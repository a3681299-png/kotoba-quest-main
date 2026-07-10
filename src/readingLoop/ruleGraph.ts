import { parseStrategySentence } from "./strategy";
import type {
  ConditionSemanticId,
  EncounterDefinition,
  ParsedStrategy,
  PlayerActionSemanticId,
  RuleGraph,
  StrategySentence,
  TraceEvent,
} from "./types";

function conditionNodeId(meaningId: ConditionSemanticId): string {
  return `condition:${meaningId}`;
}

function actionNodeId(actionId: PlayerActionSemanticId): string {
  return `action:${actionId}`;
}

export function createRuleGraph(
  meaningId: ConditionSemanticId,
  actionId: PlayerActionSemanticId,
): RuleGraph {
  return {
    conditionNode: {
      id: conditionNodeId(meaningId),
      meaningId,
    },
    connector: "then",
    actionNode: {
      id: actionNodeId(actionId),
      actionId,
    },
  };
}

export function buildRuleGraph(strategy: ParsedStrategy): RuleGraph {
  return createRuleGraph(
    strategy.condition.semanticId,
    strategy.action.semanticId,
  );
}

export function buildRuleGraphFromSentence(
  sentence: StrategySentence,
): RuleGraph | null {
  const analysis = parseStrategySentence(sentence);
  return analysis.state === "valid" ? buildRuleGraph(analysis.parsed) : null;
}

export interface TraceGenerationInput {
  encounter: EncounterDefinition;
  ruleGraph: RuleGraph;
  activeConditions: readonly ConditionSemanticId[];
}

function collisionOutcome(
  actionId: PlayerActionSemanticId,
  actionSucceeded: boolean,
): Extract<TraceEvent, { type: "collision" }>["outcome"] {
  switch (actionId) {
    case "player.dodge_side":
      return actionSucceeded ? "dodged" : "overpowered";
    case "player.guard_front":
      return "blocked";
    case "player.attack":
      return "overpowered";
  }
}

type TraceCollisionOutcome = Extract<
  TraceEvent,
  { type: "collision" }
>["outcome"];
type TraceResultOutcome = Extract<
  TraceEvent,
  { type: "result" }
>["outcome"];

export interface RuleResolution {
  conditionMatched: boolean;
  actionStarted: boolean;
  collisionOutcome: TraceCollisionOutcome | null;
  outcome: TraceResultOutcome;
  traceEvents: readonly TraceEvent[];
}

export function resolveRuleGraph({
  encounter,
  ruleGraph,
  activeConditions,
}: TraceGenerationInput): RuleResolution {
  const traceEvents: TraceEvent[] = [{ type: "omenShown" }];
  const conditionMatched = activeConditions.includes(
    ruleGraph.conditionNode.meaningId,
  );

  if (!conditionMatched) {
    traceEvents.push(
      {
        type: "conditionMissed",
        nodeId: ruleGraph.conditionNode.id,
      },
      { type: "result", outcome: "conditionMiss" },
    );
    return {
      conditionMatched: false,
      actionStarted: false,
      collisionOutcome: null,
      outcome: "conditionMiss",
      traceEvents,
    };
  }

  traceEvents.push(
    {
      type: "conditionMatched",
      nodeId: ruleGraph.conditionNode.id,
    },
    {
      type: "actionStarted",
      nodeId: ruleGraph.actionNode.id,
    },
  );

  const actionSucceeded = encounter.enemyRule.successfulCounters.includes(
    ruleGraph.actionNode.actionId,
  );
  const resolvedCollision = collisionOutcome(
    ruleGraph.actionNode.actionId,
    actionSucceeded,
  );
  const outcome = actionSucceeded ? "success" : "actionFail";
  traceEvents.push({
    type: "collision",
    outcome: resolvedCollision,
  });
  traceEvents.push({ type: "result", outcome });

  return {
    conditionMatched: true,
    actionStarted: true,
    collisionOutcome: resolvedCollision,
    outcome,
    traceEvents,
  };
}

export function generateTraceEvents(
  input: TraceGenerationInput,
): readonly TraceEvent[] {
  return resolveRuleGraph(input).traceEvents;
}
