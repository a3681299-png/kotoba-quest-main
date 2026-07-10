export type ConditionSemanticId =
  | "enemy.armor_glows_red"
  | "enemy.eyes_glow_blue";

export type EnemyActionSemanticId = "enemy.charges_front";

export type PlayerActionSemanticId =
  | "player.dodge_side"
  | "player.guard_front"
  | "player.attack";

export type SemanticId =
  | ConditionSemanticId
  | EnemyActionSemanticId
  | PlayerActionSemanticId;

export type FragmentId = string;

interface ExtractableFragmentBase {
  id: FragmentId;
  start: number;
  end: number;
  quote: string;
}

export type ExtractableFragment =
  | (ExtractableFragmentBase & {
      kind: "condition";
      semanticId: ConditionSemanticId;
    })
  | (ExtractableFragmentBase & {
      kind: "enemy_action";
      semanticId: EnemyActionSemanticId;
    })
  | (ExtractableFragmentBase & {
      kind: "player_action";
      semanticId: PlayerActionSemanticId;
    });

export interface EvidenceText {
  id: string;
  title: string;
  text: string;
  fragments: readonly ExtractableFragment[];
}

export interface EnemyRule {
  condition: ConditionSemanticId;
  action: EnemyActionSemanticId;
  actionDelay: number;
  successfulCounters: readonly PlayerActionSemanticId[];
}

export interface AcceptedInterpretation {
  id: string;
  condition: ConditionSemanticId;
  enemyAction: EnemyActionSemanticId;
  evidenceFragmentIds: readonly FragmentId[];
}

export interface SemanticLabel {
  semanticId: SemanticId;
  label: string;
}

export interface EncounterDefinition {
  id: string;
  enemyName: string;
  evidenceTexts: readonly EvidenceText[];
  enemyRule: EnemyRule;
  acceptedInterpretations: readonly AcceptedInterpretation[];
  availableActions: readonly PlayerActionSemanticId[];
  semanticLabels: readonly SemanticLabel[];
}

export interface Hypothesis {
  type: "enemy_rule";
  condition: ConditionSemanticId;
  predictedAction: EnemyActionSemanticId;
  evidenceFragmentIds: readonly FragmentId[];
}

export type HypothesisAssessment = "untested" | "contradicted" | "confirmed";

export interface HypothesisValidationResult {
  assessment: Exclude<HypothesisAssessment, "untested">;
  matchedInterpretationIds: readonly string[];
}

export type StrategyConnectorId = "syntax.if_then";

export type StrategySentencePart =
  | {
      kind: "condition";
      semanticId: ConditionSemanticId;
      sourceFragmentId?: FragmentId;
    }
  | {
      kind: "connector";
      semanticId: StrategyConnectorId;
    }
  | {
      kind: "action";
      semanticId: PlayerActionSemanticId;
    };

export interface StrategySentence {
  parts: readonly StrategySentencePart[];
}

export type SentenceSyntaxState =
  | "building"
  | "incomplete"
  | "invalid"
  | "valid";

export type ParsedPlayerAction =
  | {
      actor: "player";
      type: "dodge";
      direction: "side";
      semanticId: "player.dodge_side";
    }
  | {
      actor: "player";
      type: "guard";
      direction: "front";
      semanticId: "player.guard_front";
    }
  | {
      actor: "player";
      type: "attack";
      semanticId: "player.attack";
    };

export type ParsedCondition =
  | {
      subject: "enemy";
      event: "armor_glows_red";
      semanticId: "enemy.armor_glows_red";
    }
  | {
      subject: "enemy";
      event: "eyes_glow_blue";
      semanticId: "enemy.eyes_glow_blue";
    };

export interface ParsedStrategy {
  type: "conditional";
  condition: ParsedCondition;
  action: ParsedPlayerAction;
}

export interface RuleGraph {
  conditionNode: {
    id: string;
    meaningId: ConditionSemanticId;
  };
  connector: "then";
  actionNode: {
    id: string;
    actionId: PlayerActionSemanticId;
  };
}

export type TraceEvent =
  | { type: "omenShown" }
  | { type: "conditionMatched"; nodeId: string }
  | { type: "conditionMissed"; nodeId: string }
  | { type: "actionStarted"; nodeId: string }
  | {
      type: "collision";
      outcome: "dodged" | "blocked" | "overpowered";
    }
  | {
      type: "result";
      outcome: "success" | "conditionMiss" | "actionFail";
    };

interface StrategyAnalysisBase {
  state: SentenceSyntaxState;
  expectedNext: StrategySentencePart["kind"] | null;
}

export type StrategyAnalysis =
  | (StrategyAnalysisBase & {
      state: "building";
      expectedNext: "condition";
    })
  | (StrategyAnalysisBase & {
      state: "incomplete";
      expectedNext: "connector" | "action";
    })
  | (StrategyAnalysisBase & {
      state: "invalid";
      expectedNext: null;
      issue: string;
    })
  | (StrategyAnalysisBase & {
      state: "valid";
      expectedNext: null;
      parsed: ParsedStrategy;
    });

interface BattleEventBase {
  id: string;
  sequence: number;
  turn: number;
}

export type BattleEventPayload =
  | {
      type: "enemy_signal_observed";
      condition: ConditionSemanticId;
    }
  | {
      type: "strategy_condition_evaluated";
      condition: ConditionSemanticId;
      matched: boolean;
    }
  | {
      type: "strategy_action_triggered";
      action: PlayerActionSemanticId;
    }
  | {
      type: "strategy_action_skipped";
      action: PlayerActionSemanticId;
      reason: "condition_not_met";
    }
  | {
      type: "player_action_resolved";
      action: PlayerActionSemanticId;
    }
  | {
      type: "enemy_action_resolved";
      action: EnemyActionSemanticId;
    }
  | {
      type: "charge_evaded";
      action: "player.dodge_side";
    }
  | {
      type: "player_hit";
      action: PlayerActionSemanticId;
      reason: "dodge_too_late" | "guard_overwhelmed" | "attack_interrupted";
    }
  | {
      type: "counter_opportunity_created";
    }
  | {
      type: "battle_resolved";
      success: boolean;
      reason: BattleOutcomeReason;
    };

export type BattleEvent = BattleEventBase & BattleEventPayload;

export type BattleOutcomeReason =
  | "sentence_not_executable"
  | "condition_not_met"
  | "charge_evaded"
  | "guard_held"
  | "attack_prevailed"
  | "dodge_too_late"
  | "guard_overwhelmed"
  | "attack_interrupted";

export type CausalTraceStep =
  | {
      type: "condition_evaluation";
      condition: ConditionSemanticId;
      matched: boolean;
      eventId: string;
    }
  | {
      type: "action_activation";
      action: PlayerActionSemanticId;
      activated: boolean;
      eventId: string;
    }
  | {
      type: "outcome";
      success: boolean;
      reason: BattleOutcomeReason;
      eventId: string | null;
    };

export interface CausalTrace {
  steps: readonly CausalTraceStep[];
}

interface ValidationResultBase {
  syntaxState: SentenceSyntaxState;
  success: boolean;
}

export type ValidationResult =
  | (ValidationResultBase & {
      syntaxState: "building" | "incomplete" | "invalid";
      executable: false;
      conditionMatched: false;
      strategyTriggered: false;
      tacticalStatus: "not_evaluated";
      reason: "sentence_not_executable";
    })
  | (ValidationResultBase & {
      syntaxState: "valid";
      executable: true;
      conditionMatched: boolean;
      strategyTriggered: boolean;
      tacticalStatus: "success" | "failure" | "not_triggered";
      reason: Exclude<BattleOutcomeReason, "sentence_not_executable">;
    });

export interface BattleSimulationResult {
  ruleGraph: RuleGraph | null;
  traceEvents: readonly TraceEvent[];
  events: readonly BattleEvent[];
  causalTrace: CausalTrace;
  validation: ValidationResult;
}

export type ReadingLoopPhase =
  | "observation"
  | "reading"
  | "strategy"
  | "validation";

export type StrategyAssessment = "unverified" | "refuted" | "confirmed";

export type StrategyExecutionStatus =
  | "incomplete"
  | "complete"
  | "running";

export interface StrategyExecutionState {
  status: StrategyExecutionStatus;
  activeRunId: string | null;
  cancelledRunId: string | null;
  startedRunIds: readonly string[];
}

export interface ReadingLoopSession {
  encounterId: string;
  phase: ReadingLoopPhase;
  observedEvents: readonly BattleEvent[];
  extractedFragmentIds: readonly FragmentId[];
  hypothesis: Hypothesis | null;
  hypothesisAssessment: HypothesisAssessment;
  strategySentence: StrategySentence;
  syntaxState: SentenceSyntaxState;
  execution: StrategyExecutionState;
  strategyAssessment: StrategyAssessment;
  lastBattle: BattleSimulationResult | null;
  attempts: number;
}

export type ReadingLoopAction =
  | {
      type: "record_observation";
      events: readonly BattleEvent[];
    }
  | { type: "advance_to_reading" }
  | { type: "extract_fragment"; fragmentId: FragmentId }
  | { type: "remove_fragment"; fragmentId: FragmentId }
  | { type: "set_hypothesis"; hypothesis: Hypothesis }
  | { type: "advance_to_strategy" }
  | { type: "set_strategy_sentence"; sentence: StrategySentence }
  | { type: "begin_execution"; runId: string }
  | { type: "cancel_execution"; runId: string }
  | {
      type: "record_validation";
      runId: string;
      result: BattleSimulationResult;
    }
  | { type: "return_to_strategy" };
