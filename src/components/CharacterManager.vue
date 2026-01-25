<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import DispatchConsole from './DispatchConsole.vue';
import SystemTerminal from './SystemTerminal.vue';
import MissionReport, { type RollResult } from './MissionReport.vue';
import MissionLog from './MissionLog.vue';
import type { Skill } from '../types';
import OBR from '@owlbear-rodeo/sdk';

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
const activeTab = ref<'DISPATCH' | 'LOGS' | 'SYSTEMS'>('DISPATCH');

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
        type: 'ROLL',
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

const handleRollTakeXp = (logId: string) => {
    if (currentRoll.value) {
        addXp(currentRoll.value.characterId, 1);
        markLogAction(logId, 'xp');
        OBR.notification.show(`${currentRoll.value.characterName} gains 1 XP from failure.`);
        currentRoll.value = null;
    }
};

const handleRollEvolve = (logId: string, newSkillName: string, xpCost: number) => {
    if (currentRoll.value && newSkillName) {
         addSkill(currentRoll.value.characterId, {
            name: newSkillName,
            rank: currentRoll.value.rank + 1
         });
         
         // Deduct XP cost
         if (xpCost > 0) {
             addXp(currentRoll.value.characterId, -xpCost);
         }

         markLogAction(logId, 'advance');

         // Add SKILL Log
         addLogEntry({
            type: 'SKILL',
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

const handleLogTakeXp = (logId: string, characterId: string) => {
    addXp(characterId, 1);
    markLogAction(logId, 'xp');
    
    // Get updated character for notification
    const char = characterList.value.find(c => c.id === characterId);
    if (char) {
        OBR.notification.show(`${char.name} gains 1 XP (Total: ${char.xp}).`);
    } else {
        OBR.notification.show(`Character gains 1 XP from archived failure.`);
    }
};

const handleLogDelete = (logId: string) => {
    // Check if it's a SKILL entry with revert info
    const entry = rollHistory.value.find(e => e.id === logId);
    if (!entry) return;

    if (entry.type === 'SKILL' && entry.sourceRollId) {
        if (confirm('Undo this skill advancement? This will remove the skill and refund XP.')) {
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
                    removeSkill(entry.characterId, skillIndex);
                } else {
                    console.warn(`[Revert] Could not find skill to revert. Available skills:`, JSON.parse(JSON.stringify(char.skills)));
                    OBR.notification.show("Skill not found (already deleted?), but XP was refunded.", "WARNING");
                }

                // 2. Refund XP
                if (entry.cost > 0) {
                    addXp(entry.characterId, entry.cost);
                }
            }

            // 3. Unmark the "advance" action on the source roll so it can be used again
            unmarkLogAction(entry.sourceRollId, 'advance');

            // 4. Delete the log entry
            deleteLogEntry(logId);
            OBR.notification.show("Advancement reverted.");
        }
    } else {
        // Standard delete for other logs (Rolls, or Skills without source info)
        if (confirm('Are you sure you want to delete this log entry? This cannot be undone.')) {
            deleteLogEntry(logId);
        }
    }
};

const handleLogEvolve = (logId: string, characterId: string, rank: number, newSkillName: string, xpCost: number) => {
    addSkill(characterId, {
        name: newSkillName,
        rank: rank + 1
    });

    if (xpCost > 0) {
        addXp(characterId, -xpCost);
    }
    
    markLogAction(logId, 'advance');

    // Find character name for log
    const char = characterList.value.find(c => c.id === characterId);
    const charName = char ? char.name : 'Unknown';

    // Add SKILL Log
    addLogEntry({
        type: 'SKILL',
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
const handleRollSucceeded = (logId: string) => {
    markLogAction(logId, 'succeeded');
    currentRoll.value = null;
};
const handleLogSucceeded = (logId: string) => {
    markLogAction(logId, 'succeeded');
    OBR.notification.show(`Roll marked as Succeeded.`);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-[var(--obr-bg-paper)]">
    
    <!-- Mission Report Overlay -->
    <MissionReport 
        v-if="currentRoll" 
        :result="currentRoll"
        :character="characterList.find(c => c.id === currentRoll?.characterId)"
        @close="currentRoll = null"
        @takeXp="handleRollTakeXp"
        @confirmEvolve="handleRollEvolve"
        @succeeded="handleRollSucceeded"
    />

    <!-- Fixed Header -->
    <div class="flex-none bg-[var(--obr-bg-default)] z-10 pt-2 px-2 pb-0">
      
       <!-- Top Tabs -->
       <div class="flex items-end gap-1 mb-0 border-b-4 border-[var(--obr-text-primary)] pl-2">
          <button 
            @click="activeTab = 'DISPATCH'"
            class="px-5 py-3 font-black uppercase tracking-wider text-sm rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'DISPATCH' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-4 pb-4' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Dispatch
          </button>
          <button 
            @click="activeTab = 'LOGS'"
            class="px-5 py-3 font-black uppercase tracking-wider text-sm rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'LOGS' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-4 pb-4' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Logs
          </button>
          <button 
            @click="activeTab = 'SYSTEMS'"
            class="px-5 py-3 font-black uppercase tracking-wider text-sm rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'SYSTEMS' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-4 pb-4' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Systems
          </button>
       </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar pt-2">
      
      <!-- DISPATCH TAB CONTENT -->
      <div v-if="activeTab === 'DISPATCH'">
          <DispatchConsole @roll="handleRoll" />
      </div>

      <!-- LOGS TAB CONTENT -->
      <div v-if="activeTab === 'LOGS'" class="h-full pb-4">
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
      <div v-if="activeTab === 'SYSTEMS'" class="h-full pb-4">
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
</template>

<style scoped>
/* Custom Scrollbar Styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--obr-text-disabled);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--obr-primary-main);
}
</style>
