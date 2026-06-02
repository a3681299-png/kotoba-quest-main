import type { ASTNode, Element, MagicName } from "../parser/ast";
import type { EnemyData, LogEntry, StageConfig, StateGimmick } from "./types";
import type { WaveData } from "../data/stageData";
import type { WaveResult, EnemyBattleResult } from "./waveRunner";
import { aggregateWaveStats } from "./waveRunner";
import { executeRoundBody } from "./executor";
import { getAffinityMultiplier, getGimmickResult, MAGIC_TO_ELEMENT, COMBO_MP_COST } from "./affinity";
import { countEffectiveChars, applyCharLimit } from "./charCounter";

// ─── 多体同時バトル状態 ───────────────────────────────

interface MultiEnemy {
  data: EnemyData;
  hp: number;
  state: Element | null;
  // Stage 5 Wave 3 ボス: チャージ状態（次ラウンドで強攻撃が来る）
  charging?: boolean;
  // 各 hpRatio 閾値が既に発動済みかどうか
  triggeredSummons?: Set<number>;
}

interface MultiState {
  playerHp: number;
  maxPlayerHp: number;
  playerMp: number;
  maxPlayerMp: number;
  playerAttack: number;
  enemies: MultiEnemy[];
  // 召喚可能な敵テンプレート（templateId → EnemyData）
  summonTemplates: Map<string, EnemyData>;
  gimmick: StateGimmick | null;
  round: number;
  playerDefending: boolean;
  log: LogEntry[];
  phase: "battle" | "victory" | "defeat";
  effectiveChars: number; // 毎ラウンド固定（コードは変わらない）
}

const MAX_ROUNDS = 50;
const ALL_ELEMENTS: Element[] = ["火", "水", "雷", "氷", "風"];
const WAVE1_ELEMENTS: Element[] = ["火", "水", "雷"];

// ─── 公開: 同時多体バトル実行 ─────────────────────────

export function runSimultaneousBattle(
  ast: ASTNode[],
  wave: WaveData,
  config: StageConfig,
  startPlayerHp: number,
  startPlayerMp: number,
  code: string,
): WaveResult {
  // 召喚テンプレートを Map に変換
  const summonTemplates = new Map<string, EnemyData>();
  for (const s of wave.summonableEnemies ?? []) {
    summonTemplates.set(s.templateId, s.enemy);
  }

  const state: MultiState = {
    playerHp: startPlayerHp,
    maxPlayerHp: 100,
    playerMp: startPlayerMp,
    maxPlayerMp: config.initialMaxMp,
    playerAttack: config.playerAttack,
    enemies: wave.enemies.map((e) => ({
      data: e,
      hp: e.maxHp,
      // fixedState が定義されていれば常にその値、そうでなければギミックでランダム
      state: e.fixedState !== undefined ? e.fixedState : rollState(config.stateGimmick),
      triggeredSummons: e.summonOnHpThreshold ? new Set<number>() : undefined,
    })),
    summonTemplates,
    gimmick: config.stateGimmick,
    round: 1,
    playerDefending: false,
    log: [],
    phase: "battle",
    effectiveChars: countEffectiveChars(code),
  };

  const loopBody = extractMainLoopBody(ast);
  if (!loopBody) {
    addLog(state, "result", "繰り返す(敵が生きている あいだ): が見つかりません");
    return buildWaveResult(state, "defeat");
  }

  while (state.phase === "battle" && state.round <= MAX_ROUNDS) {
    if (allDefeated(state)) { state.phase = "victory"; break; }
    if (state.playerHp <= 0) { state.phase = "defeat"; break; }

    roundStart(state);
    playerTurn(loopBody, state);
    enemyTurn(state);
    endOfRound(state);

    if (allDefeated(state)) { state.phase = "victory"; break; }
    if (state.playerHp <= 0) { state.phase = "defeat"; break; }
    state.round++;
  }

  if (state.phase === "battle") state.phase = "defeat";

  addLog(state, "result",
    state.phase === "victory"
      ? `全敵撃破！（${state.round} ラウンド）`
      : "力尽きた…"
  );

  return buildWaveResult(state, state.phase === "victory" ? "victory" : "defeat");
}

// ─── ラウンド開始 ─────────────────────────────────────

function roundStart(state: MultiState): void {
  state.playerDefending = false;
  addLog(state, "roundStart", `ラウンド ${state.round}`);

  if (state.round > 1) {
    const before = state.playerMp;
    state.maxPlayerMp += 10;
    const recovery = Math.floor(state.maxPlayerMp / 3);
    state.playerMp = Math.min(state.maxPlayerMp, state.playerMp + recovery);
    const actual = state.playerMp - before;
    addLog(state, "mpRecovery",
      `MP回復 ${before} ＋${actual} → ${state.playerMp}　（最大MP ${state.maxPlayerMp - 10} → ${state.maxPlayerMp}）`,
      { playerMp: actual });
  }

  // 敵ごとに状態をランダム再設定（fixedState を持つ敵はスキップ）
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.data.fixedState !== undefined) {
      enemy.state = enemy.data.fixedState; // 念のため固定値で上書き
      continue;
    }
    enemy.state = rollState(state.gimmick);
  }

  const stateInfo = state.enemies
    .filter((e) => e.hp > 0)
    .map((e) => `${e.data.name}:${e.state ?? "?"}`)
    .join(" / ");
  if (stateInfo) addLog(state, "roundStart", `敵の状態 → ${stateInfo}`);
}

// ─── プレイヤーターン ─────────────────────────────────

function playerTurn(body: ASTNode[], state: MultiState): void {
  // BattleState の代わりに MultiState をキャストして executor に渡す
  // executor は state.enemyHp / state.playerHp / state.playerMp を参照する
  // → firstAlive の HP を一時的に state.enemyHp に見せる
  const firstAlive = state.enemies.find((e) => e.hp > 0);
  const pseudoState = {
    playerHp: state.playerHp,
    maxPlayerHp: state.maxPlayerHp,
    playerMp: state.playerMp,
    maxPlayerMp: state.maxPlayerMp,
    playerAttack: state.playerAttack,
    enemyHp: firstAlive?.hp ?? 0,
    maxEnemyHp: firstAlive?.data.maxHp ?? 0,
    enemy: firstAlive?.data ?? { id: "", name: "", maxHp: 0, defense: 0, element: null, attackPatterns: [] },
    currentEnemyState: firstAlive?.state ?? null,
    stateGimmick: state.gimmick,
    round: state.round,
    enemyEffects: [],
    playerBuffs: [],
    playerDefending: state.playerDefending,
    phase: state.phase as never,
    log: [],
  };

  const { actions, error } = executeRoundBody(body, pseudoState as never);
  if (error) {
    addLog(state, "playerAction", `エラー: ${error}`);
    return;
  }

  for (const action of actions) {
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

  const magicActions = actions.filter(
    (a): a is { type: "MagicUse"; magic: MagicName; targetIndex?: number } =>
      a.type === "MagicUse"
  );
  if (magicActions.length === 0) return;

  // 使用した属性の種類を収集
  const usedElements = new Set<Element>(magicActions.map((a) => MAGIC_TO_ELEMENT[a.magic]));

  // 合体魔法判定
  if (usedElements.size >= 3 && usedElements.size <= 5) {
    const count = usedElements.size as 3 | 4 | 5;
    const comboCost = COMBO_MP_COST[count];
    if (state.playerMp >= comboCost) {
      state.playerMp -= comboCost;
      // 多体モードでは合体魔法は全体攻撃
      applyComboAoE([...usedElements], count, state);
      return;
    }
  }

  // 単属性魔法を個別処理（targetIndex 指定があれば対象を選ぶ。なければ先頭の敵）
  for (const action of magicActions) {
    if (state.playerMp < 10) {
      addLog(state, "playerAction", `MPが足りず ${action.magic} は不発`);
      continue;
    }

    // ターゲット選択
    let targetIdx: number;
    if (action.targetIndex !== undefined) {
      // 1-based の番号 → 0-based の index
      const requestedIdx = action.targetIndex - 1;
      const target = state.enemies[requestedIdx];
      if (!target || target.hp <= 0) {
        // 指定された敵が存在しないか倒れている → 先頭の生きている敵へ
        const fallback = state.enemies.findIndex((e) => e.hp > 0);
        if (fallback < 0) break;
        targetIdx = fallback;
        addLog(state, "playerAction",
          `敵[${action.targetIndex}番目]は対象外のため ${state.enemies[fallback].data.name} を狙う`);
      } else {
        targetIdx = requestedIdx;
      }
    } else {
      // 指定なし → 先頭の生きている敵
      const idx = state.enemies.findIndex((e) => e.hp > 0);
      if (idx < 0) break;
      targetIdx = idx;
    }

    state.playerMp -= 10;
    applySingleMagicToEnemy(action.magic, state.enemies[targetIdx], targetIdx, state);
  }
}

// ─── 単属性魔法ダメージ ───────────────────────────────

function applySingleMagicToEnemy(
  magic: MagicName,
  enemy: MultiEnemy,
  idx: number,
  state: MultiState,
): void {
  const atk = state.playerAttack;
  let damage: number;

  if (state.gimmick && enemy.state) {
    const result = getGimmickResult(magic, enemy.state, state.gimmick.type);
    if (result.type === "absorb") {
      const heal = Math.max(1, Math.floor(atk) - enemy.data.defense);
      enemy.hp = Math.min(enemy.data.maxHp, enemy.hp + heal);
      addLog(state, "playerAction", `${magic} → ${enemy.data.name} 吸収！HP +${heal}`, { enemyHp: heal, enemyIndex: idx });
      return;
    }
    damage = Math.max(1, Math.floor(atk * result.multiplier) - enemy.data.defense);
  } else {
    const mult = getAffinityMultiplier(magic, enemy.data.element);
    damage = Math.max(1, Math.floor(atk * mult) - enemy.data.defense);
  }

  // 文字数制限補正
  if (enemy.data.charLimit) {
    damage = applyCharLimit(damage, state.effectiveChars, enemy.data.charLimit);
  }

  enemy.hp = Math.max(0, enemy.hp - damage);
  addLog(state, "playerAction", `${magic} → ${enemy.data.name} ${damage}ダメージ`, { enemyHp: -damage, enemyIndex: idx });

  // HP 閾値による雑魚召喚チェック
  checkSummonThreshold(enemy, state);
}

// ─── HP 閾値による雑魚召喚 ─────────────────────────────

function checkSummonThreshold(enemy: MultiEnemy, state: MultiState): void {
  if (!enemy.data.summonOnHpThreshold || !enemy.triggeredSummons) return;
  if (enemy.hp <= 0) return; // 倒れた敵は召喚しない
  const hpRatio = enemy.hp / enemy.data.maxHp;
  for (const trigger of enemy.data.summonOnHpThreshold) {
    if (enemy.triggeredSummons.has(trigger.hpRatio)) continue;
    if (hpRatio <= trigger.hpRatio) {
      enemy.triggeredSummons.add(trigger.hpRatio);
      summonEnemies(trigger.summonEnemyId, trigger.count, enemy, state);
    }
  }
}

function summonEnemies(
  templateId: string,
  count: number,
  summoner: MultiEnemy,
  state: MultiState,
): void {
  const template = state.summonTemplates.get(templateId);
  if (!template) {
    addLog(state, "statusEffect", `（召喚テンプレート "${templateId}" が未定義）`);
    return;
  }
  addLog(state, "statusEffect",
    `${summoner.data.name} が ${template.name} を ${count} 体 召喚！`);
  for (let i = 0; i < count; i++) {
    // 名前に番号を付けて区別（同名複数体）
    const name = count > 1 ? `${template.name}${i + 1}` : template.name;
    state.enemies.push({
      data: { ...template, id: `${template.id}_summon_${state.round}_${i}`, name },
      hp: template.maxHp,
      state: rollState(state.gimmick),
    });
  }
}

// ─── 合体魔法 AoE ─────────────────────────────────────

function applyComboAoE(elements: Element[], count: number, state: MultiState): void {
  const atk = state.playerAttack;
  const attrNames = elements.join("・");

  addLog(state, "comboMagic", `合体魔法（${attrNames}）発動！全体攻撃！`);

  let totalDefeated = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) continue;

    // この敵に対する最大属性倍率
    const maxMult = Math.max(
      ...elements.map((el) => {
        const m = (["フレイム","アクア","スパーク","フロスト","ゲイル"] as MagicName[])
          .find((n) => MAGIC_TO_ELEMENT[n] === el)!;
        if (state.gimmick && enemy.state) {
          const r = getGimmickResult(m, enemy.state, state.gimmick.type);
          return r.type === "absorb" ? 0 : r.multiplier;
        }
        return getAffinityMultiplier(m, enemy.data.element);
      })
    );

    let damage: number;
    if (count === 5) {
      damage = 200;
    } else {
      damage = Math.max(1, Math.floor(atk * count * maxMult) - enemy.data.defense);
    }

    // 文字数制限補正（ボスのみ）
    if (enemy.data.charLimit) {
      damage = applyCharLimit(damage, state.effectiveChars, enemy.data.charLimit);
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp <= 0) totalDefeated++;

    addLog(state, "comboMagic", `　${enemy.data.name} → ${damage}ダメージ！${enemy.hp <= 0 ? " 撃破！" : ""}`,
      { enemyHp: -damage, enemyIndex: i });

    // HP 閾値による雑魚召喚チェック
    checkSummonThreshold(enemy, state);
  }

  if (totalDefeated > 0) {
    addLog(state, "comboMagic", `${totalDefeated}体を撃破！`);
  }
}

// ─── 敵ターン（ボスのみ攻撃） ─────────────────────────

function enemyTurn(state: MultiState): void {
  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) continue;

    // ── ヒーラー: 味方を回復する ─────────────────────
    if (enemy.data.healAllies) {
      const { amount, selfHeal = false } = enemy.data.healAllies;
      let healedCount = 0;
      for (let j = 0; j < state.enemies.length; j++) {
        if (!selfHeal && j === i) continue;          // 自分は除外（デフォルト）
        const ally = state.enemies[j];
        if (ally.hp <= 0) continue;                  // 倒れた味方は対象外
        if (ally.hp >= ally.data.maxHp) continue;    // すでに満タンなら回復しない
        const before = ally.hp;
        ally.hp = Math.min(ally.data.maxHp, ally.hp + amount);
        const actual = ally.hp - before;
        addLog(state, "statusEffect",
          `${enemy.data.name} が ${ally.data.name} を ${actual}HP 回復`,
          { enemyHp: actual, enemyIndex: j });
        healedCount++;
      }
      if (healedCount === 0) {
        addLog(state, "statusEffect", `${enemy.data.name} は回復のために構えたが、対象がいなかった`);
      }
      // ヒーラーは攻撃も併用する場合があるので continue しない（攻撃 0 のヒーラーは下で skip される）
    }

    // ── チャージ → 強攻撃 ──────────────────────────────
    if (enemy.data.chargeAttack) {
      if (enemy.charging) {
        // 前ラウンドでチャージ済み → このラウンドで強攻撃を発動
        const chargeDmg = enemy.data.chargeAttack.damage;
        const dmg = state.playerDefending ? Math.max(1, chargeDmg - 10) : chargeDmg;
        state.playerHp = Math.max(0, state.playerHp - dmg);
        addLog(state, "enemyAction",
          `💥 ${enemy.data.name} の強攻撃！ ${dmg}ダメージ！`,
          { playerHp: -dmg });
        enemy.charging = false;
        continue; // このラウンドの行動は強攻撃のみ
      }
      // チャージ開始判定: chargeAttack.interval ラウンドごとに開始
      // 例: interval=3 → R3, R6, R9... 開始 → R4, R7, R10... で発動
      if (state.round > 0 && state.round % enemy.data.chargeAttack.interval === 0) {
        enemy.charging = true;
        const msg = enemy.data.chargeAttack.chargeMessage
          ?? `${enemy.data.name} が力を溜めている…！次のラウンドに大攻撃が来る！`;
        addLog(state, "statusEffect", `⚡ ${msg}`);
        continue; // チャージ中は通常攻撃しない
      }
    }

    // ── 通常攻撃 ────────────────────────────────────
    if (enemy.data.attackPatterns[0].maxDamage === 0) continue; // 攻撃なし（雑魚）

    const hpRatio = enemy.hp / enemy.data.maxHp;
    const pattern = hpRatio <= 0.5 && enemy.data.attackPatterns.length > 1
      ? enemy.data.attackPatterns[1]
      : enemy.data.attackPatterns[0];

    const base = pattern.minDamage + Math.floor(Math.random() * (pattern.maxDamage - pattern.minDamage + 1));
    const dmg = state.playerDefending ? Math.max(1, base - 10) : base;
    state.playerHp = Math.max(0, state.playerHp - dmg);
    addLog(state, "enemyAction", `${enemy.data.name} の攻撃！ ${dmg}ダメージ`, { playerHp: -dmg });
  }
}

// ─── ラウンド終了 ─────────────────────────────────────

function endOfRound(_state: MultiState): void {
  // 燃焼等のステータス効果は未実装（将来対応）
}

// ─── ユーティリティ ───────────────────────────────────

function allDefeated(state: MultiState): boolean {
  return state.enemies.every((e) => e.hp <= 0);
}

function rollState(gimmick: StateGimmick | null): Element | null {
  if (!gimmick) return null;
  const pool = gimmick.type === "wave1" ? WAVE1_ELEMENTS : ALL_ELEMENTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function extractMainLoopBody(ast: ASTNode[]) {
  const mainLoop = ast.find((n) => n.type === "LoopWhile" && n.condition.type === "EnemyAlive");
  if (!mainLoop || mainLoop.type !== "LoopWhile") return null;
  return mainLoop.body;
}

function addLog(
  state: MultiState,
  category: LogEntry["category"],
  message: string,
  delta?: LogEntry["delta"],
): void {
  state.log.push({ round: state.round, category, message, delta });
}

// ─── WaveResult への変換 ─────────────────────────────

function buildWaveResult(state: MultiState, outcome: "victory" | "defeat"): WaveResult {
  const enemyResults: EnemyBattleResult[] = state.enemies.map((e) => ({
    enemy: e.data,
    outcome: e.hp <= 0 ? "defeated" : "survived",
    rounds: state.round,
    battleResult: {
      phase: e.hp <= 0 ? "victory" : "defeat",
      rounds: state.round,
      log: [],
      finalPlayerHp: state.playerHp,
      finalPlayerMp: state.playerMp,
      finalMaxPlayerMp: state.maxPlayerMp,
      finalEnemyHp: e.hp,
    },
  }));

  return {
    outcome,
    enemyResults,
    totalRounds: state.round,
    finalPlayerHp: state.playerHp,
    finalPlayerMp: state.playerMp,
    allLogs: state.log,
    multiEnemyHps: state.enemies.map((e) => e.hp),
    stats: aggregateWaveStats(enemyResults, state.round, state.log),
  };
}
