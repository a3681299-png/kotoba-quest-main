// 敵のIntent（予兆）システム型定義

// Intent（予兆）タイプ
export type IntentType =
  | "attack_normal" // 通常攻撃
  | "attack_heavy" // 強攻撃（防御推奨）
  | "attack_multi" // 連続攻撃
  | "charging" // 力を溜めている（次ターン強攻撃）
  | "defending" // 防御中（攻撃が効きにくい）
  | "idle"; // 何もしない（ステージ1-2用）

// Intent情報
export interface EnemyIntent {
  type: IntentType;
  damage: number;
  description: string; // 「力を溜めている！」
  hint: string; // 「防御()でダメージを半減できるよ」
  icon: string; // 💥
  turnsUntilAction: number; // 0 = このターンに実行
}

// 敵の基本情報
export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  stage: number;
  attackPatterns: IntentPattern[];
}

// 攻撃パターン（条件付き）
export interface IntentPattern {
  condition: IntentCondition;
  intent: Omit<EnemyIntent, "turnsUntilAction">;
  weight: number; // 選択確率の重み
}

// 攻撃パターンの発動条件
export type IntentCondition =
  | { type: "always" }
  | { type: "hp_below"; threshold: number } // HP割合が閾値以下
  | { type: "hp_above"; threshold: number } // HP割合が閾値以上
  | { type: "turn_multiple"; multiple: number } // ターン数が倍数
  | { type: "player_defending" } // プレイヤーが防御中
  | { type: "random"; chance: number }; // 確率

// ステージごとの敵データ（新6ステージ構成）
export const ENEMY_DATA: Record<number, EnemyData> = {
  // ステージ1: スライム - 攻撃してこない
  1: {
    id: "slime",
    name: "スライム",
    maxHp: 10,
    stage: 1,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "こちらを見ている...",
          hint: "今は攻撃してこないよ。攻撃のチャンス！",
          icon: "👀",
        },
        weight: 1,
      },
    ],
  },

  // ステージ2: スライム軍団 - 攻撃してこない（ループ練習）
  2: {
    id: "slime_group",
    name: "スライム軍団",
    maxHp: 20,
    stage: 2,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "idle",
          damage: 0,
          description: "たくさんのスライムがいる...",
          hint: "繰り返し攻撃で一気に倒そう！",
          icon: "👀",
        },
        weight: 1,
      },
    ],
  },

  // ステージ3: ゴブリン - 毎ターン通常攻撃（防御練習）
  3: {
    id: "goblin",
    name: "ゴブリン",
    maxHp: 30,
    stage: 3,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "attack_normal",
          damage: 15,
          description: "攻撃の構え！",
          hint: "防御() でダメージを半減できるよ！",
          icon: "⚔️",
        },
        weight: 1,
      },
    ],
  },

  // ステージ4: オーガ - 通常攻撃＋強攻撃（変数でパワーアップ必須）
  4: {
    id: "ogre",
    name: "オーガ",
    maxHp: 50,
    stage: 4,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "attack_normal",
          damage: 12,
          description: "こん棒を振りかぶった！",
          hint: "",
          icon: "🪵",
        },
        weight: 3,
      },
      {
        condition: { type: "hp_below", threshold: 0.5 },
        intent: {
          type: "attack_heavy",
          damage: 25,
          description: "力を溜めている！",
          hint: "防御() でダメージを半分にしよう！",
          icon: "💥",
        },
        weight: 2,
      },
    ],
  },

  // ステージ5: オーク - HP依存攻撃（条件分岐練習）
  5: {
    id: "orc",
    name: "オーク",
    maxHp: 80,
    stage: 5,
    attackPatterns: [
      {
        condition: { type: "hp_above", threshold: 0.5 },
        intent: {
          type: "attack_normal",
          damage: 12,
          description: "攻撃の構え！",
          hint: "HPが高いうちは通常攻撃",
          icon: "⚔️",
        },
        weight: 2,
      },
      {
        condition: { type: "hp_below", threshold: 0.5 },
        intent: {
          type: "attack_heavy",
          damage: 30,
          description: "怒りの強攻撃！",
          hint: "HPが減ると怒り出す！防御() しよう！",
          icon: "💢",
        },
        weight: 3,
      },
      {
        condition: { type: "turn_multiple", multiple: 3 },
        intent: {
          type: "attack_multi",
          damage: 10,
          description: "連続攻撃の準備！",
          hint: "3ターンごとに連続攻撃！",
          icon: "⚡",
        },
        weight: 2,
      },
    ],
  },

  // ステージ6: ドラゴン - 複雑パターン（総合戦）
  6: {
    id: "dragon",
    name: "ドラゴン",
    maxHp: 150,
    stage: 6,
    attackPatterns: [
      {
        condition: { type: "always" },
        intent: {
          type: "attack_normal",
          damage: 15,
          description: "爪を振りかぶった！",
          hint: "",
          icon: "🐲",
        },
        weight: 3,
      },
      {
        condition: { type: "turn_multiple", multiple: 2 },
        intent: {
          type: "attack_heavy",
          damage: 35,
          description: "炎を吐く準備！",
          hint: "必ず防御() しよう！大ダメージ！",
          icon: "🔥",
        },
        weight: 2,
      },
      {
        condition: { type: "hp_below", threshold: 0.3 },
        intent: {
          type: "attack_multi",
          damage: 20,
          description: "激怒の連続攻撃！",
          hint: "HPが減ると本気を出す！",
          icon: "💥",
        },
        weight: 3,
      },
      {
        condition: { type: "hp_below", threshold: 0.15 },
        intent: {
          type: "charging",
          damage: 0,
          description: "力を溜めている...",
          hint: "次のターン、超強力な攻撃が来る！",
          icon: "⚡",
        },
        weight: 1,
      },
    ],
  },
};

// 敵のIntentを決定する関数
export function decideEnemyIntent(
  enemyData: EnemyData,
  enemyHp: number,
  turnCount: number,
  isPlayerDefending: boolean,
  previousIntent: EnemyIntent | null = null,
): EnemyIntent {
  const hpRatio = enemyHp / enemyData.maxHp;

  // もし前ターンの intent が charging なら、そのフォローアップを実行する
  if (previousIntent && previousIntent.type === "charging") {
    // フォローアップとして最もダメージの高い攻撃タイプを選ぶ（charging の対象）
    const attackCandidates = enemyData.attackPatterns
      .map((p) => p.intent)
      .filter((i) => i.type.startsWith("attack"));

    if (attackCandidates.length > 0) {
      const max = attackCandidates.reduce((best, cur) =>
        cur.damage > best.damage ? cur : best,
      attackCandidates[0],
      );
      return {
        ...max,
        turnsUntilAction: 0,
      };
    }

    // フォールバック
    return {
      type: "attack_normal",
      damage: 10,
      description: "溜めの後の攻撃",
      hint: "",
      icon: "⚔️",
      turnsUntilAction: 0,
    };
  }

  // 条件を満たすパターンを収集
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

  // 重み付きランダム選択
  if (validPatterns.length === 0) {
    // フォールバック：通常攻撃
    return {
      type: "attack_normal",
      damage: 10,
      description: "攻撃の構え",
      hint: "",
      icon: "⚔️",
      turnsUntilAction: 0,
    };
  }

  const totalWeight = validPatterns.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const pattern of validPatterns) {
    random -= pattern.weight;
    if (random <= 0) {
      // 選ばれたパターンが charging の場合は turnsUntilAction を設定して予兆状態にする
      if (pattern.intent.type === "charging") {
        return {
          ...pattern.intent,
          turnsUntilAction: 1,
        };
      }

      return {
        ...pattern.intent,
        turnsUntilAction: 0,
      };
    }
  }

  // フォールバック
  const fallback = validPatterns[0].intent;
  return {
    ...fallback,
    turnsUntilAction: fallback.type === "charging" ? 1 : 0,
  };
}

// ダメージ計算（防御中なら半減）
export function calculateDamage(
  intent: EnemyIntent,
  isDefending: boolean,
): number {
  if (isDefending) {
    return Math.floor(intent.damage * 0.5);
  }
  return intent.damage;
}
