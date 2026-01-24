<script setup lang="ts">
import { ref } from 'vue';
import OBR from "@owlbear-rodeo/sdk";

const count = ref(0);

const increment = () => {
  count.value++;
  OBR.notification.show(`count is ${count.value}`);
};
</script>

<template>
  <button 
    @click="increment" 
    class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded border border-transparent hover:border-blue-500 transition-colors cursor-pointer"
  >
    count is {{ count }}
  </button>
</template>
