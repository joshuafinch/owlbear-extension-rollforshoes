import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    https: {
      key: "./certs/localhost+2-key.pem",
      cert: "./certs/localhost+2.pem",
    },
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
});
