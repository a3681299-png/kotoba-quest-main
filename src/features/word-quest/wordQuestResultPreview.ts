import {
  simulateStrategyPlan,
  VOCABULARY_BY_ID,
  type ActionEffectId,
  type BattleState,
  type CausalLogEntry,
  type PlayerRunState,
  type StrategySentence,
  type WordInventory,
} from "../../wordQuest";

export type ResultPreviewConditionState = "passed" | "failed" | "skipped";
export type ResultPreviewTone =
  | "damage"
  | "defense"
  | "recovery"
  | "status"
  | "blocked";

export interface IndexedStrategySentence {
  sentence: StrategySentence;
  sentenceIndex: number;
}

export interface WordQuestResultPreviewNote {
  kind: "failure" | "reaction";
  label: string;
}

export interface WordQuestResultPreviewItem {
  id: string;
  sentenceIndex: number;
  conditionState: ResultPreviewConditionState;
  conditionLabel: string;
  conditionDetail: string;
  outcomeLabel: string;
  outcomeTone: ResultPreviewTone;
  cadenceLabel: string;
  notes: readonly WordQuestResultPreviewNote[];
}

interface BuildWordQuestResultPreviewInput {
  enemyName: string;
  player: PlayerRunState;
  battle: BattleState;
  strategies: readonly IndexedStrategySentence[];
  inventory: WordInventory;
}

function totalLoggedAmount(
  logs: readonly CausalLogEntry[],
  pattern: RegExp,
): number {
  return logs.reduce((total, log) => {
    const match = log.detail.match(pattern);
    return total + Number(match?.[1] ?? 0);
  }, 0);
}

function conditionPhrase(sentence: StrategySentence): string {
  const subject = sentence.subject
    ? VOCABULARY_BY_ID[sentence.subject]
    : null;
  const condition = sentence.condition
    ? VOCABULARY_BY_ID[sentence.condition]
    : null;

  if (
    condition?.effect.kind === "condition" &&
    condition.effect.condition === "always"
  ) {
    return condition.label;
  }

  return `${subject?.label ?? "対象"}が${condition?.label ?? "条件を満たす"}`;
}

function plannedRepetitions(sentence: StrategySentence): number {
  const connector = sentence.connector
    ? VOCABULARY_BY_ID[sentence.connector]
    : null;
  const modifier = sentence.modifier
    ? VOCABULARY_BY_ID[sentence.modifier]
    : null;
  let repetitions = 1;

  if (
    connector?.effect.kind === "connector" &&
    connector.effect.connector === "whenever"
  ) {
    repetitions += 1;
  }
  if (
    modifier?.effect.kind === "modifier" &&
    (modifier.effect.modifier === "twice" ||
      modifier.effect.modifier === "again")
  ) {
    repetitions += 1;
  }

  return repetitions;
}

function cadenceLabel(
  sentence: StrategySentence,
  conditionState: ResultPreviewConditionState,
  actionCount: number,
): string {
  const modifier = sentence.modifier
    ? VOCABULARY_BY_ID[sentence.modifier]
    : null;
  const modifierId =
    modifier?.effect.kind === "modifier" ? modifier.effect.modifier : null;
  const plannedCount = plannedRepetitions(sentence);

  if (conditionState !== "passed") {
    if (modifierId === "once" && plannedCount === 1) {
      return "条件成立時、この行動は一度だけ発動";
    }
    return `条件成立時、この行動は${plannedCount}回発動`;
  }

  if (actionCount < plannedCount) {
    return `${plannedCount}回を予定し、${actionCount}回発動`;
  }
  if (modifierId === "once" && plannedCount === 1) {
    return "この行動は一度だけ発動";
  }
  if (modifierId === "again" && plannedCount === 2) {
    return "直前と同じ行動をもう一度発動";
  }
  if (modifierId === "negate") {
    return "条件の結果を反転し、この行動は一度発動";
  }

  const countLabel =
    plannedCount === 1
      ? "一度"
      : plannedCount === 2
        ? "二回"
        : plannedCount === 3
          ? "三回"
          : `${plannedCount}回`;
  return `この行動は${countLabel}発動`;
}

function outcomeFromAction(input: {
  actionId: ActionEffectId;
  actionLabel: string;
  enemyName: string;
  actionLogs: readonly CausalLogEntry[];
  failureLogs: readonly CausalLogEntry[];
}): Pick<WordQuestResultPreviewItem, "outcomeLabel" | "outcomeTone"> {
  const { actionId, actionLabel, enemyName, actionLogs, failureLogs } = input;
  if (actionLogs.length === 0) {
    return {
      outcomeLabel:
        failureLogs[0]?.detail ?? `「${actionLabel}」は発動しません`,
      outcomeTone: "blocked",
    };
  }

  switch (actionId) {
    case "attack":
    case "counter": {
      const damage = totalLoggedAmount(actionLogs, /(\d+)ダメージ/);
      return {
        outcomeLabel: `${enemyName}に${
          actionLogs.length > 1 ? "合計" : ""
        }${damage}ダメージ`,
        outcomeTone: "damage",
      };
    }
    case "guard": {
      const reduction = totalLoggedAmount(actionLogs, /被害を(\d+)軽減/);
      return {
        outcomeLabel: `次の被害を${reduction}軽減`,
        outcomeTone: "defense",
      };
    }
    case "heal": {
      const recovery = totalLoggedAmount(actionLogs, /HPを(\d+)回復/);
      return {
        outcomeLabel: `自分のHPを${recovery}回復`,
        outcomeTone: "recovery",
      };
    }
    case "stop":
      return {
        outcomeLabel: `${enemyName}を停止状態にする`,
        outcomeTone: "status",
      };
    case "bind":
      return {
        outcomeLabel: `${enemyName}を拘束状態にする`,
        outcomeTone: "status",
      };
    case "call_name":
      return {
        outcomeLabel: actionLogs.some((log) => log.detail.includes("沈黙が解けた"))
          ? `${enemyName}の沈黙を解き、動きを止める`
          : `${enemyName}の名前を呼ぶ`,
        outcomeTone: "status",
      };
    case "shine":
      return {
        outcomeLabel: `${enemyName}に光を当てる`,
        outcomeTone: "status",
      };
    case "douse": {
      const doused = totalLoggedAmount(actionLogs, /炎上を(\d+)分鎮めた/);
      return {
        outcomeLabel: `自分の炎上を${doused}鎮める`,
        outcomeTone: "recovery",
      };
    }
    case "recharge": {
      const recoveredAp = totalLoggedAmount(actionLogs, /行動値を(\d+)回復/);
      return {
        outcomeLabel: `APを${recoveredAp}回復`,
        outcomeTone: "recovery",
      };
    }
  }
}

export function buildWordQuestResultPreview(
  input: BuildWordQuestResultPreviewInput,
): readonly WordQuestResultPreviewItem[] {
  if (input.strategies.length === 0) return [];

  const resolution = simulateStrategyPlan({
    player: input.player,
    battle: input.battle,
    strategies: input.strategies.map(({ sentence }) => sentence),
    inventory: input.inventory,
  });
  if (!resolution.valid) return [];

  return input.strategies.map(({ sentence, sentenceIndex }, simulationIndex) => {
    const logs = resolution.logs.filter(
      (log) => log.sentenceIndex === simulationIndex,
    );
    const conditionLog = logs.find((log) => log.kind === "condition");
    const actionLogs = logs.filter((log) => log.kind === "action");
    const failureLogs = logs.filter((log) => log.kind === "failure");
    const reactionLogs = logs.filter((log) => log.kind === "reaction");
    const conditionState: ResultPreviewConditionState = conditionLog
      ? conditionLog.status === "passed"
        ? "passed"
        : "failed"
      : "skipped";
    const actionWord = sentence.action
      ? VOCABULARY_BY_ID[sentence.action]
      : null;
    const actionId =
      actionWord?.effect.kind === "action" ? actionWord.effect.action : null;
    const outcome =
      conditionState === "skipped"
        ? {
            outcomeLabel: "前の作戦で決着するため発動しません",
            outcomeTone: "blocked" as const,
          }
        : conditionState === "failed"
          ? {
              outcomeLabel: `「${actionWord?.label ?? "行動"}」は発動しません`,
              outcomeTone: "blocked" as const,
            }
          : actionId
            ? outcomeFromAction({
                actionId,
                actionLabel: actionWord?.label ?? "行動",
                enemyName: input.enemyName,
                actionLogs,
                failureLogs,
              })
            : {
                outcomeLabel: "行動を確認できません",
                outcomeTone: "blocked" as const,
              };
    const modifier = sentence.modifier
      ? VOCABULARY_BY_ID[sentence.modifier]
      : null;
    const phrase = conditionPhrase(sentence);
    const conditionDetail =
      modifier?.effect.kind === "modifier" &&
      modifier.effect.modifier === "negate"
        ? `条件を反転：${phrase}`
        : conditionState === "skipped"
          ? "前の作戦で戦闘が決着"
          : phrase;
    const notes: WordQuestResultPreviewNote[] = [
      ...failureLogs
        .filter(() => actionLogs.length > 0)
        .map((log) => ({ kind: "failure" as const, label: log.detail })),
      ...reactionLogs.map((log) => ({
        kind: "reaction" as const,
        label: log.detail,
      })),
    ];

    return {
      id: sentence.id,
      sentenceIndex,
      conditionState,
      conditionLabel:
        conditionState === "passed"
          ? "条件成立"
          : conditionState === "failed"
            ? "条件不成立"
            : "実行不要",
      conditionDetail,
      ...outcome,
      cadenceLabel: cadenceLabel(sentence, conditionState, actionLogs.length),
      notes,
    };
  });
}
