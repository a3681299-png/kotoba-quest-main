import type { Variants } from "framer-motion";

export type EditorCardMotionState = "entering" | "ready" | "submitting";

export const editorCardVariants: Variants = {
  entering: {
    y: 420,
    opacity: 0,
    scale: 0.96,
  },
  ready: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 28,
      mass: 0.9,
    },
  },
  submitting: {
    y: "-52vh",
    opacity: 0,
    scale: 0.34,
    transition: {
      duration: 0.58,
      ease: [0.19, 1, 0.22, 1],
    },
  },
};

export function shouldRunCodeAfterCardAnimation(
  currentState: EditorCardMotionState,
  _completedDefinition: unknown,
): boolean {
  return currentState === "submitting";
}
