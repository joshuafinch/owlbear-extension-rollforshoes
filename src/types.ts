export interface Skill {
  name: string;
  rank: number;
}

export interface Character {
  id: string;
  name: string;
  xp: number;
  skills: Skill[];
  createdAt: number;
  imageUrl?: string;
  order?: number; // Added order field
}

export interface CharacterLink {
  characterId: string;
}

export type CharacterData = Record<string, Character>;

export interface LegacyRollEntry {
  id: string;
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
  timestamp: number;
  actionsTaken?: ('xp' | 'advance' | 'succeeded')[];
}

export interface RollLogEntry {
  type: 'ROLL';
  id: string;
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
  timestamp: number;
  actionsTaken?: ('xp' | 'advance' | 'succeeded')[];
}

export interface SkillLogEntry {
  type: 'SKILL';
  id: string;
  characterId: string;
  characterName: string;
  newSkillName: string;
  rank: number;
  timestamp: number;
  cost: number;
}

export type LogEntry = RollLogEntry | SkillLogEntry;
