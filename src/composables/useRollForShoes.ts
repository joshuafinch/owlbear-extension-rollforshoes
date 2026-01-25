import { ref, computed, onMounted, onUnmounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import getPluginId from '../utils/getPluginId';
import type { Character, CharacterData, Skill, CharacterLink, LogEntry, RollLogEntry } from '../types';

export function useRollForShoes() {
  const characters = ref<CharacterData>({});
  const rollHistory = ref<LogEntry[]>([]);
  const selectedItems = ref<string[]>([]);
  const role = ref<string>('PLAYER');
  const debugMode = ref<boolean>(false);
  
  // Room metadata key for storing all characters
  const ROOM_DATA_KEY = getPluginId('characters');
  // Item metadata key for linking a token to a character
  const LINK_KEY = getPluginId('link');
  // Room metadata key for storing roll logs
  const LOGS_DATA_KEY = getPluginId('logs');

  const activeCharacterId = ref<string | null>(null);

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
        // Instead we'll implement a reorderCharacters action
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
        for(const id in updates) {
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
      skills: [{ name: 'Do Anything', rank: 1 }],
      createdAt: Date.now(),
      order: existingCount // Append to end
    };

    // Optimistic update
    characters.value[id] = newChar;

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
      // Revert on failure would go here
    }
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    if (!characters.value[id]) return;
    
    // Optimistic
    const updatedChar = { ...characters.value[id], ...updates };
    characters.value[id] = updatedChar;

    try {
      // Create a clean object for storage, avoiding potential Proxy/Ref issues
      // DataCloneError often happens when Vue reactive objects are passed directly to postMessage
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
    if (!char) return;
    const newXp = Math.max(0, char.xp + amount);
    updateCharacter(id, { xp: newXp });
  };

  const addSkill = (id: string, skill: Skill) => {
    const char = characters.value[id];
    if (!char) return;
    updateCharacter(id, { skills: [...char.skills, skill] });
  };
  
  const updateSkill = (id: string, skillIndex: number, updates: Partial<Skill>) => {
    const char = characters.value[id];
    if (!char) return;
    const newSkills = [...char.skills];
    if (newSkills[skillIndex]) {
        newSkills[skillIndex] = { ...newSkills[skillIndex], ...updates };
        updateCharacter(id, { skills: newSkills });
    }
  };

  const removeSkill = (id: string, skillIndex: number) => {
    const char = characters.value[id];
    if (!char) return;
    const newSkills = [...char.skills];
    newSkills.splice(skillIndex, 1);
    updateCharacter(id, { skills: newSkills });
  };

  const reorderSkills = (id: string, newSkills: Skill[]) => {
    const char = characters.value[id];
    if (!char) return;
    updateCharacter(id, { skills: newSkills });
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
          
          OBR.notification.show(`Unlinked ${selectedItems.value.length} token(s).`);
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

      OBR.notification.show(`Linked ${selectedItems.value.length} token(s) to character.`);
    } catch (e) {
      console.error('Failed to link tokens', e);
    }
  };

  const addLogEntry = async (entry: LogEntry) => {
    // Optimistic
    const newHistory = [entry, ...rollHistory.value].slice(0, 50); // Keep last 50
    rollHistory.value = newHistory;

    try {
       // Strip reactivity to prevent DataCloneError
       const cleanHistory = JSON.parse(JSON.stringify(newHistory));
       await OBR.room.setMetadata({
        [LOGS_DATA_KEY]: cleanHistory
      });
    } catch (e) {
        console.error('Failed to add log entry', e);
    }
  };

  const markLogAction = async (logId: string, action: 'xp' | 'advance' | 'succeeded') => {
      const logIndex = rollHistory.value.findIndex(l => l.type === 'ROLL' && l.id === logId);
      if (logIndex === -1) return;

      const entry = rollHistory.value[logIndex];
      // Type guard already happened in findIndex, but TS might need help
      if (entry.type !== 'ROLL') return;

      const newActions = [...(entry.actionsTaken || []), action];
      
      // Optimistic update
      const newHistory = [...rollHistory.value];
      newHistory[logIndex] = { ...entry, actionsTaken: newActions };
      rollHistory.value = newHistory;

      try {
        const cleanHistory = JSON.parse(JSON.stringify(newHistory));
        await OBR.room.setMetadata({
            [LOGS_DATA_KEY]: cleanHistory
        });
      } catch (e) {
          console.error('Failed to mark log action', e);
      }
  };

  const clearLogs = async () => {
    // Optimistic
    rollHistory.value = [];
    
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

  // --- Setup ---

  onMounted(() => {
    if (!OBR.isAvailable) return;
    
    OBR.onReady(async () => {
      // Load initial data
      const metadata = await OBR.room.getMetadata();
      characters.value = (metadata[ROOM_DATA_KEY] as CharacterData) || {};

      // Listen for room data changes (Character updates)
      // Note: We don't store these specific unsubscribe functions because we override the whole block below
      // with a cleaner implementation using refs for unsubscribers.
      // This is a correction to remove the unused variable errors.
    });
  });
  
  // Register cleanup hook synchronously
  
  // Correct approach: Use refs to store unsubscribe functions
  const unsubscribeRoom = ref<(() => void) | null>(null);
  const unsubscribeSelection = ref<(() => void) | null>(null);

  onMounted(() => {
    if (!OBR.isAvailable) return;

    OBR.onReady(async () => {
      // Load initial data
      const metadata = await OBR.room.getMetadata();
      characters.value = (metadata[ROOM_DATA_KEY] as CharacterData) || {};
      const rawLogs = (metadata[LOGS_DATA_KEY] as any[]) || [];
      
      // Migration: Ensure logs have a type
      rollHistory.value = rawLogs.map(log => {
        if (!log.type) {
            return { ...log, type: 'ROLL' } as RollLogEntry;
        }
        return log as LogEntry;
      });

      // Load initial role
      role.value = await OBR.player.getRole();

      // Listen for room data changes
      unsubscribeRoom.value = OBR.room.onMetadataChange((newMetadata) => {
        const newData = newMetadata[ROOM_DATA_KEY] as CharacterData;
        const newLogs = newMetadata[LOGS_DATA_KEY] as any[];
        
        // IMPORTANT: When a character is deleted, newData might be undefined or missing the key
        // We must handle the case where newData is undefined (if the entire key was removed)
        // or just update our local state to match whatever the room has.
        if (newData) {
          characters.value = newData;
        } else {
            // If the key is gone, clear local data or handle gracefully
            // However, in our delete logic we set specific keys to undefined,
            // so newData should still exist but contain fewer keys.
            // If the entire ROOM_DATA_KEY is somehow wiped, we should clear our list.
             characters.value = {};
        }

        if (newLogs) {
            rollHistory.value = newLogs.map(log => {
              if (!log.type) {
                  return { ...log, type: 'ROLL' } as RollLogEntry;
              }
              return log as LogEntry;
            });
        }
      });

      // Listen for selection changes and role changes
      unsubscribeSelection.value = OBR.player.onChange(async (player) => {
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
    });
  });

  onUnmounted(() => {
    if (unsubscribeRoom.value) unsubscribeRoom.value();
    if (unsubscribeSelection.value) unsubscribeSelection.value();
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
    importData,
    rollDice,
    rollHistory,
    addLogEntry,
    markLogAction,
    clearLogs,
    debugMode,
    activeCharacterId,
    reorderCharacters
  };
}

function rollDice(count: number, debug = false): number[] {
    if (debug) {
        // High chance of failure (1s and 2s) for testing XP gain
        return Array.from({ length: count }, () => Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 5) + 1);
    }
    return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}
