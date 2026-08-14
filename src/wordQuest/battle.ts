import { getEnemy } from "./enemies";
import { validatePlan } from "./grammar";
import type {
  ActionEffectId,
  BattleResolution,
  BattleState,
  CausalLogEntry,
  ConditionEffectId,
  EnemyReactionRule,
  EnemyStatus,
  PlayerRunState,
  PlayerStatus,
  ReactionEffect,
  StrategySentence,
  WordId,
  WordInventory,
} from "./types";
import { VOCABULARY_BY_ID } from "./vocabulary";

const EMBER_STACK_DAMAGE_PER_STACK = 2;
const EMBER_STACK_DOUSE_AMOUNT = 5;

interface MutableBattleContext {
  player: {
    hp: number;
    maxHp: number;
    statuses: Set<PlayerStatus>;
  };
  battle: {
    enemyId: string;
    enemyHp: number;
    enemyPower: number;
    enemyStatuses: Set<EnemyStatus>;
    turn: number;
    emberStacks: number;
  };
  logs: CausalLogEntry[];
  usedActions: ActionEffectId[];
  scoreDelta: number;
  guard: number;
  lastAction: ActionEffectId | null;
  previousSentenceExecuted: boolean;
  maxEmberStacksReached: number;
}

function appendLog(
  context: MutableBattleContext,
  entry: Omit<CausalLogEntry, "id" | "sequence">,
) {
  const sequence = context.logs.length + 1;
  context.logs.push({
    ...entry,
    id: `cause-${context.battle.turn}-${sequence}`,
    sequence,
  });
}

function evaluateCondition(
  condition: ConditionEffectId,
  context: MutableBattleContext,
): boolean {
  switch (condition) {
    case "always":
    case "enemy_near":
      return true;
    case "player_hurt":
      return context.player.hp < context.player.maxHp;
    case "player_attacked":
      return context.player.statuses.has("attacked");
    case "enemy_enraged":
      return context.battle.enemyStatuses.has("enraged");
    case "enemy_watching":
      return context.battle.enemyStatuses.has("watching");
    case "enemy_not_watching":
      return !context.battle.enemyStatuses.has("watching");
    case "enemy_stopped":
      return context.battle.enemyStatuses.has("stopped");
    case "enemy_bound":
      return context.battle.enemyStatuses.has("bound");
    case "enemy_named":
      return context.battle.enemyStatuses.has("named");
  }
}

function applyReactionEffect(
  effect: ReactionEffect,
  context: MutableBattleContext,
): EnemyStatus | null {
  switch (effect.kind) {
    case "add-enemy-power":
      context.battle.enemyPower += effect.amount;
      return null;
    case "heal-enemy": {
      const enemy = getEnemy(context.battle.enemyId);
      context.battle.enemyHp = Math.min(
        enemy.maxHp,
        context.battle.enemyHp + effect.amount,
      );
      return null;
    }
    case "damage-enemy":
      context.battle.enemyHp = Math.max(0, context.battle.enemyHp - effect.amount);
      return null;
    case "add-enemy-status": {
      const added = !context.battle.enemyStatuses.has(effect.status);
      context.battle.enemyStatuses.add(effect.status);
      return added ? effect.status : null;
    }
    case "remove-enemy-status":
      context.battle.enemyStatuses.delete(effect.status);
      return null;
    case "add-score":
      context.scoreDelta += effect.amount;
      return null;
  }
}

function reactionMatches(
  reaction: EnemyReactionRule,
  action: ActionEffectId,
  repeated: boolean,
  addedStatuses: ReadonlySet<EnemyStatus>,
): boolean {
  switch (reaction.trigger.kind) {
    case "after-action":
      return reaction.trigger.action === action;
    case "repeat-action":
      return repeated;
    case "enemy-status-added":
      return addedStatuses.has(reaction.trigger.status);
  }
}

function applyEnemyReactions(
  action: ActionEffectId,
  repeated: boolean,
  initialStatuses: ReadonlySet<EnemyStatus>,
  sentenceIndex: number,
  context: MutableBattleContext,
) {
  const enemy = getEnemy(context.battle.enemyId);
  const addedStatuses = new Set<EnemyStatus>();
  for (const status of context.battle.enemyStatuses) {
    if (!initialStatuses.has(status)) addedStatuses.add(status);
  }

  for (const reaction of enemy.reactions) {
    if (!reactionMatches(reaction, action, repeated, addedStatuses)) continue;
    for (const effect of reaction.effects) {
      const added = applyReactionEffect(effect, context);
      if (added) addedStatuses.add(added);
    }
    appendLog(context, {
      sentenceIndex,
      kind: "reaction",
      status: "neutral",
      title: `${enemy.name}の反応`,
      detail: reaction.log,
    });
  }
}

function actionPower(wordId: WordId, inventory: WordInventory): number {
  const word = VOCABULARY_BY_ID[wordId];
  if (!word || word.effect.kind !== "action") return 0;
  const rank = inventory[wordId]?.rank ?? 1;
  return (
    word.effect.basePower +
    Math.max(0, rank - 1) * word.duplicateRule.powerPerRank
  );
}

function executeAction(
  sentence: StrategySentence,
  sentenceIndex: number,
  actionId: ActionEffectId,
  inventory: WordInventory,
  context: MutableBattleContext,
): boolean {
  const actionWord = sentence.action
    ? VOCABULARY_BY_ID[sentence.action]
    : null;
  if (!actionWord || actionWord.effect.kind !== "action") return false;
  const power = actionPower(actionWord.id, inventory);
  const initialStatuses = new Set(context.battle.enemyStatuses);
  const repeated = context.lastAction === actionId;
  const isEmberMaw = context.battle.enemyId === "ember-maw";
  let executed = true;
  let detail = "";

  if (isEmberMaw && actionId !== "douse") {
    context.battle.emberStacks += 1;
    context.maxEmberStacksReached = Math.max(
      context.maxEmberStacksReached,
      context.battle.emberStacks,
    );
  }

  switch (actionId) {
    case "attack": {
      const statusBonus =
        (context.battle.enemyStatuses.has("bound") ? 2 : 0) +
        (context.battle.enemyStatuses.has("exposed") ? 2 : 0);
      const damage = power + statusBonus;
      context.battle.enemyHp = Math.max(0, context.battle.enemyHp - damage);
      detail = `敵へ${damage}ダメージ。残りHP ${context.battle.enemyHp}。`;
      break;
    }
    case "counter": {
      const ready = context.player.statuses.has("attacked");
      const damage = ready ? power : Math.max(2, power - 3);
      context.battle.enemyHp = Math.max(0, context.battle.enemyHp - damage);
      detail = ready
        ? `直前の攻撃へ反撃し、${damage}ダメージ。`
        : `反撃の機会がなく、威力が落ちて${damage}ダメージ。`;
      break;
    }
    case "guard":
      context.guard += power;
      context.player.statuses.add("guarded");
      detail = `次の被害を${power}軽減する。`;
      break;
    case "heal": {
      const before = context.player.hp;
      context.player.hp = Math.min(context.player.maxHp, context.player.hp + power);
      detail = `HPを${context.player.hp - before}回復した。`;
      if (context.player.hp === context.player.maxHp) {
        context.player.statuses.delete("wounded");
      }
      break;
    }
    case "stop":
      context.battle.enemyStatuses.add("stopped");
      detail = "敵へ停止状態を付けた。";
      break;
    case "bind":
      if (
        actionWord.effect.requiresEnemyStatus &&
        !context.battle.enemyStatuses.has(actionWord.effect.requiresEnemyStatus)
      ) {
        executed = false;
        detail = "敵が止まっていないため、拘束が届かなかった。";
      } else {
        context.battle.enemyStatuses.add("bound");
        detail = "停止した敵を拘束した。";
      }
      break;
    case "call_name":
      context.battle.enemyStatuses.add("named");
      detail = "敵の古い名を呼んだ。";
      break;
    case "shine":
      context.battle.enemyStatuses.add("illuminated");
      detail = "敵へ光を当てた。";
      break;
    case "douse": {
      const before = context.battle.emberStacks;
      context.battle.emberStacks = Math.max(
        0,
        context.battle.emberStacks - EMBER_STACK_DOUSE_AMOUNT,
      );
      detail = `炎上を${before - context.battle.emberStacks}分鎮めた。残り炎上${context.battle.emberStacks}。`;
      break;
    }
  }

  appendLog(context, {
    sentenceIndex,
    kind: executed ? "action" : "failure",
    status: executed ? "passed" : "failed",
    title: actionWord.label,
    detail,
  });

  if (!executed) return false;
  context.usedActions.push(actionId);
  if (context.battle.enemyHp > 0) {
    applyEnemyReactions(
      actionId,
      repeated,
      initialStatuses,
      sentenceIndex,
      context,
    );
  }
  context.lastAction = actionId;
  return true;
}

function toPlayerState(context: MutableBattleContext): PlayerRunState {
  return {
    hp: context.player.hp,
    maxHp: context.player.maxHp,
    statuses: [...context.player.statuses],
  };
}

function toBattleState(context: MutableBattleContext): BattleState {
  return {
    enemyId: context.battle.enemyId,
    enemyHp: context.battle.enemyHp,
    enemyPower: context.battle.enemyPower,
    enemyStatuses: [...context.battle.enemyStatuses],
    turn: context.battle.turn + 1,
    emberStacks: context.battle.emberStacks,
  };
}

export function simulateStrategyPlan(input: {
  player: PlayerRunState;
  battle: BattleState;
  strategies: readonly StrategySentence[];
  inventory: WordInventory;
}): BattleResolution {
  const validations = validatePlan(input.strategies, input.inventory);
  const context: MutableBattleContext = {
    player: {
      hp: input.player.hp,
      maxHp: input.player.maxHp,
      statuses: new Set(input.player.statuses),
    },
    battle: {
      enemyId: input.battle.enemyId,
      enemyHp: input.battle.enemyHp,
      enemyPower: input.battle.enemyPower,
      enemyStatuses: new Set(input.battle.enemyStatuses),
      turn: input.battle.turn,
      emberStacks: input.battle.emberStacks,
    },
    logs: [],
    usedActions: [],
    scoreDelta: 0,
    guard: 0,
    lastAction: null,
    previousSentenceExecuted: false,
    maxEmberStacksReached: input.battle.emberStacks,
  };

  if (validations.some((validation) => !validation.valid)) {
    for (const validation of validations) {
      if (validation.valid) continue;
      appendLog(context, {
        sentenceIndex: input.strategies.findIndex(
          (sentence) => sentence.id === validation.sentenceId,
        ),
        kind: "grammar",
        status: "failed",
        title: "文章が成立していない",
        detail: validation.issue ?? "語彙の並びを確認してください。",
      });
    }
    return {
      valid: false,
      victory: false,
      defeat: false,
      logs: context.logs,
      player: input.player,
      battle: input.battle,
      usedActions: [],
      earnedDiscoveries: [],
      scoreDelta: 0,
    };
  }

  input.strategies.forEach((sentence, sentenceIndex) => {
    if (context.battle.enemyHp <= 0) return;
    const conditionWord = VOCABULARY_BY_ID[sentence.condition as WordId];
    const connectorWord = VOCABULARY_BY_ID[sentence.connector as WordId];
    const actionWord = VOCABULARY_BY_ID[sentence.action as WordId];
    const modifierWord = sentence.modifier
      ? VOCABULARY_BY_ID[sentence.modifier]
      : null;
    if (
      conditionWord?.effect.kind !== "condition" ||
      connectorWord?.effect.kind !== "connector" ||
      actionWord?.effect.kind !== "action"
    ) {
      return;
    }

    let conditionMatched = evaluateCondition(
      conditionWord.effect.condition,
      context,
    );
    if (
      modifierWord?.effect.kind === "modifier" &&
      modifierWord.effect.modifier === "negate"
    ) {
      conditionMatched = !conditionMatched;
    }
    if (
      connectorWord.effect.connector === "after" &&
      !context.previousSentenceExecuted
    ) {
      conditionMatched = false;
    }

    appendLog(context, {
      sentenceIndex,
      kind: "condition",
      status: conditionMatched ? "passed" : "failed",
      title: conditionWord.label,
      detail: conditionMatched
        ? "条件が成立し、次の語彙へ因果が進んだ。"
        : "条件が成立せず、この文章で因果が途切れた。",
    });
    if (!conditionMatched) {
      context.previousSentenceExecuted = false;
      return;
    }

    let repetitions = 1;
    if (connectorWord.effect.connector === "whenever") repetitions += 1;
    if (modifierWord?.effect.kind === "modifier") {
      if (
        modifierWord.effect.modifier === "twice" ||
        modifierWord.effect.modifier === "again"
      ) {
        repetitions += 1;
      }
    }

    let executed = false;
    for (let repeat = 0; repeat < repetitions; repeat += 1) {
      if (context.battle.enemyHp <= 0) break;
      executed =
        executeAction(
          sentence,
          sentenceIndex,
          actionWord.effect.action,
          input.inventory,
          context,
        ) || executed;
    }
    context.previousSentenceExecuted = executed;
  });

  const victory = context.battle.enemyHp <= 0;
  const enemy = getEnemy(context.battle.enemyId);
  if (!victory) {
    if (
      context.battle.enemyStatuses.has("stopped") ||
      context.battle.enemyStatuses.has("bound")
    ) {
      appendLog(context, {
        sentenceIndex: null,
        kind: "enemy",
        status: "passed",
        title: `${enemy.name}は動けない`,
        detail: "停止または拘束により、敵の反撃は発生しなかった。",
      });
      context.battle.enemyStatuses.delete("stopped");
    } else {
      const damage = Math.max(0, context.battle.enemyPower - context.guard);
      context.player.hp = Math.max(0, context.player.hp - damage);
      context.player.statuses.delete("guarded");
      if (damage > 0) context.player.statuses.add("attacked");
      if (context.player.hp < context.player.maxHp) {
        context.player.statuses.add("wounded");
      }
      appendLog(context, {
        sentenceIndex: null,
        kind: "enemy",
        status: damage === 0 ? "passed" : "failed",
        title: `${enemy.name}の反撃`,
        detail:
          damage === 0
            ? "防御が反撃をすべて受け止めた。"
            : `${damage}ダメージを受けた。残りHP ${context.player.hp}。`,
      });
    }

    if (context.battle.enemyId === "ember-maw" && context.battle.emberStacks > 0) {
      const emberDamage = context.battle.emberStacks * EMBER_STACK_DAMAGE_PER_STACK;
      context.player.hp = Math.max(0, context.player.hp - emberDamage);
      if (context.player.hp < context.player.maxHp) {
        context.player.statuses.add("wounded");
      }
      appendLog(context, {
        sentenceIndex: null,
        kind: "enemy",
        status: "failed",
        title: "炎上によるダメージ",
        detail: `炎上${context.battle.emberStacks}スタック分、${emberDamage}ダメージを受けた。残りHP ${context.player.hp}。`,
      });
    }
  }

  const defeat = context.player.hp <= 0;
  const earnedDiscoveries: string[] = [];
  if (victory) {
    const allStatuses = context.battle.enemyStatuses;
    for (const solution of enemy.solutionHints) {
      const actionsMatched = solution.requiresActions.every((action) =>
        context.usedActions.includes(action),
      );
      const statusesMatched = solution.requiresStatuses.every((status) =>
        allStatuses.has(status),
      );
      const emberStackMatched =
        solution.maxEmberStackAtMost === undefined ||
        context.maxEmberStacksReached <= solution.maxEmberStackAtMost;
      if (!actionsMatched || !statusesMatched || !emberStackMatched) continue;
      earnedDiscoveries.push(solution.label);
      context.scoreDelta += solution.bonusScore;
    }
    appendLog(context, {
      sentenceIndex: null,
      kind: "success",
      status: "passed",
      title: `${enemy.name}を突破`,
      detail:
        earnedDiscoveries.length > 0
          ? `発見した解法：${earnedDiscoveries.join("、")}`
          : "作戦文の因果が最後までつながった。",
    });
  } else if (defeat) {
    appendLog(context, {
      sentenceIndex: null,
      kind: "failure",
      status: "failed",
      title: "冒険を続けられない",
      detail: "HPが0になった。獲得した語彙を見直して再挑戦できる。",
    });
  }

  return {
    valid: true,
    victory,
    defeat,
    logs: context.logs,
    player: toPlayerState(context),
    battle: toBattleState(context),
    usedActions: context.usedActions,
    earnedDiscoveries,
    scoreDelta: context.scoreDelta,
  };
}
