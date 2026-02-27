import type { Character, Skill } from '../types';

/**
 * Compact serialization for Character metadata.
 *
 * Persisted format uses short keys to minimize room metadata size:
 *   n  = name
 *   xp = xp
 *   s  = skills (each: { n: name, r: rank })
 *   c  = color
 *   o  = order
 *   img = imageUrl
 *
 * Fields NOT persisted: id (derived from record key), createdAt (deprecated).
 */

export interface CompactSkill {
  n: string;
  r: number;
}

export interface CompactCharacter {
  n: string;
  xp: number;
  s: CompactSkill[];
  c?: string;
  o?: number;
  img?: string;
}

/** Raw metadata may be legacy (long keys) or compact (short keys). */
type RawCharacterData = Record<string, any>;

/**
 * Detect whether a raw character object uses the compact format.
 * Compact format has `n` (string) and `s` (array) at the top level.
 * Legacy format has `name` (string) and `skills` (array).
 */
function isCompactFormat(raw: Record<string, any>): raw is CompactCharacter {
  return typeof raw.n === 'string' && Array.isArray(raw.s);
}

/**
 * Expand a single raw character record (compact or legacy) into a full Character.
 * The `id` is injected from the record key by the caller.
 */
export function fromCompactCharacter(id: string, raw: Record<string, any>): Character {
  if (isCompactFormat(raw)) {
    return {
      id,
      name: raw.n,
      xp: raw.xp,
      skills: raw.s.map((sk: CompactSkill) => ({ name: sk.n, rank: sk.r })),
      color: raw.c,
      order: raw.o,
      imageUrl: raw.img,
    };
  }

  // Legacy format — long keys, may include id / createdAt
  return {
    id,
    name: raw.name,
    xp: raw.xp ?? 0,
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    color: raw.color,
    order: raw.order,
    imageUrl: raw.imageUrl,
  };
}

/**
 * Convert a full Character record map into compact format for persistence.
 * Strips `id` and `createdAt`, shortens all keys.
 */
export function toCompactCharacters(
  data: Record<string, Character>,
): Record<string, CompactCharacter> {
  const result: Record<string, CompactCharacter> = {};
  for (const [id, char] of Object.entries(data)) {
    result[id] = toCompactCharacter(char);
  }
  return result;
}

/**
 * Convert a single Character to its compact persisted form.
 */
export function toCompactCharacter(char: Character): CompactCharacter {
  const compact: CompactCharacter = {
    n: char.name,
    xp: char.xp,
    s: char.skills.map((sk: Skill) => ({ n: sk.name, r: sk.rank })),
  };
  if (char.color !== undefined) compact.c = char.color;
  if (char.order !== undefined) compact.o = char.order;
  if (char.imageUrl !== undefined) compact.img = char.imageUrl;
  return compact;
}

/**
 * Expand a full raw metadata record into a CharacterData map.
 * Also returns whether ANY character was in legacy format (triggers re-save).
 */
export function fromCompactCharacters(
  raw: RawCharacterData,
): { characters: Record<string, Character>; needsMigration: boolean } {
  const characters: Record<string, Character> = {};
  let needsMigration = false;

  for (const [id, charData] of Object.entries(raw)) {
    if (!charData || typeof charData !== 'object') continue;
    if (!isCompactFormat(charData)) {
      needsMigration = true;
    }
    characters[id] = fromCompactCharacter(id, charData);
  }

  return { characters, needsMigration };
}
