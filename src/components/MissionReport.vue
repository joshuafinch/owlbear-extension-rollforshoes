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
  actionsTaken?: Array<'xp' | 'advance' | 'succeeded'>;
}

const props = withDefaults(defineProps<{
  result: RollResult;
  character?: Character;
  isRetroactive?: boolean;
  color?: string;
  isController?: boolean;
  evolvedSkillName?: string;
}>(), {
  isController: true,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'takeXp', id: string): void;
  (e: 'confirmEvolve', id: string, skillName: string, xpCost: number): void;
  (e: 'succeeded', id: string): void;
}>();

const isEvolving = ref(false);
const newSkillName = ref('');
const skillInput = ref<HTMLInputElement | null>(null);

const isAllSixes = computed(() => props.result.dice.length > 0 && props.result.dice.every(d => d === 6));
const successCount = computed(() => props.result.dice.filter(d => d === 6).length);
const isControllerView = computed(() => props.isController !== false);
const actionState = computed(() => props.result.actionsTaken || []);
const observerStatus = computed(() => {
    if (actionState.value.includes('advance')) {
        return {
            label: props.evolvedSkillName
                ? `Skill evolved: ${props.evolvedSkillName}`
                : 'Skill evolved from this mission',
            tone: 'text-[var(--obr-status-critical)]',
        };
    }
    if (actionState.value.includes('succeeded')) {
        return {
            label: 'Mission marked as Success',
            tone: 'text-[var(--obr-status-success)]',
        };
    }
    if (actionState.value.includes('xp')) {
        return {
            label: '+1 XP logged from failure',
            tone: 'text-[var(--obr-status-warning)]',
        };
    }
    return null;
});

// Advancement Logic
const nonSixesCount = computed(() => props.result.dice.length - successCount.value);
const currentXp = computed(() => props.character?.xp || 0);

// Can advance if: (Current XP) >= Cost (non-sixes)
const canAdvanceOnFail = computed(() => {
    if (isAllSixes.value) return false;
    // XP available - do NOT assume +1 from failure until failure is claimed
    const availableXp = currentXp.value;
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
    emit('confirmEvolve', props.result.id, newSkillName.value.trim(), cost);
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" aria-modal="true" role="dialog">
    <div 
        class="w-full max-w-sm bg-[var(--obr-surface-card)] border-4 border-[var(--obr-border-base)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transform transition-all scale-100"
        :style="color ? { borderColor: color, boxShadow: `8px 8px 0px 0px ${color}` } : {}"
    >
      
      <!-- Top Secret Striped Header -->
      <div 
        class="h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,var(--obr-brand-hazard)_10px,var(--obr-brand-hazard)_20px)] border-b-4 border-black"
        :style="color ? { backgroundImage: `repeating-linear-gradient(45deg,#000,#000 10px,${color} 10px,${color} 20px)` } : {}"
      ></div>
      
      <div class="p-6 text-center">
        <!-- Header -->
        <h2 class="text-3xl font-black uppercase tracking-tighter italic mb-2 text-[var(--obr-text-primary)]">
          Mission Report
        </h2>
        <div class="inline-block bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] text-xs font-mono px-3 py-1 mb-6 tracking-widest">
           {{ result.characterName }} // {{ result.skillName }} {{ result.rank }}
        </div>

        <!-- Dice Container (Hidden during evolution to save space/focus) -->
        <div v-if="!isEvolving" class="flex flex-wrap justify-center gap-3 mb-8" role="status" aria-label="Dice Results">
          <div 
            v-for="(die, index) in result.dice" 
            :key="index"
            class="w-16 h-16 flex items-center justify-center border-4 rounded-lg text-4xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all duration-500 animate-bounce-in"
            :class="die === 6 
              ? 'bg-[var(--obr-primary-main)] border-black text-white scale-110 z-10' 
              : 'bg-[var(--obr-surface-card)] border-[var(--obr-border-subtle)] text-[var(--obr-text-disabled)]'"
            :style="{ animationDelay: `${index * 50}ms` }"
            :aria-label="`Die ${index + 1}: ${die}`"
          >
            {{ die }}
          </div>
        </div>

        <!-- Status Messages -->
        <div class="mb-4 min-h-[3rem] flex items-center justify-center" aria-live="polite">
          <div v-if="isEvolving" class="w-full">
             <div class="text-[var(--obr-status-critical)] font-black text-xl uppercase tracking-tighter italic mb-2 animate-pulse">
                Evolution Protocol Initiated
             </div>
             <p class="text-sm font-bold uppercase text-[var(--obr-text-secondary)]">Enter name for Rank {{ result.rank + 1 }} Skill</p>
          </div>
          <div v-else-if="isAllSixes" class="text-[var(--obr-status-critical)] font-black text-4xl uppercase tracking-tighter italic animate-pulse drop-shadow-md transform -rotate-2">
            CRITICAL SUCCESS!
          </div>
          <div v-else-if="successCount > 0" class="text-[var(--obr-primary-main)] font-black text-2xl uppercase tracking-widest">
            {{ successCount }} Sixes Rolled
          </div>
          <div v-else class="text-[var(--obr-text-disabled)] font-bold uppercase tracking-widest text-lg">
            Standard Execution
          </div>
        </div>

        <!-- Current XP Display -->
        <div v-if="!isAllSixes && !isEvolving" class="flex items-center justify-center gap-2 mb-4">
             <span class="text-xs font-bold uppercase text-[var(--obr-text-secondary)] tracking-widest">Current Status:</span>
             <div class="bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] px-2 py-0.5 rounded text-sm font-mono font-bold">
                 {{ currentXp }} XP
             </div>
        </div>

        <!-- Actions / Observer Notice -->
        <div class="space-y-2">
          <template v-if="isControllerView">
            <!-- Evolution Form -->
            <div v-if="isEvolving" class="animate-fade-in">
               <input 
                  ref="skillInput"
                  v-model="newSkillName"
                  type="text"
                  autocomplete="off"
                  data-1p-ignore
                  class="w-full bg-[var(--obr-surface-input)] text-[var(--obr-text-primary)] border-2 border-[var(--obr-status-critical)] p-3 font-bold text-center mb-2 focus:outline-none focus:shadow-[0_0_10px_var(--obr-status-critical)]"
                  placeholder="NEW SKILL NAME..."
                  @keyup.enter="confirmEvolution"
               />
               <div class="grid grid-cols-2 gap-2">
                  <button 
                    @click="isEvolving = false"
                    class="w-full bg-[var(--obr-surface-card)] hover:bg-[var(--obr-surface-hover)] text-[var(--obr-text-primary)] border-2 border-[var(--obr-border-base)] font-bold uppercase py-3 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    @click="confirmEvolution"
                    class="w-full bg-[var(--obr-status-critical)] hover:opacity-90 text-white border-2 border-black font-black uppercase py-3 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
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
                class="w-full bg-[var(--obr-status-critical)] hover:opacity-90 text-white border-2 border-black font-black uppercase py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-4"
              >
                <span>★</span> Evolve New Skill
              </button>

              <!-- Failure Options -->
              <div v-if="!isAllSixes" class="flex flex-col gap-2">
                  
                <button 
                  v-if="!isRetroactive"
                  @click="emit('succeeded', result.id)"
                  class="w-full bg-[var(--obr-status-success)] hover:opacity-90 text-white border-2 border-black font-bold uppercase py-3 text-sm flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
                >
                  <span class="text-lg">✓</span> SUCCEEDED
                </button>

                <div class="flex gap-2">
                  <button 
                      v-if="!isRetroactive"
                      @click="emit('takeXp', result.id)"
                      class="flex-1 bg-[var(--obr-surface-base)] hover:bg-[var(--obr-text-primary)] text-[var(--obr-text-primary)] hover:text-[var(--obr-bg-default)] border-2 border-[var(--obr-border-base)] font-bold uppercase py-3 text-sm flex flex-col items-center justify-center gap-1 group shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
                  >
                      <span class="text-[var(--obr-status-danger)] group-hover:text-[var(--obr-status-danger)] text-lg leading-none">⚠</span> 
                      <span class="leading-none">FAIL (+1 XP)</span>
                  </button>
                  
                  <button 
                      v-if="canAdvanceOnFail"
                      @click="startEvolution"
                      class="flex-1 bg-[var(--obr-primary-main)] hover:opacity-90 text-[var(--obr-primary-contrast)] border-2 border-[var(--obr-border-base)] font-bold uppercase py-3 text-sm flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-0.5"
                  >
                      <span class="text-lg leading-none">⚡</span> 
                      <span class="leading-none">ADVANCE (-{{ nonSixesCount }} XP)</span>
                  </button>
                   <div v-else-if="!isRetroactive || (isRetroactive && !canAdvanceOnFail)" class="flex-1 flex items-center justify-center bg-[var(--obr-surface-base)] border-2 border-dashed border-[var(--obr-border-subtle)] text-[var(--obr-text-disabled)] font-bold text-xs uppercase text-center p-1 cursor-not-allowed select-none">
                       Need {{ nonSixesCount }} XP to advance
                   </div>
                </div>
              </div>
              
              <button 
                v-if="!isEvolving"
                 @click="emit('close')"
                 class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-hover)] font-bold uppercase text-xs tracking-widest py-4 mt-2 rounded border border-transparent hover:border-[var(--obr-border-subtle)] transition-colors"
              >
                 Dismiss Report (Decide Later)
              </button>
            </div>
          </template>
          <div v-else class="text-xs uppercase tracking-widest bg-[var(--obr-surface-hover)] border border-dashed border-[var(--obr-border-subtle)] p-4">
            <template v-if="observerStatus">
              <p class="font-black" :class="observerStatus.tone">
                {{ observerStatus.label }}
              </p>
              <p class="text-[var(--obr-text-secondary)] mt-1 tracking-normal normal-case">
                Report updated live from command log.
              </p>
            </template>
            <template v-else>
              <p class="text-[var(--obr-text-secondary)]">Awaiting operator decision...</p>
            </template>
          </div>
        </div>
        <button 
          v-if="!isControllerView"
          @click="emit('close')"
          class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] hover:bg-[var(--obr-surface-hover)] font-bold uppercase text-xs tracking-widest py-3 mt-4 rounded border border-transparent hover:border-[var(--obr-border-subtle)] transition-colors"
        >
          Close
        </button>
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
