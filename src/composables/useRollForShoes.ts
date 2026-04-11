import { ref, computed, onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import getPluginId from '../utils/getPluginId';
import type { Character, CharacterData, Skill, CharacterLink, LogEntry, RollLogEntry, SkillLogEntry, AppSettings } from '../types';
import { fromCompactCharacters, fromCompactCharacter, toCompactCharacter } from '../utils/compactCharacter';
import { fromCompactLog, fromCompactLogs, toCompactLog } from '../utils/compactLog';
import {
  ROLE_PLAYER,
  METADATA_SUFFIX_CHARACTERS,
  METADATA_SUFFIX_CHAR_ENTRY,
  METADATA_SUFFIX_LOGS,
  METADATA_SUFFIX_LOG_ENTRY,
  METADATA_SUFFIX_LINK,
  METADATA_SUFFIX_SETTINGS,
  LOG_TYPE_ROLL,
  LOG_TYPE_SKILL,
  DEFAULT_DO_ANYTHING_RANK,
  MAX_LOG_ENTRIES,
} from '../constants';

// --- Singleton State ---
const characters = ref<CharacterData>({});
const rollHistory = ref<LogEntry[]>([]);
const selectedItems = ref<string[]>([]);
const role = ref<string>(ROLE_PLAYER);
const activeCharacterId = ref<string | null>(null);
const settings = ref<AppSettings>({
  luckModeEnabled: false,
});

// Constants
const LEGACY_CHARS_KEY = getPluginId(METADATA_SUFFIX_CHARACTERS);
const CHAR_KEY_PREFIX = getPluginId(METADATA_SUFFIX_CHAR_ENTRY);
const LINK_KEY = getPluginId(METADATA_SUFFIX_LINK);
const LEGACY_LOGS_KEY = getPluginId(METADATA_SUFFIX_LOGS);
const LOG_KEY_PREFIX = getPluginId(METADATA_SUFFIX_LOG_ENTRY);
const SETTINGS_DATA_KEY = getPluginId(METADATA_SUFFIX_SETTINGS);

const charEntryKey = (id: string) => `${CHAR_KEY_PREFIX}${id}`;
const logEntryKey = (id: string) => `${LOG_KEY_PREFIX}${id}`;

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

const rebuildCharactersFromMetadata = (metadata: Record<string, unknown>): CharacterData => {
  const result: CharacterData = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith(CHAR_KEY_PREFIX) && value != null) {
      const id = key.slice(CHAR_KEY_PREFIX.length);
      result[id] = fromCompactCharacter(id, value as Record<string, any>);
    }
  }
  return result;
};

// Computed helper to get list as array
const characterList = computed({
  get: () => {
    return Object.entries(characters.value)
      .map(([id, char]) => ({ ...char, id }))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  },
  set: () => {
    // We can't directly set a computed property like this to reorder
    // Instead we use reorderCharacters action
  }
});

// --- Actions ---

const reorderCharacters = async (newOrder: Character[]) => {
  const metadataUpdate: Record<string, any> = {};

  newOrder.forEach((char, index) => {
    const updated = { ...char, order: index };
    if (characters.value[char.id]) {
      characters.value[char.id].order = index;
    }
    metadataUpdate[charEntryKey(char.id)] = toCompactCharacter(updated);
  });

  try {
    await OBR.room.setMetadata(metadataUpdate);
  } catch (e) {
    console.error('Failed to reorder characters', e);
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
    order: existingCount
  };

  characters.value[id] = newChar;

  try {
    await OBR.room.setMetadata({
      [charEntryKey(id)]: toCompactCharacter(newChar),
    });
  } catch (e) {
    console.error('Failed to create character', e);
  }
};

const updateCharacter = async (id: string, updates: Partial<Character>) => {
  if (!characters.value[id]) return;

  const updatedChar = { ...characters.value[id], ...updates };
  characters.value[id] = updatedChar;

  try {
    await OBR.room.setMetadata({
      [charEntryKey(id)]: toCompactCharacter(updatedChar),
    });
  } catch (e) {
    console.error('Failed to update character', e);
  }
};

const deleteCharacter = async (id: string) => {
  delete characters.value[id];

  try {
    await OBR.room.setMetadata({
      [charEntryKey(id)]: undefined,
    });
  } catch (e) {
    console.error('Failed to delete character', e);
  }
};

const addXp = async (id: string, amount: number) => {
  const char = characters.value[id];
  if (!char) return;
  const newXp = Math.max(0, char.xp + amount);

  await updateCharacter(id, { xp: newXp });
};

const addSkill = async (id: string, skill: Skill) => {
  const char = characters.value[id];
  if (!char) return;

  await updateCharacter(id, { skills: [...char.skills, skill] });
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

/**
 * Rebuild the sorted log list from per-entry metadata keys.
 * Each log lives at its own top-level key (LOG_KEY_PREFIX + id),
 * so concurrent writes from different clients never collide.
 */
const rebuildLogsFromMetadata = (metadata: Record<string, unknown>): LogEntry[] => {
  const entries: LogEntry[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith(LOG_KEY_PREFIX) && value != null) {
      entries.push(fromCompactLog(value as Record<string, any>));
    }
  }
  entries.sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id));
  return entries.slice(0, MAX_LOG_ENTRIES);
};

const getServerLogs = async (): Promise<LogEntry[]> => {
  const metadata = await OBR.room.getMetadata();
  return rebuildLogsFromMetadata(metadata);
};

const pruneExcessLogs = async (allLogs: LogEntry[]) => {
  if (allLogs.length <= MAX_LOG_ENTRIES) return;

  const toDelete = allLogs.slice(MAX_LOG_ENTRIES);
  const deletions: Record<string, undefined> = {};
  for (const entry of toDelete) {
    deletions[logEntryKey(entry.id)] = undefined;
  }

  try {
    await OBR.room.setMetadata(deletions);
  } catch (e) {
    console.error('Failed to prune excess log entries', e);
  }
};

const addLogEntry = async (entry: LogEntry) => {
  rollHistory.value = [entry, ...rollHistory.value].slice(0, MAX_LOG_ENTRIES);

  try {
    await OBR.room.setMetadata({
      [logEntryKey(entry.id)]: toCompactLog(entry),
    });

    const allLogs = await getServerLogs();
    rollHistory.value = allLogs;
    await pruneExcessLogs(allLogs);
  } catch (e) {
    console.error('Failed to add log entry', e);
  }
};

const markLogAction = async (logId: string, action: 'xp' | 'evolve' | 'succeeded') => {
  const applyMark = (entry: RollLogEntry): RollLogEntry | null => {
    const currentActions = entry.actionsTaken || [];
    const normalizedActions = currentActions.map(a => a === ('advance' as any) ? 'evolve' : a);
    if (normalizedActions.includes(action)) return null;
    return { ...entry, actionsTaken: [...normalizedActions, action] as any };
  };

  const localIdx = rollHistory.value.findIndex(l => l.type === LOG_TYPE_ROLL && l.id === logId);
  if (localIdx !== -1) {
    const localEntry = rollHistory.value[localIdx] as RollLogEntry;
    const marked = applyMark(localEntry);
    if (marked) {
      const updated = [...rollHistory.value];
      updated[localIdx] = marked;
      rollHistory.value = updated;
    }
  }

  try {
    const metadata = await OBR.room.getMetadata();
    const raw = metadata[logEntryKey(logId)] as Record<string, any> | undefined;
    if (!raw) return;

    const serverEntry = fromCompactLog(raw);
    if (serverEntry.type !== LOG_TYPE_ROLL) return;

    const marked = applyMark(serverEntry as RollLogEntry);
    if (!marked) return;

    await OBR.room.setMetadata({
      [logEntryKey(logId)]: toCompactLog(marked),
    });
  } catch (e) {
    console.error('Failed to mark log action', e);
  }
};

const unmarkLogAction = async (logId: string, action: 'xp' | 'evolve' | 'succeeded') => {
  const applyUnmark = (entry: RollLogEntry): RollLogEntry => {
    const currentActions = entry.actionsTaken || [];
    const normalizedActions = currentActions.map(a => a === ('advance' as any) ? 'evolve' : a);
    return { ...entry, actionsTaken: normalizedActions.filter(a => a !== action) as any };
  };

  const localIdx = rollHistory.value.findIndex(l => l.type === LOG_TYPE_ROLL && l.id === logId);
  if (localIdx !== -1) {
    const updated = [...rollHistory.value];
    updated[localIdx] = applyUnmark(rollHistory.value[localIdx] as RollLogEntry);
    rollHistory.value = updated;
  }

  try {
    const metadata = await OBR.room.getMetadata();
    const raw = metadata[logEntryKey(logId)] as Record<string, any> | undefined;
    if (!raw) return;

    const serverEntry = fromCompactLog(raw);
    if (serverEntry.type !== LOG_TYPE_ROLL) return;

    const unmarked = applyUnmark(serverEntry as RollLogEntry);

    await OBR.room.setMetadata({
      [logEntryKey(logId)]: toCompactLog(unmarked),
    });
  } catch (e) {
    console.error('Failed to unmark log action', e);
  }
};

const deleteLogEntry = async (logId: string) => {
  rollHistory.value = rollHistory.value.filter(entry => entry.id !== logId);

  try {
    await OBR.room.setMetadata({
      [logEntryKey(logId)]: undefined,
    });
  } catch (e) {
    console.error('Failed to delete log entry', e);
  }
};

const updateRollEntry = async (logId: string, updater: (entry: RollLogEntry) => RollLogEntry) => {
  const localIdx = rollHistory.value.findIndex(e => e.type === LOG_TYPE_ROLL && e.id === logId);
  if (localIdx !== -1) {
    const updatedEntry = updater(rollHistory.value[localIdx] as RollLogEntry);
    if (updatedEntry) {
      const updated = [...rollHistory.value];
      updated[localIdx] = updatedEntry;
      rollHistory.value = updated;
    }
  }

  try {
    const metadata = await OBR.room.getMetadata();
    const raw = metadata[logEntryKey(logId)] as Record<string, any> | undefined;
    if (!raw) return;

    const serverEntry = fromCompactLog(raw);
    if (serverEntry.type !== LOG_TYPE_ROLL) return;

    const updatedEntry = updater(serverEntry as RollLogEntry);
    if (!updatedEntry) return;

    await OBR.room.setMetadata({
      [logEntryKey(logId)]: toCompactLog(updatedEntry),
    });
  } catch (e) {
    console.error('Failed to update roll entry', e);
  }
};

const clearLogs = async () => {
  const currentLogs = [...rollHistory.value];
  rollHistory.value = [];

  try {
    const metadata = await OBR.room.getMetadata();
    const deletions: Record<string, undefined> = {};
    for (const key of Object.keys(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        deletions[key] = undefined;
      }
    }

    if (currentLogs.length > 0) {
      for (const entry of currentLogs) {
        deletions[logEntryKey(entry.id)] = undefined;
      }
    }

    if (Object.keys(deletions).length > 0) {
      await OBR.room.setMetadata(deletions);
    }
  } catch (e) {
    console.error('Failed to clear logs', e);
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
    // OBR.notification.show("Failed to export data", "ERROR");
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
      // Accept both legacy (name/skills) and compact (n/s) formats
      const hasLegacyKeys = sample.name && sample.skills;
      const hasCompactKeys = typeof sample.n === 'string' && Array.isArray(sample.s);
      if (!hasLegacyKeys && !hasCompactKeys) {
        throw new Error('Invalid data format: Missing character fields');
      }
    }

    const { characters: parsed } = fromCompactCharacters(data);
    characters.value = parsed;

    const metadataUpdate: Record<string, any> = {};
    for (const [id, char] of Object.entries(parsed)) {
      metadataUpdate[charEntryKey(id)] = toCompactCharacter(char);
    }

    const currentMetadata = await OBR.room.getMetadata();
    for (const key of Object.keys(currentMetadata)) {
      if (key.startsWith(CHAR_KEY_PREFIX) && !metadataUpdate[key]) {
        metadataUpdate[key] = undefined;
      }
    }
    if (currentMetadata[LEGACY_CHARS_KEY] != null) {
      metadataUpdate[LEGACY_CHARS_KEY] = undefined;
    }

    await OBR.room.setMetadata(metadataUpdate);

    // OBR.notification.show('Data imported successfully');
  } catch (e) {
    console.error('Import failed', e);
    // OBR.notification.show('Failed to import data: Invalid format', 'ERROR');
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
    // OBR.notification.show('Failed to export mission logs', 'ERROR');
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
        const required = ['characterId', 'skillName', 'rank', 'dice', 'timestamp'];
        for (const field of required) {
          if (entry[field] === undefined) {
            throw new Error(`Missing field "${field}" on roll log at index ${index}`);
          }
        }
        return {
          type: LOG_TYPE_ROLL,
          id: entry.id ?? crypto.randomUUID(),
          characterId: String(entry.characterId),
          ...(entry.characterName ? { characterName: String(entry.characterName) } : {}),
          skillName: String(entry.skillName),
          rank: Number(entry.rank),
          dice: Array.isArray(entry.dice) ? entry.dice.map((d: number) => Number(d)) : [],
          timestamp: Number(entry.timestamp),
          actionsTaken: Array.isArray(entry.actionsTaken) ? entry.actionsTaken.filter((action: string) => action === 'xp' || action === 'evolve' || action === 'succeeded') : [],
        } as RollLogEntry;
      }

      if (withType === LOG_TYPE_SKILL) {
        const required = ['characterId', 'newSkillName', 'rank', 'timestamp'];
        for (const field of required) {
          if (entry[field] === undefined) {
            throw new Error(`Missing field "${field}" on skill log at index ${index}`);
          }
        }
        return {
          type: LOG_TYPE_SKILL,
          id: entry.id ?? crypto.randomUUID(),
          characterId: String(entry.characterId),
          ...(entry.characterName ? { characterName: String(entry.characterName) } : {}),
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

    const metadataUpdate: Record<string, any> = {};
    for (const entry of sanitized) {
      metadataUpdate[logEntryKey(entry.id)] = toCompactLog(entry);
    }

    const currentMetadata = await OBR.room.getMetadata();
    for (const key of Object.keys(currentMetadata)) {
      if (key.startsWith(LOG_KEY_PREFIX) && !metadataUpdate[key]) {
        metadataUpdate[key] = undefined;
      }
    }
    if (currentMetadata[LEGACY_LOGS_KEY] != null) {
      metadataUpdate[LEGACY_LOGS_KEY] = undefined;
    }

    await OBR.room.setMetadata(metadataUpdate);

    // OBR.notification.show('Mission logs imported successfully', 'SUCCESS');
  } catch (e) {
    console.error('Failed to import mission logs', e);
    // OBR.notification.show('Failed to import mission logs: Invalid format', 'ERROR');
  }
};

const updateSettings = async (updates: Partial<AppSettings>) => {
  const newSettings = { ...settings.value, ...updates };
  // Optimistic
  settings.value = newSettings;

  try {
    const cleanSettings = JSON.parse(JSON.stringify(newSettings));
    await OBR.room.setMetadata({
      [SETTINGS_DATA_KEY]: cleanSettings
    });
  } catch (e) {
    console.error('Failed to update settings', e);
  }
};

export interface MetadataDiagnosticResult {
  totalSizeKB: number;
  extensionSizeKB: number;
  otherExtensionsSizeKB: number;
  limitKB: number;
  extensionKeys: string[];
}

const runMetadataDiagnostic = async (): Promise<MetadataDiagnosticResult | null> => {
  try {
    const roomMetadata = await OBR.room.getMetadata();
    const fullJson = JSON.stringify(roomMetadata);
    const totalBytes = new TextEncoder().encode(fullJson).length;

    // Extract only this extension's keys
    const extensionPrefix = 'com.aurayu.rollforshoes/';
    const extensionData: Record<string, unknown> = {};
    const extensionKeys: string[] = [];
    for (const [key, value] of Object.entries(roomMetadata)) {
      if (key.startsWith(extensionPrefix)) {
        extensionData[key] = value;
        extensionKeys.push(key);
      }
    }
    const extensionJson = JSON.stringify(extensionData);
    const extensionBytes = new TextEncoder().encode(extensionJson).length;

    const totalSizeKB = totalBytes / 1024;
    const extensionSizeKB = extensionBytes / 1024;
    const otherExtensionsSizeKB = totalSizeKB - extensionSizeKB;
    const limitKB = 16;

    // Download full dump
    const prettyJson = JSON.stringify(roomMetadata, null, 2);
    const blob = new Blob([prettyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-metadata-dump-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { totalSizeKB, extensionSizeKB, otherExtensionsSizeKB, limitKB, extensionKeys };
  } catch (e) {
    console.error('Failed to run metadata diagnostic', e);
    return null;
  }
};

function rollDice(count: number, isLuckMode = false): number[] {
  if (isLuckMode) {
    // FORCE_LUCK_MODE: High chance of 6s (80% chance for a 6, 20% for random 1-6)
    return Array.from({ length: count }, () =>
      Math.random() < 0.8 ? 6 : Math.floor(Math.random() * 6) + 1
    );
  }
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

// --- Initialization Logic ---

const initListeners = async () => {
  if (!OBR.isAvailable) return;

  const metadata = await OBR.room.getMetadata();
  let metadataDirty = false;

  const rawChars = (metadata[LEGACY_CHARS_KEY] as Record<string, any>) || {};
  const hasLegacyChars = Object.keys(rawChars).length > 0;

  if (hasLegacyChars) {
    const { characters: parsedChars } = fromCompactCharacters(rawChars);
    const migration: Record<string, any> = {};
    for (const [id, char] of Object.entries(parsedChars)) {
      const key = charEntryKey(id);
      if (metadata[key] == null) {
        migration[key] = toCompactCharacter(char);
      }
    }
    migration[LEGACY_CHARS_KEY] = undefined;

    try {
      await OBR.room.setMetadata(migration);
      console.info('[RollForShoes] Migrated characters from shared key to per-entry keys');
      metadataDirty = true;
    } catch (e) {
      console.error('[RollForShoes] Character migration failed', e);
    }
  }

  const rawLogs = (metadata[LEGACY_LOGS_KEY] as any[]) || [];
  const hasLegacyLogs = rawLogs.length > 0;
  const rawSettings = metadata[SETTINGS_DATA_KEY] as AppSettings | undefined;

  if (rawSettings) {
    settings.value = { ...settings.value, ...rawSettings };
  }

  if (hasLegacyLogs) {
    const { logs: legacyParsed } = fromCompactLogs(rawLogs);
    const migration: Record<string, any> = {};
    for (const entry of legacyParsed) {
      const key = logEntryKey(entry.id);
      if (metadata[key] == null) {
        migration[key] = toCompactLog(entry);
      }
    }
    migration[LEGACY_LOGS_KEY] = undefined;

    try {
      await OBR.room.setMetadata(migration);
      console.info('[RollForShoes] Migrated logs from array to per-entry keys');
      metadataDirty = true;
    } catch (e) {
      console.error('[RollForShoes] Log migration failed', e);
    }
  }

  const freshMetadata = metadataDirty ? await OBR.room.getMetadata() : metadata;
  characters.value = rebuildCharactersFromMetadata(freshMetadata);
  rollHistory.value = rebuildLogsFromMetadata(freshMetadata);

  // Load initial role
  role.value = await OBR.player.getRole();

  // Listen for room data changes
  unsubscribeRoom = OBR.room.onMetadataChange((newMetadata) => {
    const newSettings = newMetadata[SETTINGS_DATA_KEY] as AppSettings | undefined;

    if (newSettings) {
      settings.value = { ...settings.value, ...newSettings };
    }

    characters.value = rebuildCharactersFromMetadata(newMetadata as Record<string, unknown>);
    rollHistory.value = rebuildLogsFromMetadata(newMetadata as Record<string, unknown>);
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
    activeCharacterId,
    reorderCharacters,
    updateRollEntry,
    settings,
    updateSettings,
    runMetadataDiagnostic,
  };
}



