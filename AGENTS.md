# Owlbear Extension: Roll for Shoes - Agent Guide

This document provides comprehensive guidelines for AI agents and developers working on the `roll-for-shoes` Owlbear Rodeo extension. It details build processes, code style, architectural patterns, and behavioral expectations to ensure consistency and quality.

## 1. Project Overview & Environment

*   **Type:** Vite-based web application (Vue 3 + TypeScript).
*   **Target:** Owlbear Rodeo (OBR) Extension.
*   **Root Directory:** `C:\Users\josh\Documents\Development\owlbear-extension-rollforshoes`
*   **Node Version:** Standard LTS (implied).
*   **Deployment:** Cloudflare Pages (suggested by `wrangler.jsonc`).

### Key Commands

*   **Development Server:**
    ```bash
    npm run dev
    ```
    *   *Usage:* Starts the local Vite server. Essential for live testing the extension in an OBR room context.
*   **Production Build:**
    ```bash
    npm run build
    ```
    *   *Usage:* Compiles assets to `dist/`. **Always run this before finishing a task** to ensure there are no compilation errors.
*   **Type Check:**
    ```bash
    npx vue-tsc --noEmit
    ```
    *   *Usage:* Runs TypeScript validation without emitting files. Use this to verify type safety after changes.
*   **Preview Build:**
    ```bash
    npm run preview
    ```
*   **Testing:**
    *   *Status:* **No testing framework is currently configured.**
    *   *Agent Instruction:* Do not attempt to run `npm test`. If asked to add tests, recommend and install a runner compatible with Vite (like Vitest) before attempting to write test files.

## 2. Code Style & Formatting

Adhere strictly to these conventions. The project uses a mix of styles, but consistency with *neighboring code* is paramount.

### Formatting
*   **Indentation:** **2 Spaces**.
*   **Semicolons:** **Yes**. Always end statements with semicolons.
*   **Quotes:**
    *   **TypeScript/JS:** **Single quotes** (`'`) are generally preferred for imports and code (e.g., `import { ref } from 'vue'`). *Note: Some OBR imports use double quotes; follow the file's existing pattern.*
    *   **HTML/Template:** **Double quotes** (`"`) for attributes.
*   **Line Endings:** Standard LF or CRLF (Windows).
*   **Braces:** K&R style (opening brace on the same line).

### Naming Conventions
*   **Files:**
    *   Vue Components: `PascalCase.vue` (e.g., `RollList.vue`, `Counter.vue`).
    *   TypeScript Files: `camelCase.ts` (e.g., `getPluginId.ts`, `contextMenu.ts`).
*   **Functions:** `camelCase` (e.g., `setupCounter`, `renderList`).
*   **Variables:** `camelCase`.
*   **Types/Interfaces:** `PascalCase` (e.g., `RollForShoesItem`).
*   **Constants:** `UPPER_SNAKE_CASE` (if applicable).

### TypeScript & Vue Features
*   **Module System:** ES Modules (`import`/`export`).
*   **Components:** Use `<script setup lang="ts">` syntax.
*   **Typing:** Use strict typing.
    *   Avoid `any` where possible.
    *   **OBR Metadata:** Interactions with `item.metadata` often require explicit casting because the SDK types are generic.
    *   *Pattern:* `const data = item.metadata[NAMESPACE] as MyCustomInterface;`
*   **Imports:** Explicit file extensions are **NOT** required for imports in this TypeScript setup, but consistent relative paths are.

## 3. Architecture & Patterns

The application follows a standard Vue 3 Composition API structure.

### Entry Point (`src/main.ts`)
*   Imports global CSS (`src/style.css`).
*   Mounts `App.vue` to the `#app` div.

### Component Pattern
*   **Structure:** Single File Components (SFC) with `<script setup>`, `<template>`, and `<style>` (optional).
*   **State:** Use `ref` or `reactive` for local state.
*   **Lifecycle:** Use `onMounted` for initialization logic like `OBR.onReady`.

### Owlbear Rodeo SDK Usage (`@owlbear-rodeo/sdk`)
*   **Global Object:** `OBR` is the primary entry point.
*   **Initialization:** Logic usually resides inside `onMounted` hooks, wrapped in `OBR.onReady(() => { ... })`.
*   **Metadata Namespacing:**
    *   **Critical:** The extension MUST namespace its data to avoid collisions with other plugins.
    *   **Helper:** Use `src/utils/getPluginId.ts`.
    *   *Usage:* `getPluginId("metadata")` returns the fully qualified key.
    *   *Example:* `item.metadata[getPluginId("metadata")] = { ... }`
*   **Reactivity:**
    *   Use `OBR.scene.items.onChange(...)` to subscribe to scene updates.
    *   Inside the callback, update Vue `ref`s to trigger UI re-renders.

### Styling (TailwindCSS)
*   **Version:** TailwindCSS v4 (`@tailwindcss/vite`).
*   **Approach:** Utility-first CSS.
*   **Usage:** Apply classes directly to HTML elements in `<template>`.
*   **Dark Mode:** The app supports dark mode (see `src/App.vue` classes like `dark:bg-[#242424]`). Ensure new components support this.

## 4. Workflows for Agents

### Analyzing the Codebase
1.  **Search First:** Use `grep` or `glob` to find relevant files.
2.  **Context:** Read `src/App.vue` and `src/main.ts` to understand the component tree.
3.  **Dependencies:** Check `package.json` to verify available libraries before suggesting new imports.

### Modifying Code
1.  **Match Style:** Follow the Vue 3 `<script setup>` pattern.
2.  **Safety Check:** If modifying OBR logic, remember that `OBR` calls are often asynchronous. Use `async/await` where appropriate.
3.  **Verification:**
    *   **Build:** Run `npm run build` to ensure the project compiles.
    *   **Type Check:** Run `npx vue-tsc --noEmit` to catch TypeScript errors.

### Adding Features
1.  **UI:** Create a new Vue component in `src/components/`.
2.  **Logic:** Encapsulate logic within the component or extract to `src/utils/` if shared.
3.  **Wiring:** Import and use the component in `src/App.vue` (or a relevant parent).

## 5. Specific File Notes

*   **`src/utils/getPluginId.ts`:**
    *   Helper function for creating namespaced IDs.
    *   *Input:* Short string (e.g., "roll").
    *   *Output:* `com.aurayu.rollforshoes/${path}`.
*   **`src/components/RollList.vue`:**
    *   Main component that syncs with OBR scene items.
    *   Demonstrates how to read metadata and listen for changes.
*   **`vite.config.js`:**
    *   Vite configuration with Vue and Tailwind plugins.
*   **`wrangler.jsonc`:**
    *   Configuration for Cloudflare deployment.

## 6. Troubleshooting Common Issues
*   *Issue:* "Import not found"
    *   *Fix:* Check if the path is correct. TypeScript resolution usually handles extensions, but ensure the file exists.
*   *Issue:* "OBR is not defined"
    *   *Fix:* Ensure `import OBR from "@owlbear-rodeo/sdk";` is present at the top of the file.
*   *Issue:* UI not updating
    *   *Fix:* Verify that the `OBR.scene.items.onChange` callback is correctly updating a reactive `ref` variable.
*   *Issue:* Styles not applying
    *   *Fix:* Ensure Tailwind classes are spelled correctly. In v4, no config file is needed for standard classes, but arbitrary values need `[]` syntax.

---
*Updated by opencode on Jan 24 2026*
