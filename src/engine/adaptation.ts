// Stage 6 Wave 5 学習型ラスボスの適応ロジック
//
// 集計範囲: Stage 1〜5 のすべてのクリア時データ
// 適応タイミング: Wave 5 開始時に一括計算してボスステータスを確定
//
// 適応する3要素:
//  1. 最多使用属性 上位2種 → 0.5x ダメージ耐性
//  2. comboCount / totalRounds ≥ 0.15 → 合体魔法ダメージ × 0.7
//  3. (defendCount + healCount) / totalRounds ≥ 0.30 → チャージ間隔 3 → 2

import type { MagicName } from "../parser/ast";
import type { ActionHistory } from "../store/useGameStore";

// ─── 定数（しきい値）─────────────────────────────────

export const COMBO_HEAVY_RATIO = 0.15;       // 合体魔法依存とみなす閾値
export const DEFENSIVE_RATIO = 0.30;         // 防御・回復依存とみなす閾値
export const RESIST_TOP_N = 2;               // 上位 N 種の属性に耐性
export const COMBO_REDUCED_MULTIPLIER = 0.7; // 合体魔法ダメージ係数
export const CHARGE_INTERVAL_DEFAULT = 3;    // チャージ間隔（通常）
export const CHARGE_INTERVAL_SHORTENED = 2;  // チャージ間隔（防御依存型に対して）

// ─── 適応設定 ────────────────────────────────────────

export interface AdaptationConfig {
  /** ダメージ 0.5x になる単属性魔法（上位2種） */
  resistMagics: MagicName[];
  /** 合体魔法のダメージに掛ける係数（1.0 = 通常 / 0.7 = 減衰） */
  comboDamageMultiplier: number;
  /** チャージ攻撃の発動間隔（3 or 2） */
  chargeInterval: number;
  /** 適応の生データ（セリフ生成用） */
  reasons: AdaptationReason[];
}

export type AdaptationReason =
  | { type: "resist"; magic: MagicName; usage: number }
  | { type: "comboReduction"; comboCount: number; totalRounds: number; ratio: number }
  | { type: "chargeShorten"; defendCount: number; healCount: number; totalRounds: number; ratio: number };

// ─── 適応計算 ────────────────────────────────────────

export function calcAdaptation(history: ActionHistory): AdaptationConfig {
  const reasons: AdaptationReason[] = [];

  // ─── ① 上位2属性に耐性 ───────────────────────────
  const sortedMagics = (Object.entries(history.magicUsage) as [MagicName, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const resistMagics = sortedMagics.slice(0, RESIST_TOP_N).map(([m]) => m);
  for (const [magic, usage] of sortedMagics.slice(0, RESIST_TOP_N)) {
    reasons.push({ type: "resist", magic, usage });
  }

  // ─── ② 合体魔法依存度 → 減衰 ────────────────────
  let comboDamageMultiplier = 1.0;
  if (history.totalRounds > 0) {
    const comboRatio = history.comboCount / history.totalRounds;
    if (comboRatio >= COMBO_HEAVY_RATIO) {
      comboDamageMultiplier = COMBO_REDUCED_MULTIPLIER;
      reasons.push({
        type: "comboReduction",
        comboCount: history.comboCount,
        totalRounds: history.totalRounds,
        ratio: comboRatio,
      });
    }
  }

  // ─── ③ 防御・回復依存度 → チャージ間隔短縮 ───────
  let chargeInterval = CHARGE_INTERVAL_DEFAULT;
  if (history.totalRounds > 0) {
    const defensiveRatio = (history.defendCount + history.healCount) / history.totalRounds;
    if (defensiveRatio >= DEFENSIVE_RATIO) {
      chargeInterval = CHARGE_INTERVAL_SHORTENED;
      reasons.push({
        type: "chargeShorten",
        defendCount: history.defendCount,
        healCount: history.healCount,
        totalRounds: history.totalRounds,
        ratio: defensiveRatio,
      });
    }
  }

  return {
    resistMagics,
    comboDamageMultiplier,
    chargeInterval,
    reasons,
  };
}

// ─── デバッグ用: 適応内容を人間可読な文字列に ───────

export function formatAdaptation(config: AdaptationConfig): string[] {
  const lines: string[] = [];
  if (config.resistMagics.length > 0) {
    lines.push(`耐性: ${config.resistMagics.join("・")} のダメージを 50% カット`);
  }
  if (config.comboDamageMultiplier < 1) {
    lines.push(`合体魔法ダメージを ${Math.round((1 - config.comboDamageMultiplier) * 100)}% 減衰`);
  }
  if (config.chargeInterval < CHARGE_INTERVAL_DEFAULT) {
    lines.push(`チャージ攻撃の発動間隔を短縮（${CHARGE_INTERVAL_DEFAULT} → ${config.chargeInterval} ラウンド）`);
  }
  if (lines.length === 0) {
    lines.push("（適応なし: まだ十分な行動履歴がない）");
  }
  return lines;
}
