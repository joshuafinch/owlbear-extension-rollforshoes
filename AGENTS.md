# Owlbear Extension: Roll for Shoes - Agent Guide

This document provides comprehensive guidelines for AI agents and developers working on the `roll-for-shoes` Owlbear Rodeo extension. It details build processes, code style, architectural patterns, and behavioral expectations to ensure consistency and quality.

## 1. Project Overview & Environment

*   **Type:** Vite-based web application (Vue 3 + TypeScript).
*   **Target:** Owlbear Rodeo (OBR) Extension.
*   **Root Directory:** `C:\Users\josh\Documents\Development\owlbear-extension-rollforshoes`
*   **Node Version:** Standard LTS (implied).

### Commands

*   **Development Server:**
    ```bash
    npm run dev
    ```
    *   *Usage:* Starts the local Vite server. Essential for live testing the extension in an OBR room context.
*   **Production Build:**
    ```bash
    npm run build
    ```
    *   *Usage:* Compiles assets to `dist/`. Run this before deployment or when checking for build errors.
*   **Preview Build:**
    ```bash
    npm run preview
    ```
*   **Testing:**
    *   *Status:* **No testing framework is currently configured.**
    *   *Agent Instruction:* Do not attempt to run `npm test`. If asked to add tests, recommend and install a runner compatible with Vite (like Vitest) before attempting to write test files.

## 2. Code Style & Formatting

Adhere strictly to these conventions to match existing files like `src/components/RollList.vue` and `src/main.ts`.

### Formatting
*   **Indentation:** **2 Spaces**. (Updated from Tabs).
*   **Semicolons:** **Yes**. Always end statements with semicolons.
*   **Quotes:** **Double quotes** (`"`) are preferred for strings and imports.
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
*   **Typing:** Use strict typing. Avoid `any` where possible, though interactions with OBR metadata often require explicit casting (e.g., `as any`) or defined interfaces since metadata is generic.
*   **Imports:** Explicit file extensions are **NOT** required for imports in this TypeScript setup, but consistent relative paths are.

## 3. Architecture & Patterns

The application follows a Vue 3 Composition API structure.

### Entry Point (`src/main.ts`)
*   Imports CSS and root component.
*   Mounts the Vue app to `#app`.

### Component Pattern
*   **Structure:** Single File Components (SFC) with `<script setup>`, `<template>`, and `<style>` (optional).
*   **State:** Use `ref` or `reactive` for local state.
*   **Lifecycle:** Use `onMounted` for initialization logic like `OBR.onReady`.

### Owlbear Rodeo SDK Usage (`@owlbear-rodeo/sdk`)
*   **Global Object:** `OBR` is the primary entry point.
*   **Initialization:** Logic usually resides inside `onMounted` hooks within the root or specific components, wrapped in `OBR.onReady(() => { ... })`.
*   **Metadata Namespacing:**
    *   The extension uses a helper `getPluginId("metadata")` to namespace its data.
    *   *Agent Instruction:* Always use this helper when reading/writing metadata to avoid collisions.
    *   *Example:* `item.metadata[getPluginId("metadata")]`
*   **Reactivity:**
    *   Use `OBR.scene.items.onChange(...)` to react to changes in the scene.
    *   Vue reactivity should reflect these changes by updating `ref`s inside the callback.

### Styling (TailwindCSS)
*   **Approach:** Utility-first CSS using TailwindCSS.
*   **Usage:** Apply classes directly to HTML elements in `<template>`.
*   **Custom CSS:** Place global overrides in `src/style.css`.
*   **Configuration:** Tailwind is configured via the `@tailwindcss/vite` plugin.

## 4. Workflows for Agents

### Analyzing the Codebase
1.  **Search First:** Use `grep` or `glob` to find relevant files.
2.  **Context:** Read `src/App.vue` and `src/main.ts` to understand the component tree.
3.  **Dependencies:** Check `package.json` to verify available libraries.

### Modifying Code
1.  **Match Style:** Follow the Vue 3 `<script setup>` pattern.
2.  **Verification:** Since there are no tests, verify syntax validity by creating a build (`npm run build`). A successful build is the baseline requirement.

### Adding Features
1.  **UI:** Create a new Vue component in `src/components/`.
2.  **Logic:** encapsulate logic within the component or extract to `src/utils/` if shared.
3.  **Wiring:** Import and use the component in `src/App.vue`.

## 5. Specific File Notes

*   **`src/utils/getPluginId.ts`:** Crucial helper for constructing unique ID strings for the extension.
*   **`src/components/RollList.vue`:** Main component syncing with OBR scene items.
*   **`vite.config.js`:** Vite configuration with Vue and Tailwind plugins.

## 6. Troubleshooting Common Issues
*   *Issue:* "Import not found"
    *   *Fix:* Check if the path is correct. TypeScript resolution usually handles extensions, but ensure the file exists.
*   *Issue:* "OBR is not defined"
    *   *Fix:* Ensure `@owlbear-rodeo/sdk` is imported.
*   *Issue:* UI not updating
    *   *Fix:* Verify that the `OBR.scene.items.onChange` callback is updating a reactive `ref` variable.

---
*Generated by opencode on Jan 24 2026*
