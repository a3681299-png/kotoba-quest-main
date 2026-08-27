import { getEnemy } from "./enemies";
import { validatePlan } from "./grammar";
import type {
  ActionEffectId,
  BattleResolution,
  BattleState,
  BattleTurnEffects,
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
const AP_REGEN_PER_TURN = 2;
const RECHARGE_AP_AMOUNT = 2;
export const AP_MAX = 6;
export const KING_SEAL_INTERVAL = 3;
export const HEAVY_ATTACK_INTERVAL = 3;
export const HEAVY_ATTACK_MAX_HP_RATIO = 0.8;
export const HEAVY_ATTACK_GUARD_MULTIPLIER = 12;

export interface EnemyAttackPreview {
  kind: "normal" | "heavy";
  power: number;
  turnsUntilHeavyAttack: number;
}

export function getEnemyAttackPreview(
  battle: Pick<BattleState, "enemyPower" | "turn">,
  playerMaxHp: number,
): EnemyAttackPreview {
  const remainder = battle.turn % HEAVY_ATTACK_INTERVAL;
  const turnsUntilHeavyAttack =
    remainder === 0 ? 0 : HEAVY_ATTACK_INTERVAL - remainder;
  const kind = turnsUntilHeavyAttack === 0 ? "heavy" : "normal";

  return {
    kind,
    power:
      kind === "heavy"
        ? Math.max(0, Math.round(playerMaxHp * HEAVY_ATTACK_MAX_HP_RATIO))
        : Math.max(0, battle.enemyPower),
    turnsUntilHeavyAttack,
  };
}

interface MutableBattleContext {
  player: {
    hp: number;
    maxHp: number;
    statuses: Set<PlayerStatus>;
    actionPoints: number;
  };
  battle: {
    enemyId: string;
    enemyHp: number;
    enemyPower: number;
    enemyStatuses: Set<EnemyStatus>;
    turn: number;
    emberStacks: number;
    lastPlayerAction: ActionEffectId | null;
    usedPlayerActions: Set<ActionEffectId>;
    kingSealCooldown: number;
  };
  logs: CausalLogEntry[];
  usedActions: ActionEffectId[];
  scoreDelta: number;
  guard: number;
  playerHealing: number;
  playerHpAfterActions: number;
  damageBlocked: number;
  playerDamageTaken: number;
  lastAction: ActionEffectId | null;
  priorActionExecuted: boolean;
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

interface ConditionEvaluation {
  matched: boolean;
  fact: string;
}

function evaluateCondition(
  condition: ConditionEffectId,
  context: MutableBattleContext,
): ConditionEvaluation {
  switch (condition) {
    case "always":
      return {
        matched: true,
        fact: "「いつでも」は戦況を問わない",
      };
    case "enemy_near":
      return {
        matched: true,
        fact: "戦闘中は敵が近くにいる扱いになっている",
      };
    case "player_hurt": {
      const matched = context.player.hp < context.player.maxHp;
      return {
        matched,
        fact: `自分のHPが${context.player.hp}/${context.player.maxHp}で${
          matched ? "最大値を下回っている" : "満タンになっている"
        }`,
      };
    }
    case "player_attacked": {
      const matched = context.player.statuses.has("attacked");
      return {
        matched,
        fact: `前の手番で敵の攻撃を${
          matched ? "受けている" : "受けていない"
        }`,
      };
    }
    case "enemy_enraged": {
      const matched = context.battle.enemyStatuses.has("enraged");
      return {
        matched,
        fact: `敵が怒り状態に${matched ? "なっている" : "なっていない"}`,
      };
    }
    case "enemy_watching": {
      const matched = context.battle.enemyStatuses.has("watching");
      return {
        matched,
        fact: `敵に視線状態が${matched ? "ある" : "ない"}`,
      };
    }
    case "enemy_not_watching": {
      const matched = !context.battle.enemyStatuses.has("watching");
      return {
        matched,
        fact: `敵に視線状態が${matched ? "ない" : "ある"}`,
      };
    }
    case "enemy_stopped": {
      const matched = context.battle.enemyStatuses.has("stopped");
      return {
        matched,
        fact: `敵が停止状態に${matched ? "なっている" : "なっていない"}`,
      };
    }
    case "enemy_bound": {
      const matched = context.battle.enemyStatuses.has("bound");
      return {
        matched,
        fact: `敵が拘束状態に${matched ? "なっている" : "なっていない"}`,
      };
    }
    case "enemy_named": {
      const matched = context.battle.enemyStatuses.has("named");
      return {
        matched,
        fact: `敵の名前を${matched ? "すでに呼んでいる" : "まだ呼んでいない"}`,
      };
    }
  }
}

function describeConditionEvaluation(
  evaluation: ConditionEvaluation,
  negated: boolean,
): { matched: boolean; detail: string } {
  if (!negated) {
    return {
      matched: evaluation.matched,
      detail: `${evaluation.fact}ため、条件${
        evaluation.matched ? "が成立した" : "は成立しなかった"
      }。`,
    };
  }

  const matched = !evaluation.matched;
  return {
    matched,
    detail: `${evaluation.fact}ため、元の条件${
      evaluation.matched ? "が成立した" : "は成立しなかった"
    }。「ではない」で判定が反転し、最終的に条件${
      matched ? "が成立した" : "は成立しなかった"
    }。`,
  };
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
  const { apCost } = actionWord.effect;
  const isEchoMoth = context.battle.enemyId === "echo-moth";
  const isForgottenKing = context.battle.enemyId === "forgotten-king";

  if (isEchoMoth && context.battle.lastPlayerAction === actionId) {
    appendLog(context, {
      sentenceIndex,
      kind: "failure",
      status: "failed",
      title: actionWord.label,
      detail: "同じ言葉を続けて使うと、反響の蛾に読まれてしまう。",
    });
    return false;
  }
  if (
    isForgottenKing &&
    context.player.statuses.has("sealed") &&
    actionId !== "call_name"
  ) {
    appendLog(context, {
      sentenceIndex,
      kind: "failure",
      status: "failed",
      title: actionWord.label,
      detail: "王が沈黙している間は、名を呼ぶ言葉しか届かない。",
    });
    return false;
  }
  if (context.player.actionPoints < apCost) {
    appendLog(context, {
      sentenceIndex,
      kind: "failure",
      status: "failed",
      title: actionWord.label,
      detail: `行動値が足りない（必要${apCost}、残り${context.player.actionPoints}）。`,
    });
    return false;
  }

  const power = actionPower(actionWord.id, inventory);
  const initialStatuses = new Set(context.battle.enemyStatuses);
  const repeated = context.lastAction === actionId;
  const isEmberMaw = context.battle.enemyId === "ember-maw";
  let executed = true;
  let detail = "";

  context.player.actionPoints -= apCost;

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
      const healed = context.player.hp - before;
      context.playerHealing += healed;
      detail = `HPを${healed}回復した。`;
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
      if (isForgottenKing && context.player.statuses.has("sealed")) {
        context.player.statuses.delete("sealed");
        context.battle.enemyStatuses.add("stopped");
        detail = "王が名を思い出し、沈黙が解けた。隙をついて王の身体が止まった。";
      } else {
        detail = "敵の古い名を呼んだ。";
      }
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
    case "recharge": {
      const before = context.player.actionPoints;
      context.player.actionPoints = Math.min(
        AP_MAX,
        context.player.actionPoints + RECHARGE_AP_AMOUNT,
      );
      detail = `行動値を${context.player.actionPoints - before}回復した。`;
      break;
    }
    default: {
      const unhandledAction: never = actionId;
      throw new Error(`未実装のカード効果です: ${String(unhandledAction)}`);
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
  context.battle.usedPlayerActions.add(actionId);
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
  context.battle.lastPlayerAction = actionId;
  return true;
}

function toPlayerState(context: MutableBattleContext): PlayerRunState {
  return {
    hp: context.player.hp,
    maxHp: context.player.maxHp,
    statuses: [...context.player.statuses],
    actionPoints: Math.min(
      AP_MAX,
      context.player.actionPoints + AP_REGEN_PER_TURN,
    ),
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
    lastPlayerAction: context.usedActions.at(-1) ?? null,
    usedPlayerActions: [...context.battle.usedPlayerActions],
    kingSealCooldown: context.battle.kingSealCooldown,
  };
}

function toBattleTurnEffects(
  context: MutableBattleContext,
): BattleTurnEffects {
  return {
    playerHpAfterActions: context.playerHpAfterActions,
    playerHealing: context.playerHealing,
    guardApplied: context.guard,
    damageBlocked: context.damageBlocked,
    playerDamageTaken: context.playerDamageTaken,
  };
}

/**
 * 作戦文すべてが実行されると仮定した場合の合計行動値コストを見積もる。
 * 条件分岐で実際には実行されない文があっても、ここでは考慮しない（単純合計）。
 */
export function estimatePlanApCost(
  strategies: readonly StrategySentence[],
): number {
  return strategies.reduce((total, sentence) => {
    const actionWord = sentence.action ? VOCABULARY_BY_ID[sentence.action] : null;
    if (!actionWord || actionWord.effect.kind !== "action") return total;
    const connectorWord = sentence.connector
      ? VOCABULARY_BY_ID[sentence.connector]
      : null;
    const modifierWord = sentence.modifier
      ? VOCABULARY_BY_ID[sentence.modifier]
      : null;

    let repetitions = 1;
    if (
      connectorWord?.effect.kind === "connector" &&
      connectorWord.effect.connector === "whenever"
    ) {
      repetitions += 1;
    }
    if (
      modifierWord?.effect.kind === "modifier" &&
      (modifierWord.effect.modifier === "twice" ||
        modifierWord.effect.modifier === "again")
    ) {
      repetitions += 1;
    }

    const extraApCost =
      modifierWord?.effect.kind === "modifier"
        ? modifierWord.effect.extraApCost ?? 0
        : 0;

    return total + actionWord.effect.apCost * repetitions + extraApCost;
  }, 0);
}

export function simulateStrategyPlan(input: {
  player: PlayerRunState;
  battle: BattleState;
  strategies: readonly StrategySentence[];
  inventory: WordInventory;
}): BattleResolution {
  const battleOnlyWordIds = getEnemy(input.battle.enemyId).battleOnlyWordIds;
  const validations = validatePlan(
    input.strategies,
    input.inventory,
    battleOnlyWordIds,
  );
  const context: MutableBattleContext = {
    player: {
      hp: input.player.hp,
      maxHp: input.player.maxHp,
      statuses: new Set(input.player.statuses),
      actionPoints: input.player.actionPoints,
    },
    battle: {
      enemyId: input.battle.enemyId,
      enemyHp: input.battle.enemyHp,
      enemyPower: input.battle.enemyPower,
      enemyStatuses: new Set(input.battle.enemyStatuses),
      turn: input.battle.turn,
      emberStacks: input.battle.emberStacks,
      lastPlayerAction: input.battle.lastPlayerAction,
      usedPlayerActions: new Set(input.battle.usedPlayerActions ?? []),
      kingSealCooldown: input.battle.kingSealCooldown,
    },
    logs: [],
    usedActions: [],
    scoreDelta: 0,
    guard: 0,
    playerHealing: 0,
    playerHpAfterActions: input.player.hp,
    damageBlocked: 0,
    playerDamageTaken: 0,
    lastAction: null,
    priorActionExecuted: input.battle.lastPlayerAction !== null,
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
      effects: toBattleTurnEffects(context),
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

    const conditionEvaluation = evaluateCondition(
      conditionWord.effect.condition,
      context,
    );
    const isNegated =
      modifierWord?.effect.kind === "modifier" &&
      modifierWord.effect.modifier === "negate";
    const conditionResult = describeConditionEvaluation(
      conditionEvaluation,
      isNegated,
    );
    let conditionMatched = conditionResult.matched;
    let conditionDetail = conditionResult.detail;
    if (
      connectorWord.effect.connector === "after" &&
      !context.priorActionExecuted
    ) {
      conditionMatched = false;
      conditionDetail =
        "前の手番で行動していないため、「その後」は成立しなかった。";
    }

    appendLog(context, {
      sentenceIndex,
      kind: "condition",
      status: conditionMatched ? "passed" : "failed",
      title: conditionWord.label,
      detail: conditionDetail,
    });
    if (!conditionMatched) {
      context.priorActionExecuted = false;
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

    const extraApCost =
      modifierWord?.effect.kind === "modifier"
        ? modifierWord.effect.extraApCost ?? 0
        : 0;
    if (extraApCost > 0) {
      if (context.player.actionPoints < extraApCost) {
        appendLog(context, {
          sentenceIndex,
          kind: "failure",
          status: "failed",
          title: modifierWord?.label ?? "修飾",
          detail: `行動値が足りない（必要${extraApCost}、残り${context.player.actionPoints}）。`,
        });
        context.priorActionExecuted = false;
        return;
      }
      context.player.actionPoints -= extraApCost;
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
    context.priorActionExecuted = executed;
  });

  context.playerHpAfterActions = context.player.hp;

  // attacked と guarded は直前の手番を表す一時状態。条件判定が終わったら
  // 今回の敵行動に合わせて更新し直す。
  context.player.statuses.delete("attacked");

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
      const disablingStatus = context.battle.enemyStatuses.has("stopped")
        ? "stopped"
        : "bound";
      context.battle.enemyStatuses.delete(disablingStatus);
    } else {
      const enemyAttack = getEnemyAttackPreview(
        context.battle,
        context.player.maxHp,
      );
      const guardPower =
        enemyAttack.kind === "heavy"
          ? context.guard * HEAVY_ATTACK_GUARD_MULTIPLIER
          : context.guard;
      const incomingDamage = enemyAttack.power;
      const damage = Math.max(0, incomingDamage - guardPower);
      const blockedDamage = incomingDamage - damage;
      context.damageBlocked += blockedDamage;
      const hpBeforeDamage = context.player.hp;
      context.player.hp = Math.max(0, context.player.hp - damage);
      context.playerDamageTaken += hpBeforeDamage - context.player.hp;
      if (damage > 0) context.player.statuses.add("attacked");
      if (context.player.hp < context.player.maxHp) {
        context.player.statuses.add("wounded");
      }
      appendLog(context, {
        sentenceIndex: null,
        kind: "enemy",
        status: damage === 0 ? "passed" : "failed",
        title:
          enemyAttack.kind === "heavy"
            ? `${enemy.name}の大技`
            : `${enemy.name}の反撃`,
        detail:
          damage === 0
            ? "「守る」で攻撃をすべて受け止めた。"
            : blockedDamage > 0
              ? `「守る」で${blockedDamage}軽減し、${damage}ダメージを受けた。残りHP ${context.player.hp}。`
              : `${damage}ダメージを受けた。残りHP ${context.player.hp}。`,
      });
    }

    if (context.battle.enemyId === "ember-maw" && context.battle.emberStacks > 0) {
      const emberDamage = context.battle.emberStacks * EMBER_STACK_DAMAGE_PER_STACK;
      const hpBeforeEmberDamage = context.player.hp;
      context.player.hp = Math.max(0, context.player.hp - emberDamage);
      context.playerDamageTaken += hpBeforeEmberDamage - context.player.hp;
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

    if (context.battle.enemyId === "forgotten-king") {
      if (context.player.statuses.has("sealed")) {
        // 封印中はカウントダウンを進めない（名前を呼ばれて解除されるまで続く）
      } else if (context.battle.kingSealCooldown <= 1) {
        context.player.statuses.add("sealed");
        context.battle.kingSealCooldown = KING_SEAL_INTERVAL;
        appendLog(context, {
          sentenceIndex: null,
          kind: "enemy",
          status: "failed",
          title: "王の沈黙",
          detail: "王が己の名を忘れ、あらゆる言葉を拒み始めた。名を呼ぶ言葉しか届かない。",
        });
      } else {
        context.battle.kingSealCooldown -= 1;
      }
    }
  }

  // 防御はこの手番だけ有効。敵が停止して使われなかった場合も、
  // 次の手番へ見かけだけの防御状態を持ち越さない。
  context.player.statuses.delete("guarded");

  const defeat = context.player.hp <= 0;
  const earnedDiscoveries: string[] = [];
  if (victory) {
    const allStatuses = context.battle.enemyStatuses;
    for (const solution of enemy.solutionHints) {
      const actionsMatched = solution.requiresActions.every((action) =>
        context.battle.usedPlayerActions.has(action),
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
    effects: toBattleTurnEffects(context),
    usedActions: context.usedActions,
    earnedDiscoveries,
    scoreDelta: context.scoreDelta,
  };
}
