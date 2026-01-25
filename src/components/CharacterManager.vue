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
  importData,
  rollDice,
  addLogEntry,
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
    
    // Create local roll result for modal
    currentRoll.value = {
        characterId,
        characterName: character.name,
        skillName: skill.name,
        rank: skill.rank,
        dice
    };

    // Add to shared log
    addLogEntry({
        id: crypto.randomUUID(),
        characterName: character.name,
        skillName: skill.name,
        rank: skill.rank,
        dice,
        timestamp: Date.now()
    });
};

const handleRollTakeXp = () => {
    if (currentRoll.value) {
        addXp(currentRoll.value.characterId, 1);
        OBR.notification.show(`${currentRoll.value.characterName} gains 1 XP from failure.`);
        currentRoll.value = null;
    }
};

const handleRollEvolve = (newSkillName: string) => {
    if (currentRoll.value && newSkillName) {
         addSkill(currentRoll.value.characterId, {
            name: newSkillName,
            rank: currentRoll.value.rank + 1
         });
         
         OBR.notification.show(`${currentRoll.value.characterName} acquired new skill: ${newSkillName} (Rank ${currentRoll.value.rank + 1})`, "SUCCESS");
         currentRoll.value = null;
    }
};
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-[var(--obr-bg-paper)]">
    
    <!-- Mission Report Overlay -->
    <MissionReport 
        v-if="currentRoll" 
        :result="currentRoll"
        @close="currentRoll = null"
        @takeXp="handleRollTakeXp"
        @confirmEvolve="handleRollEvolve"
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
          <MissionLog :history="rollHistory" />
      </div>

      <!-- SYSTEMS TAB CONTENT -->
      <div v-if="activeTab === 'SYSTEMS'" class="h-full pb-4">
          <SystemTerminal 
            :role="role"
            :isDebug="debugMode"
            @export="exportData"
            @import="handleImport"
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
