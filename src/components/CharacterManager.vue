<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import CharacterCard from './CharacterCard.vue';
import SystemTerminal from './SystemTerminal.vue';
import MissionReport, { type RollResult } from './MissionReport.vue';
import MissionLog from './MissionLog.vue';
import type { Skill } from '../types';
import OBR from '@owlbear-rodeo/sdk';

const { 
  characterList, 
  rollHistory,
  selectedItems, 
  role,
  createCharacter, 
  addXp, 
  addSkill, 
  updateSkill,
  removeSkill,
  linkSelectionToCharacter, 
  deleteCharacter,
  exportData,
  importData,
  rollDice,
  addLogEntry,
  debugMode
} = useRollForShoes();

const newCharName = ref('');
const isCreating = ref(false);

// Tabs: 'DISPATCH' (list) | 'LOGS' (history) | 'SYSTEMS' (admin)
const activeTab = ref<'DISPATCH' | 'LOGS' | 'SYSTEMS'>('DISPATCH');

// Rolling State
const currentRoll = ref<RollResult | null>(null);

const handleCreate = async () => {
  if (!newCharName.value.trim()) return;
  await createCharacter(newCharName.value);
  newCharName.value = '';
  isCreating.value = false;
};

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
  <div class="h-screen flex flex-col overflow-hidden bg-[var(--obr-bg-default)]">
    
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
            class="px-4 py-2 font-black uppercase tracking-wider text-xs rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'DISPATCH' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-3 pb-3' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Dispatch
          </button>
          <button 
            @click="activeTab = 'LOGS'"
            class="px-4 py-2 font-black uppercase tracking-wider text-xs rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'LOGS' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-3 pb-3' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Logs
          </button>
          <button 
            @click="activeTab = 'SYSTEMS'"
            class="px-4 py-2 font-black uppercase tracking-wider text-xs rounded-t-lg border-t-2 border-l-2 border-r-2 border-[var(--obr-text-primary)] transition-all relative top-[2px]"
            :class="activeTab === 'SYSTEMS' 
              ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border-b-4 border-b-[var(--obr-bg-default)] z-10 -mb-[4px] pt-3 pb-3' 
              : 'bg-[var(--obr-bg-paper)] text-[var(--obr-text-disabled)] hover:bg-gray-200 hover:text-[var(--obr-text-secondary)]'"
          >
            Systems
          </button>
       </div>

      <!-- Action Bar (Dispatch Tab Only) -->
      <div v-if="activeTab === 'DISPATCH'" class="flex justify-between items-center py-3 px-2">
         <h2 class="text-xl font-black text-[var(--obr-text-primary)] uppercase tracking-tighter italic leading-none">
            Personnel
         </h2>
         <button 
           v-if="!isCreating"
           @click="isCreating = true"
           class="bg-[var(--obr-primary-main)] hover:bg-[var(--obr-primary-dark)] text-[var(--obr-primary-contrast)] text-[10px] font-black uppercase tracking-widest py-2 px-3 rounded shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all border-2 border-[var(--obr-text-primary)]"
         >
           + New Recruit
         </button>
      </div>
      
      <!-- Create Form (Dispatch Tab Only) -->
      <div v-if="activeTab === 'DISPATCH' && isCreating" class="mx-2 mb-2 bg-[var(--obr-bg-paper)] p-3 rounded-lg border-2 border-[var(--obr-text-primary)] shadow-lg animate-fade-in-down">
        <label class="block text-[10px] font-black text-[var(--obr-text-secondary)] uppercase mb-1 tracking-widest">Recruit Name</label>
        <div class="flex gap-2">
          <input 
            v-model="newCharName"
            type="text" 
            class="flex-1 bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-disabled)] rounded px-3 py-2 text-sm font-bold text-[var(--obr-text-primary)] focus:border-[var(--obr-primary-main)] outline-none uppercase"
            placeholder="CODENAME..."
            @keyup.enter="handleCreate"
            autoFocus
          />
          <button 
            @click="handleCreate"
            class="bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)] font-black px-4 rounded text-sm uppercase border-2 border-[var(--obr-text-primary)] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none"
          >Save</button>
          <button 
            @click="isCreating = false"
            class="text-[var(--obr-text-secondary)] hover:text-red-500 font-bold px-2"
          >✕</button>
        </div>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar pt-2">
      
      <!-- DISPATCH TAB CONTENT -->
      <div v-if="activeTab === 'DISPATCH'">
          <!-- Empty State -->
          <div v-if="characterList.length === 0 && !isCreating" class="h-64 flex flex-col items-center justify-center text-[var(--obr-text-disabled)] opacity-50">
            <div class="text-6xl mb-4 grayscale">📂</div>
            <p class="font-black uppercase text-xl">No Records Found</p>
            <p class="text-sm font-bold mt-2">Create a recruit to begin.</p>
          </div>

          <!-- Character List -->
          <CharacterCard
            v-for="char in characterList"
            :key="char.id"
            :character="char"
            :selectedTokenIds="selectedItems"
            :role="role"
            @addXp="addXp"
            @addSkill="addSkill"
            @updateSkill="updateSkill"
            @removeSkill="removeSkill"
            @link="linkSelectionToCharacter"
            @delete="deleteCharacter"
            @roll="handleRoll"
          />
           <div class="h-10"></div>
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
