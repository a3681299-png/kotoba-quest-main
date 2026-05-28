import type { ASTNode, MagicName, Element } from "../parser/ast";
import type {
  BattleState,
  BattleResult,
  EnemyData,
  LogEntry,
  StageConfig,
} from "./types";
import { executeRoundBody } from "./executor";
import {
  getAffinityMultiplier,
  getGimmickResult,
  MAGIC_TO_ELEMENT,
  COMBO_MP_COST,
} from "./affinity";

// ─── バトル初期化 ─────────────────────────────────────

// Wave内HP/MP引き継ぎ用の拡張設定
interface StageConfigWithOverride extends StageConfig {
  _overridePlayerHp?: number;
  _overridePlayerMp?: number;
}

export function createBattleState(enemy: EnemyData, config: StageConfigWithOverride): BattleState {
  const startHp = config._overridePlayerHp ?? 100;
  const startMp = config._overridePlayerMp ?? config.initialMaxMp;
  return {
    playerHp: startHp,
    maxPlayerHp: 100,
    playerMp: startMp,
    maxPlayerMp: config.initialMaxMp,
    playerAttack: config.playerAttack,
    enemyHp: enemy.maxHp,
    maxEnemyHp: enemy.maxHp,
    enemy,
    stateGimmick: config.stateGimmick,
    currentEnemyState: rollEnemyState(config.stateGimmick),
    round: 1,
    enemyEffects: [],
    playerBuffs: [],
    playerDefending: false,
    phase: "battle",
    log: [],
  };
}

// ─── バトル実行 ───────────────────────────────────────

const MAX_ROUNDS = 50;

export function runBattle(
  ast: ASTNode[],
  enemy: EnemyData,
  config: StageConfig,
  // NPC コード（Stage3以降）
  npcAst?: ASTNode[],
): BattleResult {
  const state = createBattleState(enemy, config);

  // メインループボディを抽出
  const loopBody = extractMainLoopBody(ast);
  if (!loopBody) {
    return {
      phase: "defeat",
      rounds: 0,
      log: [{ round: 0, category: "result", message: "繰り返す(敵が生きている あいだ): が見つかりません" }],
      finalPlayerHp: state.playerHp,
      finalEnemyHp: state.enemyHp,
    };
  }

  const npcLoopBody = npcAst ? extractMainLoopBody(npcAst) : null;

  while (state.phase === "battle" && state.round <= MAX_ROUNDS) {
    if (state.enemyHp <= 0) { state.phase = "victory"; break; }
    if (state.playerHp <= 0) { state.phase = "defeat"; break; }

    processRoundStart(state);
    processPlayerTurn(loopBody, state, npcLoopBody ?? undefined);
    processEnemyTurn(state);
    processEndOfRound(state);

    if (state.enemyHp <= 0) { state.phase = "victory"; break; }
    if (state.playerHp <= 0) { state.phase = "defeat"; break; }

    state.round++;
  }

  if (state.phase === "battle") state.phase = "defeat"; // タイムアウト

  const outcome = state.phase === "victory" ? "victory"
    : state.round > MAX_ROUNDS ? "timeout"
    : "defeat";

  addLog(state, "result", outcome === "victory"
    ? `${state.enemy.name} を倒した！（${state.round} ラウンド）`
    : "力尽きた…");

  return {
    phase: outcome,
    rounds: state.round,
    log: state.log,
    finalPlayerHp: state.playerHp,
    finalPlayerMp: state.playerMp,
    finalMaxPlayerMp: state.maxPlayerMp,
    finalEnemyHp: state.enemyHp,
  };
}

// ─── ラウンド開始処理 ─────────────────────────────────

function processRoundStart(state: BattleState): void {
  state.playerDefending = false;

  // ── ラウンド開始ログ ──────────────────────────────────
  const stateTag = state.currentEnemyState ? ` | 敵は${state.currentEnemyState}状態` : "";
  addLog(state, "roundStart", `ラウンド ${state.round}${stateTag}`);

  // ── MP 回復（ラウンド2以降）────────────────────────────
  if (state.round > 1) {
    const mpBefore = state.playerMp;
    const maxMpBefore = state.maxPlayerMp;
    state.maxPlayerMp += 10;
    const recovery = Math.floor(state.maxPlayerMp / 3);
    state.playerMp = Math.min(state.maxPlayerMp, state.playerMp + recovery);
    const actual = state.playerMp - mpBefore;
    addLog(
      state, "mpRecovery",
      `MP回復 ${mpBefore} ＋${actual} → ${state.playerMp}　（最大MP ${maxMpBefore} → ${state.maxPlayerMp}）`,
      { playerMp: actual },
    );
  }

  // Stage4: 敵状態ランダム再設定
  state.currentEnemyState = rollEnemyState(state.stateGimmick);
  if (state.currentEnemyState) {
    addLog(state, "roundStart", `敵の状態が変わった → ${state.currentEnemyState}状態`);
  }
}

// ─── プレイヤーターン処理 ─────────────────────────────

function processPlayerTurn(
  body: ASTNode[],
  state: BattleState,
  npcBody?: ASTNode[],
): void {
  // プレイヤーコード実行（変数も取得してNPCに渡す）
  const { actions: playerActions, variables: playerVars, error } = executeRoundBody(body, state, { selfId: "プレイヤー" });
  if (error) {
    addLog(state, "playerAction", `エラー: ${error}`);
    return;
  }

  // Defend / Heal / Wait を先に処理
  for (const action of playerActions) {
    if (action.type === "Defend") {
      state.playerDefending = true;
      addLog(state, "playerAction", "防御態勢を取った");
    } else if (action.type === "Heal") {
      const heal = Math.floor(state.maxPlayerHp * 0.3);
      state.playerHp = Math.min(state.maxPlayerHp, state.playerHp + heal);
      addLog(state, "playerAction", `回復した ＋${heal}HP → ${state.playerHp}HP`, { playerHp: heal });
    } else if (action.type === "Wait") {
      addLog(state, "playerAction", "待機した");
    }
  }

  // NPC コード実行（Stage3 以降）
  // プレイヤーの変数をターン開始時点の値として NPC に渡す（循環依存防止）
  const playerMagicActions = playerActions.filter(
    (a): a is { type: "MagicUse"; magic: MagicName } => a.type === "MagicUse"
  );

  let npcMagicActions: { type: "MagicUse"; magic: MagicName }[] = [];
  if (npcBody) {
    // プレイヤーのコード実行結果の変数を NPC に渡す（プレイヤー.変数名 で参照可能）
    const { actions: npcActions, error: npcError } = executeRoundBody(
      npcBody, state,
      { selfId: "なかま", peerVariables: playerVars },
    );
    if (npcError) {
      addLog(state, "playerAction", `NPC エラー: ${npcError}`);
    } else {
      npcMagicActions = npcActions.filter(
        (a): a is { type: "MagicUse"; magic: MagicName } => a.type === "MagicUse"
      );
      for (const a of npcMagicActions) {
        addLog(state, "playerAction", `なかま: ${a.magic} を使った`);
      }
    }
  }

  // プレイヤー + NPC の魔法を合算して属性を収集
  const allMagicActions = [...playerMagicActions, ...npcMagicActions];
  if (allMagicActions.length === 0) return;

  const usedElements = new Set<Element>(
    allMagicActions.map((a) => MAGIC_TO_ELEMENT[a.magic])
  );

  // 合体魔法判定（プレイヤー + NPC 合算）
  const count = usedElements.size as 3 | 4 | 5;
  if (usedElements.size >= 3 && usedElements.size <= 5) {
    const comboCost = COMBO_MP_COST[count];
    if (state.playerMp >= comboCost) {
      state.playerMp -= comboCost;
      applyComboMagic([...usedElements], count, state);
      return;
    }
  }

  // 単属性魔法を個別処理（プレイヤー分のみ MP 消費）
  for (const action of playerMagicActions) {
    if (state.playerMp < 10) {
      addLog(state, "playerAction", `MPが足りず ${action.magic} は不発`);
      continue;
    }
    state.playerMp -= 10;
    applySingleMagic(action.magic, state);
  }
  // NPC 分はプレイヤーの MP を消費せず独立してダメージ
  for (const action of npcMagicActions) {
    applyNpcMagic(action.magic, state);
  }
}

// ─── 単属性魔法ダメージ ───────────────────────────────

function applySingleMagic(magic: MagicName, state: BattleState): void {
  const attackPower = effectiveAttackPower(state);

  // Stage4 ギミック判定
  if (state.stateGimmick && state.currentEnemyState) {
    const result = getGimmickResult(magic, state.currentEnemyState, state.stateGimmick.type);
    if (result.type === "absorb") {
      const healAmt = Math.max(1, Math.floor(attackPower) - state.enemy.defense);
      state.enemyHp = Math.min(state.maxEnemyHp, state.enemyHp + healAmt);
      addLog(state, "playerAction", `${magic} → 吸収！敵HP +${healAmt}`, { enemyHp: healAmt });
      return;
    }
    const damage = Math.max(1, Math.floor(attackPower * result.multiplier) - state.enemy.defense);
    state.enemyHp = Math.max(0, state.enemyHp - damage);
    addLog(state, "playerAction", `${magic} → ${damage} ダメージ`, { enemyHp: -damage });
    return;
  }

  // 通常相性
  const mult = getAffinityMultiplier(magic, state.enemy.element);
  const damage = Math.max(1, Math.floor(attackPower * mult) - state.enemy.defense);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  const tag = mult === 2 ? "弱点！" : mult === 0.5 ? "耐性" : "";
  addLog(state, "playerAction", `${magic} → ${damage} ダメージ${tag ? " " + tag : ""}`, { enemyHp: -damage });
}

// ─── NPC 魔法ダメージ（MP消費なし・プレイヤーと同攻撃力） ──

function applyNpcMagic(magic: MagicName, state: BattleState): void {
  const mult = getAffinityMultiplier(magic, state.enemy.element);
  const damage = Math.max(1, Math.floor(state.playerAttack * mult) - state.enemy.defense);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  const tag = mult === 2 ? "弱点！" : mult === 0.5 ? "耐性" : "";
  addLog(state, "playerAction", `なかま ${magic} → ${damage} ダメージ${tag ? " " + tag : ""}`, { enemyHp: -damage });
}

// ─── 合体魔法ダメージ ─────────────────────────────────

function applyComboMagic(elements: Element[], count: number, state: BattleState): void {
  const attackPower = effectiveAttackPower(state);

  // 含まれる属性のうち最大相性倍率を取得
  const maxMult = Math.max(
    ...elements.map((el) => {
      const magic = ["フレイム", "アクア", "スパーク", "フロスト", "ゲイル"].find(
        (m) => MAGIC_TO_ELEMENT[m as MagicName] === el
      ) as MagicName;
      return state.stateGimmick && state.currentEnemyState
        ? getGimmickResult(magic, state.currentEnemyState, state.stateGimmick.type).multiplier
        : getAffinityMultiplier(magic, state.enemy.element);
    })
  );

  let damage: number;
  if (count === 5) {
    damage = 200;
  } else {
    damage = Math.max(1, Math.floor(attackPower * count * maxMult) - state.enemy.defense);
  }
  state.enemyHp = Math.max(0, state.enemyHp - damage);

  const attrNames = elements.join("・");
  addLog(state, "comboMagic",
    `合体魔法（${attrNames}）発動！ → ${damage} ダメージ！`,
    { enemyHp: -damage });

  // TODO: 特殊効果（状態異常・バフ）はコンテンツ設計フェーズで追加
}

// ─── 敵ターン処理 ─────────────────────────────────────

function processEnemyTurn(state: BattleState): void {
  if (state.enemyHp <= 0) return;

  const pattern = state.enemy.attackPatterns[0]; // 最初のパターンを使用
  const baseDamage = pattern.minDamage
    + Math.floor(Math.random() * (pattern.maxDamage - pattern.minDamage + 1));

  // 感電効果（敵攻撃力半減）
  const hasKanden = state.enemyEffects.some((e) => e.type === "感電");
  const attackDamage = hasKanden ? Math.floor(baseDamage / 2) : baseDamage;

  // 防御効果（-10軽減）
  const hasDefenseUp = state.playerBuffs.some((b) => b.type === "防御アップ");
  const baseReduction = state.playerDefending ? 10 : 0;
  const extraReduction = hasDefenseUp ? state.playerBuffs.find((b) => b.type === "防御アップ")!.value : 0;
  const actualDamage = Math.max(1, attackDamage - baseReduction - extraReduction);

  state.playerHp = Math.max(0, state.playerHp - actualDamage);
  addLog(state, "enemyAction",
    `${state.enemy.name} の攻撃！ ${actualDamage} ダメージ` + (hasKanden ? "（感電で弱まっている）" : ""),
    { playerHp: -actualDamage });
}

// ─── ラウンド終了処理 ─────────────────────────────────

function processEndOfRound(state: BattleState): void {
  // 燃焼: 敵に毎ラウンド10ダメージ
  for (const effect of state.enemyEffects) {
    if (effect.type === "燃焼") {
      state.enemyHp = Math.max(0, state.enemyHp - 10);
      addLog(state, "statusEffect", "燃焼ダメージ！敵に 10 ダメージ", { enemyHp: -10 });
    }
  }

  // 継続ラウンド数を減算
  state.enemyEffects = state.enemyEffects
    .map((e) => ({ ...e, remainingRounds: e.remainingRounds - 1 }))
    .filter((e) => e.remainingRounds > 0);

  state.playerBuffs = state.playerBuffs
    .map((b) => ({ ...b, remainingRounds: b.remainingRounds - 1 }))
    .filter((b) => b.remainingRounds > 0);
}

// ─── ユーティリティ ───────────────────────────────────

function extractMainLoopBody(ast: ASTNode[]): ASTNode[] | null {
  const mainLoop = ast.find(
    (n) => n.type === "LoopWhile" && n.condition.type === "EnemyAlive"
  );
  if (!mainLoop || mainLoop.type !== "LoopWhile") return null;
  return mainLoop.body;
}

function effectiveAttackPower(state: BattleState): number {
  const buff = state.playerBuffs.find((b) => b.type === "攻撃力アップ");
  return state.playerAttack + (buff ? buff.value : 0);
}

function rollEnemyState(gimmick: BattleState["stateGimmick"]): Element | null {
  if (!gimmick) return null;
  const wave1Elements: Element[] = ["火", "水", "雷"];
  const allElements: Element[] = ["火", "水", "雷", "氷", "風"];
  const pool = gimmick.type === "wave1" ? wave1Elements : allElements;
  return pool[Math.floor(Math.random() * pool.length)];
}

function addLog(
  state: BattleState,
  category: LogEntry["category"],
  message: string,
  delta?: LogEntry["delta"],
): void {
  state.log.push({ round: state.round, category, message, delta });
}
