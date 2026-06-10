# Tutorial Assets Design

## Goal

Build a short six-stage Kotoba Quest tutorial in the existing React/Pixi battle prototype, using the newly added tutorial character spritesheets and tutorial stage background images.

## Assumptions

- The current asset set contains one player spritesheet set, one enemy spritesheet set, one tutorial stage background set, dialogue UI art, and HUD frame art.
- The first playable slice should reuse that one visual set across all six tutorial stages.
- The stage text should communicate the six different character roles from the overview spec even before character-specific sprite art exists.
- The existing battle screen remains the first screen.

## Scope

The tutorial covers these six stages:

1. Sequential execution: 人形師, "攻撃する" and "回復する" run in order.
2. Conditional branch: 契約者, "もし" chooses an action based on enemy HP or state.
3. Loop: 植物の魔女, "3回 くりかえす" repeats an action.
4. Variables: 司書, recording a word/state and using it later.
5. Functions: 幽閉の姫, calling a named plan as a grouped command.
6. Else/negative condition: 道化師, "そうでなければ" and negative conditions expose the core idea that context changes meaning.

## Architecture

- `src/data/stages.ts` becomes the source of tutorial stage copy, example code, and presentation metadata.
- `src/engine/EnemyAI.ts` changes only enough to match the new tutorial enemies and hints.
- `src/parser/parser.ts` and `src/parser/types.ts` get a narrow command-language extension for the Japanese syntax shown in the tutorial.
- `src/engine/SpellExecutor.ts` maps tutorial command names to the existing action system where possible, and logs non-damaging commands such as observation and dialogue.
- `src/game/BattleScene.ts` replaces placeholder Pixi graphics with animated spritesheet-backed player and enemy sprites, and draws the tutorial background layers.
- `src/components/BattleScreen.tsx` uses stage metadata for names, mentor text, and stage goal text while keeping the current battle/editor layout.

## Non-Goals

- No new route, title screen, save system, inventory, or character select.
- No final sprite art for all six tutorial mentors unless those assets are added later.
- No broad rewrite of the parser into a full natural-language engine.
- No unrelated UI refactor beyond what is needed to show the tutorial slice.

## Verification

- Add tests for the tutorial stage data and parser/executor behavior where the logic is deterministic.
- Run the existing Vitest suite.
- Run the TypeScript/Vite build.
- Start the Vite dev server and visually verify the battle scene renders with the tutorial background and animated sprites.
