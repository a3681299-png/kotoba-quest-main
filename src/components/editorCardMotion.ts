import type { Variants } from "framer-motion";
import type { BattlePhase } from "../store/useGameStore";

export type EditorCardMotionState = "entering" | "ready" | "submitting";
export type EditorSurface = "battle" | "desk";

interface PreparationDeskState {
  battlePhase: BattlePhase;
  isIntroDialogueOpen: boolean;
  showVictory: boolean;
  showDefeat: boolean;
}

export const editorCardVariants: Variants = {
  entering: {
    y: 520,
    opacity: 0,
    scale: 0.92,
    rotateX: 7,
    rotateZ: 2,
    transformPerspective: 900,
  },
  ready: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotateX: 0,
    rotateZ: 0,
    transformPerspective: 900,
    transition: {
      type: "spring",
      stiffness: 230,
      damping: 24,
      mass: 0.95,
    },
  },
  submitting: {
    y: "-64vh",
    opacity: 0,
    scale: 0.26,
    rotateX: 10,
    rotateZ: -7,
    transformPerspective: 900,
    transition: {
      duration: 0.72,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function getEditorCardClassName(
  state: EditorCardMotionState,
  surface: EditorSurface = "battle",
): string {
  const surfaceClassName =
    surface === "desk" ? "preparation-desk" : "battle-command-hud";
  const baseClassName = `code-area code-workbench ${surfaceClassName}`;
  return state === "ready" ? `${baseClassName} is-ready` : baseClassName;
}

export function isPreparationDeskOpen({
  battlePhase,
  isIntroDialogueOpen,
  showVictory,
  showDefeat,
}: PreparationDeskState): boolean {
  return (
    battlePhase === "player_turn" &&
    !isIntroDialogueOpen &&
    !showVictory &&
    !showDefeat
  );
}

export function shouldRunCodeAfterCardAnimation(
  currentState: EditorCardMotionState,
  completedDefinition: unknown,
): boolean {
  return currentState === "submitting" && completedDefinition === "submitting";
}
