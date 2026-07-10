import { buildRuleGraph, resolveRuleGraph } from "./ruleGraph";
import { parseStrategySentence } from "./strategy";
import type {
  BattleEvent,
  BattleEventPayload,
  BattleOutcomeReason,
  BattleSimulationResult,
  CausalTraceStep,
  ConditionSemanticId,
  EncounterDefinition,
  ParsedStrategy,
  PlayerActionSemanticId,
  StrategySentence,
} from "./types";

export interface BattleSimulationInput {
  encounter: EncounterDefinition;
  strategy: ParsedStrategy;
  activeConditions: readonly ConditionSemanticId[];
}

export interface StrategyValidationInput {
  encounter: EncounterDefinition;
  sentence: StrategySentence;
  activeConditions: readonly ConditionSemanticId[];
}

function failedCounterReason(
  action: PlayerActionSemanticId,
): "dodge_too_late" | "guard_overwhelmed" | "attack_interrupted" {
  switch (action) {
    case "player.dodge_side":
      return "dodge_too_late";
    case "player.guard_front":
      return "guard_overwhelmed";
    case "player.attack":
      return "attack_interrupted";
  }
}
function successfulCounterReason(
  action: PlayerActionSemanticId,
): "charge_evaded" | "guard_held" | "attack_prevailed" {
  switch (action) {
    case "player.dodge_side":
      return "charge_evaded";
    case "player.guard_front":
      return "guard_held";
    case "player.attack":
      return "attack_prevailed";
  }
}


export function simulateBattle({
  encounter,
  strategy,
  activeConditions,
}: BattleSimulationInput): BattleSimulationResult {
  const events: BattleEvent[] = [];
  const trace: CausalTraceStep[] = [];
  const ruleGraph = buildRuleGraph(strategy);
  const ruleResolution = resolveRuleGraph({
    encounter,
    ruleGraph,
    activeConditions,
  });
  const traceEvents = ruleResolution.traceEvents;

  const appendEvent = (
    turn: number,
    payload: BattleEventPayload,
  ): BattleEvent => {
    const sequence = events.length;
    const event = {
      id: `battle-event-${sequence + 1}`,
      sequence,
      turn,
      ...payload,
    } as BattleEvent;
    events.push(event);
    return event;
  };

  const conditionMatched = ruleResolution.conditionMatched;

  if (conditionMatched) {
    appendEvent(1, {
      type: "enemy_signal_observed",
      condition: strategy.condition.semanticId,
    });
  }

  const conditionEvent = appendEvent(1, {
    type: "strategy_condition_evaluated",
    condition: strategy.condition.semanticId,
    matched: conditionMatched,
  });
  trace.push({
    type: "condition_evaluation",
    condition: strategy.condition.semanticId,
    matched: conditionMatched,
    eventId: conditionEvent.id,
  });

  if (!conditionMatched) {
    const skippedEvent = appendEvent(1, {
      type: "strategy_action_skipped",
      action: strategy.action.semanticId,
      reason: "condition_not_met",
    });
    trace.push({
      type: "action_activation",
      action: strategy.action.semanticId,
      activated: false,
      eventId: skippedEvent.id,
    });

    const outcomeEvent = appendEvent(1, {
      type: "battle_resolved",
      success: false,
      reason: "condition_not_met",
    });
    trace.push({
      type: "outcome",
      success: false,
      reason: "condition_not_met",
      eventId: outcomeEvent.id,
    });

    return {
      ruleGraph,
      traceEvents,
      events,
      causalTrace: { steps: trace },
      validation: {
        syntaxState: "valid",
        executable: true,
        conditionMatched: false,
        strategyTriggered: false,
        tacticalStatus: "not_triggered",
        success: false,
        reason: "condition_not_met",
      },
    };
  }

  const triggerEvent = appendEvent(1, {
    type: "strategy_action_triggered",
    action: strategy.action.semanticId,
  });
  trace.push({
    type: "action_activation",
    action: strategy.action.semanticId,
    activated: true,
    eventId: triggerEvent.id,
  });

  appendEvent(1, {
    type: "player_action_resolved",
    action: strategy.action.semanticId,
  });
  appendEvent(1 + encounter.enemyRule.actionDelay, {
    type: "enemy_action_resolved",
    action: encounter.enemyRule.action,
  });

  const success = ruleResolution.outcome === "success";
  let reason: Exclude<
    BattleOutcomeReason,
    "sentence_not_executable" | "condition_not_met"
  >;

  if (success) {
    reason = successfulCounterReason(strategy.action.semanticId);
    if (strategy.action.semanticId === "player.dodge_side") {
      appendEvent(1 + encounter.enemyRule.actionDelay, {
        type: "charge_evaded",
        action: "player.dodge_side",
      });
    }
    appendEvent(1 + encounter.enemyRule.actionDelay, {
      type: "counter_opportunity_created",
    });
  } else {
    reason = failedCounterReason(strategy.action.semanticId);
    appendEvent(1 + encounter.enemyRule.actionDelay, {
      type: "player_hit",
      action: strategy.action.semanticId,
      reason,
    });
  }

  const outcomeEvent = appendEvent(1 + encounter.enemyRule.actionDelay, {
    type: "battle_resolved",
    success,
    reason,
  });
  trace.push({
    type: "outcome",
    success,
    reason,
    eventId: outcomeEvent.id,
  });

  return {
    ruleGraph,
    traceEvents,
    events,
    causalTrace: { steps: trace },
    validation: {
      syntaxState: "valid",
      executable: true,
      conditionMatched: true,
      strategyTriggered: true,
      tacticalStatus: success ? "success" : "failure",
      success,
      reason,
    },
  };
}

export function validateStrategySentence({
  encounter,
  sentence,
  activeConditions,
}: StrategyValidationInput): BattleSimulationResult {
  const analysis = parseStrategySentence(sentence);

  if (analysis.state !== "valid") {
    return {
      ruleGraph: null,
      traceEvents: [],
      events: [],
      causalTrace: {
        steps: [
          {
            type: "outcome",
            success: false,
            reason: "sentence_not_executable",
            eventId: null,
          },
        ],
      },
      validation: {
        syntaxState: analysis.state,
        executable: false,
        conditionMatched: false,
        strategyTriggered: false,
        tacticalStatus: "not_evaluated",
        success: false,
        reason: "sentence_not_executable",
      },
    };
  }

  return simulateBattle({
    encounter,
    strategy: analysis.parsed,
    activeConditions,
  });
}
