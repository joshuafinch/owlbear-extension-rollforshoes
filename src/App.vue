<script setup lang="ts">
import CharacterManager from './components/CharacterManager.vue';
import InstallGuide from './components/InstallGuide.vue';
import { ref, onMounted } from 'vue';
import OBR from "@owlbear-rodeo/sdk";
import { useTheme } from './composables/useTheme';

const isReady = ref(false);

useTheme();

onMounted(() => {
  if (OBR.isAvailable) {
    isReady.value = true;
  }
});
</script>

<template>
  <InstallGuide v-if="!isReady" />
  
  <div v-else class="font-sans h-screen transition-colors duration-300 bg-[var(--obr-bg-paper)] text-[var(--obr-text-primary)] overflow-hidden">
    <!-- Main Container -->
    <div class="w-full h-full mx-auto">
      <CharacterManager />
    </div>
  </div>
</template>
