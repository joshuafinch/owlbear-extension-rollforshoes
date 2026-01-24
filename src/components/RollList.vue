<script setup lang="ts">
import { ref, onMounted } from 'vue';
import OBR from "@owlbear-rodeo/sdk";
import getPluginId from "../utils/getPluginId";
import type { Item } from "@owlbear-rodeo/sdk";

interface RollForShoesItem {
    name: string;
    value: string;
    id: string;
}

const items = ref<RollForShoesItem[]>([]);
const errorMsg = ref<string>("");

onMounted(() => {
    // Safety check: if somehow mounted without OBR available
    if (!OBR.isAvailable) {
        errorMsg.value = "OBR SDK not available";
        return;
    }

    OBR.onReady(async () => {
        try {
            // Check if scene is ready before proceeding
            const isSceneReady = await OBR.scene.isReady();
            if (!isSceneReady) {
                 // If scene isn't ready, wait for it
                 await new Promise<void>((resolve) => {
                    const unsubscribe = OBR.scene.onReadyChange((ready) => {
                        if (ready) {
                            unsubscribe();
                            resolve();
                        }
                    });
                 });
            }

            const updateList = (sceneItems: Item[]) => {
                try {
                    const rollForShoesItems = sceneItems.filter(item => {
                        const metadata = item.metadata[getPluginId("metadata")] as any;
                        return metadata && metadata.rollForShoes !== undefined;
                    });

                    const sortedItems = rollForShoesItems.sort((a, b) => {
                        const aMetadata = a.metadata[getPluginId("metadata")] as any;
                        const bMetadata = b.metadata[getPluginId("metadata")] as any;
                        return (aMetadata.rollForShoes > bMetadata.rollForShoes) ? 1 : -1; 
                    });

                    items.value = sortedItems.map(item => {
                        const metadata = item.metadata[getPluginId("metadata")] as any;
                        return {
                            name: item.name,
                            value: metadata.rollForShoes,
                            id: item.id
                        };
                    });
                } catch (err) {
                    console.error("Error processing items:", err);
                    errorMsg.value = `Error processing items: ${err}`;
                }
            };

            // Initial load
            console.log("RollList: Fetching initial items...");
            const initialItems = await OBR.scene.items.getItems();
            console.log(`RollList: Fetched ${initialItems.length} items`);
            updateList(initialItems);

            // Subscribe to changes
            OBR.scene.items.onChange(updateList);
        } catch (err) {
            console.error("RollList Error:", err);
            errorMsg.value = `Failed to load items: ${err instanceof Error ? err.message : JSON.stringify(err)}`;
        }
    });
});
</script>

<template>
  <div v-if="errorMsg" class="text-red-500 text-xs text-left mb-2 p-2 bg-red-100 rounded">
    {{ errorMsg }}
  </div>
  <ul class="list-none p-0">
    <li v-for="item in items" :key="item.id" class="py-1">
      <span class="font-bold">{{ item.name }}:</span> {{ item.value }}
    </li>
  </ul>
</template>
