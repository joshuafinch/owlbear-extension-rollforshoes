<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OBR from "@owlbear-rodeo/sdk";
import getPluginId from '../utils/getPluginId';

const count = ref<number | null>(null);
const debugMsg = ref("");
const metadataKey = getPluginId('counter');
let unsubscribe: (() => void) | null = null;

const log = (msg: string) => {
  console.log(`[Counter] ${msg}`);
  debugMsg.value = msg;
};

onMounted(() => {
  log("Component mounted");
  OBR.onReady(async () => {
    log("OBR Ready");
    try {
      // Initial fetch
      const metadata = await OBR.room.getMetadata();
      const val = metadata[metadataKey];
      log(`Initial metadata fetch: ${JSON.stringify(val)}`);
      count.value = (typeof val === 'number') ? val : 0;

      // Subscribe
      unsubscribe = OBR.room.onMetadataChange((newMetadata) => {
        const newVal = newMetadata[metadataKey];
        log(`Metadata change detected: ${JSON.stringify(newVal)}`);
        count.value = (typeof newVal === 'number') ? newVal : 0;
      });
    } catch (e) {
      log(`Error: ${e}`);
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const increment = async () => {
  log("Increment clicked");
  const current = count.value || 0;
  const next = current + 1;
  
  // Optimistic
  count.value = next;

  try {
    await OBR.room.setMetadata({ [metadataKey]: next });
    log(`Set metadata to ${next}`);
    OBR.notification.show(`Saved count: ${next}`);
  } catch (e) {
    log(`Save failed: ${e}`);
    // Revert?
  }
};
</script>

<template>
  <div class="flex flex-col gap-2 items-center">
    <button 
      @click="increment" 
      class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded border border-transparent hover:border-blue-500 transition-colors cursor-pointer"
    >
      count is {{ count ?? 'loading...' }}
    </button>
    <div class="text-xs text-gray-500 font-mono max-w-[200px] break-all">
      {{ debugMsg }}
    </div>
  </div>
</template>
