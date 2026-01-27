<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import MissionReport from '../components/MissionReport.vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import { LOG_TYPE_ROLL, LOG_TYPE_SKILL, MODAL_MISSION_REPORT, BROADCAST_MISSION_REPORT } from '../constants';
import type { RollLogEntry, SkillLogEntry } from '../types';
import { useMissionReportControls } from '../composables/useMissionReportControls';
import getPluginId from '../utils/getPluginId';

const params = new URLSearchParams(window.location.search);
const rollId = params.get('rollId');
const isControllerView = params.get('controller') === '1';

const { rollHistory, characterList } = useRollForShoes();
const { awardFailureXp, advanceSkillFromRoll, markRollSucceeded } = useMissionReportControls();

const missionReportChannel = getPluginId(BROADCAST_MISSION_REPORT);
const HEARTBEAT_INTERVAL_MS = 300;
let hasNotifiedClose = false;
let heartbeatIntervalId: number | null = null;

const stopHeartbeat = () => {
  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
};

const sendHeartbeat = async () => {
  if (!OBR.isAvailable) return;
  try {
    await OBR.broadcast.sendMessage(
      missionReportChannel,
      { type: 'MISSION_REPORT_HEARTBEAT' },
      { destination: 'LOCAL' },
    );
  } catch (error) {
    console.error('Failed to send mission report heartbeat', error);
  }
};

const startHeartbeat = () => {
  if (heartbeatIntervalId !== null) return;
  if (!OBR.isAvailable) return;
  const bootHeartbeat = () => {
    if (heartbeatIntervalId !== null) return;
    if (typeof window === 'undefined') return;
    void sendHeartbeat();
    heartbeatIntervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  };
  OBR.onReady(bootHeartbeat);
};

onMounted(() => {
  startHeartbeat();
});

const notifyMissionReportClosed = async () => {
  stopHeartbeat();
  if (hasNotifiedClose) return;
  hasNotifiedClose = true;
  if (!OBR.isAvailable) return;
  try {
    await OBR.broadcast.sendMessage(
      missionReportChannel,
      { type: 'MISSION_REPORT_CLOSED' },
      { destination: 'ALL' },
    );
  } catch (error) {
    console.error('Failed to broadcast mission report close', error);
  }
};

const rollEntry = computed<RollLogEntry | null>(() => {
  if (!rollId) return null;
  const entry = rollHistory.value.find(
    (log): log is RollLogEntry => log.type === LOG_TYPE_ROLL && log.id === rollId,
  );
  return entry ?? null;
});

const character = computed(() => {
  const entry = rollEntry.value;
  if (!entry) return undefined;
  return characterList.value.find((c) => c.id === entry.characterId);
});

const evolvedSkillName = computed(() => {
  if (!rollId) return undefined;
  if (rollEntry.value?.evolvedSkillName) {
    return rollEntry.value.evolvedSkillName;
  }
  const skillEntry = rollHistory.value.find(
    (log): log is SkillLogEntry => log.type === LOG_TYPE_SKILL && log.sourceRollId === rollId,
  );
  return skillEntry?.newSkillName;
});

const isNpcReport = computed(() => rollEntry.value?.isNpc === true);
const isNpcHidden = computed(() => Boolean(rollEntry.value?.isHiddenFromPlayers));

const closeModal = async () => {
  try {
    if (OBR.isAvailable) {
      await OBR.modal.close(MODAL_MISSION_REPORT);
      await notifyMissionReportClosed();
    } else {
      window.close();
    }
  } catch (error) {
    console.error('Failed to close mission report modal', error);
  }
};

window.addEventListener('beforeunload', () => {
  void notifyMissionReportClosed();
});

onBeforeUnmount(() => {
  stopHeartbeat();
  void notifyMissionReportClosed();
});

const handleTakeXp = async () => {
  if (!rollEntry.value) return;
  await awardFailureXp(rollEntry.value.id, rollEntry.value.characterId);
  await closeModal();
};

const handleConfirmEvolve = async (_logId: string, newSkillName: string, xpCost: number) => {
  if (!rollEntry.value) return;
  await advanceSkillFromRoll({
    logId: rollEntry.value.id,
    newSkillName,
    xpCost,
    fallbackCharacterId: rollEntry.value.characterId,
    fallbackCharacterName: rollEntry.value.characterName,
    fallbackRank: rollEntry.value.rank,
  });
  await closeModal();
};

const handleSucceeded = async () => {
  if (!rollEntry.value) return;
  await markRollSucceeded(rollEntry.value.id);
  await closeModal();
};

const isLoading = ref(Boolean(rollId));

watch(rollEntry, (entry) => {
  if (entry) {
    isLoading.value = false;
  }
});

if (isLoading.value) {
  window.setTimeout(() => {
    isLoading.value = false;
  }, 2000);
}
</script>

<template>
  <div class="h-screen w-screen bg-[var(--obr-surface-base)] text-[var(--obr-text-primary)] flex items-center justify-center p-4">
    <div v-if="!rollId" class="text-center space-y-2 max-w-sm">
      <p class="font-black uppercase tracking-widest">Mission Report Unavailable</p>
      <p class="text-sm text-[var(--obr-text-secondary)]">Missing roll reference. Close this modal and try again.</p>
      <button 
        class="mt-4 px-4 py-2 border border-[var(--obr-border-base)] text-xs uppercase tracking-widest"
        @click="closeModal"
      >
        Close
      </button>
    </div>
    <div v-else-if="isLoading" class="text-center space-y-2 max-w-sm animate-pulse">
      <p class="font-black uppercase tracking-widest">Retrieving Mission Report…</p>
      <p class="text-sm text-[var(--obr-text-secondary)]">Stand by while telemetry syncs.</p>
    </div>
    <MissionReport
      v-else-if="rollEntry"
      :result="rollEntry"
      :character="character"
      :isController="isControllerView"
      :evolvedSkillName="evolvedSkillName"
      :isNpcReport="isNpcReport"
      :isNpcHidden="isNpcHidden"
      @close="closeModal"
      @takeXp="handleTakeXp"
      @confirmEvolve="handleConfirmEvolve"
      @succeeded="handleSucceeded"
    />
    <div v-else class="text-center space-y-2 max-w-sm">
      <p class="font-black uppercase tracking-widest">Mission Report Missing</p>
      <p class="text-sm text-[var(--obr-text-secondary)]">The referenced roll could not be found. It may have been deleted.</p>
      <button 
        class="mt-4 px-4 py-2 border border-[var(--obr-border-base)] text-xs uppercase tracking-widest"
        @click="closeModal"
      >
        Close
      </button>
    </div>
  </div>
</template>
const missionReportChannel = getPluginId(BROADCAST_MISSION_REPORT);
let hasNotifiedClose = false;

const notifyMissionReportClosed = async () => {
  if (hasNotifiedClose) return;
  hasNotifiedClose = true;
  if (!OBR.isAvailable) return;
  try {
    await OBR.broadcast.sendMessage(
      missionReportChannel,
      { type: 'MISSION_REPORT_CLOSED' },
      { destination: 'ALL' },
    );
  } catch (error) {
    console.error('Failed to broadcast mission report close', error);
  }
};
