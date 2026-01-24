# Owlbear Extension: Roll for Shoes - Agent Guide

This document serves as the authoritative guide for AI agents and developers working on the `roll-for-shoes` Owlbear Rodeo extension. It establishes strict protocols for building, styling, and architecting code to ensure the repository remains maintainable and bug-free.

## 1. Project Context & Environment

*   **Application Type:** Vite-based web application (Vue 3 + TypeScript).
*   **Target Platform:** Owlbear Rodeo (OBR) Extension.
*   **Root Directory:** `C:\Users\josh\Documents\Development\owlbear-extension-rollforshoes`
*   **Node Version:** Standard LTS.
*   **Build Tool:** Vite (Note: `package.json` overrides `vite` to `rolldown-vite` - do not change this).
*   **Styling:** TailwindCSS v4 (`@tailwindcss/vite`).
*   **Deployment:** Cloudflare Pages (configured via `wrangler.jsonc`).

## 2. Development Workflow

Execute these commands from the project root.

### Core Commands
*   **Start Development Server:**
    ```bash
    npm run dev
    ```
    *   *Purpose:* Starts the local Vite server.
    *   *Agent Note:* Essential for live verification. You cannot "run" the extension without OBR, but you can ensure the server starts without errors.

*   **Production Build:**
    ```bash
    npm run build
    ```
    *   *Purpose:* Compiles source code to `dist/`.
    *   *Agent Note:* **Mandatory.** You must run this successfully before declaring a task complete.

*   **Type Checking:**
    ```bash
    npx vue-tsc --noEmit
    ```
    *   *Purpose:* Runs TypeScript validation without generating files.
    *   *Agent Note:* **Mandatory.** Run this after any `.ts` or `.vue` modification to catch type errors that Vite's dev server might miss.

### Testing Commands
*   **Status:** **No testing framework is currently configured.**
*   **Running a Single Test:**
    *   Since no runner exists, you cannot run a single test.
    *   *If the user asks to run a specific test:* Inform them that tests are not configured and ask if they would like you to set up **Vitest**.
    *   *If you set up Vitest:* The command for a single test would be `npx vitest run path/to/file.test.ts`.

## 3. Code Style & Conventions

Adherence to these standards is non-negotiable to maintain a cohesive codebase.

### Formatting & Syntax
*   **Indentation:** 2 Spaces.
*   **Semicolons:** **Yes**. Always end statements with semicolons.
*   **Quotes:**
    *   Typescript/JS: **Single quotes** (`'`) (e.g., `import { ref } from 'vue';`).
    *   HTML Attributes: **Double quotes** (`"`) (e.g., `<div class="p-4">`).
*   **Component Syntax:** Use `<script setup lang="ts">`.
*   **Trailing Commas:** Yes, in multi-line objects/arrays.

### Naming Conventions
*   **Vue Components:** `PascalCase.vue` (e.g., `CharacterSheet.vue`).
*   **TS Files:** `camelCase.ts` (e.g., `metadataUtils.ts`).
*   **Functions/Variables:** `camelCase` (e.g., `updateScore`, `playerList`).
*   **Types/Interfaces:** `PascalCase` (e.g., `PlayerStats`).
*   **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_HP`).
*   **Event Handlers:** Prefix with `handle` (e.g., `handleClick`, `handleUpdate`).

### TypeScript Specifics
*   **Strict Mode:** Enabled.
*   **Explicit Types:** Prefer explicit interfaces over `any`.
    *   *Bad:* `const data: any = ...`
    *   *Good:* `const data = item.metadata[ID] as GameState;`
*   **Imports:** Do not use file extensions for imports (e.g., `import X from './X'` not `'./X.ts'`), *unless* required by a specific loader.

## 4. Architecture & OBR SDK Patterns

### Component Structure
*   **Single File Components:** Keep logic inside `<script setup>`.
*   **State:** Use `ref` for primitives and `reactive` for objects.
*   **Lifecycle:**
    *   Initialize OBR logic in `onMounted`.
    *   Clean up listeners (if necessary) in `onUnmounted`.

### Owlbear Rodeo Integration (`@owlbear-rodeo/sdk`)
*   **Initialization:** Wrap all OBR calls in `OBR.onReady()` to ensure the SDK is loaded.
*   **Metadata Management:**
    *   **Namespacing:** ALWAYS namespace metadata keys to prevent collisions.
    *   **Helper:** Use `src/utils/getPluginId.ts` to generate keys.
    *   *Example:*
        ```typescript
        import { getPluginId } from '../utils/getPluginId';
        const METADATA_KEY = getPluginId('stats');
        // Reading
        const stats = item.metadata[METADATA_KEY];
        ```
*   **Reactivity:**
    *   Do not poll. Use `OBR.scene.items.onChange` to listen for updates.
    *   Update local Vue state inside the callback to drive the UI.
*   **Async/Await:** Most OBR methods are asynchronous. Always use `await` or proper promise handling.

## 5. Agent Behavioral Guidelines

### Analysis Phase
1.  **Discovery:** Use `ls -R` or `glob` to map the file structure before making assumptions.
2.  **Context:** Read `src/App.vue` and `src/main.ts` first to understand the application entry point and global providers.
3.  **Dependencies:** Check `package.json` before importing *any* third-party library. If it's not listed, ask the user before installing.

### Implementation Phase
1.  **Incremental Changes:** Make small, verifiable changes.
2.  **Verification Loop:**
    *   After writing code -> Run `npx vue-tsc --noEmit`.
    *   If that passes -> Run `npm run build`.
    *   Only submit changes if both pass.

### Error Handling
*   **Runtime:** Wrap OBR calls in `try/catch` blocks if they involve network or permission operations.
*   **UI Feedback:** If an error occurs, log it to the console (`console.error`) and consider showing a user-friendly toast/notification if a notification system exists.

## 6. Troubleshooting Common Issues

*   **"OBR is not defined":**
    *   *Fix:* Add `import OBR from '@owlbear-rodeo/sdk';` at the top of the file.
*   **Tailwind Styles Missing:**
    *   *Fix:* Tailwind v4 is used. Ensure classes are valid. For arbitrary values, use square brackets (e.g., `bg-[#123456]`).
*   **Type Errors on Metadata:**
    *   *Fix:* OBR metadata is `unknown` by default. You MUST cast it to your defined interface.

---
*Generated by opencode on Jan 24 2026*
