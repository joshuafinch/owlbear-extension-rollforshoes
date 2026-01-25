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
  <div class="h-screen flex flex-col items-center overflow-y-auto p-4 bg-[#fbbf24] font-sans relative">
    
    <!-- Bold Pattern Background -->
    <div class="fixed inset-0 z-0 opacity-20 pointer-events-none" 
         style="background-image: url('/running-shoe.svg'); background-size: 100px 100px; filter: grayscale(1) contrast(1.5);">
    </div>
    
    <!-- Main "Job Ticket" Container -->
    <div class="relative z-10 max-w-2xl w-full bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black transform md:rotate-1 transition-transform hover:rotate-0 duration-300 my-8 flex-shrink-0">
      
      <!-- "Tape" decorations -->
      <div class="absolute -top-4 left-1/4 w-24 h-8 bg-white/50 border-2 border-gray-300/50 transform -rotate-3 z-20 backdrop-blur-sm"></div>
      <div class="absolute -bottom-4 right-1/4 w-24 h-8 bg-white/50 border-2 border-gray-300/50 transform rotate-2 z-20 backdrop-blur-sm"></div>

      <!-- Header Section -->
      <div class="border-b-4 border-black bg-[#ff0055] p-0 relative overflow-hidden h-72 flex items-center justify-center group">
         
         <!-- Background: Dynamic Rays -->
         <div class="absolute inset-0 opacity-50" 
              style="background: repeating-conic-gradient(#ff0055 0deg 20deg, #ff3377 20deg 40deg);">
         </div>
         
         <!-- Dot Pattern -->
         <div class="absolute inset-0 bg-[radial-gradient(black_2px,transparent_2px)] [background-size:24px_24px] opacity-20"></div>

         <!-- Chaotic Content Wrapper -->
         <div class="relative z-10 w-full max-w-xl h-full flex items-center justify-center p-4">
            
            <!-- The Icon (Sticker style) -->
            <div class="absolute top-6 left-6 md:left-12 transform -rotate-12 z-20 hover:scale-110 transition-transform duration-300">
                <div class="bg-white p-2 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
                    <img src="/apple-touch-icon.png" alt="Icon" class="w-16 h-16 object-contain" />
                </div>
                <!-- Tape -->
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-yellow-200/90 rotate-3 shadow-sm"></div>
            </div>

            <!-- The Title Stack -->
            <div class="flex flex-col items-center transform rotate-2 hover:rotate-0 transition-transform duration-300 select-none">
                <!-- ROLL -->
                <h1 class="text-8xl md:text-9xl font-black text-white italic uppercase leading-[0.75] tracking-tighter drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] stroke-black z-10" 
                    style="-webkit-text-stroke: 3px black; paint-order: stroke fill;">
                    ROLL
                </h1>
                
                <!-- FOR SHOES -->
                <h1 class="text-6xl md:text-7xl font-black text-[#fbbf24] italic uppercase leading-[0.9] tracking-tighter drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] stroke-black z-0 transform -skew-x-12 translate-x-4" 
                    style="-webkit-text-stroke: 3px black; paint-order: stroke fill;">
                    FOR SHOES
                </h1>
            </div>

            <!-- Badge / Dispatch Label -->
             <div class="absolute bottom-4 right-4 md:bottom-6 md:right-12 transform rotate-6 z-20">
                <div class="bg-black text-white border-2 border-white px-3 py-1 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_rgba(255,255,255,0.5)] flex items-center gap-2 transform hover:scale-105 transition-transform">
                    <span class="block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Extension Dispatch
                </div>
            </div>
            
            <!-- Random Debris (CSS shapes) -->
            <div class="absolute top-1/4 right-1/4 w-4 h-4 bg-yellow-400 border-2 border-black rotate-45 animate-pulse"></div>
            <div class="absolute bottom-1/3 left-1/4 w-3 h-3 bg-blue-400 border-2 border-black -rotate-12 rounded-full"></div>
         </div>
      </div>

      <!-- Content Body -->
      <div class="p-6 md:p-8 bg-[#fdfbf7] relative">
        
        <!-- Stamp Watermark -->
        <div class="hidden md:block absolute top-20 right-10 opacity-10 pointer-events-none transform -rotate-12 border-8 border-black p-4 rounded-xl text-black font-black text-7xl uppercase tracking-widest mix-blend-multiply">
            APPROVED
        </div>

        <!-- Mission Text -->
        <div class="mb-8 text-center relative z-10 bg-yellow-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 class="text-xl font-black uppercase text-black mb-1 flex items-center justify-center gap-2">
                <span class="text-red-600 text-2xl">⚠</span> MISSION DIRECTIVE
            </h2>
            <p class="text-lg font-bold text-gray-900 leading-snug">
                Installation required inside <span class="bg-blue-600 text-white px-2 decoration-clone box-decoration-clone">Owlbear Rodeo</span> to proceed.
            </p>
        </div>

        <!-- Steps List - "Ticket" style -->
        <div class="space-y-4 font-bold text-gray-800">
            
            <!-- Step 1 -->
            <div class="flex flex-col sm:flex-row border-4 border-black bg-white group hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all">
                <div class="sm:w-20 bg-black text-white flex items-center justify-center font-black text-4xl py-2 sm:py-0">1</div>
                <div class="flex-1 p-4 border-t-4 sm:border-t-0 sm:border-l-4 border-black">
                    <div class="font-black uppercase text-sm text-red-600 mb-1 tracking-wider">Secure Asset</div>
                    <div class="flex flex-col gap-3">
                         <div class="text-2xl font-black">Copy Manifest URL</div>
                         <div class="flex gap-2">
                            <code class="flex-1 bg-gray-100 border-2 border-dashed border-gray-400 p-3 font-mono text-sm font-bold truncate select-all">{{ url }}</code>
                            <button @click="copyUrl" class="bg-yellow-400 border-2 border-black px-4 py-2 font-black uppercase text-sm hover:bg-yellow-300 active:bg-yellow-500 transition-colors flex items-center gap-2">
                                <span v-if="copied">✔ COPIED</span>
                                <span v-else>COPY</span>
                            </button>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Step 2 -->
             <div class="flex flex-col sm:flex-row border-4 border-black bg-white group hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(37,99,235,1)] transition-all">
                <div class="sm:w-20 bg-black text-white flex items-center justify-center font-black text-4xl py-2 sm:py-0">2</div>
                <div class="flex-1 p-4 border-t-4 sm:border-t-0 sm:border-l-4 border-black">
                     <div class="font-black uppercase text-sm text-blue-600 mb-1 tracking-wider">Infiltrate</div>
                     <div class="text-2xl font-black">Open <a href="https://www.owlbear.rodeo/" target="_blank" class="underline decoration-4 decoration-blue-500 hover:text-blue-600 hover:decoration-black">Owlbear Rodeo</a></div>
                </div>
            </div>
            
            <!-- Step 3 -->
             <div class="flex flex-col sm:flex-row border-4 border-black bg-white group hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] transition-all">
                <div class="sm:w-20 bg-black text-white flex items-center justify-center font-black text-4xl py-2 sm:py-0">3</div>
                <div class="flex-1 p-4 border-t-4 sm:border-t-0 sm:border-l-4 border-black">
                    <div class="font-black uppercase text-sm text-green-600 mb-1 tracking-wider">Locate</div>
                    <div class="text-xl">Click <span class="bg-gray-200 px-2 border-2 border-black text-base font-black mx-1">•••</span> (Extras) → <span class="uppercase font-black">Extensions</span></div>
                </div>
            </div>

             <!-- Step 4 -->
             <div class="flex flex-col sm:flex-row border-4 border-black bg-white group hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(147,51,234,1)] transition-all">
                <div class="sm:w-20 bg-black text-white flex items-center justify-center font-black text-4xl py-2 sm:py-0">4</div>
                <div class="flex-1 p-4 border-t-4 sm:border-t-0 sm:border-l-4 border-black">
                    <div class="font-black uppercase text-sm text-purple-600 mb-1 tracking-wider">Execute</div>
                    <div class="text-xl leading-tight">Click <span class="font-black bg-black text-white px-2 py-0.5">+ Custom Extension</span> and paste the URL.</div>
                </div>
            </div>

        </div>

      </div>
      
      <!-- Footer -->
       <div class="bg-black p-4 text-center text-white font-mono text-sm font-bold uppercase tracking-[0.2em] border-t-4 border-white">
         Do Anything // Fail Forward
       </div>
    </div>
  </div>
</template>
