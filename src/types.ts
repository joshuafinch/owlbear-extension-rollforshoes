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
}

export interface CharacterLink {
  characterId: string;
}

export type CharacterData = Record<string, Character>;
