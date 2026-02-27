<script setup lang="ts">
import { ref, toRef, computed } from 'vue';
import { useAccessOverride, type OverrideSignal } from '../composables/useAccessOverride';
import type { AppSettings } from '../types';
import type { MetadataDiagnosticResult } from '../composables/useRollForShoes';

const props = defineProps<{
  role: string;
  isDevBuild?: boolean;
  settings: AppSettings;
  runMetadataDiagnostic: () => Promise<MetadataDiagnosticResult | null>;
}>();

const emit = defineEmits<{
  (e: 'export'): void;
  (e: 'import', event: Event): void;
  (e: 'exportLogs'): void;
  (e: 'importLogs', event: Event): void;
  (e: 'clearLogs'): void;
  (e: 'updateSettings', updates: Partial<AppSettings>): void;
}>();

const { hasElevatedAccess: isGm, triggerOverrideSignal } = useAccessOverride(toRef(props, 'role'));
const confirmClearLogs = ref(false);
const diagnosticResult = ref<MetadataDiagnosticResult | null>(null);
const isDiagnosticRunning = ref(false);

const diagnosticSeverity = computed(() => {
    if (!diagnosticResult.value) return null;
    const ratio = diagnosticResult.value.totalSizeKB / diagnosticResult.value.limitKB;
    if (ratio > 0.875) return 'danger';
    if (ratio > 0.75) return 'warning';
    return 'safe';
});

const handleMetadataDiagnostic = async () => {
    isDiagnosticRunning.value = true;
    diagnosticResult.value = null;
    try {
        const result = await props.runMetadataDiagnostic();
        diagnosticResult.value = result;
    } catch {
        diagnosticResult.value = null;
    } finally {
        isDiagnosticRunning.value = false;
    }
};

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

const handleOverrideTap = (signal: OverrideSignal) => {
    triggerOverrideSignal(signal);
};
</script>

<template>
  <div class="flex flex-col h-full bg-black p-4 font-mono text-green-500">
    
    <!-- CRT Screen Effect Overlay -->
    <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    <div class="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-20"></div>

    <!-- Header -->
    <div class="border-b border-green-800 pb-3 mb-4 flex justify-between items-center z-0 relative">
        <span class="text-sm font-bold tracking-widest">root@AGENCY-HQ:~$ SYS_ADMIN</span>
        <div class="flex gap-2">
            <button 
                type="button"
                class="w-4 h-4 rounded-full bg-red-500 animate-pulse cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
                aria-label="Red status LED"
                @click="handleOverrideTap('red')"
            ></button>
            <button 
                type="button"
                class="w-4 h-4 rounded-full bg-yellow-500 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
                aria-label="Yellow status LED"
                @click="handleOverrideTap('yellow')"
            ></button>
            <button 
                type="button"
                class="w-4 h-4 rounded-full bg-green-500 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
                aria-label="Green status LED"
                @click="handleOverrideTap('green')"
            ></button>
        </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 space-y-6 relative z-0 pr-2 overflow-y-auto custom-scrollbar relative">
        
        <!-- Welcome Message -->
        <div class="text-sm space-y-2 mb-6 opacity-80">
            <p>> CONNECTING TO SECURE MAINFRAME...</p>
            <p>> ESTABLISHING ENCRYPTED UPLINK...</p>
            <p>> ACCESS LEVEL: <span :class="isGm ? 'text-green-400 font-bold' : 'text-red-500 font-bold'">{{ role }}</span></p>
            <p class="text-xs text-gray-500">----------------------------------------</p>
        </div>

        <!-- GM Controls -->
        <div v-if="isGm" class="space-y-8 animate-fade-in">
             <div>
                <p class="text-sm mb-3 text-green-400 font-bold">> AVAILABLE COMMANDS:</p>
                
                <div class="grid gap-4 pl-2 border-l-2 border-green-900 ml-1">
                    <!-- Export -->
                    <button 
                        @click="emit('export')"
                        class="group text-left hover:bg-green-900/30 p-3 rounded transition-colors w-full"
                    >
                        <p class="text-base font-bold text-white group-hover:text-green-300">
                           <span class="text-green-600 mr-2">➜</span> EXECUTE_EXPORT_PROTOCOL()
                        </p>
                        <p class="text-xs text-gray-500 pl-6 mt-1">Dump current database to local JSON storage.</p>
                    </button>

                    <!-- Import -->
                    <label class="group text-left hover:bg-green-900/30 p-3 rounded transition-colors cursor-pointer block w-full">
                         <p class="text-base font-bold text-white group-hover:text-green-300">
                           <span class="text-green-600 mr-2">➜</span> EXECUTE_IMPORT_OVERRIDE()
                        </p>
                        <p class="text-xs text-gray-500 pl-6 mt-1">Overwrite mainframe with external backup.</p>
                         <input type="file" class="hidden" accept=".json" @change="(e) => emit('import', e)" />
                    </label>
                </div>
             </div>

             <div class="mt-8 border-t border-dashed border-green-900 pt-4">

                <p class="text-xs text-red-400 bg-red-900/20 p-3 border border-red-900/50 leading-relaxed">
                    ⚠ WARNING: IMPORT_OVERRIDE is a destructive operation. Previous session data will be purged immediately. Proceed with caution.
                </p>
             </div>

              <div class="mt-6">
                <p class="text-sm mb-3 text-yellow-500 font-bold">> DEBUG_PROTOCOLS:</p>
                <div class="pl-2 border-l-2 border-yellow-900 ml-1">
                     <button 
                        @click="emit('updateSettings', { luckModeEnabled: !settings.luckModeEnabled })"
                        class="w-full text-left hover:bg-yellow-900/30 p-3 rounded transition-colors flex items-center justify-between group"
                    >
                        <div>
                             <p class="text-base font-bold" :class="settings.luckModeEnabled ? 'text-yellow-400 animate-pulse' : 'text-gray-500'">
                               <span class="mr-2">⚡</span> FORCE_LUCK_MODE()
                            </p>
                            <p class="text-xs text-gray-500 pl-6 mt-1">Reroute entropy. Bias RNG towards success.</p>
                        </div>
                        <div class="text-xs font-black px-3 py-1 border" :class="settings.luckModeEnabled ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-gray-700 text-gray-700'">
                            {{ settings.luckModeEnabled ? 'ACTIVE' : 'OFFLINE' }}
                        </div>
                    </button>


                    <!-- Clear Logs -->
                    <button 
                       @click="handleClearLogs"
                       class="w-full text-left p-3 rounded transition-all flex items-center justify-between group mt-2 border border-dashed border-gray-800"
                       :class="confirmClearLogs ? 'bg-red-900/40 hover:bg-red-900/60 border-red-500' : 'hover:bg-yellow-900/30'"
                   >
                       <div>
                            <p class="text-base font-bold" :class="confirmClearLogs ? 'text-red-500 animate-pulse' : 'text-gray-500'">
                              <span class="mr-2">💣</span> PURGE_LOG_ARCHIVES()
                           </p>
                           <p v-if="confirmClearLogs" class="text-xs text-red-400 pl-6 mt-1 font-bold">⚠️ CONFIRM DELETION? CLICK AGAIN.</p>
                           <p v-else class="text-xs text-gray-500 pl-6 mt-1">Permanently erase all mission logs.</p>
                       </div>
                   </button>

                    <!-- Metadata Diagnostic -->
                    <button 
                       @click="handleMetadataDiagnostic"
                       :disabled="isDiagnosticRunning"
                       class="w-full text-left p-3 rounded transition-all group mt-2"
                       :class="isDiagnosticRunning ? 'opacity-50 cursor-wait' : 'hover:bg-yellow-900/30'"
                   >
                       <div class="flex items-center justify-between">
                           <div>
                                <p class="text-base font-bold" :class="diagnosticResult ? (diagnosticSeverity === 'danger' ? 'text-red-500' : diagnosticSeverity === 'warning' ? 'text-yellow-400' : 'text-green-400') : 'text-gray-500'">
                                  <span class="mr-2">📡</span> METADATA_DIAGNOSTIC()
                               </p>
                               <p v-if="isDiagnosticRunning" class="text-xs text-yellow-400 pl-6 mt-1 animate-pulse">Scanning room metadata...</p>
                               <p v-else-if="!diagnosticResult" class="text-xs text-gray-500 pl-6 mt-1">Measure room metadata size against 16KB limit. Exports dump.</p>
                           </div>
                           <div v-if="diagnosticResult && !isDiagnosticRunning" class="text-xs font-black px-3 py-1 border" :class="diagnosticSeverity === 'danger' ? 'border-red-500 text-red-500 bg-red-900/20' : diagnosticSeverity === 'warning' ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-green-500 text-green-500 bg-green-900/20'">
                               {{ diagnosticResult.totalSizeKB.toFixed(1) }} / {{ diagnosticResult.limitKB }} KB
                           </div>
                       </div>
                       <!-- Diagnostic Results Breakdown -->
                       <div v-if="diagnosticResult && !isDiagnosticRunning" class="mt-2 pl-6 space-y-1 text-xs font-mono">
                           <p class="text-green-600">├─ Extension: <span class="text-green-400">{{ diagnosticResult.extensionSizeKB.toFixed(2) }} KB</span></p>
                           <p class="text-green-600">├─ Other: <span class="text-gray-400">{{ diagnosticResult.otherExtensionsSizeKB.toFixed(2) }} KB</span></p>
                           <p class="text-green-600">└─ Keys: <span class="text-gray-500">{{ diagnosticResult.extensionKeys.join(', ') }}</span></p>
                       </div>
                   </button>

                    <div 
                        v-if="props.isDevBuild" 
                        class="mt-3 space-y-3 border-t border-dashed border-yellow-900 pt-3"
                    >
                        <p class="text-xs text-yellow-500 pl-6">// DEV ONLY: Mission Log Archives</p>
                        <button 
                            @click="emit('exportLogs')"
                            class="w-full text-left hover:bg-yellow-900/30 p-3 rounded transition-colors flex items-center justify-between group"
                        >
                            <div>
                                <p class="text-base font-bold text-yellow-300 group-hover:text-yellow-100">
                                    <span class="mr-2">🗄</span> LOG_ARCHIVE_EXPORT()
                                </p>
                                <p class="text-xs text-gray-500 pl-6 mt-1">Dump mission log history to JSON for debugging.</p>
                            </div>
                            <div class="text-[10px] font-black px-2 py-0.5 border border-yellow-700 text-yellow-500">
                                LOCALHOST
                            </div>
                        </button>

                        <label class="group text-left hover:bg-yellow-900/30 p-3 rounded transition-colors cursor-pointer flex flex-col gap-1">
                            <div class="flex items-center gap-2">
                                <p class="text-base font-bold text-yellow-300 group-hover:text-yellow-100 flex-1">
                                    <span class="mr-2">📥</span> LOG_ARCHIVE_IMPORT()
                                </p>
                                <span class="text-[10px] font-black px-2 py-0.5 border border-yellow-700 text-yellow-500">LOCALHOST</span>
                            </div>
                            <p class="text-xs text-gray-500 pl-6">Overwrite mission log timeline from JSON snapshot.</p>
                            <input type="file" class="hidden" accept=".json" @change="(e) => emit('importLogs', e)" />
                        </label>

                        <p class="text-[10px] text-yellow-500/80 pl-6">
                            ⚠ These protocols are restricted to localhost dev sessions and will overwrite current mission logs.
                        </p>
                    </div>

                    
                </div>
             </div>
        </div>

        <!-- Player View (Access Denied) -->
        <div v-else class="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div class="text-6xl">🔒</div>
            <p class="text-2xl text-red-500 font-black tracking-widest blink">ACCESS DENIED</p>
            <p class="text-sm">Administrative privileges required.</p>
        </div>

    </div>

    <!-- Footer -->
    <div class="mt-auto pt-4 text-xs text-gray-600 flex font-mono relative z-0">
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

/* Custom Scrollbar Styling (Dark/Terminal Theme) */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 50, 0, 0.2);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #15803d; /* green-700 */
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #22c55e; /* green-500 */
}
</style>
