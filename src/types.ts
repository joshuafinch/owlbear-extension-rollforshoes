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

export interface RollEntry {
  id: string;
  characterId: string;
  characterName: string;
  skillName: string;
  rank: number;
  dice: number[];
  timestamp: number;
  actionsTaken?: ('xp' | 'advance')[]; // Track if XP was taken or skill evolved
}
