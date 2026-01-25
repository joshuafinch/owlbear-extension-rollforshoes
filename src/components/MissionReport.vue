<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import type { Character } from '../types';

export interface RollResult {
  id: string; // Add ID to track specific roll
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
}

const props = defineProps<{
  result: RollResult;
  character?: Character;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'takeXp', id: string): void;
  (e: 'confirmEvolve', id: string, skillName: string, xpCost: number): void;
}>();

const isEvolving = ref(false);
const newSkillName = ref('');
const skillInput = ref<HTMLInputElement | null>(null);

const isAllSixes = computed(() => props.result.dice.length > 0 && props.result.dice.every(d => d === 6));
const successCount = computed(() => props.result.dice.filter(d => d === 6).length);

// Advancement Logic
const nonSixesCount = computed(() => props.result.dice.length - successCount.value);
const currentXp = computed(() => props.character?.xp || 0);

// Can advance if: (Current XP + 1 from this failure) >= Cost (non-sixes)
const canAdvanceOnFail = computed(() => {
    if (isAllSixes.value) return false;
    // XP available including the potential +1 from this failure
    const availableXp = currentXp.value + 1;
    return availableXp >= nonSixesCount.value;
});

const startEvolution = () => {
  isEvolving.value = true;
  nextTick(() => {
    skillInput.value?.focus();
  });
};

const confirmEvolution = () => {
  if (newSkillName.value.trim()) {
    // If it was all sixes, cost is 0. If it was a fail, cost is nonSixesCount
    const cost = isAllSixes.value ? 0 : nonSixesCount.value;
    emit('confirmEvolve', props.result.id, newSkillName.value.trim().toUpperCase(), cost);
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" aria-modal="true" role="dialog">
    <div class="w-full max-w-sm bg-[var(--obr-bg-paper)] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transform transition-all scale-100">
      
      <!-- Top Secret Striped Header -->
      <div class="h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fbbf24_10px,#fbbf24_20px)] border-b-4 border-black"></div>
      
      <div class="p-6 text-center">
        <!-- Header -->
        <h2 class="text-3xl font-black uppercase tracking-tighter italic mb-2 text-[var(--obr-text-primary)]">
          Mission Report
        </h2>
        <div class="inline-block bg-black text-white text-xs font-mono px-3 py-1 mb-6 uppercase tracking-widest">
           {{ result.characterName }} // {{ result.skillName.toUpperCase() }} {{ result.rank }}
        </div>

        <!-- Dice Container (Hidden during evolution to save space/focus) -->
        <div v-if="!isEvolving" class="flex flex-wrap justify-center gap-3 mb-8" role="status" aria-label="Dice Results">
          <div 
            v-for="(die, index) in result.dice" 
            :key="index"
            class="w-16 h-16 flex items-center justify-center border-4 rounded-lg text-4xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-500 animate-bounce-in"
            :class="die === 6 
              ? 'bg-[var(--obr-primary-main)] border-black text-white scale-110 z-10' 
              : 'bg-white border-gray-300 text-gray-400'"
            :style="{ animationDelay: `${index * 50}ms` }"
            :aria-label="`Die ${index + 1}: ${die}`"
          >
            {{ die }}
          </div>
        </div>

        <!-- Status Messages -->
        <div class="mb-6 min-h-[3rem] flex items-center justify-center" aria-live="polite">
          <div v-if="isEvolving" class="w-full">
             <div class="text-[#ff0055] font-black text-xl uppercase tracking-tighter italic mb-2 animate-pulse">
                Evolution Protocol Initiated
             </div>
             <p class="text-sm font-bold uppercase text-[var(--obr-text-secondary)]">Enter name for Rank {{ result.rank + 1 }} Skill</p>
          </div>
          <div v-else-if="isAllSixes" class="text-[#ff0055] font-black text-4xl uppercase tracking-tighter italic animate-pulse drop-shadow-md transform -rotate-2">
            CRITICAL SUCCESS!
          </div>
          <div v-else-if="successCount > 0" class="text-[var(--obr-primary-main)] font-black text-2xl uppercase tracking-widest">
            {{ successCount }} Sixes Rolled
          </div>
          <div v-else class="text-[var(--obr-text-disabled)] font-bold uppercase tracking-widest text-lg">
            Standard Execution
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          
          <!-- Evolution Form -->
          <div v-if="isEvolving" class="animate-fade-in">
             <input 
                ref="skillInput"
                v-model="newSkillName"
                type="text"
                autocomplete="off"
                data-1p-ignore
                class="w-full bg-black text-white border-2 border-[#ff0055] p-3 font-bold uppercase text-center mb-2 focus:outline-none focus:shadow-[0_0_10px_#ff0055]"
                placeholder="NEW SKILL NAME..."
                @keyup.enter="confirmEvolution"
             />
             <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="isEvolving = false"
                  class="w-full bg-[var(--obr-bg-paper)] hover:bg-gray-200 text-[var(--obr-text-primary)] border-2 border-black font-bold uppercase py-3 text-sm"
                >
                  Cancel
                </button>
                <button 
                  @click="confirmEvolution"
                  class="w-full bg-[#ff0055] hover:bg-[#d40045] text-white border-2 border-black font-black uppercase py-3 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                >
                  Confirm
                </button>
             </div>
          </div>

          <!-- Normal Actions -->
          <div v-else>
            <!-- Advancement Option (Success) -->
            <button 
              v-if="isAllSixes"
              @click="startEvolution"
              class="w-full bg-[#ff0055] hover:bg-[#d40045] text-white border-2 border-black font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-4"
            >
              <span>★</span> Evolve New Skill
            </button>

            <!-- Failure Options -->
            <div v-if="!isAllSixes" class="flex flex-col gap-2">
                
              <!-- Option A: Standard Fail -->
              <button 
                @click="emit('takeXp', result.id)"
                class="w-full bg-[var(--obr-bg-default)] hover:bg-gray-100 text-[var(--obr-text-primary)] border-2 border-[var(--obr-text-primary)] font-bold uppercase py-3 text-sm flex items-center justify-center gap-1 group shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
              >
                <span class="text-red-500 group-hover:text-red-600 text-lg">⚠</span> FAILED (+1 XP)
              </button>
              
              <!-- Option B: Advance on Fail (If Eligible) -->
              <button 
                v-if="canAdvanceOnFail"
                @click="startEvolution"
                class="w-full bg-[var(--obr-primary-main)] hover:opacity-90 text-[var(--obr-primary-contrast)] border-2 border-[var(--obr-text-primary)] font-bold uppercase py-3 text-sm flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
              >
                <span>⚡</span> ADVANCE (Spend {{ nonSixesCount }} XP)
              </button>
              <div v-else-if="nonSixesCount > 0" class="text-center text-[10px] text-[var(--obr-text-disabled)] uppercase font-bold tracking-widest mt-1">
                 Need {{ nonSixesCount }} XP to advance (Have {{ currentXp + 1 }})
              </div>

              <!-- Option C: Succeeded (No Reward) -->
              <button 
                v-if="successCount > 0"
                @click="emit('close')"
                class="w-full bg-green-600 hover:opacity-90 text-white border-2 border-black font-bold uppercase py-3 text-sm flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5 mt-2"
              >
                <span class="text-lg">✓</span> SUCCEEDED ({{ successCount }} Sixes)
              </button>
            </div>
            
            <button 
              v-if="!isEvolving && isAllSixes"
               @click="emit('close')"
               class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] hover:bg-gray-100 font-bold uppercase text-xs tracking-widest py-4 mt-2 rounded border border-transparent hover:border-gray-300 transition-colors"
            >
               Dismiss Report
            </button>
            
            <button 
              v-if="!isEvolving && !isAllSixes"
              @click="emit('close')"
              class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] hover:bg-gray-100 font-bold uppercase text-xs tracking-widest py-4 mt-2 rounded border border-transparent hover:border-gray-300 transition-colors"
            >
              Dismiss Report
            </button>
          </div>
        </div>
      </div>
      
       <!-- Footer Striped -->
      <div class="h-2 bg-black w-full"></div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.3) translateY(-20px); }
  50% { transform: scale(1.1); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
