<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  label?: string;
  maxRank?: number;
  alignment?: 'left' | 'right';
  color?: string;
}>(), {
  label: 'Rank',
  maxRank: 10,
  alignment: 'right',
});

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

const isOpen = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const close = () => {
  if (isOpen.value) {
    isOpen.value = false;
  }
};

const selectRank = (rank: number) => {
  emit('update:modelValue', rank);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (!rootRef.value || rootRef.value.contains(target)) {
    return;
  }
  close();
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div ref="rootRef" class="relative inline-flex flex-col items-center">
    <button 
      type="button"
      @click="toggle"
      class="h-[36px] min-w-[36px] px-1 flex flex-col items-center justify-center bg-[var(--obr-surface-base)] border-2 border-[var(--obr-border-subtle)] text-[var(--obr-text-primary)] rounded transition-colors hover:border-[var(--obr-primary-main)] focus:outline-none focus:ring-2 focus:ring-[var(--obr-primary-main)]"
      :style="color ? { borderColor: `${color}66` } : {}"
      :title="`Change ${label}`"
    >
      <span class="text-[8px] font-black uppercase text-[var(--obr-text-secondary)] leading-none mb-0.5">{{ label }}</span>
      <span class="text-base font-black leading-none">{{ modelValue }}</span>
    </button>

    <div 
      v-if="isOpen" 
      class="absolute top-full mt-1 bg-[var(--obr-surface-card)] border border-[var(--obr-border-subtle)] rounded shadow-xl z-50 w-[180px] p-2 grid grid-cols-5 gap-1"
      :class="alignment === 'left' ? 'left-0' : 'right-0'"
    >
      <button 
        v-for="r in maxRank" 
        :key="r"
        type="button"
        @click="selectRank(r)"
        class="h-8 w-full flex items-center justify-center rounded font-bold text-sm transition-colors"
        :class="r === modelValue 
          ? 'bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)]'
          : 'bg-[var(--obr-surface-base)] text-[var(--obr-text-primary)] hover:bg-[var(--obr-primary-main)]/10'"
      >
        {{ r }}
      </button>
    </div>
  </div>
</template>
