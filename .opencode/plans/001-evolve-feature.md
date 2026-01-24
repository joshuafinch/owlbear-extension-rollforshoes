# Plan: Implement Automated Skill Evolution

## Goal
Implement the "Evolve" mechanic from Roll for Shoes. When a player rolls all 6s (Critical Success), they should be able to immediately name and acquire a new skill at Rank + 1 based on the skill they just used.

## Proposed Changes

### 1. `src/components/MissionReport.vue`
*   **State**: Add `isEvolving` (boolean) and `newSkillName` (string).
*   **UI Updates**:
    *   When "Evolve New Skill" is clicked, switch the modal view to an input form.
    *   Add an input field for the new skill name (auto-focused).
    *   Add "Confirm" and "Cancel" buttons.
*   **Events**:
    *   Change the `evolve` event to `confirmEvolve(skillName: string)`.

### 2. `src/components/CharacterManager.vue`
*   **Logic**:
    *   Update `handleRollEvolve` to accept the `newSkillName` argument.
    *   Use `addSkill` to insert the new skill into the character's data:
        *   `name`: The user-provided name.
        *   `rank`: `currentRoll.rank + 1`.
    *   Show a success notification confirming the addition.
*   **Template**:
    *   Update the `<MissionReport>` component usage to listen for `@confirmEvolve` instead of `@evolve`.

## Verification
*   **Manual Test**:
    1.  Open "Dispatch" tab.
    2.  Click a roll button (e.g., Rank 1).
    3.  (Since rolling all 6s is rare, we might need to mock the result or just retry until we get it, or temporarily force the dice values in code for testing, but I will rely on code correctness first). *Correction*: I can just trust the logic for now, or use the "Systems" tab if we had a debug die roller, but we don't.
*   **Build**: Run `npx vue-tsc --noEmit && npm run build` to ensure type safety.
