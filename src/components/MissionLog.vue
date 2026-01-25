<script setup lang="ts">
import type { RollEntry } from '../types';

const props = defineProps<{
  history: RollEntry[];
}>();

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isCritical = (dice: number[]) => dice.length > 0 && dice.every(d => d === 6);
const countSuccesses = (dice: number[]) => dice.filter(d => d === 6).length;
</script>

<template>
  <div class="h-full flex flex-col bg-[#f0f0f0] border-t-4 border-[var(--obr-text-primary)]">
    
    <!-- Tape Header -->
    <div class="bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] px-4 py-1 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
        <span>// MISSION LOG // ARCHIVE</span>
        <span>REC_ID: {{ Math.floor(Date.now() / 1000) }}</span>
    </div>

    <!-- Scrollable Logs -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]">
        
        <div v-if="history.length === 0" class="text-center py-10 opacity-40">
             <div class="text-4xl mb-2 grayscale">📇</div>
             <p class="font-black uppercase text-sm">Log Empty</p>
        </div>

        <div 
            v-for="entry in history" 
            :key="entry.id"
            class="relative bg-white p-3 shadow-md border-l-4 font-mono text-xs group transition-all hover:-translate-x-1"
            :class="isCritical(entry.dice) ? 'border-[#ff0055]' : 'border-black'"
        >
            <!-- Timestamp Badge -->
            <div class="absolute -right-2 -top-2 bg-black text-white px-1.5 py-0.5 text-[8px] font-bold transform rotate-3 group-hover:rotate-0 transition-transform">
                {{ formatTime(entry.timestamp) }}
            </div>

            <!-- Content -->
            <div class="flex flex-col gap-1">
                <div class="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-1 mb-1">
                    <span class="font-black uppercase text-black">{{ entry.characterName }}</span>
                    <span class="text-[10px] text-gray-500 uppercase">{{ entry.skillName }} ({{ entry.rank }})</span>
                </div>
                
                <div class="flex items-center gap-2 mt-1">
                    <span class="font-bold text-gray-400 select-none">></span>
                    <div class="flex gap-1 flex-wrap">
                        <span 
                            v-for="(die, i) in entry.dice" 
                            :key="i"
                            class="w-5 h-5 flex items-center justify-center border border-black rounded text-[10px] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            :class="die === 6 ? 'bg-[var(--obr-primary-main)] text-white' : 'bg-gray-100 text-gray-600'"
                        >
                            {{ die }}
                        </span>
                    </div>
                </div>

                <!-- Result Tag -->
                <div class="mt-2 flex justify-end">
                    <span v-if="isCritical(entry.dice)" class="text-[#ff0055] font-black text-[10px] uppercase border-2 border-[#ff0055] px-1 transform -rotate-2">
                        ★ CRITICAL ★
                    </span>
                    <span v-else-if="countSuccesses(entry.dice) > 0" class="text-[var(--obr-primary-main)] font-bold text-[10px] uppercase">
                        {{ countSuccesses(entry.dice) }} Successes
                    </span>
                    <span v-else class="text-gray-400 font-bold text-[10px] uppercase">
                        Standard
                    </span>
                </div>
            </div>
        </div>

    </div>
  </div>
</template>
