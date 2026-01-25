<script setup lang="ts">
import { ref } from 'vue';
import { useRollForShoes } from '../composables/useRollForShoes';
import CharacterCard from './CharacterCard.vue';
import CreationRow from './common/CreationRow.vue';
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
  activeCharacterId
} = useRollForShoes();

const isCreating = ref(false);

const handleCreate = async (name: string) => {
  await createCharacter(name);
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
             :isActive="activeCharacterId === char.id"
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
           
           <!-- Reusable Create Component -->
           <CreationRow
              v-if="characterList.length > 0 || isCreating"
              :active="isCreating"
              placeholder="NEW RECRUIT CODENAME"
              buttonText="Add New Recruit"
              @submit="handleCreate"
              @cancel="isCreating = false"
              @activate="isCreating = true"
           />
           
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