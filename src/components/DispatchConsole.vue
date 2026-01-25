<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import CharacterCard from './CharacterCard.vue';
import type { Skill } from '../types';

const emit = defineEmits<{
  (e: 'roll', characterId: string, skill: Skill): void;
}>();

const { 
  characterList, 
  role,
  selectedItems,
  createCharacter, 
  addXp, 
  addSkill, 
  updateSkill,
  removeSkill,
  reorderSkills,
  linkSelectionToCharacter, 
  deleteCharacter,
} = useRollForShoes();

const newCharName = ref('');
const isCreating = ref(false);

const handleCreate = async () => {
  if (!newCharName.value.trim()) return;
  await createCharacter(newCharName.value);
  newCharName.value = '';
  isCreating.value = false;
};

const onRoll = (characterId: string, skill: Skill) => {
    emit('roll', characterId, skill);
};
</script>

<template>
  <div class="h-full flex flex-col">
      <!-- Action Bar -->
      <div class="flex justify-between items-end py-4 px-3 shrink-0 border-b-2 border-dashed border-[var(--obr-text-disabled)] border-opacity-30 mb-4">
         <h2 class="text-3xl font-black text-[var(--obr-text-primary)] uppercase tracking-tighter leading-none transform -rotate-1 origin-bottom-left">
            Personnel
            <span class="block text-[10px] font-bold tracking-widest text-[var(--obr-text-secondary)] not-italic mt-1 rotate-1 ml-1">Active Roster // Class-A</span>
         </h2>
      </div>
      
      <!-- Character List Container -->
      <div class="pb-20">
          <!-- Empty State -->
          <div v-if="characterList.length === 0 && !isCreating" class="h-64 flex flex-col items-center justify-center text-[var(--obr-text-disabled)] opacity-50 border-4 border-dashed border-[var(--obr-text-disabled)] rounded-xl m-4 bg-[var(--obr-bg-default)]">
            <div class="text-6xl mb-4 grayscale">📂</div>
            <p class="font-black uppercase text-xl tracking-widest">No Records Found</p>
            <p class="text-sm font-bold mt-2">Roster is currently empty.</p>
            <button 
                @click="isCreating = true"
                class="mt-6 bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)] px-6 py-3 rounded font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
            >
                Initialize First Recruit
            </button>
          </div>

          <!-- Character List -->
          <div class="px-2">
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
             @reorderSkills="reorderSkills"
             @link="linkSelectionToCharacter"
             @delete="deleteCharacter"
             @roll="onRoll"
           />
          </div>
           
           <!-- Create Form (Moved to bottom) -->
           <div v-if="isCreating" class="mx-2 mt-4 bg-[var(--obr-bg-paper)] p-4 rounded-lg border-2 border-[var(--obr-text-primary)] shadow-lg animate-fade-in-up shrink-0">
                <label class="block text-[10px] font-black text-[var(--obr-text-secondary)] uppercase mb-2 tracking-widest">New Recruit Codename</label>
                <div class="flex gap-2">
                <input 
                    v-model="newCharName"
                    type="text" 
                    class="flex-1 bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-disabled)] rounded px-3 py-3 text-base font-bold text-[var(--obr-text-primary)] focus:border-[var(--obr-primary-main)] outline-none uppercase tracking-wide"
                    placeholder="ENTER NAME..."
                    @keyup.enter="handleCreate"
                    autoFocus
                />
                <button 
                    @click="handleCreate"
                    class="bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)] font-black px-6 rounded text-sm uppercase border-2 border-[var(--obr-text-primary)] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all"
                >Save</button>
                <button 
                    @click="isCreating = false"
                    class="text-[var(--obr-text-secondary)] hover:text-red-500 font-bold px-3 transition-colors"
                >✕</button>
                </div>
           </div>

           <!-- Add Button at bottom of list -->
           <div v-if="characterList.length > 0 && !isCreating" class="mt-4 px-2 flex justify-center">
              <button 
                @click="isCreating = true"
                class="w-full py-4 border-2 border-dashed border-[var(--obr-text-disabled)] rounded-lg text-[var(--obr-text-disabled)] hover:text-[var(--obr-primary-main)] hover:border-[var(--obr-primary-main)] hover:bg-[var(--obr-primary-main)]/5 font-black uppercase tracking-widest transition-all group flex flex-col items-center gap-1"
              >
                 <span class="text-2xl group-hover:scale-110 transition-transform">+</span>
                 <span class="text-xs">Add New Recruit</span>
              </button>
           </div>
           
           <div class="h-10"></div>
      </div>
  </div>
</template>

<style scoped>
.animate-fade-in-down {
    animation: fadeInDown 0.3s ease-out;
}
@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>