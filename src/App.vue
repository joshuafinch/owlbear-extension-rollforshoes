<script setup lang="ts">
import CharacterManager from './components/CharacterManager.vue';
import InstallGuide from './components/InstallGuide.vue';
import { ref, onMounted } from 'vue';
import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from './utils/contextMenu';
import { useTheme } from './composables/useTheme';

const isReady = ref(false);

useTheme();

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
  
  <div v-else class="font-sans min-h-screen transition-colors duration-300 bg-[var(--obr-bg-default)] text-[var(--obr-text-primary)]">
    <!-- Main Container -->
    <div class="w-full max-w-lg mx-auto py-4">
      <div class="px-6 pb-2 text-center">
        <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-[var(--obr-primary-main)] via-purple-500 to-[var(--obr-secondary-main)] bg-clip-text text-transparent drop-shadow-sm pb-1">
          Roll for Shoes
        </h1>
        <p class="text-xs font-medium text-[var(--obr-text-secondary)] uppercase tracking-widest mt-1 opacity-80">Character Manager</p>
      </div>
      
      <CharacterManager />
    </div>
  </div>
</template>
