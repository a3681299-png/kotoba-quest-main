import type { Element, MagicName } from "../parser/ast";
import type { EnemyElement } from "./types";

// ─── 属性相性テーブル ──────────────────────────────────
// 循環: 水→火→氷→風→雷→水
// A→B: A属性の魔法が B タイプの敵に2倍、逆方向は0.5倍

const BEATS: Record<MagicName, Element> = {
  アクア:    "火", // 水 → 火
  フレイム:  "氷", // 火 → 氷
  フロスト:  "風", // 氷 → 風
  ゲイル:    "雷", // 風 → 雷
  スパーク:  "水", // 雷 → 水
};

const BEATEN_BY: Record<Element, MagicName> = {
  火: "アクア",
  氷: "フレイム",
  風: "フロスト",
  雷: "ゲイル",
  水: "スパーク",
};

export function getAffinityMultiplier(magic: MagicName, enemyElement: EnemyElement): number {
  if (enemyElement === null) return 1;
  if (BEATS[magic] === enemyElement) return 2;           // 弱点
  if (BEATEN_BY[enemyElement] !== magic) {
    // 耐性チェック: enemyElement を強くする魔法が magic なら弱点、
    // enemy が beats する魔法なら耐性
    const magicElement = MAGIC_TO_ELEMENT[magic];
    if (magicElement && BEATS[ELEMENT_TO_MAGIC[enemyElement] as MagicName] === magicElement) {
      return 0.5; // 耐性
    }
  }
  return 1; // 中立
}

// Stage4 専用: 状態ギミックの属性判定
// Wave1: 有効属性 → 通常ダメージ(1x), 残り火/水/雷 → 吸収, 氷/風 → 0.25x
// Wave2: 有効属性 → 通常ダメージ(1x), 残り4属性 → 0.25x
export type GimmickResult =
  | { type: "effective"; multiplier: 1 }
  | { type: "absorb"; multiplier: number }   // HP回復（正のダメージ値をHP回復に変換）
  | { type: "reduced"; multiplier: 0.25 };

export function getGimmickResult(
  magic: MagicName,
  currentState: Element,
  gimmickType: "wave1" | "wave2",
): GimmickResult {
  const magicElement = MAGIC_TO_ELEMENT[magic];
  if (magicElement === currentState) return { type: "effective", multiplier: 1 };

  if (gimmickType === "wave1") {
    const initialThree: Element[] = ["火", "水", "雷"];
    if (initialThree.includes(magicElement)) {
      return { type: "absorb", multiplier: 1 };
    }
    return { type: "reduced", multiplier: 0.25 };
  }

  // wave2: 全属性 0.25x（有効以外）
  return { type: "reduced", multiplier: 0.25 };
}

// ─── ヘルパーマップ ────────────────────────────────────

export const MAGIC_TO_ELEMENT: Record<MagicName, Element> = {
  フレイム: "火",
  アクア:   "水",
  スパーク: "雷",
  フロスト: "氷",
  ゲイル:   "風",
};

export const ELEMENT_TO_MAGIC: Record<Element, MagicName> = {
  火: "フレイム",
  水: "アクア",
  雷: "スパーク",
  氷: "フロスト",
  風: "ゲイル",
};

// ─── 合体魔法 MP コスト ────────────────────────────────

export const COMBO_MP_COST: Record<3 | 4 | 5, number> = {
  3: 80,
  4: 100,
  5: 120,
};
