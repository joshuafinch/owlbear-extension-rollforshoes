<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Skill } from '../types';

const props = defineProps<{
  skill: Skill;
  isManageMode: boolean;
  isDeleting: boolean;
  color?: string;
}>();

const emit = defineEmits<{
  (e: 'roll', skill: Skill): void;
  (e: 'remove'): void;
  (e: 'update', updates: Partial<Skill>): void;
}>();

const isEditing = ref(false);
const editSkillName = ref('');
const editSkillRank = ref(1);
const editSkillInput = ref<HTMLTextAreaElement | null>(null);
const showRankPicker = ref(false);

const startEditing = async () => {
  if (!props.isManageMode) return;
  
  isEditing.value = true;
  showRankPicker.value = false;
  editSkillName.value = props.skill.name;
  editSkillRank.value = props.skill.rank;
  await nextTick();
  editSkillInput.value?.focus();
};

const saveEdit = () => {
  if (!editSkillName.value.trim()) return;
  emit('update', {
    name: editSkillName.value,
    rank: editSkillRank.value
  });
  isEditing.value = false;
  showRankPicker.value = false;
};

const cancelEdit = () => {
  isEditing.value = false;
  showRankPicker.value = false;
};

const selectRank = (rank: number) => {
    editSkillRank.value = rank;
    showRankPicker.value = false;
};

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
    }
    if (e.key === 'Escape') {
        if (showRankPicker.value) {
            showRankPicker.value = false;
        } else {
            cancelEdit();
        }
    }
};
</script>

<template>
  <div 
    class="relative flex items-center bg-[var(--obr-surface-card)] p-2 rounded border transition-all mb-2 select-none overflow-visible skill-item-root"
    :class="isManageMode ? 'border-[var(--obr-primary-main)] border-dashed bg-[var(--obr-surface-base)]' : 'border-[var(--obr-border-subtle)] border-opacity-30 hover:shadow-sm'"
    :style="!isManageMode && color ? { '--hover-border-color': color } : {}"
  >
    <!-- Drag Handle (Only in Manage Mode AND NOT Editing) -->
    <div 
      v-if="isManageMode && !isEditing"
      class="drag-handle cursor-grab active:cursor-grabbing text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] px-2 mr-1 flex items-center justify-center shrink-0"
    >
      <span class="text-xs font-black leading-none">⋮⋮</span>
    </div>

    <!-- View Mode -->
    <template v-if="!isEditing">
        
        <!-- Skill Name -->
        <div 
           class="flex-1 min-w-0 pr-2 py-1" 
           :class="isManageMode ? 'cursor-pointer hover:text-[var(--obr-primary-main)]' : ''"
           @click="startEditing"
           :title="isManageMode ? 'Click to edit name' : ''"
       >
             <span class="font-bold text-[var(--obr-text-primary)] block leading-tight text-base break-words whitespace-normal">{{ skill.name }}</span>
        </div>

        <!-- Actions Group -->
        <div class="flex items-center gap-2 shrink-0">
            
            <!-- Combined Roll/Rank Button (Normal Mode) -->
            <button 
               v-if="!isManageMode"
               @click.stop="emit('roll', skill)"
               class="h-9 min-w-[42px] px-1 flex flex-col items-center justify-center bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] rounded shadow-sm hover:shadow-md active:translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)] skill-roll-btn"
               :style="{ '--btn-hover-bg': color || 'var(--obr-primary-main)' }"
               :aria-label="`Roll ${skill.rank} dice`"
               title="Click to Roll"
            >
               <span class="text-lg font-black leading-none mt-0.5">{{ skill.rank }}</span>
               <span class="text-[8px] font-black uppercase tracking-wider leading-none">Roll</span>
            </button>

           <!-- Rank Badge (Manage Mode) -->
           <div 
              v-else
              class="h-9 min-w-[42px] px-1 flex flex-col items-center justify-center bg-[var(--obr-surface-base)] border-2 border-[var(--obr-border-subtle)] text-[var(--obr-text-primary)] rounded transition-colors group/rank cursor-pointer hover:border-[var(--obr-primary-main)]"
              @click="startEditing"
              title="Click to edit rank"
           >
              <span class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)] leading-none mb-0.5">Rank</span>
              <span class="text-base font-black leading-none group-hover/rank:text-[var(--obr-primary-main)]">{{ skill.rank }}</span>
           </div>
        </div>

        <!-- Delete Button (Only in Manage Mode) -->
        <div v-if="isManageMode" class="ml-2 flex justify-end shrink-0">
           <button 
              @click="emit('remove')"
              class="h-9 flex items-center justify-center rounded transition-all focus:outline-none focus:ring-2 focus:ring-[var(--obr-status-danger)]"
              :class="isDeleting ? 'bg-[var(--obr-status-danger)] text-white shadow-sm px-3 w-auto' : 'w-8 text-[var(--obr-text-disabled)] hover:text-[var(--obr-status-danger)] hover:bg-red-100'"
              :aria-label="isDeleting ? 'Confirm remove skill' : `Remove skill ${skill.name}`"
              :title="isDeleting ? 'Click again to confirm' : 'Remove Skill'"
           >
              <span v-if="isDeleting" aria-hidden="true" class="text-xs font-bold uppercase whitespace-nowrap">Confirm</span>
              <span v-else aria-hidden="true" class="text-xl leading-none">×</span>
           </button>
        </div>
    </template>

    <template v-else>
        <div class="flex items-start gap-2 w-full z-10 bg-[var(--obr-surface-card)] p-1 -m-0.5 rounded ring-2 ring-[var(--obr-primary-main)] shadow-lg relative">
            <textarea 
              ref="editSkillInput"
              v-model="editSkillName"
              rows="2"
              class="flex-1 min-w-0 bg-transparent text-[var(--obr-text-primary)] font-bold px-2 py-1 text-base focus:outline-none resize-y"
              @keydown="handleKeydown"
              placeholder="SKILL NAME"
            ></textarea>
            
            <div class="flex flex-col items-center border-l border-[var(--obr-border-subtle)] border-opacity-30 pl-2 shrink-0 relative">
                <!-- Rank Button (Mimics the normal view rank badge) -->
                <button 
                    @click="showRankPicker = !showRankPicker"
                    class="h-[36px] min-w-[36px] px-1 flex flex-col items-center justify-center bg-[var(--obr-surface-base)] border-2 border-[var(--obr-border-subtle)] text-[var(--obr-text-primary)] rounded transition-colors hover:border-[var(--obr-primary-main)]"
                    title="Change Rank"
                >
                    <span class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)] leading-none mb-0.5">Rank</span>
                    <span class="text-base font-black leading-none">{{ editSkillRank }}</span>
                </button>
                
                <!-- Rank Picker Dropdown -->
                <div v-if="showRankPicker" class="absolute top-full right-0 mt-1 bg-[var(--obr-surface-card)] border border-[var(--obr-border-subtle)] rounded shadow-xl z-50 w-[160px] p-2 grid grid-cols-5 gap-1">
                    <button 
                        v-for="r in 10" 
                        :key="r"
                        @click="selectRank(r)"
                        class="h-8 w-full flex items-center justify-center rounded hover:bg-[var(--obr-primary-main)] hover:text-[var(--obr-primary-contrast)] font-bold text-sm transition-colors"
                        :class="r === editSkillRank ? 'bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)]' : 'bg-[var(--obr-surface-base)] text-[var(--obr-text-primary)]'"
                    >
                        {{ r }}
                    </button>
                </div>
            </div>

           <div class="flex flex-col gap-1 pl-1 shrink-0">
               <button @click="saveEdit" class="bg-[var(--obr-status-success)] text-white w-7 h-7 rounded flex items-center justify-center hover:opacity-90 shadow-sm text-sm font-bold" title="Save">✓</button>
               <button @click="cancelEdit" class="bg-[var(--obr-surface-base)] text-[var(--obr-text-primary)] w-7 h-7 rounded flex items-center justify-center hover:text-[var(--obr-text-disabled)] shadow-sm text-sm font-bold" title="Cancel">✕</button>
           </div>
       </div>
    </template>
  </div>
</template>

<style scoped>
.skill-item-root:hover {
    border-color: var(--hover-border-color, var(--obr-border-base));
}
.skill-roll-btn:hover {
    background-color: var(--btn-hover-bg);
}
</style>
