<script setup lang="ts">
import { computed, ref } from 'vue';
import { ROLE_GM } from '../constants';

const props = defineProps<{
  role: string;
  isDebug?: boolean;
}>();

const emit = defineEmits<{
  (e: 'export'): void;
  (e: 'import', event: Event): void;
  (e: 'toggleDebug'): void;
  (e: 'clearLogs'): void;
}>();

const isGm = computed(() => props.role === ROLE_GM);
const confirmClearLogs = ref(false);

const handleClearLogs = () => {
    if (confirmClearLogs.value) {
        emit('clearLogs');
        confirmClearLogs.value = false;
    } else {
        confirmClearLogs.value = true;
        setTimeout(() => {
            confirmClearLogs.value = false;
        }, 4000);
    }
};
</script>

<template>
  <div class="flex flex-col h-full bg-[var(--obr-surface-card)] p-4 font-mono text-[var(--obr-text-primary)] overflow-hidden border-2 border-[var(--obr-border-base)] shadow-lg rounded-xl relative transition-colors duration-300">
    
    <!-- Header -->
    <div class="border-b border-[var(--obr-border-subtle)] pb-3 mb-4 flex justify-between items-center z-10 relative">
        <span class="text-sm font-bold tracking-widest text-[var(--obr-text-secondary)]">SYSTEM_ADMIN</span>
        <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-[var(--obr-status-danger)]"></div>
            <div class="w-3 h-3 rounded-full bg-[var(--obr-status-warning)]"></div>
            <div class="w-3 h-3 rounded-full bg-[var(--obr-status-success)]"></div>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto space-y-6 relative z-10">
        
        <!-- Welcome Message -->
        <div class="text-sm space-y-2 mb-6 opacity-80">
            <p class="flex items-center gap-2"><span class="text-[var(--obr-status-success)]">●</span> SYSTEM READY</p>
            <p class="flex items-center gap-2"><span class="text-[var(--obr-status-success)]">●</span> CONNECTION SECURE</p>
            <p class="flex items-center gap-2 text-[var(--obr-text-primary)]">
                <span>ACCESS LEVEL:</span> 
                <span :class="isGm ? 'text-[var(--obr-status-success)] font-black bg-[var(--obr-status-success)]/10 px-2 py-0.5 rounded' : 'text-[var(--obr-status-danger)] font-black bg-[var(--obr-status-danger)]/10 px-2 py-0.5 rounded'">{{ role }}</span>
            </p>
            <div class="h-px bg-[var(--obr-border-subtle)] opacity-50 my-4"></div>
        </div>

        <!-- GM Controls -->
        <div v-if="isGm" class="space-y-8 animate-fade-in">
             <div>
                <p class="text-xs font-black uppercase tracking-wider mb-3 text-[var(--obr-text-secondary)]">Data Management</p>
                
                <div class="grid gap-3">
                    <!-- Export -->
                    <button 
                        @click="emit('export')"
                        class="group text-left bg-[var(--obr-surface-base)] hover:bg-[var(--obr-surface-hover)] border border-[var(--obr-border-subtle)] p-3 rounded-lg transition-all w-full flex items-center justify-between"
                    >
                        <div>
                            <p class="text-sm font-bold text-[var(--obr-text-primary)]">
                               Execute Export
                            </p>
                            <p class="text-xs text-[var(--obr-text-disabled)] mt-0.5">Download current state as JSON</p>
                        </div>
                        <span class="text-[var(--obr-primary-main)] opacity-0 group-hover:opacity-100 transition-opacity">↓</span>
                    </button>

                    <!-- Import -->
                    <label class="group text-left bg-[var(--obr-surface-base)] hover:bg-[var(--obr-surface-hover)] border border-[var(--obr-border-subtle)] p-3 rounded-lg transition-all cursor-pointer w-full flex items-center justify-between">
                         <div>
                            <p class="text-sm font-bold text-[var(--obr-text-primary)]">
                               Import Override
                            </p>
                            <p class="text-xs text-[var(--obr-text-disabled)] mt-0.5">Restore from backup file</p>
                         </div>
                        <span class="text-[var(--obr-primary-main)] opacity-0 group-hover:opacity-100 transition-opacity">↑</span>
                        <input type="file" class="hidden" accept=".json" @change="(e) => emit('import', e)" />
                    </label>
                </div>
             </div>

             <div class="mt-8 border-l-4 border-[var(--obr-status-warning)] bg-[var(--obr-status-warning)]/5 p-4 rounded-r-lg">
                <p class="text-xs font-bold text-[var(--obr-status-warning)] uppercase mb-1">Warning</p>
                <p class="text-xs text-[var(--obr-text-secondary)] leading-relaxed">
                    Importing data will immediately overwrite the current session. This action cannot be undone.
                </p>
             </div>

             <!-- DEBUG TOOLS -->
             <div class="mt-6">
                <p class="text-xs font-black uppercase tracking-wider mb-3 text-[var(--obr-text-secondary)]">Debug Tools</p>
                <div class="space-y-3">
                     <button 
                        @click="emit('toggleDebug')"
                        class="w-full text-left bg-[var(--obr-surface-base)] hover:bg-[var(--obr-surface-hover)] border border-[var(--obr-border-subtle)] p-3 rounded-lg transition-colors flex items-center justify-between group"
                    >
                        <div>
                             <p class="text-sm font-bold flex items-center gap-2" :class="isDebug ? 'text-[var(--obr-status-warning)]' : 'text-[var(--obr-text-primary)]'">
                               <span v-if="isDebug">⚡</span> Force Luck Mode
                            </p>
                            <p class="text-xs text-[var(--obr-text-disabled)] mt-0.5">Bias RNG towards success</p>
                        </div>
                        <div class="text-[10px] font-black px-2 py-1 rounded" :class="isDebug ? 'bg-[var(--obr-status-warning)] text-white' : 'bg-[var(--obr-text-disabled)] text-white'">
                            {{ isDebug ? 'ON' : 'OFF' }}
                        </div>
                    </button>

                    <!-- Clear Logs -->
                    <button 
                       @click="handleClearLogs"
                       class="w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group mt-2 border"
                       :class="confirmClearLogs ? 'bg-[var(--obr-status-danger)] text-white border-[var(--obr-status-danger)]' : 'bg-[var(--obr-surface-base)] border-[var(--obr-border-subtle)] hover:border-[var(--obr-status-danger)] hover:text-[var(--obr-status-danger)]'"
                   >
                       <div>
                            <p class="text-sm font-bold flex items-center gap-2">
                              <span>🗑️</span> Purge Logs
                           </p>
                           <p v-if="!confirmClearLogs" class="text-xs opacity-70 mt-0.5">Clear all mission history</p>
                       </div>
                       <span v-if="confirmClearLogs" class="text-xs font-black uppercase animate-pulse">Confirm?</span>
                   </button>
                </div>
             </div>
        </div>

        <!-- Player View (Access Denied) -->
        <div v-else class="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div class="text-6xl grayscale opacity-20">🔒</div>
            <p class="text-lg font-black tracking-widest text-[var(--obr-text-disabled)]">RESTRICTED</p>
            <p class="text-xs text-[var(--obr-text-disabled)]">Administrative privileges required.</p>
        </div>

    </div>

    <!-- Footer -->
    <div class="mt-auto pt-4 text-[10px] text-[var(--obr-text-disabled)] flex justify-between font-mono border-t border-[var(--obr-border-subtle)] relative z-10">
        <span>V.1.0.4-BETA</span>
    </div>

  </div>
</template>

<style scoped>
.blink {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
.animate-fade-in {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
