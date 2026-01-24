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
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Characters</h2>
      <button 
        v-if="!isCreating"
        @click="isCreating = true"
        class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1.5 px-3 rounded shadow-sm transition-colors cursor-pointer"
      >
        + New Character
      </button>
    </div>

    <!-- Create Form -->
    <div v-if="isCreating" class="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900">
      <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
      <div class="flex gap-2">
        <input 
          v-model="newCharName"
          type="text" 
          class="flex-1 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="e.g. Ollie"
          @keyup.enter="handleCreate"
        />
        <button 
          @click="handleCreate"
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded text-sm"
        >Save</button>
        <button 
          @click="isCreating = false"
          class="text-gray-500 hover:text-gray-700 px-2"
        >×</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="characterList.length === 0 && !isCreating" class="text-center py-10 text-gray-400">
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
    <div v-if="role === 'GM'" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Data Management</h3>
        <div class="flex gap-3">
            <button 
                @click="exportData"
                class="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors"
            >
                Export JSON
            </button>
            <label class="flex-1 cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors text-center">
                Import JSON
                <input type="file" class="hidden" accept=".json" @change="handleImport" />
            </label>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">Back up your character data or transfer it to another room.</p>
    </div>
  </div>
</template>
