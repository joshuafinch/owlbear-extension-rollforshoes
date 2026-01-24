<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import CharacterCard from './CharacterCard.vue';

const { 
  characterList, 
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
  importData
} = useRollForShoes();

const newCharName = ref('');
const isCreating = ref(false);

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
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-[var(--obr-bg-default)]">
    <!-- Fixed Header -->
    <div class="flex-none p-4 pb-2 bg-[var(--obr-bg-default)] z-10">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-black text-[var(--obr-text-primary)] uppercase tracking-tighter italic border-b-4 border-[var(--obr-text-primary)] leading-none pb-1">
           Personnel
        </h2>
        <button 
          v-if="!isCreating"
          @click="isCreating = true"
          class="bg-[var(--obr-primary-main)] hover:bg-[var(--obr-primary-dark)] text-[var(--obr-primary-contrast)] text-xs font-black uppercase tracking-widest py-2 px-4 rounded shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all border-2 border-[var(--obr-text-primary)]"
        >
          + New Recruit
        </button>
      </div>

      <!-- Create Form -->
      <div v-if="isCreating" class="mb-4 bg-[var(--obr-bg-paper)] p-3 rounded-lg border-2 border-[var(--obr-text-primary)] shadow-lg animate-fade-in-down">
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
    <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar">
      
      <!-- Empty State -->
      <div v-if="characterList.length === 0 && !isCreating" class="h-full flex flex-col items-center justify-center text-[var(--obr-text-disabled)] opacity-50">
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
      />

       <!-- Spacer for bottom actions -->
       <div class="h-20"></div>
    </div>

    <!-- Fixed Footer (GM Only) -->
    <div v-if="role === 'GM'" class="flex-none border-t-2 border-[var(--obr-text-disabled)] bg-[var(--obr-bg-paper)] p-3 shadow-[0px_-4px_10px_rgba(0,0,0,0.1)] z-20">
        <h3 class="text-[10px] font-black text-[var(--obr-text-secondary)] uppercase tracking-widest mb-2 text-center">Data Management</h3>
        <div class="flex gap-3">
            <button 
                @click="exportData"
                class="flex-1 bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)] hover:text-white text-[var(--obr-text-primary)] text-xs font-black uppercase py-2 px-2 rounded shadow-sm transition-all active:scale-95"
            >
                Export
            </button>
            <label class="flex-1 cursor-pointer bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)] hover:text-white text-[var(--obr-text-primary)] text-xs font-black uppercase py-2 px-2 rounded shadow-sm transition-all active:scale-95 text-center flex items-center justify-center">
                Import
                <input type="file" class="hidden" accept=".json" @change="handleImport" />
            </label>
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
