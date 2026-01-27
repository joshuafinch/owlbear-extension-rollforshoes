import { ref, computed, onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import getPluginId from '../utils/getPluginId';
import type { Character, CharacterData, Skill, CharacterLink, LogEntry, RollLogEntry, SkillLogEntry } from '../types';
import {
  ROLE_PLAYER,
  METADATA_SUFFIX_CHARACTERS,
  METADATA_SUFFIX_LOGS,
  METADATA_SUFFIX_LINK,
  LOG_TYPE_ROLL,
  LOG_TYPE_SKILL,
  DEFAULT_DO_ANYTHING_RANK
} from '../constants';

// --- Singleton State ---
const characters = ref<CharacterData>({});
const rollHistory = ref<LogEntry[]>([]);
const selectedItems = ref<string[]>([]);
const role = ref<string>(ROLE_PLAYER);
const debugMode = ref<boolean>(false);
const activeCharacterId = ref<string | null>(null);

// Locks
const characterLocks = ref<Map<string, number>>(new Map());
const logLock = ref<number>(0);
const LOCK_DURATION = 2000; // ms

// Constants
const ROOM_DATA_KEY = getPluginId(METADATA_SUFFIX_CHARACTERS);
const LINK_KEY = getPluginId(METADATA_SUFFIX_LINK);
const LOGS_DATA_KEY = getPluginId(METADATA_SUFFIX_LOGS);

// Initialization Flag
const isInitialized = ref(false);

// Unsubscribe functions (kept for potential cleanup, though rarely needed in singleton)
// We assign them to variables to potentially allow cleanup later if we added a teardown method,
// but currently they live for the app lifecycle.
// @ts-ignore
let unsubscribeRoom: (() => void) | null = null;
// @ts-ignore
let unsubscribeSelection: (() => void) | null = null;

// --- Helper Functions ---

const setCharLock = (id: string) => {
  characterLocks.value.set(id, Date.now() + LOCK_DURATION);
};

const setLogLock = () => {
  logLock.value = Date.now() + LOCK_DURATION;
};

// Computed helper to get list as array
const characterList = computed({
  get: () => {
    return Object.values(characters.value).sort((a, b) => {
      // Sort by order if available, otherwise fallback to creation date
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.createdAt - b.createdAt;
    });
  },
  set: () => {
    // We can't directly set a computed property like this to reorder
    // Instead we use reorderCharacters action
  }
});

// --- Actions ---

const reorderCharacters = async (newOrder: Character[]) => {
  // Create updates for all characters with new order indices
  const updates: Record<string, Character> = {};
  const roomMetadata = await OBR.room.getMetadata();
  const currentData = (roomMetadata[ROOM_DATA_KEY] as CharacterData) || {};

  newOrder.forEach((char, index) => {
    updates[char.id] = { ...char, order: index };
    // Optimistic update
    if (characters.value[char.id]) {
      characters.value[char.id].order = index;
    }
  });

  try {
    // Strip reactivity
    const cleanUpdates: CharacterData = {};
    for (const id in updates) {
      cleanUpdates[id] = JSON.parse(JSON.stringify(updates[id]));
    }

    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: {
        ...currentData,
        ...cleanUpdates
      }
    });
  } catch (e) {
    console.error("Failed to reorder characters", e);
  }
};

const createCharacter = async (name: string) => {
  const id = crypto.randomUUID();
  const existingCount = Object.keys(characters.value).length;
  const newChar: Character = {
    id,
    name,
    xp: 0,
    skills: [{ name: 'Do Anything', rank: DEFAULT_DO_ANYTHING_RANK }],
    createdAt: Date.now(),
    order: existingCount // Append to end
  };

  // Optimistic update
  characters.value[id] = newChar;
  setCharLock(id);

  try {
    const roomMetadata = await OBR.room.getMetadata();
    const currentData = (roomMetadata[ROOM_DATA_KEY] as CharacterData) || {};

    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: {
        ...currentData,
        [id]: newChar
      }
    });
  } catch (e) {
    console.error('Failed to create character', e);
  }
};

const updateCharacter = async (id: string, updates: Partial<Character>) => {
  if (!characters.value[id]) return;

  // Optimistic
  const updatedChar = { ...characters.value[id], ...updates };
  characters.value[id] = updatedChar;
  setCharLock(id);

  try {
    // Create a clean object for storage
    const cleanData = JSON.parse(JSON.stringify(updatedChar));

    const roomMetadata = await OBR.room.getMetadata();
    const currentData = (roomMetadata[ROOM_DATA_KEY] as CharacterData) || {};

    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: {
        ...currentData,
        [id]: cleanData
      }
    });
  } catch (e) {
    console.error('Failed to update character', e);
  }
};

const deleteCharacter = async (id: string) => {
  // Optimistic update
  delete characters.value[id];
  setCharLock(id);

  try {
    const roomMetadata = await OBR.room.getMetadata();
    const currentData = (roomMetadata[ROOM_DATA_KEY] as CharacterData) || {};

    // Create a copy and remove the character
    const newData = { ...currentData };
    delete newData[id];

    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: newData
    });
  } catch (e) {
    console.error("Failed to delete character", e);
  }
};

const addXp = (id: string, amount: number) => {
  const char = characters.value[id];
  if (!char) return Promise.resolve();
  const newXp = Math.max(0, char.xp + amount);

  // Enable log locking on character updates too to prevent race conditions
  setLogLock();
  return updateCharacter(id, { xp: newXp });
};

const addSkill = (id: string, skill: Skill) => {
  const char = characters.value[id];
  if (!char) return Promise.resolve();
  setLogLock();
  return updateCharacter(id, { skills: [...char.skills, skill] });
};

const updateSkill = (id: string, skillIndex: number, updates: Partial<Skill>) => {
  const char = characters.value[id];
  if (!char) return Promise.resolve();
  const newSkills = [...char.skills];
  if (newSkills[skillIndex]) {
    newSkills[skillIndex] = { ...newSkills[skillIndex], ...updates };
    return updateCharacter(id, { skills: newSkills });
  }
  return Promise.resolve();
};

const removeSkill = (id: string, skillIndex: number) => {
  const char = characters.value[id];
  if (!char) return Promise.resolve();
  const newSkills = [...char.skills];
  newSkills.splice(skillIndex, 1);
  return updateCharacter(id, { skills: newSkills });
};

const reorderSkills = (id: string, newSkills: Skill[]) => {
  const char = characters.value[id];
  if (!char) return Promise.resolve();
  return updateCharacter(id, { skills: newSkills });
};

const linkSelectionToCharacter = async (characterId: string | null) => {
  if (selectedItems.value.length === 0) return;

  try {
    // Create a plain array copy to remove Vue reactivity
    const itemIds = [...selectedItems.value];

    if (characterId === null) {
      // Unlink
      await OBR.scene.items.updateItems(itemIds, (items) => {
        for (const item of items) {
          delete item.metadata[LINK_KEY];
        }
      });

      // Optimistic Update: Clear active character immediately
      activeCharacterId.value = null;

      // OBR.notification.show(`Unlinked ${selectedItems.value.length} token(s).`);
      return;
    }

    const metadata: CharacterLink = { characterId };

    // Get the items to extract image URL
    const items = await OBR.scene.items.getItems(itemIds);
    let imageUrl: string | undefined;

    // Try to find an image in the selection
    const imageItem = items.find(i => i.type === 'IMAGE');
    if (imageItem && 'image' in imageItem) {
      imageUrl = (imageItem as any).image.url;
    }

    await OBR.scene.items.updateItems(itemIds, (items) => {
      for (const item of items) {
        item.metadata[LINK_KEY] = metadata;
      }
    });

    // Update character with image if found
    if (imageUrl) {
      updateCharacter(characterId, { imageUrl });
    }

    // Optimistic Update: Immediately set activeCharacterId so the UI refreshes
    activeCharacterId.value = characterId;

    // OBR.notification.show(`Linked ${selectedItems.value.length} token(s) to character.`);
  } catch (e) {
    console.error('Failed to link tokens', e);
  }
};

const addLogEntry = async (entry: LogEntry) => {
  // Optimistic
  const newHistory = [entry, ...rollHistory.value].slice(0, 50); // Keep last 50
  rollHistory.value = newHistory;

  // Track that we are messing with the log list
  setLogLock();

  try {
    // Strip reactivity to prevent DataCloneError
    const cleanHistory = JSON.parse(JSON.stringify(newHistory));
    return OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory
    });
  } catch (e) {
    console.error('Failed to add log entry', e);
    return Promise.resolve();
  }
};

const markLogAction = async (logId: string, action: 'xp' | 'evolve' | 'succeeded') => {
  const logIndex = rollHistory.value.findIndex(l => l.type === LOG_TYPE_ROLL && l.id === logId);
  if (logIndex === -1) {
    console.warn(`[RollForShoes] markLogAction: Log ${logId} not found locally.`);
    return Promise.resolve();
  }

  const entry = rollHistory.value[logIndex];
  // Type guard already happened in findIndex, but TS might need help
  if (entry.type !== LOG_TYPE_ROLL) return Promise.resolve();

  // Handle migration/backwards compatibility: 'advance' -> 'evolve'
  const currentActions = entry.actionsTaken || [];
  const normalizedActions = currentActions.map(a => a === ('advance' as any) ? 'evolve' : a);

  // Avoid duplicates
  if (normalizedActions.includes(action)) {
    return Promise.resolve();
  }

  const newActions = [...normalizedActions, action];

  // Optimistic update
  const newHistory = [...rollHistory.value];
  newHistory[logIndex] = { ...entry, actionsTaken: newActions as any };
  rollHistory.value = newHistory;

  setLogLock();

  try {
    const cleanHistory = JSON.parse(JSON.stringify(newHistory));
    return OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory
    });
  } catch (e) {
    console.error('Failed to mark log action', e);
    return Promise.resolve();
  }
};

const unmarkLogAction = async (logId: string, action: 'xp' | 'evolve' | 'succeeded') => {
  const logIndex = rollHistory.value.findIndex(l => l.type === LOG_TYPE_ROLL && l.id === logId);
  if (logIndex === -1) return Promise.resolve();

  const entry = rollHistory.value[logIndex];
  if (entry.type !== LOG_TYPE_ROLL) return Promise.resolve();

  // Handle migration/backwards compatibility: 'advance' -> 'evolve'
  const currentActions = entry.actionsTaken || [];
  const normalizedActions = currentActions.map(a => a === ('advance' as any) ? 'evolve' : a);

  const newActions = normalizedActions.filter(a => a !== action);

  // Optimistic update
  const newHistory = [...rollHistory.value];
  newHistory[logIndex] = { ...entry, actionsTaken: newActions as any };
  rollHistory.value = newHistory;

  setLogLock();

  try {
    const cleanHistory = JSON.parse(JSON.stringify(newHistory));
    return OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory
    });
  } catch (e) {
    console.error('Failed to unmark log action', e);
    return Promise.resolve();
  }
};

const deleteLogEntry = async (logId: string) => {
  // Optimistic
  const newHistory = rollHistory.value.filter(entry => entry.id !== logId);
  rollHistory.value = newHistory;

  setLogLock();

  try {
    const cleanHistory = JSON.parse(JSON.stringify(newHistory));
    await OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory
    });
    OBR.notification.show('Log entry deleted.', 'SUCCESS');
    return Promise.resolve();
  } catch (e) {
    console.error('Failed to delete log entry', e);
    OBR.notification.show('Failed to delete log entry.', 'ERROR');
    return Promise.resolve();
  }
};

const updateRollEntry = async (logId: string, updater: (entry: RollLogEntry) => RollLogEntry) => {
  const index = rollHistory.value.findIndex(entry => entry.type === LOG_TYPE_ROLL && entry.id === logId);
  if (index === -1) return;

  const currentEntry = rollHistory.value[index] as RollLogEntry;
  const updatedEntry = updater(currentEntry);
  if (!updatedEntry) return;

  const newHistory = [...rollHistory.value];
  newHistory[index] = updatedEntry;
  rollHistory.value = newHistory;

  setLogLock();

  try {
    const cleanHistory = JSON.parse(JSON.stringify(newHistory));
    await OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory,
    });
  } catch (e) {
    console.error('Failed to update roll entry', e);
  }
};

const clearLogs = async () => {
  // Optimistic
  rollHistory.value = [];

  setLogLock();

  try {
    await OBR.room.setMetadata({
      [LOGS_DATA_KEY]: []
    });
    OBR.notification.show('Mission logs have been purged.', 'SUCCESS');
  } catch (e) {
    console.error('Failed to clear logs', e);
    OBR.notification.show('Failed to purge logs.', 'ERROR');
  }
};

const exportData = () => {
  try {
    const dataStr = JSON.stringify(characters.value, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roll-for-shoes-backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Failed to export data", e);
    OBR.notification.show("Failed to export data", "ERROR");
  }
};

const importData = async (jsonContent: string) => {
  try {
    const data = JSON.parse(jsonContent);

    // Basic validation: check if it's an object
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data format: Not an object');
    }

    // Check for at least one character-like structure if not empty
    const values = Object.values(data);
    if (values.length > 0) {
      const sample = values[0] as any;
      if (!sample.id || !sample.name || !sample.skills) {
        throw new Error('Invalid data format: Missing character fields');
      }
    }

    // Optimistic update
    characters.value = data as CharacterData;

    // Update Room
    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: data
    });

    OBR.notification.show('Data imported successfully');
  } catch (e) {
    console.error('Import failed', e);
    OBR.notification.show('Failed to import data: Invalid format', 'ERROR');
  }
};

const exportLogs = () => {
  try {
    const dataStr = JSON.stringify(rollHistory.value, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-logs-backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export mission logs', e);
    OBR.notification.show('Failed to export mission logs', 'ERROR');
  }
};

const importLogs = async (jsonContent: string) => {
  try {
    const data = JSON.parse(jsonContent);

    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: Expected an array of log entries');
    }

    const sanitized = data.map((entry, index) => {
      const withType = entry?.type ?? LOG_TYPE_ROLL;
      if (withType === LOG_TYPE_ROLL) {
        const required = ['characterId', 'characterName', 'skillName', 'rank', 'dice', 'timestamp'];
        for (const field of required) {
          if (entry[field] === undefined) {
            throw new Error(`Missing field "${field}" on roll log at index ${index}`);
          }
        }
        return {
          type: LOG_TYPE_ROLL,
          id: entry.id ?? crypto.randomUUID(),
          characterId: String(entry.characterId),
          characterName: String(entry.characterName),
          skillName: String(entry.skillName),
          rank: Number(entry.rank),
          dice: Array.isArray(entry.dice) ? entry.dice.map((d: number) => Number(d)) : [],
          timestamp: Number(entry.timestamp),
          actionsTaken: Array.isArray(entry.actionsTaken) ? entry.actionsTaken.filter((action: string) => action === 'xp' || action === 'evolve' || action === 'succeeded') : [],
        } as RollLogEntry;
      }

      if (withType === LOG_TYPE_SKILL) {
        const required = ['characterId', 'characterName', 'newSkillName', 'rank', 'timestamp'];
        for (const field of required) {
          if (entry[field] === undefined) {
            throw new Error(`Missing field "${field}" on skill log at index ${index}`);
          }
        }
        return {
          type: LOG_TYPE_SKILL,
          id: entry.id ?? crypto.randomUUID(),
          characterId: String(entry.characterId),
          characterName: String(entry.characterName),
          newSkillName: String(entry.newSkillName),
          rank: Number(entry.rank),
          timestamp: Number(entry.timestamp),
          cost: Number(entry.cost ?? 0),
          sourceRollId: entry.sourceRollId ? String(entry.sourceRollId) : undefined,
        } as SkillLogEntry;
      }

      throw new Error(`Unsupported log type at index ${index}`);
    });

    rollHistory.value = sanitized;
    setLogLock();

    const cleanHistory = JSON.parse(JSON.stringify(sanitized));
    await OBR.room.setMetadata({
      [LOGS_DATA_KEY]: cleanHistory,
    });

    OBR.notification.show('Mission logs imported successfully', 'SUCCESS');
  } catch (e) {
    console.error('Failed to import mission logs', e);
    OBR.notification.show('Failed to import mission logs: Invalid format', 'ERROR');
  }
};

function rollDice(count: number, debug = false): number[] {
  if (debug) {
    // High chance of failure (1s and 2s) for testing XP gain
    return Array.from({ length: count }, () => Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 5) + 1);
  }
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

// --- Initialization Logic ---

const initListeners = async () => {
  if (!OBR.isAvailable) return;

  // Load initial data
  const metadata = await OBR.room.getMetadata();
  characters.value = (metadata[ROOM_DATA_KEY] as CharacterData) || {};
  const rawLogs = (metadata[LOGS_DATA_KEY] as any[]) || [];

  // Migration: Ensure logs have a type and ID
  rollHistory.value = rawLogs.map(log => {
    if (!log.type) {
      // Legacy ROLL entry
      return { ...log, type: LOG_TYPE_ROLL } as RollLogEntry;
    }
    if (log.type === LOG_TYPE_SKILL && !log.id) {
      // Fix missing ID/CharacterID in Skill Logs
      return {
        ...log,
        id: crypto.randomUUID(),
        characterId: '' // Fallback for legacy data without char ID
      } as SkillLogEntry;
    }
    return log as LogEntry;
  });

  // Load initial role
  role.value = await OBR.player.getRole();

  // Listen for room data changes
  unsubscribeRoom = OBR.room.onMetadataChange((newMetadata) => {
    const newData = newMetadata[ROOM_DATA_KEY] as CharacterData;
    const newLogs = newMetadata[LOGS_DATA_KEY] as any[];

    if (newData) {
      // Merging strategy for characters
      const currentIds = new Set(Object.keys(characters.value));
      const newIds = new Set(Object.keys(newData));
      const now = Date.now();

      // 1. Update/Add characters that aren't currently being modified by us
      for (const [id, char] of Object.entries(newData)) {
        const lockTime = characterLocks.value.get(id);
        const isLocked = lockTime && lockTime > now;

        if (!isLocked) {
          characters.value[id] = char;
        }
      }

      // 2. Handle deletions (if ID is in current but not in new, and not pending)
      for (const id of currentIds) {
        const lockTime = characterLocks.value.get(id);
        const isLocked = lockTime && lockTime > now;

        if (!newIds.has(id) && !isLocked) {
          delete characters.value[id];
        }
      }
    } else {
      if (characterLocks.value.size === 0) {
        characters.value = {};
      }
    }

    if (newLogs) {
      const now = Date.now();
      const isLocked = logLock.value > now;

      if (isLocked) {
        return;
      }

      rollHistory.value = newLogs.map(log => {
        if (!log.type) {
          return { ...log, type: LOG_TYPE_ROLL } as RollLogEntry;
        }
        if (log.type === LOG_TYPE_SKILL && !log.id) {
          return {
            ...log,
            id: crypto.randomUUID(),

            characterId: ''
          } as SkillLogEntry;
        }
        return log as LogEntry;
      });
    }
  });

  // Listen for selection changes and role changes
  unsubscribeSelection = OBR.player.onChange(async (player) => {
    selectedItems.value = player.selection || [];
    role.value = player.role;

    // Check for linked character in selection
    if (selectedItems.value.length === 1) {
      const items = await OBR.scene.items.getItems([selectedItems.value[0]]);
      if (items.length > 0) {
        const metadata = items[0].metadata[LINK_KEY] as CharacterLink | undefined;
        if (metadata && metadata.characterId) {
          activeCharacterId.value = metadata.characterId;
          return;
        }
      }
    }
    activeCharacterId.value = null;
  });
};

// --- Exported Composable ---

export function useRollForShoes() {

  onMounted(() => {
    if (!isInitialized.value) {
      if (OBR.isAvailable) {
        OBR.onReady(() => {
          initListeners();
          isInitialized.value = true;
        });
      }
    }
  });

  return {
    characters,
    characterList,
    selectedItems,
    role,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    addXp,
    addSkill,
    updateSkill,
    removeSkill,
    reorderSkills,
    linkSelectionToCharacter,
    exportData,
    exportLogs,
    importData,
    importLogs,
    rollDice,
    rollHistory,
    addLogEntry,
    markLogAction,
    unmarkLogAction,
    deleteLogEntry,
     clearLogs,
     debugMode,
     activeCharacterId,
     reorderCharacters,
     updateRollEntry,
  };
}
