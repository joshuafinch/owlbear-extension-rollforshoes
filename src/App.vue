<script setup lang="ts">
import CharacterManager from './components/CharacterManager.vue';
import InstallGuide from './components/InstallGuide.vue';
import { ref, onMounted } from 'vue';
import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from './utils/contextMenu';

const isReady = ref(false);

onMounted(() => {
  if (OBR.isAvailable) {
    isReady.value = true;
    OBR.onReady(() => {
      // We might want to keep the context menu or remove it if it conflicts with the new system.
      // For now, let's keep it as it doesn't hurt, but the main interaction is now the UI panel.
      setupContextMenu(); 
    });
  }
});
</script>

<template>
  <InstallGuide v-if="!isReady" />
  
  <div v-else class="font-sans text-[#213547] min-h-screen bg-white dark:bg-[#242424] dark:text-[rgba(255,255,255,0.87)]">
    <div class="w-full">
      <div class="p-4 text-center border-b border-gray-100 dark:border-gray-800">
        <h1 class="text-2xl font-bold leading-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Roll for Shoes
        </h1>
      </div>
      
      <CharacterManager />
    </div>
  </div>
</template>
