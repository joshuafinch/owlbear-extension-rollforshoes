import { LOG_TYPE_ROLL } from './constants';

export interface Skill {
  name: string;
  rank: number;
}

export interface NpcRollRequest {
  npcName: string;
  skillName: string;
  diceCount: number;
  revealToPlayers: boolean;
}

export interface Character {
  id: string;
  name: string;
  xp: number;
  skills: Skill[];
  createdAt: number;
  imageUrl?: string;
  order?: number; // Added order field
  color?: string; // Character specific accent color
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
  actionsTaken?: ('xp' | 'evolve' | 'succeeded')[];
}

export interface RollLogEntry {
  type: typeof LOG_TYPE_ROLL;
  id: string;
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
  timestamp: number;
  actionsTaken?: ('xp' | 'evolve' | 'succeeded')[];
  evolvedSkillName?: string;
  isNpc?: boolean;
  isHiddenFromPlayers?: boolean;
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
  sourceRollId?: string;
}

export type LogEntry = RollLogEntry | SkillLogEntry;

export interface AppSettings {
  missionReportBroadcastEnabled: boolean;
}
