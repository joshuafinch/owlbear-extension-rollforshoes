import { LOG_TYPE_ROLL, LOG_TYPE_SKILL } from '../constants';
import type { RollLogEntry } from '../types';
import { useRollForShoes } from './useRollForShoes';

interface EvolveOptions {
  logId: string;
  newSkillName: string;
  xpCost: number;
  fallbackCharacterId?: string;
  fallbackRank?: number;
}

const ACTION_LABELS = {
  xp: 'xp',
  evolve: 'evolve',
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

    // Mark log FIRST to prevent potential UI race where user can click again
    await markLogAction(logId, ACTION_LABELS.xp);
    await addXp(characterId, 1);

    const char = characterList.value.find((c) => c.id === characterId);
    if (char) {
      // OBR.notification.show(`${char.name} gains 1 XP (Total: ${char.xp}).`);
    } else {
      // OBR.notification.show('Failure recorded: +1 XP applied.');
    }
  };

  const evolveSkillFromRoll = async ({
    logId,
    newSkillName,
    xpCost,
    fallbackCharacterId,
    fallbackRank,
  }: EvolveOptions) => {
    const entry = findRollEntry(logId);
    const characterId = resolveCharacterId(entry, fallbackCharacterId);
    if (!characterId) {
      console.warn('[MissionReport] Unable to locate character for evolution', { logId });
      return;
    }

    const rank = resolveRank(entry, fallbackRank);

    await addSkill(characterId, {
      name: newSkillName,
      rank: rank + 1,
    });

    if (xpCost > 0) {
      await addXp(characterId, -xpCost);
    }

    await markLogAction(logId, ACTION_LABELS.evolve);

    await addLogEntry({
      type: LOG_TYPE_SKILL,
      id: crypto.randomUUID(),
      characterId,
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

    // OBR.notification.show(
    //   `${characterName} evolved new skill: ${newSkillName} (Rank ${rank + 1})`,
    //   'SUCCESS',
    // );
  };

  const markRollSucceeded = async (logId: string) => {
    await markLogAction(logId, ACTION_LABELS.succeeded);
  };

  return {
    awardFailureXp,
    evolveSkillFromRoll,
    markRollSucceeded,
  };
}
