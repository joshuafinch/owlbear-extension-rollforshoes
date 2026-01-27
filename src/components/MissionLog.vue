<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LogEntry, RollLogEntry, Character } from '../types';
import MissionReport from './MissionReport.vue';
import { LOG_TYPE_ROLL, LOG_TYPE_SKILL, ROLE_GM } from '../constants';

const props = defineProps<{
  history: LogEntry[];
  characters: Character[];
  role?: string;
}>();

const isGm = computed(() => props.role === ROLE_GM);
const visibleHistory = computed(() => {
    if (isGm.value) {
        return props.history;
    }
    return props.history.filter((entry) => {
        if (entry.type !== LOG_TYPE_ROLL) return true;
        const rollEntry = entry as RollLogEntry;
        return !(rollEntry.isNpc && rollEntry.isHiddenFromPlayers);
    });
});

const latestRollIds = computed(() => {
    const ids = new Set<string>();
    const seenChars = new Set<string>();
    
    // History is presumably sorted newest first
    for (const entry of visibleHistory.value) {
        if (entry.type === LOG_TYPE_ROLL) {
            if (!seenChars.has(entry.characterId)) {
                ids.add(entry.id);
                seenChars.add(entry.characterId);
            }
        }
    }
    return ids;
});

const emit = defineEmits<{
    (e: 'takeXp', logId: string, characterId: string): void;
    (e: 'evolve', logId: string, characterId: string, rank: number, newSkillName: string, xpCost: number): void;
    (e: 'succeeded', logId: string): void;
    (e: 'deleteLog', logId: string): void;
}>();

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isCritical = (dice: number[]) => dice.length > 0 && dice.every(d => d === 6);
const countSuccesses = (dice: number[]) => dice.filter(d => d === 6).length;
const getAdvanceCost = (dice: number[]) => dice.length - countSuccesses(dice);
const hasResolvedOutcome = (entry: RollLogEntry) => entry.actionsTaken?.some(action => action === 'advance' || action === 'succeeded') ?? false;
const canAdvanceNow = (entry: RollLogEntry) => latestRollIds.value.has(entry.id);
const shouldShowAdvanceSummary = (entry: RollLogEntry) => {
    if (entry.actionsTaken?.includes('advance')) return true;
    if (entry.actionsTaken?.includes('succeeded')) return false;
    return canAdvanceNow(entry);
};
const getAdvanceSummary = (entry: RollLogEntry) => {
    if (entry.actionsTaken?.includes('advance')) {
        return 'Skill evolved from this roll';
    }
    const dice = entry.dice;
    if (dice.length === 0) {
        return 'No dice recorded';
    }
    if (isCritical(dice)) {
        return 'All sixes — advance is free';
    }
    const xpCost = getAdvanceCost(dice);
    return `Advance cost: ${xpCost} XP`;
};

// Manage Retroactive Evolution
const activeEvolutionEntry = ref<RollLogEntry | null>(null);

const startRetroEvolution = (entry: RollLogEntry) => {
    if (entry.isNpc) return;
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
    
    // XP >= Cost (Do NOT assume +1, user must claim Fail first to get the XP)
    // However, for retroactive actions in the log, the entry might NOT have 'xp' action taken yet.
    // If we remove +1 here, users with 0 XP can NEVER advance from log unless they claim XP first.
    // Which is the desired behavior for strict accounting.
    return char.xp >= nonSixes;
};

// -- Delete Handling (No Alerts) --
const deletingLogId = ref<string | null>(null);
const deleteTimeout = ref<number | null>(null);

const getCharacterColor = (characterId: string) => {
    const char = props.characters.find(c => c.id === characterId);
    return char?.color || 'var(--obr-border-base)';
};

const handleDeleteClick = (id: string) => {
    if (deletingLogId.value === id) {
        // Confirmed
        emit('deleteLog', id);
        deletingLogId.value = null;
        if (deleteTimeout.value) window.clearTimeout(deleteTimeout.value);
    } else {
        // First Click
        deletingLogId.value = id;
        if (deleteTimeout.value) window.clearTimeout(deleteTimeout.value);
        deleteTimeout.value = window.setTimeout(() => {
            deletingLogId.value = null;
        }, 3000); // 3s reset
    }
};
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--obr-surface-base)] border-t-4 border-[var(--obr-border-base)] relative">
    
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
        :isRetroactive="true"
        @close="activeEvolutionEntry = null"
        @takeXp="(id) => { emit('takeXp', id, activeEvolutionEntry!.characterId); activeEvolutionEntry = null; }"
        @confirmEvolve="handleRetroEvolve"
    />

    <!-- Tape Header -->
    <div class="bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] px-4 py-2 text-xs font-black uppercase tracking-widest flex justify-between items-center">
        <span>// MISSION LOG // ARCHIVE</span>
        <span>REC_ID: {{ Math.floor(Date.now() / 1000) }}</span>
    </div>

    <!-- Scrollable Logs -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[var(--obr-surface-base)]">
        
        <div v-if="visibleHistory.length === 0" class="text-center py-10 opacity-40">
              <div class="text-5xl mb-2 grayscale">📇</div>
              <p class="font-black uppercase text-base text-[var(--obr-text-primary)]">Log Empty</p>
        </div>

        <template v-for="entry in visibleHistory" :key="entry.id">
            <!-- ROLL ENTRY -->
            <div 
                v-if="entry.type === LOG_TYPE_ROLL"
                class="relative bg-[var(--obr-surface-card)] p-3 shadow-md border-l-4 font-mono text-sm group transition-all hover:-translate-x-1"
                :class="isCritical(entry.dice) ? 'border-[var(--obr-status-critical)]' : ''"
                :style="!isCritical(entry.dice) ? { borderLeftColor: getCharacterColor(entry.characterId) } : {}"
            >
                <!-- Timestamp Badge -->
                <div class="absolute -right-2 -top-2 bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] px-2 py-0.5 text-[10px] font-bold transform rotate-3 group-hover:rotate-0 transition-transform">
                    {{ formatTime(entry.timestamp) }}
                </div>

                <!-- Content -->
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between items-baseline border-b border-dashed border-[var(--obr-border-subtle)] pb-1 mb-1">
                        <span class="font-black text-[var(--obr-text-primary)] text-base">{{ entry.characterName }}</span>
                        <span class="text-xs text-[var(--obr-text-secondary)]">{{ entry.skillName }} ({{ entry.rank }})</span>
                    </div>

                    <div v-if="entry.isNpc" class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em]">
                        <span class="text-[var(--obr-status-critical)]">NPC Roll</span>
                        <span 
                            class="tracking-normal px-2 py-0.5 rounded-full border text-[var(--obr-text-primary)]"
                            :class="entry.isHiddenFromPlayers ? 'border-[var(--obr-status-danger)] text-[var(--obr-status-danger)]' : 'border-[var(--obr-status-success)] text-[var(--obr-status-success)]'"
                        >
                            {{ entry.isHiddenFromPlayers ? 'Hidden from players' : 'Broadcast to players' }}
                        </span>
                    </div>
                    
                    <div class="flex items-center gap-2 mt-1">
                        <span class="font-bold text-[var(--obr-text-disabled)] select-none">></span>
                        <div class="flex gap-1 flex-wrap">
                            <span 
                                v-for="(die, i) in entry.dice" 
                                :key="i"
                                class="w-6 h-6 flex items-center justify-center border border-[var(--obr-border-base)] rounded text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]"
                                :class="die === 6 ? 'bg-[var(--obr-primary-main)] text-white' : 'bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)]'"
                            >
                                {{ die }}
                            </span>
                        </div>
                    </div>

                    <!-- Result + Actions -->
                    <div class="mt-3 space-y-3">
                        <template v-if="!entry.isNpc">
                            <div>
                                <div 
                                    v-if="!hasResolvedOutcome(entry)"
                                    class="text-[10px] uppercase font-black tracking-[0.35em] text-[var(--obr-text-secondary)] mb-1"
                                >
                                    Outcome Options
                                </div>
                                <!-- Retroactive Actions -->
                                <div 
                                    v-if="!hasResolvedOutcome(entry)" 
                                    class="flex flex-wrap gap-2"
                                >
                                  <!-- CRITICAL CASE -->
                                  <template v-if="isCritical(entry.dice)">
                                     <button 
                                         @click="startRetroEvolution(entry)"
                                         class="text-[10px] bg-[var(--obr-status-critical)] text-white hover:opacity-90 border border-[var(--obr-border-base)] px-2 py-1 font-bold uppercase animate-pulse"
                                     >
                                         Evolve!
                                     </button>
                                  </template>

                                  <!-- STANDARD CASE -->
                                  <template v-else>
                                      <!-- Fail (+1 XP) -->
                                      <button 
                                         v-if="!entry.actionsTaken?.includes('xp')"
                                         @click="emit('takeXp', entry.id, entry.characterId)"
                                         class="text-[10px] bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 font-bold uppercase text-[var(--obr-status-danger)]"
                                         title="Claim 1 XP for Failure"
                                     >
                                         FAIL (+1 XP)
                                     </button>
                                     <span v-else class="text-[10px] text-[var(--obr-text-disabled)] font-bold italic uppercase mr-2">XP Claimed</span>

                                     <!-- Advance -->
                                     <button 
                                        v-if="canAffordAdvance(entry) && canAdvanceNow(entry)"
                                        @click="startRetroEvolution(entry)"
                                        class="text-[10px] bg-[var(--obr-primary-main)] text-white hover:opacity-90 border border-[var(--obr-border-base)] px-2 py-1 font-bold uppercase animate-pulse"
                                        title="Spend XP to Advance"
                                    >
                                        Advance!
                                    </button>

                                      <!-- Success (Only if XP not taken) -->
                                      <button 
                                         v-if="!entry.actionsTaken?.includes('xp')"
                                         @click="emit('succeeded', entry.id)"
                                         class="text-[10px] bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 font-bold uppercase text-[var(--obr-status-success)]"
                                         title="Mark as Succeeded"
                                     >
                                         SUCCESS
                                     </button>
                                  </template>
                                </div>
                                
                                <!-- Terminal State Status -->
                                <div v-else class="text-[10px] text-[var(--obr-text-disabled)] uppercase font-bold italic">
                                    <span v-if="entry.actionsTaken?.includes('advance')">Evolved</span>
                                    <span v-else-if="entry.actionsTaken?.includes('succeeded')">Succeeded</span>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2 justify-between border-t border-dashed border-[var(--obr-border-subtle)] pt-2">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span v-if="isCritical(entry.dice)" class="text-[var(--obr-status-critical)] font-black text-xs uppercase border-2 border-[var(--obr-status-critical)] px-1 transform -rotate-2">
                                        ★ CRITICAL ★
                                    </span>
                                    <span 
                                        v-if="shouldShowAdvanceSummary(entry)"
                                        class="text-[10px] font-bold uppercase tracking-wide text-[var(--obr-text-secondary)]"
                                    >
                                        {{ getAdvanceSummary(entry) }}
                                    </span>
                                </div>
                                
                                <!-- Delete Button (Only on Hover) -->
                                <button 
                                    @click="handleDeleteClick(entry.id)"
                                    class="opacity-0 group-hover:opacity-100 transition-opacity font-bold px-1 rounded text-xs"
                                    :class="deletingLogId === entry.id ? 'bg-[var(--obr-status-danger)] text-white opacity-100' : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-status-danger)]'"
                                    :title="deletingLogId === entry.id ? 'Click again to confirm delete' : 'Delete Log Entry'"
                                >
                                    {{ deletingLogId === entry.id ? 'CONFIRM?' : '✕' }}
                                </button>
                            </div>
                        </template>
                        <template v-else>
                            <div class="text-[10px] uppercase font-black tracking-[0.35em] text-[var(--obr-text-secondary)]">
                                No advancement options — NPC intel only.
                            </div>
                            <div class="flex justify-end">
                                <button 
                                    @click="handleDeleteClick(entry.id)"
                                    class="opacity-100 font-bold px-2 py-1 rounded text-xs border"
                                    :class="deletingLogId === entry.id ? 'bg-[var(--obr-status-danger)] text-white border-[var(--obr-status-danger)]' : 'text-[var(--obr-text-secondary)] border-transparent hover:border-[var(--obr-border-subtle)]'"
                                    :title="deletingLogId === entry.id ? 'Click again to confirm delete' : 'Delete Log Entry'"
                                >
                                    {{ deletingLogId === entry.id ? 'CONFIRM?' : 'Delete' }}
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- SKILL ENTRY -->
            <div 
                v-else-if="entry.type === LOG_TYPE_SKILL"
                class="relative bg-[var(--obr-surface-card)] p-3 shadow-md border-l-4 font-mono text-sm my-2 group transition-all hover:-translate-x-1"
                :style="{ borderLeftColor: getCharacterColor(entry.characterId) }"
            >
                <!-- Header: Character Name + Time -->
                <div class="flex justify-between items-baseline border-b border-dashed border-[var(--obr-border-subtle)] pb-1 mb-2">
                    <span class="font-black text-[var(--obr-text-primary)] text-base">{{ entry.characterName }}</span>
                    <span class="text-[10px] font-bold text-[var(--obr-text-secondary)]">{{ formatTime(entry.timestamp) }}</span>
                </div>
                
                <!-- Achievement Block -->
                <div class="bg-[var(--obr-primary-main)]/5 rounded p-3 text-center border border-[var(--obr-primary-main)]/20 mb-2 relative overflow-hidden">
                    <!-- Decorator Icon -->
                    <div class="absolute -right-4 -bottom-4 text-[var(--obr-primary-main)] opacity-10 text-6xl transform rotate-12 select-none">★</div>
                    
                    <div class="text-[9px] uppercase text-[var(--obr-primary-main)] tracking-[0.2em] font-black mb-1">
                        ✨ Skill Acquired
                    </div>
                    
                    <div class="font-black text-lg leading-tight text-[var(--obr-text-primary)] my-1 relative z-10">
                        {{ entry.newSkillName }}
                    </div>

                    <div class="inline-block bg-[var(--obr-text-primary)] text-[var(--obr-text-inverse)] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm mt-1 relative z-10">
                        Rank {{ entry.rank }}
                    </div>
                </div>

                <!-- Footer: Cost + Actions -->
                <div class="flex justify-between items-center mt-1">
                     <!-- Cost Badge -->
                    <div class="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                         :class="entry.cost > 0 ? 'bg-[var(--obr-bg-default)] text-[var(--obr-text-disabled)]' : 'bg-[var(--obr-status-success)]/10 text-[var(--obr-status-success)]'"
                    >
                        <span v-if="entry.cost > 0">-{{ entry.cost }} XP</span>
                        <span v-else>Free (Crit)</span>
                    </div>

                    <!-- Delete Button (Standardized) -->
                     <button 
                        @click="handleDeleteClick(entry.id)"
                        class="opacity-0 group-hover:opacity-100 transition-opacity font-bold ml-2 px-1 rounded text-xs"
                        :class="deletingLogId === entry.id ? 'bg-[var(--obr-status-danger)] text-white opacity-100' : 'text-[var(--obr-text-disabled)] hover:text-[var(--obr-status-danger)]'"
                        :title="deletingLogId === entry.id ? 'Click again to confirm delete' : 'Delete Log Entry'"
                    >
                        {{ deletingLogId === entry.id ? 'CONFIRM?' : '✕' }}
                    </button>
                </div>
            </div>
        </template>

    </div>
  </div>
</template>
