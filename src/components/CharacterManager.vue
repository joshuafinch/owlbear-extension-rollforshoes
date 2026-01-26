<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import DispatchConsole from './DispatchConsole.vue';
import SystemTerminal from './SystemTerminal.vue';
import MissionReport, { type RollResult } from './MissionReport.vue';
import MissionLog from './MissionLog.vue';
import type { Skill } from '../types';
import OBR from '@owlbear-rodeo/sdk';
import { 
  TAB_DISPATCH, 
  TAB_LOGS, 
  TAB_SYSTEMS, 
  LOG_TYPE_ROLL, 
  LOG_TYPE_SKILL 
} from '../constants';

const { 
  characterList, 
  rollHistory,
  role,
  addXp, 
  addSkill, 
  removeSkill,
  importData,
  rollDice,
  addLogEntry,
  markLogAction,
  unmarkLogAction,
  deleteLogEntry,
  clearLogs,
  debugMode,
  exportData
} = useRollForShoes();

// Tabs: 'DISPATCH' (list) | 'LOGS' (history) | 'SYSTEMS' (admin)
const activeTab = ref<typeof TAB_DISPATCH | typeof TAB_LOGS | typeof TAB_SYSTEMS>(TAB_DISPATCH);

// Rolling State
const currentRoll = ref<RollResult | null>(null);

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

const handleRoll = (characterId: string, skill: Skill) => {
    const character = characterList.value.find(c => c.id === characterId);
    if (!character) return;

    const dice = rollDice(skill.rank, debugMode.value);
    
    const rollId = crypto.randomUUID();

    // Create local roll result for modal
    currentRoll.value = {
        id: rollId,
        characterId,
        characterName: character.name,
        skillName: skill.name,
        rank: skill.rank,
        dice
    };

    // Add to shared log
    addLogEntry({
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
};

const handleRollTakeXp = async (logId: string) => {
    if (currentRoll.value) {
        await addXp(currentRoll.value.characterId, 1);
        await markLogAction(logId, 'xp');
        OBR.notification.show(`${currentRoll.value.characterName} gains 1 XP from failure.`);
        // Remove: currentRoll.value = null; // Don't close immediately so user sees "Success" or "Evolve" options disabled, or better yet, keep modal open but in 'result' state
        // Actually, for better UX, we can keep it open or close it. 
        // If we keep it open, we need to update the UI to show XP was taken.
        // But the MissionReport is a prop-driven component.
        // Let's close it for now as per original behavior, but ensure the XP add finished first? 
        // addXp is async now but we don't await it here because the UI is optimistic.
        currentRoll.value = null;
    }
};

const handleRollEvolve = async (logId: string, newSkillName: string, xpCost: number) => {
    if (currentRoll.value && newSkillName) {
         await addSkill(currentRoll.value.characterId, {
            name: newSkillName,
            rank: currentRoll.value.rank + 1
         });
         
         // Deduct XP cost
         if (xpCost > 0) {
             await addXp(currentRoll.value.characterId, -xpCost);
         }

         await markLogAction(logId, 'advance');

         // Add SKILL Log
         await addLogEntry({
            type: LOG_TYPE_SKILL,
            id: crypto.randomUUID(),
            characterId: currentRoll.value.characterId,
            characterName: currentRoll.value.characterName,
            newSkillName: newSkillName,
            rank: currentRoll.value.rank + 1,
            timestamp: Date.now(),
            cost: xpCost,
            sourceRollId: logId // Link back to the roll
         });
         
         OBR.notification.show(`${currentRoll.value.characterName} acquired new skill: ${newSkillName} (Rank ${currentRoll.value.rank + 1})`, "SUCCESS");
         currentRoll.value = null;
    }
};

const handleLogTakeXp = async (logId: string, characterId: string) => {
    await addXp(characterId, 1);
    await markLogAction(logId, 'xp');
    
    // Get updated character for notification
    const char = characterList.value.find(c => c.id === characterId);
    if (char) {
        OBR.notification.show(`${char.name} gains 1 XP (Total: ${char.xp}).`);
    } else {
        OBR.notification.show(`Character gains 1 XP from archived failure.`);
    }
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
                OBR.notification.show("Skill not found (already deleted?), but XP was refunded.", "WARNING");
            }

            // 2. Refund XP
            if (entry.cost > 0) {
                await addXp(entry.characterId, entry.cost);
            }
        }

        // 3. Unmark the "advance" action on the source roll so it can be used again
        await unmarkLogAction(entry.sourceRollId, 'advance');

        // 4. Delete the log entry
        await deleteLogEntry(logId);
        OBR.notification.show("Advancement reverted.");
    } else {
        // Standard delete for other logs (Rolls, or Skills without source info)
        await deleteLogEntry(logId);
    }
};

const handleLogEvolve = async (logId: string, characterId: string, rank: number, newSkillName: string, xpCost: number) => {
    // 1. Add the skill to the character
    await addSkill(characterId, {
        name: newSkillName,
        rank: rank + 1
    });

    // 2. Deduct XP cost
    if (xpCost > 0) {
        await addXp(characterId, -xpCost);
    }
    
    // 3. Mark the roll log as 'advanced'
    await markLogAction(logId, 'advance');

    // Find character name for log
    const char = characterList.value.find(c => c.id === characterId);
    const charName = char ? char.name : 'Unknown';

    // 4. Add SKILL Log
    await addLogEntry({
        type: LOG_TYPE_SKILL,
        id: crypto.randomUUID(),
        characterId: characterId,
        characterName: charName,
        newSkillName: newSkillName,
        rank: rank + 1,
        timestamp: Date.now(),
        cost: xpCost,
        sourceRollId: logId // Link back to the roll that spawned this
    });

    OBR.notification.show(`Character acquired new skill: ${newSkillName} (Rank ${rank + 1})`, "SUCCESS");
};
const handleRollSucceeded = async (logId: string) => {
    await markLogAction(logId, 'succeeded');
    currentRoll.value = null;
};
const handleLogSucceeded = async (logId: string) => {
    await markLogAction(logId, 'succeeded');
    OBR.notification.show(`Roll marked as Succeeded.`);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-transparent">
    
    <!-- Mission Report Overlay -->
    <MissionReport 
        v-if="currentRoll" 
        :result="currentRoll"
        :character="characterList.find(c => c.id === currentRoll?.characterId)"
        :color="characterList.find(c => c.id === currentRoll?.characterId)?.color"
        @close="currentRoll = null"
        @takeXp="handleRollTakeXp"
        @confirmEvolve="handleRollEvolve"
        @succeeded="handleRollSucceeded"
    />

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
            <DispatchConsole @roll="handleRoll" />
        </div>

        <!-- LOGS TAB CONTENT -->
        <div v-if="activeTab === TAB_LOGS" class="h-full">
            <MissionLog 
              :history="rollHistory" 
              :characters="characterList"
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
              @export="exportData"
              @import="handleImport"
              @clearLogs="clearLogs"
              @toggleDebug="debugMode = !debugMode"
            />
        </div>
      </div>
    </div>
  </div>
</template>
