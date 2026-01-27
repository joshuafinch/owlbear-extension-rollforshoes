import OBR from '@owlbear-rodeo/sdk';
import { LOG_TYPE_ROLL, LOG_TYPE_SKILL } from '../constants';
import type { RollLogEntry } from '../types';
import { useRollForShoes } from './useRollForShoes';

interface AdvanceOptions {
  logId: string;
  newSkillName: string;
  xpCost: number;
  fallbackCharacterId?: string;
  fallbackCharacterName?: string;
  fallbackRank?: number;
}

const ACTION_LABELS = {
  xp: 'xp',
  advance: 'advance',
  succeeded: 'succeeded',
} as const;

export function useMissionReportControls() {
  const {
    addXp,
    addSkill,
    addLogEntry,
    markLogAction,
    updateRollEntry,
    rollHistory,
    characterList,
  } = useRollForShoes();

  const findRollEntry = (logId: string): RollLogEntry | undefined => {
    return rollHistory.value.find(
      (entry): entry is RollLogEntry => entry.type === LOG_TYPE_ROLL && entry.id === logId,
    );
  };

  const resolveCharacterId = (
    entry: RollLogEntry | undefined,
    fallbackCharacterId?: string,
  ): string | undefined => {
    return entry?.characterId ?? fallbackCharacterId;
  };

  const resolveCharacterName = (
    entry: RollLogEntry | undefined,
    fallbackCharacterName?: string,
  ) => {
    if (entry?.characterName) return entry.characterName;
    if (fallbackCharacterName) return fallbackCharacterName;
    if (entry?.characterId) {
      const char = characterList.value.find((c) => c.id === entry.characterId);
      if (char) return char.name;
    }
    return 'Unknown Agent';
  };

  const resolveRank = (entry: RollLogEntry | undefined, fallbackRank?: number) => {
    if (entry) return entry.rank;
    if (typeof fallbackRank === 'number') return fallbackRank;
    return 0;
  };

  const awardFailureXp = async (logId: string, fallbackCharacterId?: string) => {
    const entry = findRollEntry(logId);
    const characterId = resolveCharacterId(entry, fallbackCharacterId);
    if (!characterId) {
      console.warn('[MissionReport] Unable to locate character for XP award', { logId });
      return;
    }

    await addXp(characterId, 1);
    await markLogAction(logId, ACTION_LABELS.xp);

    const char = characterList.value.find((c) => c.id === characterId);
    if (char) {
      OBR.notification.show(`${char.name} gains 1 XP (Total: ${char.xp}).`);
    } else {
      OBR.notification.show('Failure recorded: +1 XP applied.');
    }
  };

  const advanceSkillFromRoll = async ({
    logId,
    newSkillName,
    xpCost,
    fallbackCharacterId,
    fallbackCharacterName,
    fallbackRank,
  }: AdvanceOptions) => {
    const entry = findRollEntry(logId);
    const characterId = resolveCharacterId(entry, fallbackCharacterId);
    if (!characterId) {
      console.warn('[MissionReport] Unable to locate character for advancement', { logId });
      return;
    }

    const characterName = resolveCharacterName(entry, fallbackCharacterName);
    const rank = resolveRank(entry, fallbackRank);

    await addSkill(characterId, {
      name: newSkillName,
      rank: rank + 1,
    });

    if (xpCost > 0) {
      await addXp(characterId, -xpCost);
    }

    await markLogAction(logId, ACTION_LABELS.advance);

    await addLogEntry({
      type: LOG_TYPE_SKILL,
      id: crypto.randomUUID(),
      characterId,
      characterName,
      newSkillName,
      rank: rank + 1,
      timestamp: Date.now(),
      cost: xpCost,
      sourceRollId: logId,
    });

    await updateRollEntry(logId, (entry: RollLogEntry) => ({
      ...entry,
      evolvedSkillName: newSkillName,
    }));

    OBR.notification.show(
      `${characterName} acquired new skill: ${newSkillName} (Rank ${rank + 1})`,
      'SUCCESS',
    );
  };

  const markRollSucceeded = async (logId: string) => {
    await markLogAction(logId, ACTION_LABELS.succeeded);
    const entry = findRollEntry(logId);
    const characterName = resolveCharacterName(entry);
    OBR.notification.show(`${characterName}'s roll marked as Succeeded.`);
  };

  return {
    awardFailureXp,
    advanceSkillFromRoll,
    markRollSucceeded,
  };
}
