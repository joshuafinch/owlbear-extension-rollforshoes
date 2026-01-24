<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Character, Skill } from '../types';

const props = defineProps<{
  character: Character;
  selectedTokenIds: string[];
}>();

const emit = defineEmits<{
  (e: 'addXp', id: string, amount: number): void;
  (e: 'addSkill', id: string, skill: Skill): void;
  (e: 'removeSkill', id: string, index: number): void;
  (e: 'link', id: string): void;
  (e: 'delete', id: string): void;
}>();

const isExpanded = ref(false);
const newSkillName = ref('');
const newSkillRank = ref(2);

const canLink = computed(() => props.selectedTokenIds.length > 0);

const handleAddSkill = () => {
  if (!newSkillName.value.trim()) return;
  emit('addSkill', props.character.id, {
    name: newSkillName.value,
    rank: newSkillRank.value
  });
  newSkillName.value = '';
  newSkillRank.value = 2; // Reset to 2 as it's the most common next step
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-3 border border-gray-200 dark:border-gray-700">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="isExpanded = !isExpanded">
        <span class="text-gray-400 text-sm transform transition-transform" :class="{ 'rotate-90': isExpanded }">▶</span>
        <h3 class="font-bold text-lg text-gray-900 dark:text-white">{{ character.name }}</h3>
      </div>
      
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-gray-100 dark:bg-gray-900 rounded px-2 py-1">
          <span class="text-xs font-bold text-gray-500 mr-2">XP</span>
          <button 
            @click="emit('addXp', character.id, -1)"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >-</button>
          <span class="mx-2 font-mono font-bold w-6 text-center">{{ character.xp }}</span>
          <button 
            @click="emit('addXp', character.id, 1)"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div v-if="canLink" class="flex justify-end mb-2">
        <button 
            @click="emit('link', character.id)"
            class="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded"
            title="Link currently selected tokens to this character"
        >
            Link Selected Token
        </button>
    </div>

    <!-- Details -->
    <div v-if="isExpanded" class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Skills</h4>
      
      <div class="space-y-2 mb-4">
        <div 
          v-for="(skill, index) in character.skills" 
          :key="index"
          class="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
        >
          <span class="font-medium">{{ skill.name }}</span>
          <div class="flex items-center gap-3">
             <span class="font-bold font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-sm">
                {{ skill.rank }}
             </span>
             <button 
                @click="emit('removeSkill', character.id, index)"
                class="text-red-400 hover:text-red-600 px-1"
                title="Remove Skill"
             >×</button>
          </div>
        </div>
      </div>

      <!-- Add Skill Form -->
      <div class="flex gap-2 items-center">
        <input 
          v-model="newSkillName" 
          type="text" 
          placeholder="New Skill Name"
          class="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 outline-none px-1 py-1 text-sm"
          @keyup.enter="handleAddSkill"
        />
        <input 
          v-model.number="newSkillRank" 
          type="number" 
          min="1" 
          max="10"
          class="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 outline-none px-1 py-1 text-center text-sm"
          @keyup.enter="handleAddSkill"
        />
        <button 
          @click="handleAddSkill"
          class="text-indigo-600 hover:text-indigo-800 text-sm font-bold px-2"
        >Add</button>
      </div>

      <div class="mt-6 flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
         <button @click="emit('delete', character.id)" class="text-xs text-red-500 hover:text-red-700 underline">Delete Character</button>
      </div>
    </div>
  </div>
</template>
