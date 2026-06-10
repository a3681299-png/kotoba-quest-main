# Tutorial Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved six-stage tutorial slice using the new tutorial spritesheets and stage background assets.

**Architecture:** Keep the current battle screen and execution loop. Extend the parser/executor only enough for the tutorial syntax, replace the stage/enemy data with the six learning stages, and swap Pixi placeholder drawings for spritesheet-backed animated characters.

**Tech Stack:** React 19, Vite, TypeScript, Pixi.js 8, Zustand, Peggy, Vitest.

---

## File Structure

- Modify `src/parser/types.ts`: add AST node types for else branches and plan/function definitions.
- Modify `src/parser/parser.ts`: accept tutorial syntax such as `攻撃する`, `3回 くりかえす 攻撃する`, `もし 敵HP が 少ない なら 攻撃する`, and `そうでなければ`.
- Modify `src/parser/parser.test.ts`: lock the tutorial syntax.
- Create `src/engine/SpellExecutor.test.ts`: verify tutorial commands emit the intended actions/logs.
- Modify `src/engine/SpellExecutor.ts`: execute tutorial command names, else bodies, and named plan calls.
- Modify `src/data/stages.ts`: replace current tutorial copy with the six-stage overview-spec tutorial.
- Create `src/data/stages.test.ts`: verify stage count, order, mentors, and sample-code parsability.
- Modify `src/engine/EnemyAI.ts`: match the six tutorial enemies and their hints.
- Modify `src/game/BattleScene.ts`: load tutorial backgrounds and animated spritesheets.
- Modify `src/components/BattleScreen.tsx`: show mentor/lesson metadata and pass the current stage into Pixi scene initialization.
- Modify `src/styles/battle.css`: small layout and dialogue styling adjustments.

## Tasks

### Task 1: Parser Red Tests

- [ ] Add parser tests for bare commands, Japanese loop syntax, Japanese if/else syntax, and plan definition/call syntax.
- [ ] Run `npm run test:run -- src/parser/parser.test.ts`.
- [ ] Expected result: the new tests fail because the parser does not accept those forms yet.

### Task 2: Executor Red Tests

- [ ] Add executor tests for `攻撃する`, `回復する`, `観察する`, `話しかける`, `記録する`, and named plan calls.
- [ ] Run `npm run test:run -- src/engine/SpellExecutor.test.ts`.
- [ ] Expected result: the new tests fail because the executor does not map these commands yet.

### Task 3: Parser Implementation

- [ ] Extend AST types for `If` else bodies and `PlanDefinition`.
- [ ] Extend the grammar in `src/parser/parser.ts`.
- [ ] Keep existing function-call syntax compatible.
- [ ] Run `npm run test:run -- src/parser/parser.test.ts`.
- [ ] Expected result: parser tests pass.

### Task 4: Executor Implementation

- [ ] Add tutorial command mappings to `src/engine/SpellExecutor.ts`.
- [ ] Add else-body execution and named plan registration/call support.
- [ ] Run `npm run test:run -- src/engine/SpellExecutor.test.ts`.
- [ ] Expected result: executor tests pass.

### Task 5: Tutorial Stage Data

- [ ] Replace the six stages in `src/data/stages.ts` with the overview-spec tutorial flow.
- [ ] Add deterministic tests in `src/data/stages.test.ts` for order, mentor names, and sample-code parsability.
- [ ] Run `npm run test:run -- src/data/stages.test.ts`.
- [ ] Expected result: stage data tests pass.

### Task 6: Pixi Asset Rendering

- [ ] Import tutorial background images and spritesheets in `src/game/BattleScene.ts`.
- [ ] Replace placeholder `PIXI.Graphics` character bodies with `PIXI.AnimatedSprite`.
- [ ] Use idle loops by default and briefly switch to attack/damage textures during combat animations.
- [ ] Keep existing combat motion helpers.
- [ ] Run `npm run build`.
- [ ] Expected result: TypeScript and Vite build pass.

### Task 7: Battle UI Copy

- [ ] Use stage metadata in `src/components/BattleScreen.tsx` for player name, mentor/lesson labels, and enemy copy.
- [ ] Keep current editor and execution preview interaction.
- [ ] Add small CSS rules only if needed for text fit.
- [ ] Run `npm run build`.
- [ ] Expected result: build passes and no text-overflow regressions are introduced in the edited labels.

### Task 8: Full Verification

- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev -- --host 127.0.0.1`.
- [ ] Open the local app in the in-app browser.
- [ ] Verify the first stage renders the tutorial background and animated sprites, and the sample code clears the first stage.
