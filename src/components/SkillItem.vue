<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Skill } from '../types';

const props = defineProps<{
  skill: Skill;
  isManageMode: boolean;
  isDeleting: boolean;
}>();

const emit = defineEmits<{
  (e: 'roll', skill: Skill): void;
  (e: 'remove'): void;
  (e: 'update', updates: Partial<Skill>): void;
}>();

const isEditing = ref(false);
const editSkillName = ref('');
const editSkillRank = ref(1);
const editSkillInput = ref<HTMLInputElement | null>(null);

const startEditing = async () => {
  if (!props.isManageMode) return;
  
  isEditing.value = true;
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
};

const cancelEdit = () => {
  isEditing.value = false;
};
</script>

<template>
  <div 
    class="relative flex items-center bg-[var(--obr-surface-card)] p-2 rounded border transition-all mb-2 select-none overflow-hidden"
    :class="isManageMode ? 'border-[var(--obr-primary-main)] border-dashed bg-[var(--obr-surface-base)]' : 'border-[var(--obr-border-subtle)] border-opacity-30 hover:border-[var(--obr-border-base)] hover:shadow-sm'"
  >
    <!-- Drag Handle (Only in Manage Mode) -->
    <div 
      v-if="isManageMode"
      class="drag-handle cursor-grab active:cursor-grabbing text-[var(--obr-text-disabled)] hover:text-[var(--obr-text-primary)] px-2 mr-1 flex items-center justify-center shrink-0"
    >
      <span class="text-xs font-black leading-none">⋮⋮</span>
    </div>

    <!-- View Mode -->
    <template v-if="!isEditing">
        
        <!-- Skill Name -->
        <div 
           class="flex-1 min-w-0 pr-2" 
           :class="isManageMode ? 'cursor-pointer hover:text-[var(--obr-primary-main)]' : ''"
           @click="startEditing"
           :title="isManageMode ? 'Click to edit name' : ''"
       >
             <span class="font-bold text-[var(--obr-text-primary)] block leading-tight text-base truncate">{{ skill.name }}</span>
        </div>

        <!-- Actions Group -->
        <div class="flex items-center gap-2 shrink-0">
            
            <!-- Roll Button (Only in Normal Mode) -->
            <button 
               v-if="!isManageMode"
               @click.stop="emit('roll', skill)"
               class="h-9 px-3 flex items-center gap-1.5 bg-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)] text-[var(--obr-text-inverse)] rounded shadow-sm hover:shadow-md active:translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)]"
               :aria-label="`Roll ${skill.rank} dice for ${skill.name}`"
               title="Roll Dice"
            >
               <span aria-hidden="true" class="text-lg leading-none">🎲</span>
               <span class="text-xs font-black uppercase tracking-wider leading-none">Roll</span>
            </button>

           <!-- Rank Badge -->
           <div 
              class="h-9 min-w-[36px] px-1 flex flex-col items-center justify-center bg-[var(--obr-surface-base)] border-2 border-[var(--obr-border-subtle)] text-[var(--obr-text-primary)] rounded transition-colors group/rank"
              :class="isManageMode ? 'cursor-pointer hover:border-[var(--obr-primary-main)]' : ''"
              @click="startEditing"
              :title="isManageMode ? 'Click to edit rank' : ''"
           >
              <span class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)] leading-none mb-0.5">Rank</span>
              <span class="text-base font-black leading-none" :class="isManageMode ? 'group-hover/rank:text-[var(--obr-primary-main)]' : ''">{{ skill.rank }}</span>
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

    <!-- Edit Mode (Inside Manage Mode) -->
    <template v-else>
        <div class="flex items-center gap-2 w-full z-10 bg-[var(--obr-surface-card)] p-0.5 -m-0.5 rounded ring-2 ring-[var(--obr-primary-main)] shadow-lg">
            <input 
              ref="editSkillInput"
              v-model="editSkillName"
              type="text"
              class="flex-1 bg-transparent text-[var(--obr-text-primary)] font-bold px-2 py-1 text-base focus:outline-none"
              @keyup.enter="saveEdit"
              @keyup.esc="cancelEdit"
              placeholder="SKILL NAME"
            />
            <div class="flex flex-col items-center border-l border-[var(--obr-border-subtle)] border-opacity-30 pl-2">
                <label class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)]">Rank</label>
                <input 
                v-model.number="editSkillRank"
                type="number"
                min="1"
                max="10"
                class="w-12 bg-[var(--obr-surface-input)] text-[var(--obr-text-primary)] border border-[var(--obr-border-subtle)] rounded px-1 py-0 text-center text-sm font-bold focus:outline-none focus:border-[var(--obr-primary-main)]"
                @keyup.enter="saveEdit"
                />
            </div>
           <div class="flex gap-1 pl-1">
               <button @click="saveEdit" class="bg-[var(--obr-status-success)] text-white w-7 h-7 rounded flex items-center justify-center hover:opacity-90 shadow-sm text-sm font-bold" title="Save">✓</button>
               <button @click="cancelEdit" class="bg-[var(--obr-surface-base)] text-[var(--obr-text-primary)] w-7 h-7 rounded flex items-center justify-center hover:text-[var(--obr-text-disabled)] shadow-sm text-sm font-bold" title="Cancel">✕</button>
           </div>
       </div>
   </template>
  </div>
</template>