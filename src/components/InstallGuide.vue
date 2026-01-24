<script setup lang="ts">
import { ref } from 'vue';

const copied = ref(false);
const url = `${window.location.href}manifest.json`;

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#242424] text-[#213547] dark:text-gray-100 font-sans">
    <div class="max-w-2xl w-full bg-white dark:bg-[#1a1a1a] shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <!-- Header -->
      <div class="bg-indigo-600 p-8 text-center">
        <h1 class="text-3xl font-bold text-white mb-2">Owlbear Extension: Roll for Shoes</h1>
        <p class="text-indigo-100">Enhance your game with custom rolling mechanics</p>
      </div>

      <!-- Content -->
      <div class="p-8 space-y-8">
        
        <!-- Context -->
        <div class="flex items-start gap-4">
          <div class="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold mb-2">Extension Detected</h2>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              You've opened this extension directly in your browser. To use it, you need to install it inside Owlbear Rodeo.
            </p>
          </div>
        </div>

        <!-- Instructions -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 class="text-xl font-semibold mb-6">How to Install</h2>
          <ol class="space-y-6 list-decimal list-outside text-gray-600 dark:text-gray-300 ml-5">
            <li class="pl-2">
              <div class="mb-2"><span class="font-medium text-gray-900 dark:text-white">Copy the Extension URL:</span></div>
              <div class="flex gap-2 max-w-full">
                <code class="flex-1 block p-3 bg-gray-100 dark:bg-[#2a2a2a] rounded border border-gray-200 dark:border-gray-700 font-mono text-sm break-all">
                  {{ url }}
                </code>
                <button 
                  @click="copyUrl"
                  class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
                  title="Copy to clipboard"
                >
                  <span v-if="copied">Copied!</span>
                  <span v-else>Copy URL</span>
                </button>
              </div>
            </li>
            <li class="pl-2">
              Open your <a href="https://www.owlbear.rodeo/" target="_blank" class="text-indigo-600 hover:underline dark:text-indigo-400 font-medium">Owlbear Rodeo</a> room.
            </li>
            <li class="pl-2">
              Click the <span class="font-bold text-gray-800 dark:text-gray-200">Extras</span> menu (three dots) in the bottom toolbar.
            </li>
            <li class="pl-2">
              Select <span class="font-bold text-gray-800 dark:text-gray-200">Extensions</span>, then click <span class="font-bold text-gray-800 dark:text-gray-200">Custom Extension</span> (the + icon at top-right).
            </li>
            <li class="pl-2">
              Paste the URL into the input field and click <span class="font-bold text-gray-800 dark:text-gray-200">Install</span>.
            </li>
          </ol>
        </div>

      </div>
    </div>
  </div>
</template>
