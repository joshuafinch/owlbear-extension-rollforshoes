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

onMounted(() => {
    const updateList = (sceneItems: Item[]) => {
        const rollForShoesItems = sceneItems.filter(item => {
            const metadata = item.metadata[getPluginId("metadata")] as any;
            return metadata && metadata.rollForShoes !== undefined;
        });

        const sortedItems = rollForShoesItems.sort((a, b) => {
            const aMetadata = a.metadata[getPluginId("metadata")] as any;
            const bMetadata = b.metadata[getPluginId("metadata")] as any;
            return aMetadata.rollForShoes - bMetadata.rollForShoes;
        });

        items.value = sortedItems.map(item => {
            const metadata = item.metadata[getPluginId("metadata")] as any;
            return {
                name: item.name,
                value: metadata.rollForShoes,
                id: item.id
            };
        });
    };

    OBR.scene.items.onChange(updateList);
});
</script>

<template>
  <ul class="list-none p-0">
    <li v-for="item in items" :key="item.id" class="py-1">
      <span class="font-bold">{{ item.name }}:</span> {{ item.value }}
    </li>
  </ul>
</template>
