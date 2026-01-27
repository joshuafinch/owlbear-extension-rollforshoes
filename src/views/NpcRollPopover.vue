<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import {
  MODAL_NPC_ROLL_POPOVER,
  METADATA_SUFFIX_CHARACTERS,
  METADATA_SUFFIX_LINK,
  BROADCAST_NPC_ROLL_REQUEST,
} from '../constants';
import type { CharacterData, CharacterLink, NpcRollRequest } from '../types';
import getPluginId from '../utils/getPluginId';
import RankPicker from '../components/RankPicker.vue';

const params = new URLSearchParams(window.location.search);
const tokenId = params.get('tokenId') ?? undefined;

const npcName = ref('NPC Operative');
const skillName = ref('Do Anything');
const diceCount = ref(2);
const revealToPlayers = ref(true);
const isSubmitting = ref(false);
const isLoaded = ref(false);
const errorMessage = ref<string | null>(null);

const MIN_DICE = 1;
const MAX_DICE = 10;

const charactersKey = getPluginId(METADATA_SUFFIX_CHARACTERS);
const linkKey = getPluginId(METADATA_SUFFIX_LINK);
const popoverId = getPluginId(MODAL_NPC_ROLL_POPOVER);
const npcRollChannel = getPluginId(BROADCAST_NPC_ROLL_REQUEST);

const sanitizedNpcName = computed(() => npcName.value.trim() || 'NPC Operative');
const sanitizedSkillName = computed(() => skillName.value.trim() || 'Do Anything');

const clampDice = (value: number) => Math.min(MAX_DICE, Math.max(MIN_DICE, Math.floor(value)));

const closePopover = async () => {
  try {
    if (OBR.isAvailable) {
      await OBR.popover.close(popoverId);
    } else {
      window.close();
    }
  } catch (error) {
    console.error('Failed to close NPC roll popover', error);
  }
};

const submitRoll = async () => {
  if (!OBR.isAvailable || !tokenId) {
    errorMessage.value = 'Token unavailable. Try again.';
    return;
  }

  const payload: NpcRollRequest = {
    npcName: sanitizedNpcName.value,
    skillName: sanitizedSkillName.value,
    diceCount: clampDice(diceCount.value),
    revealToPlayers: revealToPlayers.value,
  };

  try {
    isSubmitting.value = true;
    await OBR.broadcast.sendMessage(npcRollChannel, payload, { destination: 'ALL' });
    await closePopover();
  } catch (error) {
    console.error('Failed to dispatch NPC roll request', error);
    errorMessage.value = 'Failed to dispatch roll. Try again.';
  } finally {
    isSubmitting.value = false;
  }
};

const hydrateDefaults = async () => {
  if (!OBR.isAvailable) {
    errorMessage.value = 'OBR not available.';
    isLoaded.value = true;
    return;
  }

  if (!tokenId) {
    errorMessage.value = 'Token reference missing.';
    isLoaded.value = true;
    return;
  }

  try {
    const [item] = await OBR.scene.items.getItems([tokenId]);
    if (!item) {
      errorMessage.value = 'Token no longer exists.';
      return;
    }

    const itemWithText = item as { text?: { plainText?: string } };
    const tokenText = itemWithText.text?.plainText?.trim();
    const tokenName = item.name?.trim();

    if (tokenText) {
      npcName.value = tokenText;
    } else if (tokenName) {
      npcName.value = tokenName;
    }

    const metadata = await OBR.room.getMetadata();
    const characters = (metadata[charactersKey] as CharacterData | undefined) ?? undefined;
    const link = item.metadata[linkKey] as CharacterLink | undefined;
    if (!tokenText && !tokenName && link?.characterId && characters?.[link.characterId]) {
      npcName.value = characters[link.characterId].name;
    }
  } catch (error) {
    console.error('Failed to hydrate NPC popover defaults', error);
    errorMessage.value = 'Unable to load token data.';
  } finally {
    isLoaded.value = true;
  }
};

onMounted(() => {
  if (!OBR.isAvailable) {
    errorMessage.value = 'OBR unavailable.';
    isLoaded.value = true;
    return;
  }
  OBR.onReady(() => {
    hydrateDefaults();
  });
});
</script>

<template>
  <div class="h-full w-full flex items-center justify-center p-3 text-[var(--obr-text-primary)]">
    <div class="w-full max-w-[260px] bg-[var(--obr-surface-card)] border border-[var(--obr-border-base)] rounded-2xl p-4 space-y-3 shadow-xl">
      <header class="flex items-center justify-between">
        <h1 class="text-base font-black uppercase tracking-[0.3em]">NPC Roll</h1>
        <span class="text-[10px] font-bold text-[var(--obr-text-secondary)]">{{ diceCount }}d6</span>
      </header>

      <div v-if="!isLoaded" class="text-center text-xs text-[var(--obr-text-secondary)] animate-pulse">
        Syncing token data…
      </div>

      <div v-else class="space-y-2">
        <input
          v-model="npcName"
          type="text"
          class="w-full bg-[var(--obr-surface-input)] border border-[var(--obr-border-subtle)] rounded-lg px-3 py-2 font-bold"
          placeholder="Codename"
        />

        <input
          v-model="skillName"
          type="text"
          class="w-full bg-[var(--obr-surface-input)] border border-[var(--obr-border-subtle)] rounded-lg px-3 py-2 font-bold"
          placeholder="Skill (e.g. Do Anything)"
        />

        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-[0.3em] text-[var(--obr-text-secondary)]">Dice</span>
          <RankPicker v-model="diceCount" :max-rank="MAX_DICE" label="" />
        </div>

        <div class="flex items-center justify-between bg-[var(--obr-surface-base)] border border-[var(--obr-border-subtle)] rounded-lg px-3 py-2">
          <p class="text-xs font-bold">
            {{ revealToPlayers ? 'Broadcast to players' : 'Hidden (GM only)' }}
          </p>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer" v-model="revealToPlayers" />
            <div class="w-10 h-5 bg-[var(--obr-border-subtle)] rounded-full peer-checked:bg-[var(--obr-primary-main)] transition-colors"></div>
            <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-[var(--obr-surface-card)] rounded-full transition-all peer-checked:translate-x-5"></div>
          </label>
        </div>

        <p v-if="errorMessage" class="text-xs text-[var(--obr-status-danger)] font-bold">{{ errorMessage }}</p>

        <div class="flex gap-2 pt-1">
          <button
            type="button"
            class="flex-1 border border-[var(--obr-border-subtle)] text-[var(--obr-text-secondary)] rounded-lg py-2 font-bold uppercase text-[10px]"
            @click="closePopover"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 bg-[var(--obr-status-critical)] text-white rounded-lg py-2 font-black uppercase text-[10px] tracking-[0.3em] shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none disabled:opacity-60"
            :disabled="isSubmitting || !isLoaded"
            @click="submitRoll"
          >
            {{ isSubmitting ? 'Rolling…' : 'Roll' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
