import { computed, ref, type Ref } from 'vue';
import { ROLE_GM } from '../constants';

export type OverrideSignal = 'red' | 'yellow' | 'green';

const OVERRIDE_SEQUENCE: OverrideSignal[] = ['red', 'yellow', 'green'];
const SEQUENCE_TIMEOUT_MS = 4000;

const overrideUnlocked = ref(false);
const sequenceProgress = ref(0);
let resetTimer: number | null = null;

const clearSequenceTimer = () => {
  if (typeof window === 'undefined') return;
  if (resetTimer !== null) {
    window.clearTimeout(resetTimer);
    resetTimer = null;
  }
};

const scheduleSequenceReset = () => {
  if (typeof window === 'undefined') return;
  clearSequenceTimer();
  resetTimer = window.setTimeout(() => {
    sequenceProgress.value = 0;
    resetTimer = null;
  }, SEQUENCE_TIMEOUT_MS);
};

const resetSequence = () => {
  sequenceProgress.value = 0;
  clearSequenceTimer();
};

const activateOverride = () => {
  overrideUnlocked.value = true;
  resetSequence();
};

const processOverrideSignal = (signal: OverrideSignal) => {
  if (overrideUnlocked.value) {
    // Already unlocked; keep the playful inputs responsive but no further action.
    return;
  }

  const expectedSignal = OVERRIDE_SEQUENCE[sequenceProgress.value];

  if (signal === expectedSignal) {
    sequenceProgress.value += 1;
    if (sequenceProgress.value === OVERRIDE_SEQUENCE.length) {
      activateOverride();
      return;
    }
  } else {
    // If the signal restarts the pattern, keep it as progress 1, else reset entirely.
    sequenceProgress.value = signal === OVERRIDE_SEQUENCE[0] ? 1 : 0;
  }

  scheduleSequenceReset();
};

export const resetOverride = () => {
  overrideUnlocked.value = false;
  resetSequence();
};

export const useAccessOverride = (role?: Ref<string | undefined>) => {
  const hasElevatedAccess = computed(() => {
    if (role) {
      return role.value === ROLE_GM || overrideUnlocked.value;
    }
    return overrideUnlocked.value;
  });

  return {
    hasElevatedAccess,
    overrideUnlocked,
    triggerOverrideSignal: processOverrideSignal,
  };
};
