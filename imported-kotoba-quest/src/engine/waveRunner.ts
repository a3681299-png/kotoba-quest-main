import type { ASTNode } from "../parser/ast";
import type { BattleResult, EnemyData, StageConfig } from "./types";
import type { WaveData } from "../data/stageData";
import { runBattle } from "./battle";
import { runSimultaneousBattle } from "./multiBattle";
import type { LogEntry } from "./types";

// ─── Wave実行結果 ─────────────────────────────────────

export type WaveOutcome = "victory" | "defeat" | "timeout";

export interface WaveResult {
  outcome: WaveOutcome;
  enemyResults: EnemyBattleResult[];
  totalRounds: number;
  finalPlayerHp: number;
  finalPlayerMp: number;
  // 多体同時バトル用（simultaneous=true のWaveのみ）
  allLogs?: import("./types").LogEntry[];
  multiEnemyHps?: number[]; // 各敵の最終HP（表示用）
  // 行動履歴集計用（Stage 6 学習型ラスボス向け）
  stats?: WaveStats;
}

export interface WaveStats {
  magicUsage: Record<string, number>; // 単属性魔法の使用回数（属性名 → 回数）
  comboCount: number;                  // 合体魔法発動回数
  defendCount: number;                 // 防御()使用回数
  healCount: number;                   // 回復()使用回数
  rounds: number;                      // このバトルでのラウンド数
}

export interface EnemyBattleResult {
  enemy: EnemyData;
  outcome: "defeated" | "survived";
  rounds: number;
  battleResult: BattleResult;
}

// ─── Wave実行 ────────────────────────────────────────
// 同一Wave内の敵を「順番に」処理する
// 各敵に同じコードを実行し、1体倒したら次の敵へ
// HP は各敵戦闘の開始時にリセット（MP も一旦リセット）
// → Wave間のHP/MP引き継ぎはステート管理レイヤーで行う

export function runWave(
  ast: ASTNode[],
  wave: WaveData,
  config: StageConfig,
  startPlayerHp: number,
  startPlayerMp: number,
  npcAst?: ASTNode[],
  code = "",  // プレイヤーのコード文字列（文字数制限チェック用）
): WaveResult {
  // Wave 単位で stateGimmick を上書き
  const waveConfig: StageConfig =
    wave.stateGimmickOverride !== undefined
      ? { ...config, stateGimmick: wave.stateGimmickOverride }
      : config;

  // 同時多体バトル（Stage4 Wave3）
  if (wave.simultaneous) {
    return runSimultaneousBattle(ast, wave, waveConfig, startPlayerHp, startPlayerMp, code);
  }

  const enemyResults: EnemyBattleResult[] = [];
  let currentPlayerHp = startPlayerHp;
  let currentPlayerMp = startPlayerMp;
  let totalRounds = 0;

  for (const enemy of wave.enemies) {
    if (currentPlayerHp <= 0) {
      // 既に死亡している場合は残りの敵はスキップ
      enemyResults.push({
        enemy,
        outcome: "survived",
        rounds: 0,
        battleResult: {
          phase: "defeat",
          rounds: 0,
          log: [],
          finalPlayerHp: 0,
          finalPlayerMp: 0,
          finalMaxPlayerMp: config.initialMaxMp,
          finalEnemyHp: enemy.maxHp,
        },
      });
      continue;
    }

    // 同Wave内の敵戦闘は HP/MP を引き継ぐ
    // StageConfig に startHp / startMp を一時オーバーライドする
    const overrideConfig = {
      ...waveConfig,
      _overridePlayerHp: currentPlayerHp,
      _overridePlayerMp: currentPlayerMp,
    } as StageConfig;
    const battleResult = runBattle(ast, enemy, overrideConfig, npcAst);

    totalRounds += battleResult.rounds;
    // 同Wave内の次の敵戦闘へ: HP を引き継ぎ + 小回復（最大HPの20%）
    currentPlayerHp = Math.min(100, battleResult.finalPlayerHp + 20);
    // MP は実際の最終値をそのまま引き継ぐ（maxMP増加も引き継がれるべきだが、
    // 現状の battle.ts は maxMP も config から再計算するので一旦現状のまま）
    currentPlayerMp = battleResult.finalPlayerMp;

    enemyResults.push({
      enemy,
      outcome: battleResult.phase === "victory" ? "defeated" : "survived",
      rounds: battleResult.rounds,
      battleResult,
    });

    if (battleResult.phase !== "victory") {
      // 残りの敵はスキップ扱いでプレースホルダーを追加してから返す
      const remaining = wave.enemies.slice(enemyResults.length);
      for (const skipped of remaining) {
        enemyResults.push({
          enemy: skipped,
          outcome: "survived",
          rounds: 0,
          battleResult: {
            phase: "defeat",
            rounds: 0,
            log: [],
            finalPlayerHp: 0,
            finalPlayerMp: 0,
            finalMaxPlayerMp: config.initialMaxMp,
            finalEnemyHp: skipped.maxHp,
          },
        });
      }
      return {
        outcome: battleResult.phase,
        enemyResults,
        totalRounds,
        finalPlayerHp: currentPlayerHp,
        finalPlayerMp: currentPlayerMp,
        stats: aggregateWaveStats(enemyResults, totalRounds),
      };
    }
  }

  return {
    outcome: "victory",
    enemyResults,
    totalRounds,
    finalPlayerHp: currentPlayerHp,
    finalPlayerMp: currentPlayerMp,
    stats: aggregateWaveStats(enemyResults, totalRounds),
  };
}

// ─── 行動履歴の集計 ────────────────────────────────────
// 全バトルのログを走査し、プレイヤーの行動回数を集計する

export function aggregateWaveStats(
  enemyResults: EnemyBattleResult[],
  totalRounds: number,
  extraLogs: LogEntry[] = [],
): WaveStats {
  const stats: WaveStats = {
    magicUsage: {},
    comboCount: 0,
    defendCount: 0,
    healCount: 0,
    rounds: totalRounds,
  };
  const allLogs = [
    ...enemyResults.flatMap((r) => r.battleResult.log),
    ...extraLogs,
  ];
  for (const log of allLogs) {
    if (log.category === "playerAction") {
      // 防御
      if (log.message.includes("防御態勢")) {
        stats.defendCount++;
        continue;
      }
      // 回復
      if (log.message.startsWith("回復した")) {
        stats.healCount++;
        continue;
      }
      // 単属性魔法（"ダメージ" を含む魔法ログ）
      for (const magic of ["フレイム", "アクア", "スパーク", "フロスト", "ゲイル"]) {
        if (log.message.includes(magic) && log.message.includes("ダメージ")) {
          stats.magicUsage[magic] = (stats.magicUsage[magic] ?? 0) + 1;
          break;
        }
      }
    } else if (log.category === "comboMagic" && log.message.includes("合体魔法")) {
      stats.comboCount++;
    }
  }
  return stats;
}

// ─── Wave間のHP/MPリセットルール ─────────────────────

export interface WaveTransition {
  nextPlayerHp: number;
  nextPlayerMp: number;
}

// Wave完了後に次Wave開始時のHP/MPを決定する
// 1WaveごとにHPは100、MPはステージの initialMaxMp へリセットする
export function calcWaveTransition(
  _waveResult: WaveResult,
  config: StageConfig,
): WaveTransition {
  return {
    nextPlayerHp: 100,
    nextPlayerMp: config.initialMaxMp,
  };
}
