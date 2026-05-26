# Kotoba Quest Architecture Diagram Design

## Goal

Create two separate architecture diagrams for this project using the local `architecture` skill:

1. An overall system overview diagram
2. An execution-flow architecture diagram

The diagrams should help a reader understand both the static structure of the app and the runtime path from player code input to battle resolution.

## Project Context

This project is a client-side game built with Vite and React.

The current architecture is centered on `BattleScreen`, which orchestrates:

- React UI components
- Zustand-based game state
- A custom parser and execution engine for player-written commands
- Pixi-based battle rendering
- Static stage/tutorial data
- Enemy intent and damage rules

There is no backend service in the current codebase. External persistence, network APIs, and server-side systems should not be implied in the diagrams.

## Deliverables

### Diagram 1: Overall Architecture Overview

Purpose:
Show the major subsystems, their responsibilities, and how they depend on each other.

Primary audience:
- Developers onboarding to the project
- Reviewers trying to understand where core responsibilities live

Recommended structure:
- `User / Entry` layer
- `UI Layer`
- `State / Orchestration Layer`
- `Logic / Execution Layer`
- `Rendering Layer`
- `Static Data / Rules Layer`

Required components:
- `main.tsx`
- `App.tsx`
- `BattleScreen`
- `CodeEditor`
- `DebugPanel`
- `useGameStore (Zustand)`
- `parse()`
- `SpellExecutor`
- `EnemyAI`
- `BattleScene (Pixi)`
- `stages.ts`

Required relationships:
- `main.tsx` renders `App.tsx`
- `App.tsx` renders `BattleScreen`
- `BattleScreen` coordinates UI, state, parsing, execution, rendering, and stage progression
- `CodeEditor` sends player code to `BattleScreen`
- `DebugPanel` reads and controls execution-related state through `useGameStore`
- `BattleScreen` calls `parse()` and constructs `SpellExecutor`
- `SpellExecutor` updates execution state through the store when store-backed mode is enabled
- `BattleScreen` drives `BattleScene` animations and visual updates
- `BattleScreen` reads stage definitions from `stages.ts`
- `BattleScreen` uses `EnemyAI` to determine intent and damage behavior

Diagram intent:
- Emphasize architectural layers and responsibility boundaries
- Avoid turning the diagram into a file tree
- Make clear that `BattleScreen` is the orchestration hub
- Make clear that `stages.ts` and enemy rule logic are local static inputs, not services

Recommended visual treatment:
- Layered layout with `BattleScreen` centered
- Clean neutral styling such as `Frost Clean` or a similarly restrained style from the architecture skill
- A small sidebar is acceptable only if it improves readability; the main priority is the layered core structure

### Diagram 2: Execution-Flow Architecture

Purpose:
Show how player-written code is transformed into actions, state transitions, animations, and enemy turn progression.

Primary audience:
- Developers tracing gameplay execution
- Readers trying to understand runtime behavior rather than static ownership

Required flow:
1. Player enters code in `CodeEditor`
2. `BattleScreen.executeCode()` starts execution and resets transient execution state
3. `parse()` transforms source text into AST
4. `SpellExecutor.execute(ast)` processes AST nodes
5. Execution events update line highlighting and step state
6. Execution results produce `actions` and `logs`
7. `BattleScreen` applies actions to store state and battle animations
8. `BattleScene` plays attack or defeat visuals
9. `EnemyAI` determines enemy intent and damage for the enemy turn
10. `useGameStore` advances turn state and stores the next intent

Required side path:
- Step mode branch showing `pauseExecution`, `nextStep`, and line highlighting behavior through the store and editor

Required outputs in the flow:
- Updated HP state
- Battle log messages
- Intent updates
- Victory or defeat transition when thresholds are crossed

Diagram intent:
- Prioritize runtime sequence and data movement over class ownership
- Show where parsing ends and gameplay application begins
- Show that execution is split between engine logic, shared store updates, and Pixi visual feedback

Recommended visual treatment:
- Pipeline or left-to-right staged flow
- Clear distinction between `input`, `parse/execute`, `state updates`, `animation`, and `enemy response`
- Highlight the step-mode branch as an optional control path rather than the mainline path

## Constraints

- Use only components and relationships that exist in the current repository
- Do not invent backend, database, auth, or deployment layers
- Keep labels aligned with current source names
- Keep each diagram readable in isolation
- Avoid duplicating every arrow from the code; show only architecturally meaningful connections

## Source Mapping

The design is based on the current source layout:

- Entry: `src/main.tsx`, `src/App.tsx`
- Main screen: `src/components/BattleScreen.tsx`
- UI support: `src/components/CodeEditor.tsx`, `src/components/DebugPanel.tsx`
- State: `src/store/useGameStore.ts`
- Parser: `src/parser/parser.ts`
- Execution engine: `src/engine/SpellExecutor.ts`
- Enemy rules: `src/engine/EnemyAI.ts`
- Rendering: `src/game/BattleScene.ts`
- Static content: `src/data/stages.ts`

## Verification Criteria

The diagrams are correct when:

- A reader can identify the app's orchestration center without reading code
- The overview diagram clearly separates UI, state, execution, rendering, and data/rules
- The execution-flow diagram clearly shows the path from source text to gameplay outcome
- No nonexistent infrastructure appears
- The two diagrams complement each other instead of repeating the same information

## Out of Scope

- Class-level internal method diagrams
- Full turn-state state machine
- CSS/layout structure of the screen
- Detailed tutorial-card rendering behavior
- Test architecture
