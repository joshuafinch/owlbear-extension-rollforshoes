import { ref, computed, onMounted, onUnmounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import getPluginId from '../utils/getPluginId';
import type { Character, CharacterData, Skill, CharacterLink } from '../types';

export function useRollForShoes() {
  const characters = ref<CharacterData>({});
  const selectedItems = ref<string[]>([]);
  
  // Room metadata key for storing all characters
  const ROOM_DATA_KEY = getPluginId('characters');
  // Item metadata key for linking a token to a character
  const LINK_KEY = getPluginId('link');

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
    updateCharacter(id, { xp: char.xp + amount });
  };

  const addSkill = (id: string, skill: Skill) => {
    const char = characters.value[id];
    if (!char) return;
    updateCharacter(id, { skills: [...char.skills, skill] });
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

      // Listen for room data changes
      unsubscribeRoom.value = OBR.room.onMetadataChange((newMetadata) => {
        const newData = newMetadata[ROOM_DATA_KEY] as CharacterData;
        
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
      });

      // Listen for selection changes
      unsubscribeSelection.value = OBR.player.onChange((player) => {
        selectedItems.value = player.selection || [];
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
    createCharacter,
    deleteCharacter,
    addXp,
    addSkill,
    removeSkill,
    linkSelectionToCharacter
  };
}
