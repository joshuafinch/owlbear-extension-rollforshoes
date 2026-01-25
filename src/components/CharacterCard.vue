<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
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
  (e: 'updateName', id: string, name: string): void;
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

const isEditingName = ref(false);
const editNameValue = ref('');
const editNameInput = ref<HTMLInputElement | null>(null);

const startEditingName = async () => {
    editNameValue.value = props.character.name;
    isEditingName.value = true;
    await nextTick();
    editNameInput.value?.focus();
};

const saveNameEdit = () => {
    if (!editNameValue.value.trim()) {
        isEditingName.value = false;
        return;
    }
    emit('updateName', props.character.id, editNameValue.value);
    isEditingName.value = false;
};

const cancelNameEdit = () => {
    isEditingName.value = false;
};

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

const isManageMode = ref(false);

const handleAddSkill = (name: string) => {
  if (!name.trim()) return;
  emit('addSkill', props.character.id, {
    name: name.toUpperCase(),
    rank: newSkillRank.value
  });
  newSkillRank.value = 2; 
  // Keep adding mode active if desired, or reset
  // isAddingSkill.value = false; 
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

const editSkillInput = ref<HTMLInputElement | null>(null);

const startEditingSkill = async (index: number, skill: Skill) => {
    editingSkillIndex.value = index;
    editSkillName.value = skill.name;
    editSkillRank.value = skill.rank;
    await nextTick();
    editSkillInput.value?.focus();
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

// XP Animation Logic
const isXpAnimating = ref(false);
const xpDiff = ref(0);

// Watch for external XP changes (e.g. from rolls)
watch(() => props.character.xp, (newVal, oldVal) => {
    const diff = newVal - oldVal;
    if (diff !== 0) {
        triggerXpAnimation(diff);
    }
});

const triggerXpAnimation = (diff: number) => {
    xpDiff.value = diff;
    isXpAnimating.value = true;
    
    // Clear animation after delay
    setTimeout(() => {
        isXpAnimating.value = false;
        xpDiff.value = 0;
    }, 1000);
};

const handleXpChange = (amount: number) => {
    emit('addXp', props.character.id, amount);
    // Animation is handled by the watcher
};
</script>

<template>
  <div 
    class="bg-[var(--obr-bg-paper)] backdrop-blur-xl rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-0 mb-4 border-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden"
    :class="isActive ? 'border-[var(--obr-primary-main)] ring-2 ring-[var(--obr-primary-main)]/50' : 'border-[var(--obr-text-primary)]'"
  >
    
    <!-- Header / Summary View -->
    <div class="p-3 bg-gradient-to-r from-[var(--obr-bg-default)] to-[var(--obr-bg-paper)] transition-all duration-300" :class="isExpanded ? 'pb-4' : ''">
      <div class="flex items-center justify-between gap-2">
        
        <!-- Name & Toggle -->
        <button 
          class="flex items-center gap-3 cursor-pointer select-none group flex-1 min-w-0 text-left focus:outline-none rounded p-1 -ml-1 z-10" 
          @click="isExpanded = !isExpanded"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? `Collapse character sheet for ${character.name}` : `Expand character sheet for ${character.name}`"
        >
           <div 
             class="shrink-0 flex items-center justify-center bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] rounded-full font-black border-2 border-[var(--obr-bg-paper)] shadow-sm transform transition-all duration-300 origin-left" 
             :class="isExpanded ? 'w-12 h-12 scale-125' : 'w-10 h-10 group-hover:scale-110'"
             aria-hidden="true"
            >
              <img v-if="character.imageUrl" :src="character.imageUrl" class="w-full h-full object-cover" :alt="character.name" />
              <span v-else class="text-[var(--obr-bg-paper)] font-bold" :class="isExpanded ? 'text-2xl' : 'text-lg'">{{ character.name.charAt(0).toUpperCase() }}</span>
           </div>
           <div class="flex flex-col min-w-0 transition-all duration-300 origin-left" :class="{'translate-x-2 scale-110': isExpanded}">
              
              <!-- Name Display / Edit Mode -->
              <div v-if="!isEditingName" 
                   @click.stop="isExpanded ? startEditingName() : null" 
                   class="group/name relative"
                   :class="isExpanded ? 'cursor-pointer' : ''"
                   :title="isExpanded ? 'Click to edit name' : ''"
              >
                  <h3 
                    class="font-black text-[var(--obr-text-primary)] uppercase tracking-tight leading-none group-hover:text-[var(--obr-primary-main)] transition-colors duration-300 truncate pr-1"
                    :class="isExpanded ? 'text-xl' : 'text-xl'"
                  >
                    {{ character.name }}
                    <span v-if="isExpanded" class="opacity-0 group-hover/name:opacity-100 text-[10px] text-[var(--obr-text-disabled)] ml-1 absolute top-0 -right-4 transition-opacity">✎</span>
                  </h3>
              </div>
              
              <div v-else class="flex items-center" @click.stop>
                   <input 
                      ref="editNameInput"
                      v-model="editNameValue"
                      type="text"
                      class="bg-[var(--obr-bg-paper)] text-[var(--obr-text-primary)] font-black uppercase tracking-tight leading-none border-b-2 border-[var(--obr-primary-main)] focus:outline-none w-full min-w-[150px] text-xl"
                      @keyup.enter="saveNameEdit"
                      @keyup.esc="cancelNameEdit"
                      @blur="saveNameEdit"
                    />
              </div>

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
        
          <!-- Animated XP Widget -->
        <div 
            class="flex shrink-0 items-center bg-[var(--obr-bg-default)] rounded border-2 border-[var(--obr-text-primary)] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-300 overflow-hidden relative group/xp"
            :class="[isExpanded ? 'p-1 gap-1' : 'px-2 py-1 gap-0', isXpAnimating ? 'ring-2 ring-yellow-400 border-yellow-500 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : '']"
            role="group" 
            aria-label="Experience Points"
        >
          <!-- Decrease Button -->
          <button 
              @click.stop="handleXpChange(-1)"
              :disabled="character.xp <= 0"
              class="flex items-center justify-center rounded bg-[var(--obr-bg-paper)] hover:bg-red-500 hover:text-white text-[var(--obr-text-primary)] font-bold transition-all duration-300 overflow-hidden"
              :class="isExpanded ? 'w-8 h-8 opacity-100 mr-2 border border-[var(--obr-text-disabled)]' : 'w-0 h-8 opacity-0 border-0'"
              aria-label="Decrease XP"
              :tabindex="isExpanded ? 0 : -1"
            >-</button>

          <!-- Label -->
          <div class="flex flex-col items-center mr-2 border-r border-[var(--obr-text-disabled)] border-opacity-30 pr-2" aria-hidden="true">
             <span class="text-[10px] font-black uppercase text-[var(--obr-text-secondary)] leading-none transition-colors" :class="isXpAnimating ? 'text-yellow-600' : ''">XP</span>
          </div>
          
          <!-- Value -->
          <span 
              class="font-mono font-black text-xl text-[var(--obr-text-primary)] transition-all duration-300" 
              :class="isXpAnimating ? 'text-yellow-600 scale-125' : ''"
              aria-live="polite"
           >{{ character.xp }}</span>

          <!-- Increase Button -->
          <button 
              @click.stop="handleXpChange(1)"
              class="flex items-center justify-center rounded bg-[var(--obr-bg-paper)] hover:bg-green-500 hover:text-white text-[var(--obr-text-primary)] font-bold transition-all duration-300 overflow-hidden"
              :class="isExpanded ? 'w-8 h-8 opacity-100 ml-2 border border-[var(--obr-text-disabled)]' : 'w-0 h-8 opacity-0 border-0'"
              aria-label="Increase XP"
              :tabindex="isExpanded ? 0 : -1"
            >+</button>

            <!-- Floating XP Gain Animation -->
            <transition name="float-up">
                <div v-if="xpDiff !== 0" 
                     class="absolute top-0 right-0 left-0 bottom-0 pointer-events-none flex items-center justify-center font-black text-xl z-20"
                     :class="xpDiff > 0 ? 'text-green-600' : 'text-red-500'"
                >
                    {{ xpDiff > 0 ? '+' : '' }}{{ xpDiff }}
                </div>
            </transition>
        </div>
      </div>
    </div>
    
    <!-- Expanded Details -->
    <transition name="expand">
      <div v-if="isExpanded" class="border-t-2 border-[var(--obr-text-primary)] bg-[var(--obr-bg-default)] bg-opacity-50 overflow-hidden">
        
       <!-- Actions Bar (Expanded State) -->
       <div v-if="canLink" class="px-3 pt-3 flex justify-end">

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
      
        <!-- Skills Section -->
       <div class="p-3">
         <div class="flex justify-between items-center mb-3 border-b-2 border-[var(--obr-text-disabled)] border-opacity-20 pb-1">
             <h4 class="text-sm font-black text-[var(--obr-text-primary)] uppercase tracking-widest">Skills</h4>
             
             <button 
                @click="isManageMode = !isManageMode"
                class="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1"
                :class="isManageMode ? 'bg-[var(--obr-primary-main)] text-white' : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-bg-default)]'"
             >
                <span v-if="isManageMode">Done</span>
                <span v-else>Manage</span>
             </button>
         </div>
         
         <div class="space-y-2 mb-4">
           <draggable 
             v-model="draggableSkills" 
             item-key="name" 
             handle=".drag-handle"
             :disabled="!isManageMode"
             ghost-class="sortable-ghost"
             drag-class="sortable-drag"
             :animation="200"
             :force-fallback="true"
             :fallback-tolerance="3"
             :fallback-on-body="true"
           >
             <template #item="{ element: skill, index }">
               <div 
                 class="relative flex items-center bg-[var(--obr-bg-paper)] p-2 rounded border transition-all mb-2 select-none overflow-hidden"
                 :class="isManageMode ? 'border-[var(--obr-primary-main)] border-dashed bg-[var(--obr-bg-default)]' : 'border-[var(--obr-text-disabled)] border-opacity-30 hover:border-[var(--obr-text-primary)] hover:shadow-sm'"
               >
                 <!-- Drag Handle (Only in Manage Mode) -->
                 <div 
                   v-if="isManageMode"
                   class="drag-handle cursor-grab active:cursor-grabbing text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] px-2 mr-1 flex items-center justify-center shrink-0"
                 >
                   <span class="text-xs font-black leading-none">⋮⋮</span>
                 </div>
 
                 <!-- View Mode -->
                 <template v-if="editingSkillIndex !== index">
                     
                     <!-- Skill Name -->
                     <div 
                        class="flex-1 min-w-0 pr-2" 
                        :class="isManageMode ? 'cursor-pointer hover:text-[var(--obr-primary-main)]' : ''"
                        @click="isManageMode ? startEditingSkill(index, skill) : null"
                        :title="isManageMode ? 'Click to edit name' : ''"
                    >
                          <span class="font-bold text-[var(--obr-text-primary)] block leading-tight uppercase text-base truncate">{{ skill.name }}</span>
                     </div>
 
                     <!-- Actions Group -->
                     <div class="flex items-center gap-2 shrink-0">
                         
                         <!-- Roll Button (Only in Normal Mode) -->
                         <button 
                            v-if="!isManageMode"
                            @click.stop="emit('roll', character.id, skill)"
                            class="h-9 px-3 flex items-center gap-1.5 bg-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)] text-white rounded shadow-sm hover:shadow-md active:translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)]"
                            :aria-label="`Roll ${skill.rank} dice for ${skill.name}`"
                            title="Roll Dice"
                         >
                            <span aria-hidden="true" class="text-lg leading-none">🎲</span>
                            <span class="text-xs font-black uppercase tracking-wider leading-none">Roll</span>
                         </button>
 
                        <!-- Rank Badge -->
                        <div 
                           class="h-9 min-w-[36px] px-1 flex flex-col items-center justify-center bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-disabled)] text-[var(--obr-text-primary)] rounded transition-colors group/rank"
                           :class="isManageMode ? 'cursor-pointer hover:border-[var(--obr-primary-main)]' : ''"
                           @click="isManageMode ? startEditingSkill(index, skill) : null"
                           :title="isManageMode ? 'Click to edit rank' : ''"
                        >
                           <span class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)] leading-none mb-0.5">Rank</span>
                           <span class="text-base font-black leading-none" :class="isManageMode ? 'group-hover/rank:text-[var(--obr-primary-main)]' : ''">{{ skill.rank }}</span>
                        </div>
                     </div>
 
                     <!-- Delete Button (Only in Manage Mode) -->
                     <div v-if="isManageMode" class="ml-2 flex justify-end shrink-0">
                        <button 
                           @click="handleRemoveSkill(index)"
                           class="h-9 flex items-center justify-center rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                           :class="deletingSkillIndex === index ? 'bg-red-500 text-white shadow-sm px-3 w-auto' : 'w-8 text-[var(--obr-text-disabled)] hover:text-red-500 hover:bg-red-100'"
                           :aria-label="deletingSkillIndex === index ? 'Confirm remove skill' : `Remove skill ${skill.name}`"
                           :title="deletingSkillIndex === index ? 'Click again to confirm' : 'Remove Skill'"
                        >
                           <span v-if="deletingSkillIndex === index" aria-hidden="true" class="text-xs font-bold uppercase whitespace-nowrap">Confirm</span>
                           <span v-else aria-hidden="true" class="text-xl leading-none">×</span>
                        </button>
                     </div>
                 </template>
 
                 <!-- Edit Mode (Inside Manage Mode) -->
                 <template v-else>
                     <div class="flex items-center gap-2 w-full z-10 bg-[var(--obr-bg-paper)] p-0.5 -m-0.5 rounded ring-2 ring-[var(--obr-primary-main)] shadow-lg">
                         <input 
                           ref="editSkillInput"
                           v-model="editSkillName"
                           type="text"
                           class="flex-1 bg-transparent text-[var(--obr-text-primary)] font-bold px-2 py-1 text-base focus:outline-none uppercase"
                           @keyup.enter="saveSkillEdit(index)"
                           @keyup.esc="cancelSkillEdit"
                           placeholder="SKILL NAME"
                         />
                         <div class="flex flex-col items-center border-l border-[var(--obr-text-disabled)] border-opacity-30 pl-2">
                             <label class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)]">Rank</label>
                             <input 
                             v-model.number="editSkillRank"
                             type="number"
                             min="1"
                             max="10"
                             class="w-12 bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)] border border-[var(--obr-text-disabled)] rounded px-1 py-0 text-center text-sm font-bold focus:outline-none focus:border-[var(--obr-primary-main)]"
                             @keyup.enter="saveSkillEdit(index)"
                             />
                         </div>
                         <div class="flex gap-1 pl-1">
                             <button @click="saveSkillEdit(index)" class="bg-green-500 text-white w-7 h-7 rounded flex items-center justify-center hover:bg-green-600 shadow-sm text-sm font-bold" title="Save">✓</button>
                             <button @click="cancelSkillEdit" class="bg-gray-200 text-gray-600 w-7 h-7 rounded flex items-center justify-center hover:bg-gray-300 shadow-sm text-sm font-bold" title="Cancel">✕</button>
                         </div>
                     </div>
                 </template>
               </div>
             </template>
           </draggable>
         </div>
 
         <!-- Add Skill Form (Only in Manage Mode) -->
         <CreationRow
             v-if="isManageMode"
             :active="true"
             placeholder="ADD NEW SKILL..."
             buttonText="Add New Skill"
             @submit="handleAddSkill"
             @cancel="isManageMode = false"
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
    </transition>
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

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-out;
  transform-origin: top center;
  max-height: 500px; /* Arbitrary large height */
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.95);
  max-height: 0;
}

/* XP Float Animation */
.float-up-enter-active {
  transition: all 0.5s ease-out;
}
.float-up-leave-active {
  transition: all 0.5s ease-in;
  opacity: 0;
}
.float-up-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.5);
}
.float-up-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1.5);
}
.float-up-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1);
}
</style>
