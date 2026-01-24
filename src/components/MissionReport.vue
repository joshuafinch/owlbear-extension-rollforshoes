<script setup lang="ts">
import { computed } from 'vue';

export interface RollResult {
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
}

const props = defineProps<{
  result: RollResult;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'takeXp'): void;
  (e: 'evolve'): void;
}>();

const isAllSixes = computed(() => props.result.dice.length > 0 && props.result.dice.every(d => d === 6));
const successCount = computed(() => props.result.dice.filter(d => d === 6).length);
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="w-full max-w-sm bg-[var(--obr-bg-paper)] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transform transition-all scale-100">
      
      <!-- Top Secret Striped Header -->
      <div class="h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fbbf24_10px,#fbbf24_20px)] border-b-4 border-black"></div>
      
      <div class="p-6 text-center">
        <!-- Header -->
        <h2 class="text-2xl font-black uppercase tracking-tighter italic mb-1 text-[var(--obr-text-primary)]">
          Mission Report
        </h2>
        <div class="inline-block bg-black text-white text-[10px] font-mono px-2 py-0.5 mb-6 uppercase tracking-widest">
           {{ result.characterName }} // {{ result.skillName }} {{ result.rank }}
        </div>

        <!-- Dice Container -->
        <div class="flex flex-wrap justify-center gap-3 mb-8">
          <div 
            v-for="(die, index) in result.dice" 
            :key="index"
            class="w-12 h-12 flex items-center justify-center border-4 rounded-lg text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-500 animate-bounce-in"
            :class="die === 6 
              ? 'bg-[var(--obr-primary-main)] border-black text-white scale-110 z-10' 
              : 'bg-white border-gray-300 text-gray-400'"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            {{ die }}
          </div>
        </div>

        <!-- Status Messages -->
        <div class="mb-6 min-h-[3rem] flex items-center justify-center">
          <div v-if="isAllSixes" class="text-[#ff0055] font-black text-3xl uppercase tracking-tighter italic animate-pulse drop-shadow-md transform -rotate-2">
            CRITICAL SUCCESS!
          </div>
          <div v-else-if="successCount > 0" class="text-[var(--obr-primary-main)] font-black text-xl uppercase tracking-widest">
            {{ successCount }} Sixes Rolled
          </div>
          <div v-else class="text-[var(--obr-text-disabled)] font-bold uppercase tracking-widest text-sm">
            Standard Execution
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <!-- Advancement Option -->
          <button 
            v-if="isAllSixes"
            @click="emit('evolve')"
            class="w-full bg-[#ff0055] hover:bg-[#d40045] text-white border-2 border-black font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-4"
          >
            <span>★</span> Evolve New Skill
          </button>

          <!-- Failure / Success Options -->
          <div v-if="!isAllSixes" class="grid grid-cols-2 gap-2">
             <button 
              @click="emit('takeXp')"
              class="w-full bg-[var(--obr-bg-default)] hover:bg-gray-100 text-[var(--obr-text-primary)] border-2 border-[var(--obr-text-primary)] font-bold uppercase py-2 text-xs flex items-center justify-center gap-1 group"
            >
              <span class="text-red-500 group-hover:text-red-600">⚠</span> FAILED (+1 XP)
            </button>
             <button 
              @click="emit('close')"
              class="w-full bg-[var(--obr-primary-main)] hover:opacity-90 text-[var(--obr-primary-contrast)] border-2 border-[var(--obr-text-primary)] font-bold uppercase py-2 text-xs flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
            >
              <span>✓</span> SUCCEEDED
            </button>
          </div>
          
          <button 
            @click="emit('close')"
            class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] font-bold uppercase text-[10px] tracking-widest py-2"
          >
            Dismiss Report
          </button>
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
