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
  isNpcReport?: boolean;
  isNpcHidden?: boolean;
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

const isNpcReport = computed(() => props.isNpcReport === true);
const isNpcHidden = computed(() => Boolean(props.isNpcHidden));
const isAllSixes = computed(() => props.result.dice.length > 0 && props.result.dice.every(d => d === 6));
const successCount = computed(() => props.result.dice.filter(d => d === 6).length);
const isControllerView = computed(() => props.isController !== false);
const actionState = computed(() => props.result.actionsTaken || []);
const showActionControls = computed(() => isControllerView.value && !isNpcReport.value);
const observerStatus = computed(() => {
  if (isNpcReport.value) {
    if (isNpcHidden.value) {
      return {
        label: 'GM kept this roll hidden',
        tone: 'text-[var(--obr-status-danger)]',
      };
    }
    return null;
  }
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
  if (!showActionControls.value) return;
  isEvolving.value = true;
  nextTick(() => {
    skillInput.value?.focus();
  });
};

const confirmEvolution = () => {
  if (!showActionControls.value) return;
  if (newSkillName.value.trim()) {
    // If it was all sixes, cost is 0. If it was a fail, cost is nonSixesCount
    const cost = isAllSixes.value ? 0 : nonSixesCount.value;
    emit('confirmEvolve', props.result.id, newSkillName.value.trim(), cost);
  }
};
</script>

<template>
  <div :class="[
    isRetroactive ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm' : 'h-full w-full relative flex flex-col overflow-hidden bg-[var(--obr-surface-base)]',
    'animate-fade-in'
  ]" :aria-modal="isRetroactive" role="dialog">
    <div :class="[
      isRetroactive ? 'w-full max-w-sm border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'flex-1 flex flex-col w-full h-full border-0',
      'bg-[var(--obr-surface-card)] relative overflow-hidden transform transition-all scale-100 border-[var(--obr-border-base)]'
    ]" :style="color && isRetroactive ? { borderColor: color, boxShadow: `8px 8px 0px 0px ${color}` } : {}">

      <div class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start custom-scrollbar">
        <!-- Character / Skill Header (Condensed Comic Style) -->
        <div class="relative mb-6 mt-1 transform -rotate-1 group text-center">
          <div
            class="inline-block bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] text-2xl sm:text-3xl font-black px-4 py-1.5 tracking-tighter uppercase transform skew-x-12 shadow-[4px_4px_0px_0px_var(--obr-status-critical)] mb-1">
            {{ result.characterName }}
          </div>
          <h2
            class="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-[var(--obr-text-primary)] leading-tight mt-2">
            {{ result.skillName }}
          </h2>
        </div>

        <div v-if="isNpcReport && isNpcHidden"
          class="mb-6 bg-[var(--obr-status-danger)] text-white p-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
          <span class="text-xs font-black uppercase tracking-widest">Top Secret: Hidden From Players</span>
        </div>

        <!-- Dice Bay -->
        <div v-if="!isEvolving"
          class="w-full max-w-2xl bg-black/5 border-y-4 border-dashed border-[var(--obr-border-subtle)] py-6 px-4 mb-6 flex flex-wrap justify-center gap-3 sm:gap-4"
          role="status" aria-label="Dice Results">
          <div v-for="(die, index) in result.dice" :key="index"
            class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-4 border-black rounded-sm text-4xl sm:text-5xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-500 animate-bounce-in relative"
            :class="[
              die === 6
                ? 'bg-[var(--obr-status-critical)] text-white scale-110 rotate-3 z-10'
                : 'bg-[var(--obr-surface-card)] text-[var(--obr-text-primary)] -rotate-3',
              isAllSixes ? 'ring-4 ring-yellow-400 animate-pulse' : ''
            ]" :style="{ animationDelay: `${index * 100}ms` }" :aria-label="`Die ${index + 1}: ${die}`">
            {{ die }}
            <!-- Impact Sparkle for 6s -->
            <div v-if="die === 6" class="absolute -inset-2 pointer-events-none">
              <div class="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-150 animate-pulse"></div>
            </div>
          </div>
        </div>

        <!-- Callout Box (Only for Evolution) -->
        <div v-if="!isNpcReport && isEvolving" class="mb-6 w-full max-w-lg" aria-live="polite">
          <div
            class="text-center p-4 border-4 border-[var(--obr-status-critical)] bg-[var(--obr-status-critical)]/10 transform rotate-1">
            <div
              class="text-[var(--obr-status-critical)] font-black text-2xl uppercase tracking-tighter italic mb-1 animate-pulse">
              Evolution Protocol!
            </div>
            <p class="text-xs font-black uppercase text-[var(--obr-text-primary)]">Codename for Rank {{ result.rank + 1
            }} Skill:</p>
          </div>
        </div>

        <!-- Status / Action Area -->
        <div class="w-full max-w-lg space-y-4">
          <template v-if="showActionControls">
            <!-- Evolution Form -->
            <div v-if="isEvolving" class="animate-fade-in space-y-4">
              <input ref="skillInput" v-model="newSkillName" type="text" autocomplete="off" data-1p-ignore
                class="w-full bg-[var(--obr-surface-input)] text-[var(--obr-text-primary)] border-4 border-black p-4 font-black text-2xl text-center uppercase focus:outline-none focus:ring-4 focus:ring-[var(--obr-status-critical)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                placeholder="NEW ABILITY NAME..." @keyup.enter="confirmEvolution" />
              <div class="grid grid-cols-2 gap-4">
                <button @click="isEvolving = false"
                  class="bg-[var(--obr-surface-card)] hover:bg-[var(--obr-surface-hover)] text-[var(--obr-text-primary)] border-4 border-black font-black uppercase py-4 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all">
                  Abort
                </button>
                <button @click="confirmEvolution"
                  class="bg-[var(--obr-status-critical)] hover:opacity-90 text-white border-4 border-black font-black uppercase py-4 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all">
                  Manifest!
                </button>
              </div>
            </div>

            <!-- Normal Actions -->
            <div v-else class="space-y-4">
              <!-- Advancement Option (Success) -->
              <button v-if="isAllSixes" @click="startEvolution"
                class="w-full bg-[var(--obr-status-critical)] hover:scale-105 text-white border-4 border-black font-black uppercase py-4 text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-3">
                <span>★</span> EVOLVE NOW <span>★</span>
              </button>

              <!-- Failure Options -->
              <div v-if="!isAllSixes" class="flex flex-col gap-4">

                <button v-if="!isRetroactive" @click="emit('succeeded', result.id)"
                  class="w-full bg-[var(--obr-status-success)] hover:scale-[1.02] text-white border-4 border-black font-black uppercase py-4 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all">
                  MISSION ACCOMPLISHED
                </button>

                <button v-if="!isRetroactive" @click="emit('takeXp', result.id)"
                  class="w-full bg-[var(--obr-status-danger)] hover:scale-[1.02] text-white border-4 border-black font-black uppercase py-4 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all">
                  MISSION FAILED (+1 XP)
                </button>

                <button v-if="canAdvanceOnFail" @click="startEvolution"
                  class="w-full bg-[var(--obr-primary-main)] hover:scale-[1.02] text-white border-4 border-black font-black uppercase py-4 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all">
                  SPEND ({{ nonSixesCount }} XP) TO EVOLVE
                </button>

                <div v-else-if="!isRetroactive || (isRetroactive && !canAdvanceOnFail)"
                  class="w-full bg-black/5 border-4 border-dashed border-[var(--obr-border-subtle)] text-[var(--obr-text-disabled)] font-black text-sm uppercase text-center p-4 cursor-not-allowed select-none">
                  Gather {{ nonSixesCount }} XP to evolve
                </div>
              </div>

              <button v-if="!isEvolving" @click="emit('close')"
                class="w-full text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] font-black uppercase text-xs tracking-[0.3em] py-4 transition-colors">
                Decide Later...
              </button>
            </div>
          </template>

          <template v-else-if="isControllerView">
            <button
              class="w-full bg-black text-white border-4 border-black font-black uppercase py-4 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
              @click="emit('close')">
              Back to Field
            </button>
          </template>

          <div v-else-if="!isNpcReport"
            class="bg-white text-black border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
            <template v-if="observerStatus">
              <p class="font-black uppercase text-lg leading-none mb-1" :class="observerStatus.tone">
                {{ observerStatus.label }}
              </p>
              <p class="text-[9px] font-bold uppercase tracking-widest opacity-50">
                Satellite Uplink Confirmed
              </p>
            </template>
            <template v-else>
              <p class="text-base font-black uppercase animate-pulse">Awaiting Command...</p>
            </template>
          </div>

          <div v-else-if="observerStatus"
            class="bg-white text-black border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
            <p class="font-black uppercase text-lg leading-none mb-1" :class="observerStatus.tone">
              {{ observerStatus.label }}
            </p>
          </div>
        </div>

        <button v-if="!isControllerView" @click="emit('close')"
          class="text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] font-black uppercase text-xs tracking-[0.3em] py-4 transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(-20px);
  }

  50% {
    transform: scale(1.1);
  }

  70% {
    transform: scale(0.9);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>