<script setup lang="ts">
import { onMounted } from 'vue';
import RollList from './components/RollList.vue';
import Counter from './components/Counter.vue';
import { setupContextMenu } from './utils/contextMenu';
import OBR from "@owlbear-rodeo/sdk";

onMounted(() => {
  OBR.onReady(() => {
    setupContextMenu();
  });
});
</script>

<template>
  <div class="font-sans text-center text-[#213547] min-h-screen flex flex-col items-center justify-start pt-8 bg-white dark:bg-[#242424] dark:text-[rgba(255,255,255,0.87)]">
    <div class="max-w-md w-full px-4">
      <h1 class="text-3xl font-bold leading-tight mb-8">
        Owlbear Extension:<br/>Roll for Shoes
      </h1>
      
      <div class="mb-8">
        <RollList />
      </div>

      <div class="card p-8">
        <Counter />
      </div>
    </div>
  </div>
</template>
