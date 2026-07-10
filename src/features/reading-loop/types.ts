import type {
  BattleOutcomeReason,
  FragmentId,
  PlayerActionSemanticId,
  SemanticId,
  SentenceSyntaxState,
} from "../../readingLoop/types";

export type ReadingChapter = "observation" | "reading" | "strategy" | "validation";

export type EncounterVisualState =
  | "watching"
  | "telegraph"
  | "windup"
  | "charge"
  | "impact"
  | "dodge"
  | "guard"
  | "attack"
  | "opportunity";

export interface TimelineMoment {
  id: string;
  label: string;
  detail: string;
  timeLabel: string;
  visualState: EncounterVisualState;
  activePart?: "condition" | "connector" | "action" | "outcome";
}

export interface EvidenceSegment {
  id: string;
  text: string;
  fragmentId?: FragmentId;
  semanticId?: SemanticId;
  selectable?: boolean;
  hint?: string;
}

export interface EvidencePassageView {
  id: string;
  title: string;
  segments: readonly EvidenceSegment[];
  alternateSegments: readonly EvidenceSegment[];
}

export interface ExtractedFragmentView {
  id: FragmentId;
  text: string;
  roleLabel: string;
  semanticId: SemanticId;
}

export interface StrategyChoiceView {
  id: PlayerActionSemanticId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface TraceStepView {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "passed" | "failed";
}

export interface ValidationSummaryView {
  success: boolean;
  title: string;
  detail: string;
  reason: BattleOutcomeReason;
}

export type StrategyDisplayState = SentenceSyntaxState | "unverified" | "refuted" | "confirmed";
