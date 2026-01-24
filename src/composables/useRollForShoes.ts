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
      const roomMetadata = await OBR.room.getMetadata();
      const currentData = (roomMetadata[ROOM_DATA_KEY] as CharacterData) || {};
      
      await OBR.room.setMetadata({
        [ROOM_DATA_KEY]: {
          ...currentData,
          [id]: updatedChar
        }
      });
    } catch (e) {
      console.error('Failed to update character', e);
    }
  };

  const deleteCharacter = async (id: string) => {
    // Optimistic
    delete characters.value[id];

    try {
        await OBR.room.setMetadata({
            [ROOM_DATA_KEY]: {
                [id]: undefined // OBR way to delete a key from metadata object
            }
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

  const init = async () => {
    if (!OBR.isAvailable) return;

    // Load initial data
    const metadata = await OBR.room.getMetadata();
    characters.value = (metadata[ROOM_DATA_KEY] as CharacterData) || {};

    // Listen for room data changes (Character updates)
    const roomSub = OBR.room.onMetadataChange((newMetadata) => {
      const newData = newMetadata[ROOM_DATA_KEY] as CharacterData;
      if (newData) {
        characters.value = newData;
      }
    });

    // Listen for selection changes (to enable "Link" buttons)
    const selectionSub = OBR.player.onChange((player) => {
      selectedItems.value = player.selection || [];
    });

    onUnmounted(() => {
      roomSub();
      selectionSub();
    });
  };

  onMounted(() => {
    OBR.onReady(() => {
        init();
    });
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
