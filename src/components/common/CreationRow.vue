<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  placeholder: string;
  buttonText: string;
  initialValue?: string;
  active?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', value: string): void;
  (e: 'cancel'): void;
  (e: 'activate'): void;
}>();

const inputValue = ref(props.initialValue || '');
const inputRef = ref<HTMLInputElement | null>(null);

const isActive = computed({
  get: () => props.active,
  set: (val) => {
    if (val) emit('activate');
    else emit('cancel');
  }
});

const handleSubmit = () => {
  if (!inputValue.value.trim()) return;
  emit('submit', inputValue.value);
  inputValue.value = '';
};

const handleCancel = () => {
  emit('cancel');
  inputValue.value = '';
};

const handleActivate = () => {
    emit('activate');
    setTimeout(() => {
        inputRef.value?.focus();
    }, 50);
};
</script>

<template>
  <div class="mt-4 px-2">
    <!-- Active Form State -->
    <div v-if="isActive" class="bg-[var(--obr-bg-paper)] p-3 rounded-lg border-2 border-[var(--obr-text-primary)] shadow-lg animate-fade-in-up shrink-0">
        <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
                <input 
                    ref="inputRef"
                    v-model="inputValue"
                    type="text" 
                    class="flex-1 bg-[var(--obr-bg-default)] border-2 border-[var(--obr-text-disabled)] rounded px-3 py-2 text-sm font-bold text-[var(--obr-text-primary)] focus:border-[var(--obr-primary-main)] outline-none tracking-wide placeholder:text-[var(--obr-text-disabled)]/50"
                    :placeholder="placeholder"
                    @keyup.enter="handleSubmit"
                    @keyup.esc="handleCancel"
                />
                
                <!-- Optional Slot for extra inputs (like Rank) -->
                <slot name="extra-fields"></slot>
            </div>

            <div class="flex justify-end gap-2">
                 <button 
                    @click="handleCancel"
                    class="text-[var(--obr-text-secondary)] hover:text-[var(--obr-text-primary)] text-xs font-bold uppercase px-3 py-1.5 rounded transition-colors"
                >Cancel</button>
                <button 
                    @click="handleSubmit"
                    class="bg-[var(--obr-primary-main)] text-[var(--obr-primary-contrast)] font-black px-4 py-1.5 rounded text-xs uppercase border border-[var(--obr-text-primary)] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all flex items-center gap-2"
                >
                    <span>Save</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Inactive Button State -->
    <button 
        v-else
        @click="handleActivate"
        class="w-full py-3 border-2 border-dashed border-[var(--obr-text-disabled)] rounded-lg text-[var(--obr-text-disabled)] hover:text-[var(--obr-primary-main)] hover:border-[var(--obr-primary-main)] hover:bg-[var(--obr-primary-main)]/5 font-black uppercase tracking-widest transition-all group flex flex-col items-center gap-1"
    >
        <span class="text-xl group-hover:scale-110 transition-transform">+</span>
        <span class="text-xs">{{ buttonText }}</span>
    </button>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
    animation: fadeInUp 0.2s ease-out;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>