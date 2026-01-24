<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  role: string;
  isDebug?: boolean;
}>();

const emit = defineEmits<{
  (e: 'export'): void;
  (e: 'import', event: Event): void;
  (e: 'toggleDebug'): void;
}>();

const isGm = computed(() => props.role === 'GM');
</script>

<template>
  <div class="flex flex-col h-full bg-black p-4 font-mono text-green-500 overflow-hidden border-2 border-gray-800 shadow-inner rounded-lg relative">
    
    <!-- CRT Screen Effect Overlay -->
    <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    <div class="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-20"></div>

    <!-- Header -->
    <div class="border-b border-green-800 pb-2 mb-4 flex justify-between items-center z-0 relative">
        <span class="text-xs font-bold tracking-widest">root@AGENCY-HQ:~$ SYS_ADMIN</span>
        <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto space-y-4 relative z-0">
        
        <!-- Welcome Message -->
        <div class="text-xs space-y-1 mb-6 opacity-80">
            <p>> CONNECTING TO SECURE MAINFRAME...</p>
            <p>> ESTABLISHING ENCRYPTED UPLINK...</p>
            <p>> ACCESS LEVEL: <span :class="isGm ? 'text-green-400 font-bold' : 'text-red-500 font-bold'">{{ role }}</span></p>
            <p class="text-[10px] text-gray-500">----------------------------------------</p>
        </div>

        <!-- GM Controls -->
        <div v-if="isGm" class="space-y-6 animate-fade-in">
             <div>
                <p class="text-xs mb-2 text-green-400 font-bold">> AVAILABLE COMMANDS:</p>
                
                <div class="grid gap-3 pl-2 border-l-2 border-green-900 ml-1">
                    <!-- Export -->
                    <button 
                        @click="emit('export')"
                        class="group text-left hover:bg-green-900/30 p-2 rounded transition-colors"
                    >
                        <p class="text-xs font-bold text-white group-hover:text-green-300">
                           <span class="text-green-600 mr-2">➜</span> EXECUTE_EXPORT_PROTOCOL()
                        </p>
                        <p class="text-[10px] text-gray-500 pl-6">Dump current database to local JSON storage.</p>
                    </button>

                    <!-- Import -->
                    <label class="group text-left hover:bg-green-900/30 p-2 rounded transition-colors cursor-pointer block">
                         <p class="text-xs font-bold text-white group-hover:text-green-300">
                           <span class="text-green-600 mr-2">➜</span> EXECUTE_IMPORT_OVERRIDE()
                        </p>
                        <p class="text-[10px] text-gray-500 pl-6">Overwrite mainframe with external backup.</p>
                        <input type="file" class="hidden" accept=".json" @change="(e) => emit('import', e)" />
                    </label>
                </div>
             </div>

             <div class="mt-8 border-t border-dashed border-green-900 pt-2">
                <p class="text-[10px] text-red-500 bg-red-900/10 p-2 border border-red-900/30">
                    ⚠ WARNING: IMPORT_OVERRIDE is a destructive operation. Previous session data will be purged immediately. Proceed with caution.
                </p>
             </div>

             <!-- DEBUG TOOLS -->
             <div class="mt-4">
                <p class="text-xs mb-2 text-yellow-500 font-bold">> DEBUG_PROTOCOLS:</p>
                <div class="pl-2 border-l-2 border-yellow-900 ml-1">
                     <button 
                        @click="emit('toggleDebug')"
                        class="w-full text-left hover:bg-yellow-900/30 p-2 rounded transition-colors flex items-center justify-between group"
                    >
                        <div>
                             <p class="text-xs font-bold" :class="isDebug ? 'text-yellow-400 animate-pulse' : 'text-gray-500'">
                               <span class="mr-2">⚡</span> FORCE_LUCK_MODE()
                            </p>
                            <p class="text-[10px] text-gray-500 pl-6">Reroute entropy. Bias RNG towards success.</p>
                        </div>
                        <div class="text-[10px] font-black px-2 py-0.5 border" :class="isDebug ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-gray-700 text-gray-700'">
                            {{ isDebug ? 'ACTIVE' : 'OFFLINE' }}
                        </div>
                    </button>
                </div>
             </div>
        </div>

        <!-- Player View (Access Denied) -->
        <div v-else class="h-40 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
            <div class="text-4xl">🔒</div>
            <p class="text-red-500 font-black tracking-widest blink">ACCESS DENIED</p>
            <p class="text-[10px]">Administrative privileges required.</p>
        </div>

    </div>

    <!-- Footer -->
    <div class="mt-auto pt-2 text-[10px] text-gray-600 flex justify-between font-mono relative z-0">
        <span>V.1.0.4-BETA</span>
        <span class="animate-pulse">_</span>
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
