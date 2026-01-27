<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type WatchStopHandle } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import DispatchConsole from './DispatchConsole.vue';
import SystemTerminal from './SystemTerminal.vue';
import MissionLog from './MissionLog.vue';
import type { Skill, NpcRollRequest } from '../types';
import OBR from '@owlbear-rodeo/sdk';
import { 
  TAB_DISPATCH, 
  TAB_LOGS, 
  TAB_SYSTEMS, 
  LOG_TYPE_ROLL, 
  LOG_TYPE_SKILL,
  MODAL_MISSION_REPORT,
  MODAL_NPC_ROLL_POPOVER,
  BROADCAST_NPC_ROLL_REQUEST,
  BROADCAST_MISSION_REPORT,
 } from '../constants';
import { useMissionReportControls } from '../composables/useMissionReportControls';
import getPluginId from '../utils/getPluginId';
import { useModalQueue } from '../composables/useModalQueue';
import { useAccessOverride } from '../composables/useAccessOverride';

const {
  characterList, 
  rollHistory,
  role,
  addXp, 
  removeSkill,
  importData,
  importLogs,
  rollDice,
  addLogEntry,
  unmarkLogAction,
  deleteLogEntry,
  clearLogs,
  debugMode,
  exportData,
  exportLogs,
  settings,
  updateSettings
} = useRollForShoes();

const { hasElevatedAccess } = useAccessOverride(role);

const devHosts = ['localhost', '127.0.0.1', '::1'];
const runtimeEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
const isDevBuild = Boolean(runtimeEnv?.DEV && typeof window !== 'undefined' && devHosts.includes(window.location.hostname));

// Tabs: 'DISPATCH' (list) | 'LOGS' (history) | 'SYSTEMS' (admin)
const activeTab = ref<typeof TAB_DISPATCH | typeof TAB_LOGS | typeof TAB_SYSTEMS>(TAB_DISPATCH);

const { awardFailureXp, evolveSkillFromRoll, markRollSucceeded } = useMissionReportControls();

const displayedRollIds = new Set<string>();
let isModalReady = false;
const modalReadyResolvers: Array<() => void> = [];
const missionReportChannel = getPluginId(BROADCAST_MISSION_REPORT);
const npcRollRequestChannel = getPluginId(BROADCAST_NPC_ROLL_REQUEST);
const npcPopoverId = getPluginId(MODAL_NPC_ROLL_POPOVER);
const npcContextMenuId = getPluginId('npc-roll-menu');
const localConnectionId = ref<string | null>(null);
let unsubscribeMissionReport: (() => void) | null = null;
let unsubscribeNpcRoll: (() => void) | null = null;
let hasNpcContextMenu = false;
let stopRoleWatcher: WatchStopHandle | null = null;
const { enqueueModal, releaseModal } = useModalQueue();
const missionReportHeartbeatReleaseDelay = 600;
let missionReportHeartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

const clearMissionReportHeartbeat = () => {
    if (missionReportHeartbeatTimeout !== null) {
        clearTimeout(missionReportHeartbeatTimeout);
        missionReportHeartbeatTimeout = null;
    }
};

const releaseMissionReportModal = () => {
    clearMissionReportHeartbeat();
    releaseModal(MODAL_MISSION_REPORT);
};

const scheduleMissionReportHeartbeatRelease = () => {
    clearMissionReportHeartbeat();
    missionReportHeartbeatTimeout = setTimeout(() => {
        missionReportHeartbeatTimeout = null;
        releaseMissionReportModal();
    }, missionReportHeartbeatReleaseDelay);
};

if (OBR.isAvailable) {
    OBR.onReady(() => {
        isModalReady = true;
        while (modalReadyResolvers.length > 0) {
            const resolver = modalReadyResolvers.shift();
            resolver?.();
        }
    });
}

const waitForModalReady = () => {
    if (!OBR.isAvailable) {
        return Promise.resolve();
    }
    if (isModalReady) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        modalReadyResolvers.push(resolve);
    });
};

const handleRemoteMissionReport = async (rollId: string) => {
    if (!rollId || displayedRollIds.has(rollId)) {
        return;
    }
    displayedRollIds.add(rollId);
    queueMissionReportModal(rollId, false);
};

const ensureConnectionId = async () => {
    if (!OBR.isAvailable) return;
    if (!localConnectionId.value) {
        localConnectionId.value = await OBR.player.getConnectionId();
    }
};

const setupMissionReportListener = () => {
    if (!OBR.isAvailable) return;

    OBR.onReady(async () => {
        await ensureConnectionId();
        unsubscribeMissionReport = OBR.broadcast.onMessage(missionReportChannel, (event) => {
            if (!event?.data || typeof event.data !== 'object') return;
            const payload = event.data as { type?: string; rollId?: string };

            if (payload.type === 'MISSION_REPORT_CLOSED') {
                if (event.connectionId === localConnectionId.value) {
                    releaseMissionReportModal();
                }
                return;
            }

            if (payload.type === 'MISSION_REPORT_HEARTBEAT') {
                if (event.connectionId === localConnectionId.value) {
                    scheduleMissionReportHeartbeatRelease();
                }
                return;
            }

            if (event.connectionId === localConnectionId.value) return;
            if (payload.type !== 'MISSION_REPORT') return;
            if (!payload.rollId) return;
            handleRemoteMissionReport(payload.rollId);
        });
    });
};

const setupNpcRollListener = () => {
    if (!OBR.isAvailable) return;
    OBR.onReady(async () => {
        await ensureConnectionId();
        unsubscribeNpcRoll = OBR.broadcast.onMessage(npcRollRequestChannel, (event) => {
            if (!event?.data || typeof event.data !== 'object') return;
            if (event.connectionId !== localConnectionId.value) return;
            const payload = event.data as NpcRollRequest;
            handleNpcRoll(payload);
        });
    });
};

const buildNpcPopoverUrl = (tokenId: string) => {
    const baseUrl = new URL(window.location.href);
    baseUrl.search = '';
    baseUrl.searchParams.set('modal', MODAL_NPC_ROLL_POPOVER);
    baseUrl.searchParams.set('tokenId', tokenId);
    return baseUrl.toString();
};

const openNpcPopover = async (tokenId: string | null, anchorId?: string | null) => {
    if (!OBR.isAvailable || !tokenId) return;
    try {
        await OBR.popover.open({
            id: npcPopoverId,
            url: buildNpcPopoverUrl(tokenId),
            anchorElementId: anchorId || tokenId,
            width: 280,
            height: 320,
        });
    } catch (error) {
        console.error('Failed to open NPC roll popover', error);
    }
};

const registerNpcContextMenu = () => {
    if (!OBR.isAvailable || hasNpcContextMenu) return;
    OBR.onReady(async () => {
        if (hasNpcContextMenu) return;
        try {
            await OBR.contextMenu.create({
                id: npcContextMenuId,
                icons: [
                    {
                        icon: '/icons/npc-roll.svg',
                        label: 'NPC Roll',
                        filter: {
                            roles: ['GM', 'PLAYER'],
                        },
                    },
                ],
                onClick(context, elementId) {
                    const firstCharacterLayerItem = context.items?.find((item) => item.layer === 'CHARACTER');
                    const fallbackItem = firstCharacterLayerItem ?? context.items?.[0];
                    const targetId = fallbackItem?.id || null;
                    if (!targetId) {
                        return;
                    }
                    openNpcPopover(targetId, elementId ?? targetId);
                },
            });
            hasNpcContextMenu = true;
        } catch (error) {
            console.error('Failed to register NPC context menu', error);
        }
    });
};

const destroyNpcContextMenu = async () => {
    if (!OBR.isAvailable || !hasNpcContextMenu) return;
    try {
        await OBR.contextMenu.remove(npcContextMenuId);
    } catch (error) {
        console.error('Failed to destroy NPC context menu', error);
    } finally {
        hasNpcContextMenu = false;
    }
};

onMounted(() => {
    setupMissionReportListener();
    setupNpcRollListener();
    stopRoleWatcher = watch(hasElevatedAccess, (canAccessNpcTools) => {
        if (canAccessNpcTools) {
            registerNpcContextMenu();
        } else {
            destroyNpcContextMenu();
        }
    }, { immediate: true });
});

onUnmounted(() => {
    unsubscribeMissionReport?.();
    unsubscribeMissionReport = null;
    unsubscribeNpcRoll?.();
    unsubscribeNpcRoll = null;
    destroyNpcContextMenu();
    stopRoleWatcher?.();
    stopRoleWatcher = null;
    clearMissionReportHeartbeat();
});

const handleImport = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = (e) => {
    if (e.target?.result && typeof e.target.result === 'string') {
        if (confirm('This will overwrite all current character data. Are you sure?')) {
            importData(e.target.result);
        }
    }
  };
  
  reader.readAsText(file);
  input.value = '';
};

const handleImportLogs = (event: Event) => {
  if (!isDevBuild) return;
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    if (e.target?.result && typeof e.target.result === 'string') {
      if (confirm('This will overwrite all mission log history. Proceed?')) {
        importLogs(e.target.result);
      }
    }
  };

  reader.readAsText(file);
  input.value = '';
};

const handleExportLogs = () => {
  if (!isDevBuild) return;
  exportLogs();
};

const buildMissionReportUrl = (rollId: string, isControllerView: boolean) => {
    const baseUrl = new URL(window.location.href);
    baseUrl.search = '';
    baseUrl.searchParams.set('modal', MODAL_MISSION_REPORT);
    baseUrl.searchParams.set('rollId', rollId);
    if (isControllerView) {
        baseUrl.searchParams.set('controller', '1');
    }
    return baseUrl.toString();
};

const openMissionReportModal = async (rollId: string, isControllerView: boolean) => {
    if (!OBR.isAvailable) return;
    await waitForModalReady();
    await OBR.modal.open({
        id: MODAL_MISSION_REPORT,
        url: buildMissionReportUrl(rollId, isControllerView),
        height: 640,
        width: 420,
    });
};

const queueMissionReportModal = (rollId: string, isControllerView: boolean) => {
    enqueueModal({
        id: MODAL_MISSION_REPORT,
        opener: async () => {
            try {
                await openMissionReportModal(rollId, isControllerView);
            } catch (error) {
                console.error('Failed to open Mission Report modal', error);
                releaseMissionReportModal();
            }
        },
    });
};

const broadcastMissionReport = async (rollId: string) => {
    if (!OBR.isAvailable) return;
    try {
        await waitForModalReady();
        await OBR.broadcast.sendMessage(missionReportChannel, {
            type: 'MISSION_REPORT',
            rollId,
        }, { destination: 'ALL' });
    } catch (error) {
        console.error('Failed to broadcast mission report', error);
    }
};

const handleRoll = async (characterId: string, skill: Skill) => {
    const character = characterList.value.find(c => c.id === characterId);
    if (!character) return;

    const dice = rollDice(skill.rank, debugMode.value);
    const rollId = crypto.randomUUID();

    displayedRollIds.add(rollId);

    await addLogEntry({
        type: LOG_TYPE_ROLL,
        id: rollId,
        characterId,
        characterName: character.name,
        skillName: skill.name,
        rank: skill.rank,
        dice,
        timestamp: Date.now(),
        actionsTaken: []
    });

    queueMissionReportModal(rollId, true);
    if (settings.value.missionReportBroadcastEnabled) {
        await broadcastMissionReport(rollId);
    }
};

const handleNpcRoll = async (payload: NpcRollRequest) => {
    const dice = rollDice(payload.diceCount, debugMode.value);
    const rollId = crypto.randomUUID();
    displayedRollIds.add(rollId);
    const npcName = payload.npcName.trim() || 'NPC Operative';
    const skillName = payload.skillName.trim() || 'Field Test';

    await addLogEntry({
        type: LOG_TYPE_ROLL,
        id: rollId,
        characterId: `npc-${rollId}`,
        characterName: npcName,
        skillName,
        rank: payload.diceCount,
        dice,
        timestamp: Date.now(),
        isNpc: true,
        isHiddenFromPlayers: !payload.revealToPlayers,
    });

    queueMissionReportModal(rollId, true);
    if (payload.revealToPlayers && settings.value.missionReportBroadcastEnabled) {
        await broadcastMissionReport(rollId);
    }
};

const handleLogTakeXp = async (logId: string, characterId: string) => {
    await awardFailureXp(logId, characterId);
};

const handleLogDelete = async (logId: string) => {
    // Check if it's a SKILL entry with revert info
    const entry = rollHistory.value.find(e => e.id === logId);
    if (!entry) return;

    if (entry.type === LOG_TYPE_SKILL && entry.sourceRollId) {
        // 1. Remove the skill from the character
        // We need to find the skill index. This is tricky since we only store name/rank.
        // Assumption: The most recent skill with this name/rank is the one we want.
        const char = characterList.value.find(c => c.id === entry.characterId);
        if (char) {
            // Find index of skill matching name and rank
            // Search from end to find most recent
            let skillIndex = -1;
            
            // Debug logging for reversion
            console.log(`[Revert] Looking for skill: "${entry.newSkillName}" (Rank ${entry.rank}) on character "${char.name}"`);

            for (let i = char.skills.length - 1; i >= 0; i--) {
                const skill = char.skills[i];
                // Robust comparison: Case-insensitive name, loose equality for rank
                const nameMatch = (skill.name || "").trim().toLowerCase() === (entry.newSkillName || "").trim().toLowerCase();
                const rankMatch = skill.rank == entry.rank;

                if (nameMatch && rankMatch) {
                    skillIndex = i;
                    break;
                }
            }

            if (skillIndex !== -1) {
                await removeSkill(entry.characterId, skillIndex);
            } else {
                console.warn(`[Revert] Could not find skill to revert. Available skills:`, JSON.parse(JSON.stringify(char.skills)));
                // OBR.notification.show("Skill not found (already deleted?), but XP was refunded.", "WARNING");
            }

            // 2. Refund XP
            if (entry.cost > 0) {
                await addXp(entry.characterId, entry.cost);
            }
        }

        // 3. Unmark the "evolve" action on the source roll so it can be used again
        await unmarkLogAction(entry.sourceRollId, 'evolve');

        // 4. Delete the log entry
        await deleteLogEntry(logId);
        // OBR.notification.show("Evolution reverted.");
    } else {
        // Standard delete for other logs (Rolls, or Skills without source info)
        await deleteLogEntry(logId);
    }
};

const handleLogEvolve = async (logId: string, characterId: string, rank: number, newSkillName: string, xpCost: number) => {
    const fallbackName = characterList.value.find(c => c.id === characterId)?.name;
    await evolveSkillFromRoll({
        logId,
        newSkillName,
        xpCost,
        fallbackCharacterId: characterId,
        fallbackCharacterName: fallbackName,
        fallbackRank: rank,
    });
};

const handleLogSucceeded = async (logId: string) => {
    await markRollSucceeded(logId);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-transparent">
    
    <!-- Main Interface Frame -->
    <div class="flex-1 flex flex-col overflow-hidden">
      
      <!-- Integrated Header / Nav -->
      <nav class="flex flex-none border-b-4 border-[var(--obr-border-base)] z-10">
        <!-- Dispatch Tab -->
        <button 
          @click="activeTab = TAB_DISPATCH"
          class="flex-1 py-3 text-center font-black uppercase tracking-widest text-xs sm:text-sm transition-all relative group flex items-center justify-center gap-2"
          :class="activeTab === TAB_DISPATCH 
            ? 'bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)]' 
            : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-hover)]'"
        >
          <span v-if="activeTab === TAB_DISPATCH" class="text-[var(--obr-brand-accent)]">●</span>
          Dispatch
        </button>

        <!-- Vertical Divider -->
        <div class="w-[4px] bg-[var(--obr-border-base)]"></div>

        <!-- Logs Tab -->
        <button 
          @click="activeTab = TAB_LOGS"
          class="flex-1 py-3 text-center font-black uppercase tracking-widest text-xs sm:text-sm transition-all relative group flex items-center justify-center gap-2"
          :class="activeTab === TAB_LOGS 
            ? 'bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)]' 
            : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-hover)]'"
        >
          <span v-if="activeTab === TAB_LOGS" class="text-[var(--obr-brand-accent)]">●</span>
          Logs
        </button>

        <!-- Vertical Divider -->
        <div class="w-[4px] bg-[var(--obr-border-base)]"></div>

        <!-- System Tab -->
        <button 
          @click="activeTab = TAB_SYSTEMS"
          class="flex-1 py-3 text-center font-black uppercase tracking-widest text-xs sm:text-sm transition-all relative group flex items-center justify-center gap-2"
          :class="activeTab === TAB_SYSTEMS 
            ? 'bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)]' 
            : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-hover)]'"
        >
          <span v-if="activeTab === TAB_SYSTEMS" class="text-[var(--obr-brand-accent)]">●</span>
          System
        </button>
      </nav>

      <!-- Scrollable Content Area -->
      <div class="flex-1 min-h-0 overflow-hidden relative">
        
        <!-- DISPATCH TAB CONTENT -->
        <div v-if="activeTab === TAB_DISPATCH" class="h-full">
            <DispatchConsole @roll="handleRoll" @npcRoll="handleNpcRoll" />
        </div>

        <!-- LOGS TAB CONTENT -->
        <div v-if="activeTab === TAB_LOGS" class="h-full">
            <MissionLog 
              :history="rollHistory" 
              :characters="characterList"
              :role="role"
              @takeXp="handleLogTakeXp"
              @evolve="handleLogEvolve"
              @succeeded="handleLogSucceeded"
              @deleteLog="handleLogDelete"
            />
        </div>

         <!-- SYSTEMS TAB CONTENT -->
         <div v-if="activeTab === TAB_SYSTEMS" class="h-full">
             <SystemTerminal 
               :role="role"
               :isDebug="debugMode"
               :isDevBuild="isDevBuild"
               :settings="settings"
               @export="exportData"
               @import="handleImport"
               @exportLogs="handleExportLogs"
               @importLogs="handleImportLogs"
               @clearLogs="clearLogs"
               @toggleDebug="debugMode = !debugMode"
               @updateSettings="updateSettings"
             />
         </div>

      </div>
    </div>
  </div>
</template>
