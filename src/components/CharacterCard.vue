<script setup lang="ts">
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
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
  (e: 'reorderSkills', id: string, skills: Skill[]): void;
  (e: 'link', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'roll', id: string, skill: Skill): void;
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

// Computed property for vuedraggable to handle skills array
const draggableSkills = computed({
  get: () => props.character.skills,
  set: (value: Skill[]) => {
     // Wait for drag to complete? vuedraggable handles this automatically usually.
     // However, with computed properties, it's best to emit directly.
     emit('reorderSkills', props.character.id, value);
  }
});

const handleAddSkill = () => {
  if (!newSkillName.value.trim()) return;
  emit('addSkill', props.character.id, {
    name: newSkillName.value.toUpperCase(),
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
        name: editSkillName.value.toUpperCase(),
        rank: editSkillRank.value
    });
    editingSkillIndex.value = null;
};

const cancelSkillEdit = () => {
    editingSkillIndex.value = null;
};
</script>

<template>
  <div class="bg-[var(--obr-bg-paper)] backdrop-blur-xl rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-0 mb-4 border-2 border-[var(--obr-text-primary)] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
    
    <!-- Header / Summary View -->
    <div class="p-3 bg-gradient-to-r from-[var(--obr-bg-default)] to-[var(--obr-bg-paper)]">
      <div class="flex items-center justify-between">
        
        <!-- Name & Toggle -->
        <button 
          class="flex items-center gap-3 cursor-pointer select-none group flex-1 text-left focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)] rounded p-1 -ml-1" 
          @click="isExpanded = !isExpanded"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? `Collapse character sheet for ${character.name}` : `Expand character sheet for ${character.name}`"
        >
           <div class="w-8 h-8 flex items-center justify-center bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] rounded-full font-black border-2 border-[var(--obr-bg-paper)] shadow-sm transform transition-transform group-hover:scale-110" aria-hidden="true">
              <span class="text-[var(--obr-bg-paper)] text-base font-bold">{{ character.name.charAt(0).toUpperCase() }}</span>
           </div>
           <div class="flex flex-col">
              <h3 class="font-black text-xl text-[var(--obr-text-primary)] uppercase tracking-tight leading-none group-hover:text-[var(--obr-primary-main)] transition-colors">{{ character.name }}</h3>
              <span class="text-xs font-bold text-[var(--obr-text-disabled)] uppercase tracking-wider flex items-center gap-1 group-hover:text-[var(--obr-text-secondary)] transition-colors">
                 <svg 
                   class="w-4 h-4 transform transition-transform duration-300 text-[var(--obr-text-primary)]"
                   :class="{ 'rotate-180': isExpanded }"
                   fill="none" 
                   stroke="currentColor" 
                   viewBox="0 0 24 24" 
                   xmlns="http://www.w3.org/2000/svg"
                   aria-hidden="true"
                 >
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M19 9l-7 7-7-7"></path>
                 </svg>
                 <span class="sr-only">{{ isExpanded ? 'Collapse' : 'Expand' }} details</span>
              </span>
           </div>
        </button>
        
        <!-- XP Counter -->
        <div class="flex items-center bg-[var(--obr-bg-default)] rounded border-2 border-[var(--obr-text-primary)] px-1 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]" role="group" aria-label="Experience Points">
          <div class="flex flex-col items-center mr-2 pl-1 border-r border-[var(--obr-text-disabled)] border-opacity-30 pr-2" aria-hidden="true">
             <span class="text-[10px] font-black uppercase text-[var(--obr-text-secondary)] leading-none">XP</span>
          </div>
          <button 
            @click="emit('addXp', character.id, -1)"
            :disabled="character.xp <= 0"
            class="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 hover:text-white text-[var(--obr-text-primary)] font-bold transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
            aria-label="Decrease XP"
          >-</button>
          <span class="mx-1 font-mono font-black text-xl w-8 text-center text-[var(--obr-text-primary)]" aria-live="polite">{{ character.xp }}</span>
          <button 
            @click="emit('addXp', character.id, 1)"
            class="w-8 h-8 flex items-center justify-center rounded hover:bg-green-500 hover:text-white text-[var(--obr-text-primary)] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
            aria-label="Increase XP"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Actions Bar (Collapsed State) -->
     <div v-if="!isExpanded && canLink" class="px-3 pb-3 flex justify-end">
        <button 
            @click.stop="emit('link', character.id)"
            class="text-xs font-bold uppercase bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)] hover:opacity-90 px-3 py-1.5 rounded shadow-sm flex items-center gap-1"
        >
            <span>🔗 Link Token</span>
        </button>
     </div>

    <!-- Expanded Details -->
    <div v-if="isExpanded" class="border-t-2 border-[var(--obr-text-primary)] bg-[var(--obr-bg-default)] bg-opacity-50">
      
      <!-- Skills Section -->
      <div class="p-3">
        <div class="flex justify-between items-end mb-2">
            <h4 class="text-sm font-black text-[var(--obr-text-primary)] uppercase tracking-widest border-b-2 border-[var(--obr-primary-main)] inline-block">Skills</h4>
            
            <!-- Link Action (Expanded) -->
             <button 
                v-if="canLink"
                @click="emit('link', character.id)"
                class="text-xs font-bold uppercase text-[var(--obr-primary-main)] hover:underline flex items-center gap-1"
            >
                <span>🔗 Link Token</span>
            </button>
        </div>
        
        <div class="space-y-2 mb-4">
          <draggable 
            v-model="draggableSkills" 
            item-key="name" 
            handle=".drag-handle"
            ghost-class="sortable-ghost"
            drag-class="sortable-drag"
            :animation="200"
            :force-fallback="true"
            :fallback-tolerance="3"
            :fallback-on-body="true"
          >
            <template #item="{ element: skill, index }">
              <div 
                class="relative flex items-center justify-between bg-[var(--obr-bg-paper)] p-2 rounded border border-[var(--obr-text-disabled)] border-opacity-30 group hover:border-[var(--obr-primary-main)] hover:shadow-md transition-colors mb-2 select-none"
              >
                <!-- Background rank watermark -->
                <div class="absolute right-10 top-1/2 -translate-y-1/2 text-4xl font-black text-[var(--obr-text-disabled)] opacity-5 pointer-events-none z-0">{{ skill.rank }}</div>

                <!-- Drag Handle -->
                <div 
                  class="drag-handle cursor-grab active:cursor-grabbing text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] px-2 mr-1"
                >
                  <span class="text-xs">⋮⋮</span>
                </div>

                <!-- View Mode -->
                <template v-if="editingSkillIndex !== index">
                    <!-- Roll Button -->
                    <button 
                       @click.stop="emit('roll', character.id, skill)"
                       class="mr-3 w-8 h-8 flex items-center justify-center bg-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)] text-white font-black text-sm rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none transition-all z-20 border border-transparent hover:border-white focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)]"
                       :aria-label="`Roll ${skill.rank} dice for ${skill.name}`"
                       title="Roll Dice"
                    >
                       <span aria-hidden="true">🎲</span>
                    </button>

                    <div class="flex-1 z-10 cursor-pointer" @click="startEditingSkill(index, skill)" title="Click to edit">
                         <span class="font-bold text-[var(--obr-text-primary)] block leading-tight uppercase text-base">{{ skill.name }}</span>
                    </div>
                    
                    <div class="flex items-center gap-2 z-10 ml-2">
                       <!-- Rank Badge -->
                       <button 
                          class="w-8 h-8 flex items-center justify-center bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] font-black text-base rounded shadow-sm cursor-pointer hover:scale-110 transition-transform border-2 border-transparent hover:border-[var(--obr-primary-main)] focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)]"
                          @click="startEditingSkill(index, skill)"
                          title="Click to edit rank"
                          :aria-label="`Rank ${skill.rank}. Click to edit skill.`"
                       >
                          {{ skill.rank }}
                       </button>
                       
                       <button 
                          @click="emit('removeSkill', character.id, index)"
                          class="w-8 h-8 flex items-center justify-center text-[var(--obr-text-disabled)] hover:text-red-500 hover:bg-red-100 rounded opacity-60 hover:opacity-100 transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
                          :aria-label="`Remove skill ${skill.name}`"
                          title="Remove Skill"
                       ><span aria-hidden="true">×</span></button>
                    </div>
                </template>

                <!-- Edit Mode -->
                <template v-else>
                    <div class="flex items-center gap-2 w-full z-10 bg-[var(--obr-bg-paper)] p-1 -m-1 rounded ring-2 ring-[var(--obr-primary-main)] shadow-lg">
                        <input 
                          v-model="editSkillName"
                          type="text"
                          class="flex-1 bg-transparent text-[var(--obr-text-primary)] font-bold px-1 py-1 text-base focus:outline-none uppercase"
                          @keyup.enter="saveSkillEdit(index)"
                          @keyup.esc="cancelSkillEdit"
                          ref="editInput"
                        />
                        <div class="flex flex-col items-center">
                            <label class="text-[10px] font-black uppercase text-[var(--obr-text-secondary)]">Rank</label>
                            <input 
                            v-model.number="editSkillRank"
                            type="number"
                            min="1"
                            max="10"
                            class="w-10 bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border border-[var(--obr-text-disabled)] rounded px-1 py-0 text-center text-sm font-bold focus:outline-none focus:border-[var(--obr-primary-main)]"
                            @keyup.enter="saveSkillEdit(index)"
                            />
                        </div>
                        <div class="flex flex-col gap-1">
                            <button @click="saveSkillEdit(index)" class="bg-green-500 text-white w-6 h-6 rounded flex items-center justify-center hover:bg-green-600 shadow-sm text-sm font-bold">✓</button>
                            <button @click="cancelSkillEdit" class="bg-gray-200 text-gray-600 w-6 h-6 rounded flex items-center justify-center hover:bg-gray-300 shadow-sm text-sm font-bold">✕</button>
                        </div>
                    </div>
                </template>
              </div>
            </template>
          </draggable>
        </div>

        <!-- Add Skill Form -->
        <div class="flex gap-2 items-center bg-[var(--obr-bg-paper)] p-2 rounded-lg border border-dashed border-[var(--obr-text-disabled)] hover:border-[var(--obr-primary-main)] transition-colors">
          <div class="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--obr-primary-main)] text-white font-bold text-sm shrink-0 shadow-sm">+</div>
          <input 
            v-model="newSkillName" 
            type="text" 
            placeholder="ADD NEW SKILL..."
            class="flex-1 bg-transparent outline-none px-1 py-1 text-sm font-bold text-[var(--obr-text-primary)] placeholder-[var(--obr-text-disabled)] uppercase tracking-wide"
            @keyup.enter="handleAddSkill"
          />
          <input 
            v-model.number="newSkillRank" 
            type="number" 
            min="1" 
            max="10"
            class="w-10 bg-[var(--obr-bg-default)] border border-[var(--obr-text-disabled)] border-opacity-30 rounded px-1 py-1 text-center text-sm font-bold text-[var(--obr-text-primary)] outline-none focus:border-[var(--obr-primary-main)]"
            @keyup.enter="handleAddSkill"
          />
          <button 
            @click="handleAddSkill"
            class="text-[var(--obr-primary-main)] hover:bg-[var(--obr-primary-main)] hover:text-white rounded px-2 py-1 text-xs font-black uppercase transition-colors"
          >Save</button>
        </div>

        <div class="mt-4 pt-2 flex justify-end">
           <button 
              v-if="isGm"
              @click="handleDelete" 
              class="text-[10px] font-black uppercase text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
           >
              <span>🗑 Delete File</span>
           </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sortable-ghost {
  opacity: 0.5;
  background: var(--obr-bg-default);
  border: 1px dashed var(--obr-primary-main);
}
.sortable-ghost * {
  opacity: 0;
}

.sortable-drag {
  background: var(--obr-bg-paper);
  opacity: 1;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: scale(1.02);
  z-index: 50;
  border: 1px solid var(--obr-primary-main);
}
</style>
