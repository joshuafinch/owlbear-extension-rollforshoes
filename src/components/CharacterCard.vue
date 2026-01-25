<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import draggable from 'vuedraggable';
import type { Character, Skill } from '../types';
import CreationRow from './common/CreationRow.vue';

const props = defineProps<{
  character: Character;
  selectedTokenIds: string[];
  role: string;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'addXp', id: string, amount: number): void;
  (e: 'addSkill', id: string, skill: Skill): void;
  (e: 'updateSkill', id: string, index: number, skill: Partial<Skill>): void;
  (e: 'removeSkill', id: string, index: number): void;
  (e: 'reorderSkills', id: string, skills: Skill[]): void;
  (e: 'link', id: string | null): void;
  (e: 'delete', id: string): void;
  (e: 'roll', id: string, skill: Skill): void;
}>();

const isExpanded = ref(false);

// Auto-expand when active
watch(() => props.isActive, (active) => {
    if (active) {
        isExpanded.value = true;
    }
});

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

const isAddingSkill = ref(false);

const handleAddSkill = (name: string) => {
  if (!name.trim()) return;
  emit('addSkill', props.character.id, {
    name: name.toUpperCase(),
    rank: newSkillRank.value
  });
  newSkillRank.value = 2; // Reset to 2 as it's the most common next step
  isAddingSkill.value = false;
};

const isDeleting = ref(false);

const handleDelete = () => {
  if (isDeleting.value) {
    emit('delete', props.character.id);
  } else {
    isDeleting.value = true;
    setTimeout(() => {
        isDeleting.value = false;
    }, 3000);
  }
};

const deletingSkillIndex = ref<number | null>(null);

const handleRemoveSkill = (index: number) => {
    if (deletingSkillIndex.value === index) {
        emit('removeSkill', props.character.id, index);
        deletingSkillIndex.value = null;
    } else {
        deletingSkillIndex.value = index;
        setTimeout(() => {
            if (deletingSkillIndex.value === index) {
                deletingSkillIndex.value = null;
            }
        }, 3000);
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
  <div 
    class="bg-[var(--obr-bg-paper)] backdrop-blur-xl rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-0 mb-4 border-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden"
    :class="isActive ? 'border-[var(--obr-primary-main)] ring-2 ring-[var(--obr-primary-main)]/50' : 'border-[var(--obr-text-primary)]'"
  >
    
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
           <div class="w-10 h-10 shrink-0 flex items-center justify-center bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] rounded-full font-black border-2 border-[var(--obr-bg-paper)] shadow-sm transform transition-transform group-hover:scale-110 overflow-hidden" aria-hidden="true">
              <img v-if="character.imageUrl" :src="character.imageUrl" class="w-full h-full object-cover" :alt="character.name" />
              <span v-else class="text-[var(--obr-bg-paper)] text-lg font-bold">{{ character.name.charAt(0).toUpperCase() }}</span>
           </div>
           <div class="flex flex-col min-w-0">
              <h3 class="font-black text-xl text-[var(--obr-text-primary)] uppercase tracking-tight leading-none group-hover:text-[var(--obr-primary-main)] transition-colors truncate">{{ character.name }}</h3>
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
             <div v-if="canLink" class="flex gap-2">
                 <button 
                    v-if="isActive"
                    @click="emit('link', null)"
                    class="text-xs font-bold uppercase text-[var(--obr-text-disabled)] hover:text-red-500 hover:underline flex items-center gap-1"
                >
                    <span>Unlink Token</span>
                </button>
                 <button 
                    @click="emit('link', character.id)"
                    class="text-xs font-bold uppercase text-[var(--obr-primary-main)] hover:underline flex items-center gap-1"
                >
                    <span>{{ isActive ? '🔄 Update Link' : '🔗 Link Token' }}</span>
                </button>
             </div>
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
                          @click="handleRemoveSkill(index)"
                          class="w-8 h-8 flex items-center justify-center rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
                          :class="deletingSkillIndex === index ? 'bg-red-500 text-white opacity-100 shadow-sm w-auto px-2' : 'text-[var(--obr-text-disabled)] hover:text-red-500 hover:bg-red-100 opacity-60 hover:opacity-100'"
                          :aria-label="deletingSkillIndex === index ? 'Confirm remove skill' : `Remove skill ${skill.name}`"
                          :title="deletingSkillIndex === index ? 'Click again to confirm' : 'Remove Skill'"
                       >
                          <span v-if="deletingSkillIndex === index" aria-hidden="true" class="text-xs font-bold uppercase whitespace-nowrap">Confirm Delete</span>
                          <span v-else aria-hidden="true">×</span>
                       </button>
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
        <CreationRow
            :active="isAddingSkill"
            placeholder="ADD NEW SKILL..."
            buttonText="Add New Skill"
            @submit="handleAddSkill"
            @cancel="isAddingSkill = false"
            @activate="isAddingSkill = true"
        >
            <template #extra-fields>
                 <div class="relative flex items-center" title="Initial Rank">
                    <span class="absolute left-2 text-[10px] font-black text-[var(--obr-text-disabled)] select-none">RK</span>
                    <input 
                        v-model.number="newSkillRank" 
                        type="number" 
                        min="1" 
                        max="10"
                        class="w-16 bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-disabled)] rounded pl-8 pr-1 py-2 text-center text-sm font-bold text-[var(--obr-text-primary)] outline-none focus:border-[var(--obr-primary-main)]"
                        placeholder="#"
                    />
                 </div>
            </template>
        </CreationRow>

        <div class="mt-4 pt-2 flex justify-end">
           <button 
              v-if="isGm"
              @click="handleDelete" 
              class="text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1 transition-all duration-200"
              :class="isDeleting ? 'bg-red-500 text-white hover:bg-red-600 shadow-md scale-105' : 'text-red-400 hover:text-red-600 hover:bg-red-50'"
           >
              <span v-if="isDeleting">CONFIRM DELETION</span>
              <span v-else>Delete File</span>
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
