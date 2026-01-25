<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import draggable from 'vuedraggable';
import type { Character, Skill } from '../types';
import CreationRow from './common/CreationRow.vue';
import SkillItem from './SkillItem.vue';
import { ROLE_GM, DEFAULT_NEW_SKILL_RANK, TACTICAL_PALETTE } from '../constants';

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
  (e: 'updateColor', id: string, color: string): void;
}>();

const isExpanded = ref(false);

// Auto-expand when active
watch(() => props.isActive, (active) => {
    if (active) {
        isExpanded.value = true;
    }
});

const newSkillRank = ref(DEFAULT_NEW_SKILL_RANK);

const isEditingName = ref(false);
const editNameValue = ref('');
const editNameInput = ref<HTMLInputElement | null>(null);

// Color Picker State
const showColorPicker = ref(false);
const cardColor = computed(() => props.character.color || TACTICAL_PALETTE[0]);

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

const handleColorSelect = (color: string) => {
    emit('updateColor', props.character.id, color);
    showColorPicker.value = false;
};

const canLink = computed(() => props.selectedTokenIds.length > 0);
const isGm = computed(() => props.role === ROLE_GM);

// Computed property for vuedraggable to handle skills array
const draggableSkills = computed({
  get: () => props.character.skills,
  set: (value: Skill[]) => {
     emit('reorderSkills', props.character.id, value);
  }
});

const isManageMode = ref(false);

const handleAddSkill = (name: string) => {
  if (!name.trim()) return;
  emit('addSkill', props.character.id, {
    name: name,
    rank: newSkillRank.value
  });
  newSkillRank.value = DEFAULT_NEW_SKILL_RANK; 
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

const handleUpdateSkill = (index: number, updates: Partial<Skill>) => {
  emit('updateSkill', props.character.id, index, updates);
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
    class="bg-[var(--obr-surface-card)] backdrop-blur-xl rounded-xl p-0 mb-4 border-2 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
    :class="isActive ? 'ring-2 ring-opacity-50 shadow-[0_0_25px_-5px_var(--card-shadow-hover)]' : 'shadow-[0_8px_16px_-6px_var(--card-shadow)] hover:shadow-[0_12px_24px_-6px_var(--card-shadow-hover)]'"
    :style="{ 
        '--card-accent': cardColor,
        '--card-shadow': `${cardColor}40`,
        '--card-shadow-hover': `${cardColor}80`,
        'borderColor': isActive ? cardColor : `${cardColor}66`,
        '--tw-ring-color': cardColor
    }"
  >
    <!-- Background Tint (Subtle) -->
    <div 
        class="absolute inset-0 pointer-events-none opacity-5 transition-colors duration-500"
        :style="{ backgroundColor: cardColor }"
    ></div>

    <!-- Header / Summary View -->
    <div 
        class="p-0 transition-all duration-300 relative z-20"
        :style="{ background: `linear-gradient(to right, ${cardColor}33, var(--obr-surface-card))` }"
    >
      <div class="flex items-center justify-between gap-2">
        
        <!-- Name & Toggle -->
        <button 
          class="flex items-center gap-3 cursor-pointer select-none group flex-1 min-w-0 text-left focus:outline-none rounded p-0 z-10" 
          :class="{ 'min-h-[4.5rem]': !character.imageUrl }"
          @click="isExpanded = !isExpanded"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? `Collapse character sheet for ${character.name}` : `Expand character sheet for ${character.name}`"
        >
           <div 
             v-if="character.imageUrl"
             class="shrink-0 flex items-center justify-center font-black transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden relative z-10 ml-1 mt-1" 
             :class="isExpanded ? 'w-24 h-24 text-[var(--obr-text-inverse)]' : 'w-16 h-16 group-hover:scale-105'"
             aria-hidden="true"
            >
              <img 
                 :src="character.imageUrl" 
                 class="w-full h-full object-cover object-top transition-transform duration-700 origin-top min-w-full min-h-full scale-100" 
                 :alt="character.name" 
               />
           </div>
           <div class="flex flex-col justify-center min-w-0 transition-all duration-300 origin-left pl-3">
               
               <!-- Name Display / Edit Mode (Collapsed State Only) -->
               <transition name="name-slide-header">
                 <div v-if="!isExpanded" class="absolute top-0 bottom-0 flex items-center z-20" :class="character.imageUrl ? 'left-[5.5rem]' : 'left-4'">
                     <div v-if="!isEditingName" 
                          class="group/name relative"
                     >
                         <div 
                             @click.stop="isExpanded = true" 
                             class="cursor-pointer"
                             title="Click to expand"
                          >
                             <h3 
                               class="font-black text-[var(--obr-text-primary)] tracking-tight leading-none group-hover:text-[var(--card-accent)] transition-all duration-300 truncate pr-1 origin-left text-2xl pb-1"
                             >
                               {{ character.name }}
                             </h3>
                         </div>
                     </div>
                 </div>
               </transition>

               <!-- Chevron (Collapsed Only) -->
               <transition name="fade">
                <span v-if="!isExpanded" class="text-xs font-bold text-[var(--obr-text-disabled)] uppercase tracking-wider flex items-center gap-1 group-hover:text-[var(--obr-text-secondary)] transition-colors absolute bottom-2" :class="character.imageUrl ? 'left-[5.5rem]' : 'left-4'">
                    <span class="text-[10px]">CLICK TO EXPAND</span>
                </span>
               </transition>
           </div>
        </button>
        
          <!-- Animated XP Widget -->
            <div 
             class="flex shrink-0 items-center bg-[var(--obr-surface-base)] rounded border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-300 overflow-hidden relative group/xp mr-2"
             :class="[isExpanded ? 'p-1 gap-1' : 'px-2 py-1 gap-0', isXpAnimating ? 'ring-2 ring-[var(--obr-status-warning)] border-[var(--obr-status-warning)] scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : '']"
             :style="{ borderColor: isXpAnimating ? '' : `${cardColor}66` }"
             role="group" 
             aria-label="Experience Points"
        >
          <!-- Decrease Button -->
          <button 
              @click.stop="handleXpChange(-1)"
              :disabled="character.xp <= 0"
              class="flex items-center justify-center rounded bg-[var(--obr-surface-card)] hover:bg-[var(--obr-status-danger)] hover:text-white text-[var(--obr-text-primary)] font-bold transition-all duration-300 overflow-hidden"
              :class="isExpanded ? 'w-8 h-8 opacity-100 mr-2 border border-[var(--obr-border-subtle)]' : 'w-0 h-8 opacity-0 border-0'"
              aria-label="Decrease XP"
              :tabindex="isExpanded ? 0 : -1"
            >-</button>

          <!-- Label -->
          <div class="flex flex-col items-center mr-2 border-r border-[var(--obr-border-subtle)] border-opacity-30 pr-2" aria-hidden="true">
             <span class="text-[10px] font-black uppercase text-[var(--obr-text-secondary)] leading-none transition-colors" :class="isXpAnimating ? 'text-[var(--obr-status-warning)]' : ''">XP</span>
          </div>
          
          <!-- Value -->
          <span 
              class="font-mono font-black text-xl text-[var(--obr-text-primary)] transition-all duration-300" 
              :class="isXpAnimating ? 'text-[var(--obr-status-warning)] scale-125' : ''"
              aria-live="polite"
           >{{ character.xp }}</span>

          <!-- Increase Button -->
          <button 
              @click.stop="handleXpChange(1)"
              class="flex items-center justify-center rounded bg-[var(--obr-surface-card)] hover:bg-[var(--obr-status-success)] hover:text-white text-[var(--obr-text-primary)] font-bold transition-all duration-300 overflow-hidden"
              :class="isExpanded ? 'w-8 h-8 opacity-100 ml-2 border border-[var(--obr-border-subtle)]' : 'w-0 h-8 opacity-0 border-0'"
              aria-label="Increase XP"
              :tabindex="isExpanded ? 0 : -1"
            >+</button>

            <!-- Floating XP Gain Animation -->
            <transition name="float-up">
                <div v-if="xpDiff !== 0" 
                     class="absolute top-0 right-0 left-0 bottom-0 pointer-events-none flex items-center justify-center font-black text-xl z-20"
                     :class="xpDiff > 0 ? 'text-[var(--obr-status-success)]' : 'text-[var(--obr-status-danger)]'"
                >
                    {{ xpDiff > 0 ? '+' : '' }}{{ xpDiff }}
                </div>
            </transition>
        </div>
      </div>
    </div>
    
    <!-- Expanded Details -->
    <transition name="expand">
      <div v-if="isExpanded" class="border-t-2 bg-[var(--obr-surface-base)] bg-opacity-90 overflow-hidden relative" :style="{ borderColor: cardColor }">
        
        <!-- Background Artwork -->
        <div v-if="character.imageUrl" class="absolute inset-0 z-0 pointer-events-none flex items-end justify-center opacity-10 grayscale">
             <img 
               :src="character.imageUrl" 
               class="h-full w-full object-contain object-bottom scale-x-[-1]" 
               alt="" 
             />
        </div>

       <!-- Actions Bar (Expanded State) -->
       <div class="px-3 pt-3 flex justify-between items-center relative z-10 min-h-[48px]">
            <!-- Name (Expanded Mode Only) -->
            <transition name="name-slide-expanded">
                <div v-if="isExpanded" 
                   class="group/name relative cursor-pointer flex-1"
                >
                    <div 
                       v-if="!isEditingName"
                       @click.stop="startEditingName()" 
                       title="Click to edit name"
                    >
                        <h3 
                            class="font-black text-[var(--obr-text-primary)] tracking-tight leading-none group-hover:text-[var(--card-accent)] transition-colors duration-300 text-3xl pb-1"
                        >
                            {{ character.name }}
                            <span class="opacity-0 group-hover/name:opacity-100 text-[10px] text-[var(--obr-text-disabled)] ml-1 absolute top-0 -right-4 transition-opacity">✎</span>
                        </h3>
                    </div>
                    <div v-else class="flex items-center" @click.stop>
                       <input 
                          ref="editNameInput"
                          v-model="editNameValue"
                          type="text"
                          class="bg-[var(--obr-surface-input)] text-[var(--obr-text-primary)] font-black tracking-tight leading-none border-b-2 focus:outline-none w-full min-w-[150px] text-3xl"
                          :style="{ borderColor: cardColor }"
                          @keyup.enter="saveNameEdit"
                          @keyup.esc="cancelNameEdit"
                          @blur="saveNameEdit"
                        />
                    </div>
                </div>
            </transition>
            
            <div v-if="!isExpanded" class="flex-1"></div>

            <div class="flex gap-2 items-center">
                <!-- Color Picker Toggle -->
                 <div class="relative">
                    <button 
                        v-if="isExpanded"
                        @click.stop="showColorPicker = !showColorPicker"
                        class="w-6 h-6 rounded border border-[var(--obr-border-subtle)] shadow-sm hover:scale-110 transition-transform flex items-center justify-center overflow-hidden bg-[var(--obr-surface-card)]"
                        title="Set Tactical Color"
                        :class="{ 'ring-2 ring-[var(--obr-primary-main)]': showColorPicker }"
                    >
                        <div class="w-full h-full opacity-80" :style="{ backgroundColor: cardColor }"></div>
                    </button>
                 </div>

                 <!-- Link Buttons -->
                 <div v-if="canLink" class="flex gap-2">
                    <button 
                        v-if="isActive"
                        @click="emit('link', null)"
                        class="text-xs font-bold uppercase text-[var(--obr-text-disabled)] hover:text-[var(--obr-status-danger)] hover:underline flex items-center gap-1"
                    >
                        <span>Unlink Token</span>
                    </button>
                    <button 
                        @click="emit('link', character.id)"
                        class="text-xs font-bold uppercase hover:underline flex items-center gap-1 transition-colors"
                        :style="{ color: cardColor }"
                    >
                        <span>{{ isActive ? '🔄 Update Link' : '🔗 Link Token' }}</span>
                    </button>
                </div>
            </div>
       </div>

       <!-- Color Picker Drawer (Inline) -->
       <transition name="expand">
        <div v-if="showColorPicker && isExpanded" class="bg-[var(--obr-surface-base)] border-y border-[var(--obr-border-subtle)] border-dashed py-2 px-3 flex flex-wrap gap-2 justify-end relative z-10 shadow-inner">
             <div class="w-full text-[10px] font-black uppercase text-[var(--obr-text-disabled)] text-right mb-1">Select Tactical Color</div>
             <button 
                v-for="color in TACTICAL_PALETTE" 
                :key="color"
                @click.stop="handleColorSelect(color)"
                class="w-6 h-6 rounded-sm border border-transparent hover:scale-125 focus:scale-125 focus:outline-none focus:ring-2 focus:ring-[var(--obr-text-primary)] focus:z-10 transition-transform"
                :class="{ 'ring-2 ring-offset-1 ring-[var(--obr-text-primary)]': color === cardColor }"
                :style="{ backgroundColor: color }"
                :aria-label="`Select color ${color}`"
            ></button>
        </div>
       </transition>
      
        <!-- Skills Section -->
       <div class="p-3 relative z-10">
         <div class="flex justify-between items-center mb-3 border-b-2 border-[var(--obr-border-subtle)] border-opacity-20 pb-1">
             <h4 class="text-sm font-black text-[var(--obr-text-primary)] uppercase tracking-widest">Skills</h4>
             
             <button 
                @click="isManageMode = !isManageMode"
                class="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1"
                :class="isManageMode ? 'bg-[var(--obr-primary-main)] text-white' : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-base)]'"
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
                 <div>
                   <SkillItem
                      :skill="skill"
                      :isManageMode="isManageMode"
                      :isDeleting="deletingSkillIndex === index"
                      :color="cardColor"
                      @roll="(s) => emit('roll', character.id, s)"
                      @remove="handleRemoveSkill(index)"
                      @update="(updates) => handleUpdateSkill(index, updates)"
                   />
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
                         class="w-16 bg-[var(--obr-surface-input)] border-2 border-[var(--obr-border-subtle)] rounded pl-8 pr-1 py-2 text-center text-sm font-bold text-[var(--obr-text-primary)] outline-none focus:border-[var(--obr-primary-main)]"
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
              :class="isDeleting ? 'bg-[var(--obr-status-danger)] text-white hover:opacity-90 shadow-md scale-105' : 'text-red-400 hover:text-[var(--obr-status-danger)] hover:bg-red-50'"
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
  background: var(--obr-surface-card);
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

/* Name Slide Animations */
/* Header Name: Exits by sliding DOWN into the body */
.name-slide-header-enter-active,
.name-slide-header-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.name-slide-header-enter-from,
.name-slide-header-leave-to {
  opacity: 0;
  transform: translateY(20px); 
}

/* Expanded Name: Enters by sliding UP from the header position */
.name-slide-expanded-enter-active,
.name-slide-expanded-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.1s; /* Slight delay to let the card expand first */
}
.name-slide-expanded-enter-from,
.name-slide-expanded-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>