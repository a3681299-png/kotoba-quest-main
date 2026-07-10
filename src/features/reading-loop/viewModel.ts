import {
  getEncounterFragment,
  getSemanticLabel,
} from "../../readingLoop";
import type {
  BattleEvent,
  BattleOutcomeReason,
  BattleSimulationResult,
  EncounterDefinition,
  ExtractableFragment,
  Hypothesis,
  PlayerActionSemanticId,
  ReadingLoopSession,
  SemanticId,
  StrategySentence,
} from "../../readingLoop";
import type {
  EvidencePassageView,
  EvidenceSegment,
  ExtractedFragmentView,
  StrategyChoiceView,
  StrategyDisplayState,
  TimelineMoment,
  TraceStepView,
  ValidationSummaryView,
} from "./types";

export const OBSERVATION_MOMENTS: readonly TimelineMoment[] = [
  {
    id: "observation-watching",
    label: "静かな対峙",
    detail: "獣は正面でこちらを見ている。",
    timeLabel: "T1・00",
    visualState: "watching",
  },
  {
    id: "observation-signal",
    label: "赤い発光",
    detail: "鎧の継ぎ目が赤く脈打った。",
    timeLabel: "T1・01",
    visualState: "telegraph",
    activePart: "condition",
  },
  {
    id: "observation-delay",
    label: "短い間",
    detail: "獣が姿勢を低くし、正面へ力をためる。",
    timeLabel: "T1・02",
    visualState: "windup",
    activePart: "connector",
  },
  {
    id: "observation-impact",
    label: "正面への突進",
    detail: "獣が一直線に飛びかかり、こちらの攻撃を押しつぶした。",
    timeLabel: "T2・00",
    visualState: "impact",
    activePart: "outcome",
  },
];

export const OBSERVATION_EVENTS: readonly BattleEvent[] = [
  {
    id: "observation-signal",
    sequence: 0,
    turn: 1,
    type: "enemy_signal_observed",
    condition: "enemy.armor_glows_red",
  },
  {
    id: "observation-charge",
    sequence: 1,
    turn: 2,
    type: "enemy_action_resolved",
    action: "enemy.charges_front",
  },
  {
    id: "observation-impact",
    sequence: 2,
    turn: 2,
    type: "player_hit",
    action: "player.attack",
    reason: "attack_interrupted",
  },
  {
    id: "observation-outcome",
    sequence: 3,
    turn: 2,
    type: "battle_resolved",
    success: false,
    reason: "attack_interrupted",
  },
];

interface DecoyDefinition {
  id: string;
  quote: string;
  hint: string;
}

const DECOYS: Readonly<Record<string, readonly DecoyDefinition[]>> = {
  "battle-record": [
    {
      id: "decoy-front-soldier",
      quote: "正面から刃を受け止めた兵士",
      hint: "その言葉だけでは、敵が動くきっかけが分からない。赤く光った箇所と結びつけてみよう。",
    },
  ],
  "scout-note": [
    {
      id: "decoy-evaded-result",
      quote: "その突進を免れた",
      hint: "結果だけでは、斥候が何をしたかが分からない。文の前半を見よう。",
    },
  ],
};

interface SegmentCandidate {
  start: number;
  end: number;
  segment: EvidenceSegment;
}

function fragmentCandidate(fragment: ExtractableFragment): SegmentCandidate {
  return {
    start: fragment.start,
    end: fragment.end,
    segment: {
      id: fragment.id,
      text: fragment.quote,
      fragmentId: fragment.id,
      semanticId: fragment.semanticId,
      selectable: true,
    },
  };
}

export function buildEvidencePassages(
  encounter: EncounterDefinition,
): readonly EvidencePassageView[] {
  return encounter.evidenceTexts.map((evidence) => {
    const fragmentCandidates = evidence.fragments.map(fragmentCandidate);
    const decoyCandidates = (DECOYS[evidence.id] ?? []).flatMap((decoy) => {
      const start = evidence.text.indexOf(decoy.quote);
      if (start < 0) return [];
      return [
        {
          start,
          end: start + decoy.quote.length,
          segment: {
            id: decoy.id,
            text: decoy.quote,
            selectable: true,
            hint: decoy.hint,
          },
        },
      ];
    });
    const candidates = [...fragmentCandidates, ...decoyCandidates].sort(
      (left, right) => left.start - right.start || right.end - left.end,
    );
    const nonOverlapping: SegmentCandidate[] = [];
    let occupiedUntil = -1;
    for (const candidate of candidates) {
      if (candidate.start < occupiedUntil) continue;
      nonOverlapping.push(candidate);
      occupiedUntil = candidate.end;
    }

    const segments: EvidenceSegment[] = [];
    let cursor = 0;
    nonOverlapping.forEach((candidate, index) => {
      if (candidate.start > cursor) {
        segments.push({
          id: `${evidence.id}-plain-${index}`,
          text: evidence.text.slice(cursor, candidate.start),
        });
      }
      segments.push(candidate.segment);
      cursor = candidate.end;
    });
    if (cursor < evidence.text.length) {
      segments.push({
        id: `${evidence.id}-plain-end`,
        text: evidence.text.slice(cursor),
      });
    }

    const visibleFragmentIds = new Set(
      nonOverlapping.flatMap((candidate) =>
        candidate.segment.fragmentId ? [candidate.segment.fragmentId] : [],
      ),
    );
    const alternateSegments = fragmentCandidates
      .filter(
        (candidate) =>
          candidate.segment.fragmentId !== undefined &&
          !visibleFragmentIds.has(candidate.segment.fragmentId),
      )
      .map((candidate) => candidate.segment);

    return {
      id: evidence.id,
      title: evidence.title,
      segments,
      alternateSegments,
    };
  });
}

function fragmentRole(fragment: ExtractableFragment): string {
  switch (fragment.kind) {
    case "condition":
      return "兆し";
    case "enemy_action":
      return "敵の行動";
    case "player_action":
      return "対抗の手がかり";
  }
}

export function getExtractedFragmentViews(
  encounter: EncounterDefinition,
  fragmentIds: readonly string[],
): readonly ExtractedFragmentView[] {
  return fragmentIds.flatMap((fragmentId) => {
    const fragment = getEncounterFragment(encounter, fragmentId);
    if (!fragment) return [];
    return [
      {
        id: fragment.id,
        text: fragment.quote,
        roleLabel: fragmentRole(fragment),
        semanticId: fragment.semanticId,
      },
    ];
  });
}

export function buildHypothesisFromSelection(
  encounter: EncounterDefinition,
  fragmentIds: readonly string[],
): Hypothesis | null {
  const fragments = fragmentIds.flatMap((fragmentId) => {
    const fragment = getEncounterFragment(encounter, fragmentId);
    return fragment ? [fragment] : [];
  });
  const condition = fragments.find((fragment) => fragment.kind === "condition");
  const enemyAction = fragments.find((fragment) => fragment.kind === "enemy_action");
  if (!condition || condition.kind !== "condition") return null;
  if (!enemyAction || enemyAction.kind !== "enemy_action") return null;

  return {
    type: "enemy_rule",
    condition: condition.semanticId,
    predictedAction: enemyAction.semanticId,
    evidenceFragmentIds: [condition.id, enemyAction.id],
  };
}

export function formatHypothesis(
  encounter: EncounterDefinition,
  hypothesis: Hypothesis | null,
): string {
  if (!hypothesis) {
    return "もし［兆し］なら、敵は［どう動く？］";
  }
  return `もし［${getSemanticLabel(encounter, hypothesis.condition)}］なら、敵は［${getSemanticLabel(encounter, hypothesis.predictedAction)}］`;
}

export function getStrategyChoices(
  encounter: EncounterDefinition,
): readonly StrategyChoiceView[] {
  const descriptions: Record<PlayerActionSemanticId, string> = {
    "player.dodge_side": "正面の軸から外れる",
    "player.guard_front": "正面で衝撃を受け止める",
    "player.attack": "予兆の間に斬りかかる",
  };
  return encounter.availableActions.map((id) => ({
    id,
    label: getSemanticLabel(encounter, id),
    shortLabel:
      id === "player.dodge_side" ? "横回避" : id === "player.guard_front" ? "正面防御" : "攻撃",
    description: descriptions[id],
  }));
}

export function getSelectedAction(
  sentence: StrategySentence,
): PlayerActionSemanticId | null {
  const action = sentence.parts.find((part) => part.kind === "action");
  return action?.kind === "action" ? action.semanticId : null;
}

export function formatStrategySentence(
  encounter: EncounterDefinition,
  sentence: StrategySentence,
): string {
  const condition = sentence.parts.find((part) => part.kind === "condition");
  const action = sentence.parts.find((part) => part.kind === "action");
  const conditionLabel =
    condition?.kind === "condition"
      ? getSemanticLabel(encounter, condition.semanticId)
      : getSemanticLabel(encounter, encounter.enemyRule.condition);
  const actionLabel =
    action?.kind === "action" ? getSemanticLabel(encounter, action.semanticId) : "行動を選ぶ";
  return `もし［${conditionLabel}］なら、［${actionLabel}］`;
}

export function getStrategyDisplayState(
  session: ReadingLoopSession,
): StrategyDisplayState {
  if (session.strategyAssessment === "confirmed") return "confirmed";
  if (session.strategyAssessment === "refuted") return "refuted";
  return session.syntaxState === "valid" ? "unverified" : session.syntaxState;
}

function actionVisualState(action: PlayerActionSemanticId) {
  return action === "player.dodge_side"
    ? ("dodge" as const)
    : action === "player.guard_front"
      ? ("guard" as const)
      : ("attack" as const);
}

export function battleEventsToMoments(
  encounter: EncounterDefinition,
  events: readonly BattleEvent[],
): readonly TimelineMoment[] {
  return events.map((event) => {
    const base = {
      id: event.id,
      timeLabel: `T${event.turn}・${event.sequence + 1}`,
    };
    switch (event.type) {
      case "enemy_signal_observed":
        return {
          ...base,
          label: "赤い兆し",
          detail: `${getSemanticLabel(encounter, event.condition)}。`,
          visualState: "telegraph" as const,
          activePart: "condition" as const,
        };
      case "strategy_condition_evaluated":
        return {
          ...base,
          label: event.matched ? "条件が一致" : "条件は不一致",
          detail: event.matched ? "作戦文の条件節が発光した。" : "条件節は反応しなかった。",
          visualState: "telegraph" as const,
          activePart: "condition" as const,
        };
      case "strategy_action_triggered":
        return {
          ...base,
          label: "行動が発動",
          detail: `${getSemanticLabel(encounter, event.action)}が作戦文から呼び出された。`,
          visualState: actionVisualState(event.action),
          activePart: "action" as const,
        };
      case "strategy_action_skipped":
        return {
          ...base,
          label: "行動は発動せず",
          detail: "条件が合わず、行動節へ魔力が届かなかった。",
          visualState: "watching" as const,
          activePart: "connector" as const,
        };
      case "player_action_resolved":
        return {
          ...base,
          label: getSemanticLabel(encounter, event.action),
          detail: "選んだ行動を実行した。",
          visualState: actionVisualState(event.action),
          activePart: "action" as const,
        };
      case "enemy_action_resolved":
        return {
          ...base,
          label: "敵が突進",
          detail: `${getSemanticLabel(encounter, event.action)}。`,
          visualState: "charge" as const,
          activePart: "outcome" as const,
        };
      case "charge_evaded":
        return {
          ...base,
          label: "突進が外れる",
          detail: "残像をかすめ、獣は正面を通り過ぎた。",
          visualState: "dodge" as const,
          activePart: "outcome" as const,
        };
      case "player_hit":
        return {
          ...base,
          label:
            event.reason === "dodge_too_late"
              ? "回避が間に合わない"
              : event.reason === "guard_overwhelmed"
                ? "防御ごと押し切られる"
                : "攻撃を中断される",
          detail: outcomeDetail(event.reason),
          visualState: "impact" as const,
          activePart: "outcome" as const,
        };
      case "counter_opportunity_created":
        return {
          ...base,
          label: "反撃の機会",
          detail: "突進後の隙が生まれた。",
          visualState: "opportunity" as const,
          activePart: "outcome" as const,
        };
      case "battle_resolved":
        return {
          ...base,
          label: event.success ? "仮説が戦場で働いた" : "作戦を見直す手がかり",
          detail: outcomeDetail(event.reason),
          visualState: event.success ? ("opportunity" as const) : ("impact" as const),
          activePart: "outcome" as const,
        };
    }
  });
}

function outcomeDetail(reason: BattleOutcomeReason): string {
  switch (reason) {
    case "charge_evaded":
      return "横へ外れたため、正面への突進は届かなかった。";
    case "guard_held":
      return "正面防御が突進を受け止め、反撃できる隙が生まれた。";
    case "attack_prevailed":
      return "攻撃が突進を押し返し、反撃できる隙が生まれた。";
    case "dodge_too_late":
      return "条件も行動も成立したが、回避が遅れて突進を受けた。";
    case "guard_overwhelmed":
      return "条件も行動も成立したが、正面防御では衝撃を受け止めきれなかった。";
    case "attack_interrupted":
      return "条件も行動も成立したが、攻撃は突進に中断された。";
    case "condition_not_met":
      return "条件が成立せず、作戦の行動は発動しなかった。";
    case "sentence_not_executable":
      return "作戦文が未完成で、戦闘では実行されなかった。";
  }
}

export function causalTraceToViews(
  encounter: EncounterDefinition,
  result: BattleSimulationResult,
): readonly TraceStepView[] {
  return result.causalTrace.steps.map((step, index) => {
    switch (step.type) {
      case "condition_evaluation":
        return {
          id: step.eventId,
          label: "条件を評価",
          detail: `${getSemanticLabel(encounter, step.condition)}：${step.matched ? "一致" : "不一致"}`,
          status: step.matched ? ("passed" as const) : ("failed" as const),
        };
      case "action_activation":
        return {
          id: step.eventId,
          label: "行動を発動",
          detail: `${getSemanticLabel(encounter, step.action)}：${step.activated ? "発動" : "発動せず"}`,
          status: step.activated ? ("passed" as const) : ("failed" as const),
        };
      case "outcome":
        return {
          id: step.eventId ?? `trace-outcome-${index}`,
          label: "戦闘結果",
          detail: outcomeDetail(step.reason),
          status: step.success ? ("passed" as const) : ("failed" as const),
        };
    }
  });
}

export function validationSummary(
  result: BattleSimulationResult,
): ValidationSummaryView {
  const reason = result.validation.reason;
  const titles: Record<BattleOutcomeReason, string> = {
    charge_evaded: "突進が外れた",
    guard_held: "防御で突進を止めた",
    dodge_too_late: "回避が間に合わなかった",
    attack_prevailed: "攻撃で突進を押し返した",
    guard_overwhelmed: "防御は発動したが、押し切られた",
    attack_interrupted: "攻撃は発動したが、中断された",
    condition_not_met: "作戦の条件が発動しなかった",
    sentence_not_executable: "作戦文がまだ閉じていない",
  };
  return {
    success: result.validation.success,
    title: titles[reason],
    detail: outcomeDetail(reason),
    reason,
  };
}

export function fragmentFeedback(
  encounter: EncounterDefinition,
  semanticId: SemanticId,
): string {
  const label = getSemanticLabel(encounter, semanticId);
  if (semanticId === "enemy.armor_glows_red") return `兆しとして「${label}」を写し取った。`;
  if (semanticId === "enemy.charges_front") return `敵の行動として「${label}」を写し取った。`;
  return `対抗の手がかりとして「${label}」を写し取った。`;
}
