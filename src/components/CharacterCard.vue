<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Character, Skill } from '../types';

const props = defineProps<{
  character: Character;
  selectedTokenIds: string[];
  role: string;
}>();

const emit = defineEmits<{
  (e: 'addXp', id: string, amount: number): void;
  (e: 'addSkill', id: string, skill: Skill): void;
  (e: 'updateSkill', id: string, index: number, skill: Partial<Skill>): void;
  (e: 'removeSkill', id: string, index: number): void;
  (e: 'link', id: string): void;
  (e: 'delete', id: string): void;
}>();

const isExpanded = ref(false);
const newSkillName = ref('');
const newSkillRank = ref(2);

// Track editing state for each skill by index
const editingSkillIndex = ref<number | null>(null);
const editSkillName = ref('');
const editSkillRank = ref(1);

const canLink = computed(() => props.selectedTokenIds.length > 0);
const isGm = computed(() => props.role === 'GM');

const handleAddSkill = () => {
  if (!newSkillName.value.trim()) return;
  emit('addSkill', props.character.id, {
    name: newSkillName.value,
    rank: newSkillRank.value
  });
  newSkillName.value = '';
  newSkillRank.value = 2; // Reset to 2 as it's the most common next step
};

const handleDelete = () => {
  if (confirm(`Are you sure you want to delete ${props.character.name}? This cannot be undone.`)) {
    emit('delete', props.character.id);
  }
};

const startEditingSkill = (index: number, skill: Skill) => {
    editingSkillIndex.value = index;
    editSkillName.value = skill.name;
    editSkillRank.value = skill.rank;
};

const saveSkillEdit = (index: number) => {
    if (!editSkillName.value.trim()) return;
    emit('updateSkill', props.character.id, index, {
        name: editSkillName.value,
        rank: editSkillRank.value
    });
    editingSkillIndex.value = null;
};

const cancelSkillEdit = () => {
    editingSkillIndex.value = null;
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
            :disabled="character.xp <= 0"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded group"
        >
          <!-- View Mode -->
          <template v-if="editingSkillIndex !== index">
              <span class="font-medium cursor-pointer hover:text-indigo-600 truncate flex-1" @click="startEditingSkill(index, skill)" title="Click to edit">{{ skill.name }}</span>
              <div class="flex items-center gap-3 ml-2">
                 <span 
                    class="font-bold font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-sm cursor-pointer hover:border-indigo-400"
                    @click="startEditingSkill(index, skill)"
                    title="Click to edit"
                 >
                    {{ skill.rank }}
                 </span>
                 <button 
                    @click="emit('removeSkill', character.id, index)"
                    class="text-gray-300 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Skill"
                 >×</button>
              </div>
          </template>

          <!-- Edit Mode -->
          <template v-else>
              <div class="flex items-center gap-2 w-full">
                  <input 
                    v-model="editSkillName"
                    type="text"
                    class="flex-1 bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    @keyup.enter="saveSkillEdit(index)"
                    @keyup.esc="cancelSkillEdit"
                    ref="editInput"
                  />
                  <input 
                    v-model.number="editSkillRank"
                    type="number"
                    min="1"
                    max="10"
                    class="w-12 bg-white dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    @keyup.enter="saveSkillEdit(index)"
                  />
                  <button @click="saveSkillEdit(index)" class="text-green-600 hover:text-green-800 text-xs font-bold">✓</button>
                  <button @click="cancelSkillEdit" class="text-gray-500 hover:text-gray-700 text-xs">✕</button>
              </div>
          </template>
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
         <button 
            v-if="isGm"
            @click="handleDelete" 
            class="text-xs text-red-500 hover:text-red-700 underline"
         >
            Delete Character
         </button>
      </div>
    </div>
  </div>
</template>
