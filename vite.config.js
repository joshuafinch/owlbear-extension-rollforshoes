import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
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