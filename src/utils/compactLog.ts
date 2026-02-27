import { LOG_TYPE_ROLL, LOG_TYPE_SKILL } from '../constants';
import type { LogEntry, RollLogEntry, SkillLogEntry } from '../types';

/**
 * Compact serialization for log entries.
 *
 * Persisted key mapping:
 *   t   = type
 *   id  = id
 *   cid = characterId
 *   cn  = characterName
 *   sn  = skillName
 *   r   = rank
 *   d   = dice
 *   ts  = timestamp
 *   a   = actionsTaken
 *   esn = evolvedSkillName
 *   npc = isNpc
 *   hid = isHiddenFromPlayers
 *   nsn = newSkillName
 *   co  = cost
 *   sri = sourceRollId
 */

export interface CompactRollLog {
  t: string;
  id: string;
  cid: string;
  cn?: string;
  sn: string;
  r: number;
  d: number[];
  ts: number;
  a?: string[];
  esn?: string;
  npc?: boolean;
  hid?: boolean;
}

export interface CompactSkillLog {
  t: string;
  id: string;
  cid: string;
  cn?: string;
  nsn: string;
  r: number;
  ts: number;
  co: number;
  sri?: string;
}

export type CompactLogEntry = CompactRollLog | CompactSkillLog;

/** Detect whether a raw log entry uses compact format (has `t` instead of `type`). */
function isCompactFormat(raw: Record<string, any>): boolean {
  return typeof raw.t === 'string' && raw.type === undefined;
}

/**
 * Expand a single raw log entry (compact or legacy) into a full LogEntry.
 */
export function fromCompactLog(raw: Record<string, any>): LogEntry {
  if (isCompactFormat(raw)) {
    if (raw.t === LOG_TYPE_ROLL) {
      const entry: RollLogEntry = {
        type: LOG_TYPE_ROLL,
        id: raw.id,
        characterId: raw.cid,
        skillName: raw.sn,
        rank: raw.r,
        dice: raw.d,
        timestamp: raw.ts,
      };
      if (raw.cn !== undefined) entry.characterName = raw.cn;
      if (raw.a !== undefined) entry.actionsTaken = raw.a;
      if (raw.esn !== undefined) entry.evolvedSkillName = raw.esn;
      if (raw.npc !== undefined) entry.isNpc = raw.npc;
      if (raw.hid !== undefined) entry.isHiddenFromPlayers = raw.hid;
      return entry;
    }

    if (raw.t === LOG_TYPE_SKILL) {
      const entry: SkillLogEntry = {
        type: LOG_TYPE_SKILL,
        id: raw.id,
        characterId: raw.cid,
        newSkillName: raw.nsn,
        rank: raw.r,
        timestamp: raw.ts,
        cost: raw.co,
      };
      if (raw.cn !== undefined) entry.characterName = raw.cn;
      if (raw.sri !== undefined) entry.sourceRollId = raw.sri;
      return entry;
    }
  }

  // Legacy format — already has long keys
  // Apply same migration logic: ensure type and id exist
  if (!raw.type) {
    return { ...raw, type: LOG_TYPE_ROLL } as RollLogEntry;
  }
  if (raw.type === LOG_TYPE_SKILL && !raw.id) {
    return {
      ...raw,
      id: crypto.randomUUID(),
      characterId: raw.characterId || '',
    } as SkillLogEntry;
  }
  return raw as LogEntry;
}

/**
 * Convert a full LogEntry to compact format for persistence.
 */
export function toCompactLog(entry: LogEntry): CompactLogEntry {
  if (entry.type === LOG_TYPE_ROLL) {
    const compact: CompactRollLog = {
      t: entry.type,
      id: entry.id,
      cid: entry.characterId,
      sn: entry.skillName,
      r: entry.rank,
      d: entry.dice,
      ts: entry.timestamp,
    };
    if (entry.characterName !== undefined) compact.cn = entry.characterName;
    if (entry.actionsTaken !== undefined && entry.actionsTaken.length > 0) compact.a = entry.actionsTaken;
    if (entry.evolvedSkillName !== undefined) compact.esn = entry.evolvedSkillName;
    if (entry.isNpc !== undefined) compact.npc = entry.isNpc;
    if (entry.isHiddenFromPlayers !== undefined) compact.hid = entry.isHiddenFromPlayers;
    return compact;
  }

  // SKILL
  const compact: CompactSkillLog = {
    t: entry.type,
    id: entry.id,
    cid: entry.characterId,
    nsn: entry.newSkillName,
    r: entry.rank,
    ts: entry.timestamp,
    co: entry.cost,
  };
  if (entry.characterName !== undefined) compact.cn = entry.characterName;
  if (entry.sourceRollId !== undefined) compact.sri = entry.sourceRollId;
  return compact;
}

/**
 * Convert an array of LogEntries to compact format.
 */
export function toCompactLogs(entries: LogEntry[]): CompactLogEntry[] {
  return entries.map(toCompactLog);
}

/**
 * Expand an array of raw log entries (compact or legacy) into LogEntry[].
 * Returns whether any entries were in legacy format (triggers re-save).
 */
export function fromCompactLogs(
  rawLogs: Record<string, any>[],
): { logs: LogEntry[]; needsMigration: boolean } {
  let needsMigration = false;
  const logs = rawLogs.map((raw) => {
    if (!isCompactFormat(raw)) {
      needsMigration = true;
    }
    return fromCompactLog(raw);
  });
  return { logs, needsMigration };
}
