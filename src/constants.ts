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

// Modal IDs
export const MODAL_MISSION_REPORT = 'mission-report';
export const MODAL_NPC_ROLL_POPOVER = 'npc-roll-popover';

// Metadata Constants
// Using a constant suffix to ensure we don't typo it elsewhere
export const METADATA_SUFFIX_CHARACTERS = 'characters';
export const METADATA_SUFFIX_CHAR_ENTRY = 'char/v1/';
export const METADATA_SUFFIX_LOGS = 'logs';
export const METADATA_SUFFIX_LOG_ENTRY = 'log/v1/';
export const METADATA_SUFFIX_LINK = 'link';
export const METADATA_SUFFIX_SETTINGS = 'settings';

// Broadcast Channels
export const BROADCAST_NPC_ROLL_REQUEST = 'npc-roll-request';
export const BROADCAST_MISSION_REPORT = 'mission-report-open';

// Default Values
export const DEFAULT_NEW_SKILL_RANK = 2;
export const DEFAULT_DO_ANYTHING_RANK = 1;
export const DEFAULT_XP_ANIMATION_DURATION = 1000;
export const DEFAULT_DELETE_CONFIRM_DURATION = 3000;
export const MAX_LOG_ENTRIES = 15;

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
