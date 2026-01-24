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
  // Reset input so same file can be selected again if needed
  input.value = '';
};
</script>

<template>
  <div class="w-full max-w-md mx-auto p-4">
    <!-- Header / Actions -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-[var(--obr-text-primary)]">Characters</h2>
      <button 
        v-if="!isCreating"
        @click="isCreating = true"
        class="bg-[var(--obr-primary-main)] hover:opacity-90 text-[var(--obr-primary-contrast)] text-sm font-medium py-1.5 px-3 rounded shadow-sm transition-colors cursor-pointer"
      >
        + New Character
      </button>
    </div>

    <!-- Create Form -->
    <div v-if="isCreating" class="mb-6 bg-[var(--obr-bg-paper)] backdrop-blur-xl p-4 rounded-2xl border border-[var(--obr-primary-main)] border-opacity-30 shadow-lg">
      <label class="block text-xs font-bold text-[var(--obr-text-secondary)] uppercase mb-1">Name</label>
      <div class="flex gap-2">
        <input 
          v-model="newCharName"
          type="text" 
          class="flex-1 rounded border-[var(--obr-text-disabled)] border-opacity-40 bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--obr-primary-main)] outline-none border"
          placeholder="e.g. Ollie"
          @keyup.enter="handleCreate"
        />
        <button 
          @click="handleCreate"
          class="bg-[var(--obr-primary-main)] hover:opacity-90 text-[var(--obr-primary-contrast)] font-bold px-4 rounded text-sm"
        >Save</button>
        <button 
          @click="isCreating = false"
          class="text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] px-2"
        >×</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="characterList.length === 0 && !isCreating" class="text-center py-10 text-[var(--obr-text-disabled)]">
      <p>No characters yet.</p>
      <p class="text-sm">Create one to get started.</p>
    </div>

    <!-- List -->
    <div class="space-y-4">
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
    </div>

    <!-- Data Management (GM Only) -->
    <div v-if="role === 'GM'" class="mt-8 pt-6 border-t border-[var(--obr-text-disabled)] border-opacity-20">
        <h3 class="text-xs font-bold text-[var(--obr-text-disabled)] uppercase tracking-wider mb-3">Data Management</h3>
        <div class="flex gap-3">
            <button 
                @click="exportData"
                class="flex-1 bg-[var(--obr-bg-paper)] border border-[var(--obr-text-disabled)] border-opacity-30 hover:bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors"
            >
                Export JSON
            </button>
            <label class="flex-1 cursor-pointer bg-[var(--obr-bg-paper)] border border-[var(--obr-text-disabled)] border-opacity-30 hover:bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors text-center">
                Import JSON
                <input type="file" class="hidden" accept=".json" @change="handleImport" />
            </label>
        </div>
        <p class="text-xs text-[var(--obr-text-disabled)] mt-2 text-center">Back up your character data or transfer it to another room.</p>
    </div>
  </div>
</template>
