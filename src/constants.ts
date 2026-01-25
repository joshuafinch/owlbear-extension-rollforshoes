// Role Constants
export const ROLE_GM = 'GM';
export const ROLE_PLAYER = 'PLAYER';

// Tab Constants
export const TAB_DISPATCH = 'DISPATCH';
export const TAB_LOGS = 'LOGS';
export const TAB_SYSTEMS = 'SYSTEMS';

// Log Types
export const LOG_TYPE_ROLL = 'ROLL';
export const LOG_TYPE_SKILL = 'SKILL';

// Metadata Constants
// Using a constant suffix to ensure we don't typo it elsewhere
export const METADATA_SUFFIX_CHARACTERS = 'characters';
export const METADATA_SUFFIX_LOGS = 'logs';
export const METADATA_SUFFIX_LINK = 'link';

// Default Values
export const DEFAULT_NEW_SKILL_RANK = 2;
export const DEFAULT_DO_ANYTHING_RANK = 1;
export const DEFAULT_XP_ANIMATION_DURATION = 1000;
export const DEFAULT_DELETE_CONFIRM_DURATION = 3000;

// Tactical Palette (Tailwind-ish values adjusted for visibility)
export const TACTICAL_PALETTE = [
  '#6366f1', // Default (Indigo-500)
  '#ef4444', // Red-500
  '#f97316', // Orange-500
  '#eab308', // Yellow-500
  '#10b981', // Emerald-500
  '#06b6d4', // Cyan-500
  '#3b82f6', // Blue-500
  '#a855f7', // Purple-500
  '#ec4899', // Pink-500
  '#64748b', // Slate-500
];
