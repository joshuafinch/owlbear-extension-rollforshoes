<script setup lang="ts">
import { ref } from 'vue';
import type { LogEntry, RollLogEntry, Character } from '../types';
import MissionReport from './MissionReport.vue';

const props = defineProps<{
  history: LogEntry[];
  characters: Character[];
}>();

const emit = defineEmits<{
    (e: 'takeXp', logId: string, characterId: string): void;
    (e: 'evolve', logId: string, characterId: string, rank: number, newSkillName: string, xpCost: number): void;
    (e: 'succeeded', logId: string): void;
}>();

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isCritical = (dice: number[]) => dice.length > 0 && dice.every(d => d === 6);
const countSuccesses = (dice: number[]) => dice.filter(d => d === 6).length;

// Manage Retroactive Evolution
const activeEvolutionEntry = ref<RollLogEntry | null>(null);

const startRetroEvolution = (entry: RollLogEntry) => {
    activeEvolutionEntry.value = entry;
};

const handleRetroEvolve = (logId: string, newSkillName: string, xpCost: number) => {
    if (activeEvolutionEntry.value) {
        emit('evolve', logId, activeEvolutionEntry.value.characterId, activeEvolutionEntry.value.rank, newSkillName, xpCost);
        activeEvolutionEntry.value = null;
    }
};

// Helper to check if a specific entry can afford advancement
const canAffordAdvance = (entry: RollLogEntry) => {
    const char = props.characters.find(c => c.id === entry.characterId);
    if (!char) return false;
    
    const successes = countSuccesses(entry.dice);
    const nonSixes = entry.dice.length - successes;
    
    // XP + 1 (from this failure) >= Cost
    return (char.xp + 1) >= nonSixes;
};
</script>

<template>
  <div class="h-full flex flex-col bg-[#f0f0f0] border-t-4 border-[var(--obr-text-primary)] relative">
    
    <!-- Reuse Mission Report for Retroactive Evolution -->
    <MissionReport 
        v-if="activeEvolutionEntry"
        :result="{
            id: activeEvolutionEntry.id,
            characterId: activeEvolutionEntry.characterId,
            characterName: activeEvolutionEntry.characterName,
            skillName: activeEvolutionEntry.skillName,
            rank: activeEvolutionEntry.rank,
            dice: activeEvolutionEntry.dice
        }"
        :character="characters.find(c => c.id === activeEvolutionEntry?.characterId)"
        @close="activeEvolutionEntry = null"
        @takeXp="(id) => { emit('takeXp', id, activeEvolutionEntry!.characterId); activeEvolutionEntry = null; }"
        @confirmEvolve="handleRetroEvolve"
    />

    <!-- Tape Header -->
    <div class="bg-[var(--obr-text-primary)] text-[var(--obr-bg-paper)] px-4 py-2 text-xs font-black uppercase tracking-widest flex justify-between items-center">
        <span>// MISSION LOG // ARCHIVE</span>
        <span>REC_ID: {{ Math.floor(Date.now() / 1000) }}</span>
    </div>

    <!-- Scrollable Logs -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]">
        
        <div v-if="history.length === 0" class="text-center py-10 opacity-40">
             <div class="text-5xl mb-2 grayscale">📇</div>
             <p class="font-black uppercase text-base">Log Empty</p>
        </div>

        <template v-for="(entry, index) in history" :key="index">
            <!-- ROLL ENTRY -->
            <div 
                v-if="entry.type === 'ROLL'"
                class="relative bg-white p-3 shadow-md border-l-4 font-mono text-sm group transition-all hover:-translate-x-1"
                :class="isCritical(entry.dice) ? 'border-[#ff0055]' : 'border-black'"
            >
                <!-- Timestamp Badge -->
                <div class="absolute -right-2 -top-2 bg-black text-white px-2 py-0.5 text-[10px] font-bold transform rotate-3 group-hover:rotate-0 transition-transform">
                    {{ formatTime(entry.timestamp) }}
                </div>

                <!-- Content -->
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-1 mb-1">
                        <span class="font-black uppercase text-black text-base">{{ entry.characterName }}</span>
                        <span class="text-xs text-gray-500 uppercase">{{ entry.skillName }} ({{ entry.rank }})</span>
                    </div>
                    
                    <div class="flex items-center gap-2 mt-1">
                        <span class="font-bold text-gray-400 select-none">></span>
                        <div class="flex gap-1 flex-wrap">
                            <span 
                                v-for="(die, i) in entry.dice" 
                                :key="i"
                                class="w-6 h-6 flex items-center justify-center border border-black rounded text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                :class="die === 6 ? 'bg-[var(--obr-primary-main)] text-white' : 'bg-gray-100 text-gray-600'"
                            >
                                {{ die }}
                            </span>
                        </div>
                    </div>

                    <!-- Result Tag -->
                    <div class="mt-2 flex justify-between items-center">
                        <!-- Retroactive Actions -->
                        <div v-if="!entry.actionsTaken?.length" class="flex gap-2">
                             <template v-if="!isCritical(entry.dice)">
                                 <button 
                                    @click="emit('takeXp', entry.id, entry.characterId)"
                                    class="text-[10px] bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 font-bold uppercase text-red-600"
                                    title="Claim 1 XP for Failure"
                                >
                                    FAIL (+1 XP)
                                </button>
                                <button 
                                    v-if="canAffordAdvance(entry)"
                                    @click="startRetroEvolution(entry)"
                                    class="text-[10px] bg-[var(--obr-primary-main)] text-white hover:opacity-90 border border-black px-2 py-1 font-bold uppercase animate-pulse"
                                    title="Spend XP to Advance"
                                >
                                    Advance!
                                </button>
                                 <button 
                                    @click="emit('succeeded', entry.id)"
                                    class="text-[10px] bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 font-bold uppercase text-green-600"
                                    title="Mark as Succeeded"
                                >
                                    SUCCESS
                                </button>
                             </template>
                             <template v-else>
                                <button 
                                    @click="startRetroEvolution(entry)"
                                    class="text-[10px] bg-[#ff0055] text-white hover:bg-[#d40045] border border-black px-2 py-1 font-bold uppercase animate-pulse"
                                >
                                    Evolve!
                                </button>
                             </template>
                        </div>
                        <div v-else class="text-[10px] text-gray-400 uppercase font-bold italic">
                            <span v-if="entry.actionsTaken.includes('advance')">Evolved</span>
                            <span v-else-if="entry.actionsTaken.includes('xp')">XP Claimed</span>
                            <span v-else-if="entry.actionsTaken.includes('succeeded')">Succeeded</span>
                        </div>

                        <div class="flex justify-end ml-auto">
                            <span v-if="isCritical(entry.dice)" class="text-[#ff0055] font-black text-xs uppercase border-2 border-[#ff0055] px-1 transform -rotate-2">
                                ★ CRITICAL ★
                            </span>
                            <span v-else-if="countSuccesses(entry.dice) > 0" class="text-[var(--obr-primary-main)] font-bold text-xs uppercase">
                                {{ countSuccesses(entry.dice) }} Successes
                            </span>
                            <span v-else class="text-gray-400 font-bold text-xs uppercase">
                                Standard
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SKILL ENTRY -->
            <div 
                v-else-if="entry.type === 'SKILL'"
                class="relative bg-[var(--obr-bg-default)] p-3 shadow-md border-l-4 border-[var(--obr-primary-main)] font-mono text-sm opacity-90"
            >
                 <!-- Timestamp Badge -->
                 <div class="absolute -right-2 -top-2 bg-[var(--obr-primary-main)] text-white px-2 py-0.5 text-[10px] font-bold rounded-full">
                    {{ formatTime(entry.timestamp) }}
                </div>
                
                <div class="flex flex-col gap-1 text-center">
                    <div class="text-xs uppercase text-gray-500 tracking-widest mb-1">Skill Acquired</div>
                    <div class="font-black uppercase text-lg leading-tight">{{ entry.newSkillName }}</div>
                    <div class="text-xs font-bold bg-black text-white px-2 py-1 inline-block mx-auto rounded mt-1">
                        Rank {{ entry.rank }}
                    </div>
                    <div class="mt-2 text-[10px] uppercase border-t border-gray-200 pt-1 flex justify-between px-2">
                        <span>{{ entry.characterName }}</span>
                        <span v-if="entry.cost > 0">-{{ entry.cost }} XP</span>
                        <span v-else>Free (Crit)</span>
                    </div>
                </div>
            </div>
        </template>

    </div>
  </div>
</template>
