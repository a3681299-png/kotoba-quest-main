// 敵のIntent（予兆）システム型定義

export type IntentType =
  | "attack_normal"
  | "attack_heavy"
  | "attack_multi"
  | "charging"
  | "defending"
  | "idle";

export interface EnemyIntent {
  type: IntentType;
  damage: number;
  description: string;
  hint: string;
  icon: string;
  turnsUntilAction: number;
}

export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  stage: number;
  attackPatterns: IntentPattern[];
}

export interface IntentPattern {
  condition: IntentCondition;
  intent: Omit<EnemyIntent, "turnsUntilAction">;
  weight: number;
}

export type IntentCondition =
  | { type: "always" }
  | { type: "hp_below"; threshold: number }
  | { type: "hp_above"; threshold: number }
  | { type: "turn_multiple"; multiple: number }
  | { type: "player_defending" }
  | { type: "random"; chance: number };

export const ENEMY_DATA: Record<number, EnemyData> = {
  1: {
    id: "training_doll",
    name: "木偶の影",
    maxHp: 20,
    stage: 1,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "命令を待っている",
          hint: "上から順番に命令を書こう。",
          icon: "🧵",
        },
        weight: 1,
      },
    ],
  },
  2: {
    id: "contract_beast",
    name: "弱った契約獣",
    maxHp: 10,
    stage: 2,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "弱って契約を待っている",
          hint: "敵HP が 少ない時だけ攻撃する契約を書こう。",
          icon: "📜",
        },
        weight: 1,
      },
    ],
  },
  3: {
    id: "thorn_root",
    name: "からみ根",
    maxHp: 30,
    stage: 3,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "何度もほどく必要がある",
          hint: "3回 くりかえす で同じ命令をまとめよう。",
          icon: "🌿",
        },
        weight: 1,
      },
    ],
  },
  4: {
    id: "nameless",
    name: "名前を忘れた敵",
    maxHp: 15,
    stage: 4,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "同じ言葉をくりかえしている",
          hint: "敵の言葉を記録してから、その記録を条件に使おう。",
          icon: "📖",
        },
        weight: 1,
      },
    ],
  },
  5: {
    id: "sealed_cage",
    name: "閉ざされた鳥籠",
    maxHp: 20,
    stage: 5,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "ひとまとまりの作戦を待っている",
          hint: "作戦A を定義してから実行しよう。",
          icon: "🕊️",
        },
        weight: 1,
      },
    ],
  },
  6: {
    id: "exception_shadow",
    name: "敵ではない影",
    maxHp: 20,
    stage: 6,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "敵かどうか、まだ決まっていない",
          hint: "敵ではないなら、攻撃ではなく手を伸ばそう。",
          icon: "🎭",
        },
        weight: 1,
      },
    ],
  },
};

export function decideEnemyIntent(
  enemyData: EnemyData,
  enemyHp: number,
  turnCount: number,
  isPlayerDefending: boolean,
): EnemyIntent {
  const hpRatio = enemyHp / enemyData.maxHp;

  const validPatterns = enemyData.attackPatterns.filter((pattern) => {
    const cond = pattern.condition;
    switch (cond.type) {
      case "always":
        return true;
      case "hp_below":
        return hpRatio <= cond.threshold;
      case "hp_above":
        return hpRatio >= cond.threshold;
      case "turn_multiple":
        return turnCount > 0 && turnCount % cond.multiple === 0;
      case "player_defending":
        return isPlayerDefending;
      case "random":
        return Math.random() < cond.chance;
      default:
        return false;
    }
  });

  if (validPatterns.length === 0) {
    return {
      type: "idle",
      damage: 0,
      description: "様子を見ている",
      hint: "敵の状態を読もう。",
      icon: "👁",
      turnsUntilAction: 0,
    };
  }

  const totalWeight = validPatterns.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const pattern of validPatterns) {
    random -= pattern.weight;
    if (random <= 0) {
      return {
        ...pattern.intent,
        turnsUntilAction: 0,
      };
    }
  }

  return {
    ...validPatterns[0].intent,
    turnsUntilAction: 0,
  };
}

export function calculateDamage(
  intent: EnemyIntent,
  isDefending: boolean,
): number {
  if (isDefending) {
    return Math.floor(intent.damage * 0.5);
  }
  return intent.damage;
}
