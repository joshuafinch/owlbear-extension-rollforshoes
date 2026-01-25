import { ref, computed, onMounted, onUnmounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import getPluginId from '../utils/getPluginId';
import type { Character, CharacterData, Skill, CharacterLink, RollEntry } from '../types';

export function useRollForShoes() {
  const characters = ref<CharacterData>({});
  const rollHistory = ref<RollEntry[]>([]);
  const selectedItems = ref<string[]>([]);
  const role = ref<string>('PLAYER');
  const debugMode = ref<boolean>(false);
  
  // Room metadata key for storing all characters
  const ROOM_DATA_KEY = getPluginId('characters');
  // Item metadata key for linking a token to a character
  const LINK_KEY = getPluginId('link');
  // Room metadata key for storing roll logs
  const LOGS_DATA_KEY = getPluginId('logs');

  // Computed helper to get list as array
  const characterList = computed(() => {
    return Object.values(characters.value).sort((a, b) => b.createdAt - a.createdAt);
  });

  // --- Actions ---

  const createCharacter = async (name: string) => {
    const id = crypto.randomUUID();
    const newChar: Character = {
      id,
      name,
      xp: 0,
      skills: [{ name: 'Do Anything', rank: 1 }],
      createdAt: Date.now()
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
  }

  const linkSelectionToCharacter = async (characterId: string) => {
    if (selectedItems.value.length === 0) return;
    
    try {
      const metadata: CharacterLink = { characterId };
      await OBR.scene.items.updateItems(selectedItems.value, (items) => {
        for (const item of items) {
          item.metadata[LINK_KEY] = metadata;
        }
      });
      OBR.notification.show(`Linked ${selectedItems.value.length} token(s) to character.`);
    } catch (e) {
      console.error('Failed to link tokens', e);
    }
  };

  const addLogEntry = async (entry: RollEntry) => {
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
      rollHistory.value = (metadata[LOGS_DATA_KEY] as RollEntry[]) || [];

      // Load initial role
      role.value = await OBR.player.getRole();

      // Listen for room data changes
      unsubscribeRoom.value = OBR.room.onMetadataChange((newMetadata) => {
        const newData = newMetadata[ROOM_DATA_KEY] as CharacterData;
        const newLogs = newMetadata[LOGS_DATA_KEY] as RollEntry[];
        
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
            rollHistory.value = newLogs;
        }
      });

      // Listen for selection changes and role changes
      unsubscribeSelection.value = OBR.player.onChange((player) => {
        selectedItems.value = player.selection || [];
        role.value = player.role;
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
    deleteCharacter,
    addXp,
    addSkill,
    updateSkill,
    removeSkill,
    linkSelectionToCharacter,
    exportData,
    importData,
    rollDice,
    rollHistory,
    addLogEntry,
    debugMode
  };
}

function rollDice(count: number, debug = false): number[] {
    if (debug) {
        // High chance of 6s for testing
        return Array.from({ length: count }, () => Math.random() > 0.3 ? 6 : Math.floor(Math.random() * 6) + 1);
    }
    return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}
