import type { Element, MagicName } from "../parser/ast";

// ─── 敵データ ──────────────────────────────────────────

export type EnemyElement = Element | null; // null = 無属性

export interface EnemyAttackPattern {
  minDamage: number;
  maxDamage: number;
  condition?: "always" | "hp_below_half" | "every_n_rounds";
  conditionValue?: number;
}

export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  defense: number;
  element: EnemyElement;
  attackPatterns: EnemyAttackPattern[];
  charLimit?: number; // このボスが生きている間、有効文字数がこの値を超えるとダメージが減る
  // Stage 5 Wave 2 ヒーラー: 毎ラウンド他の生きている味方を回復する
  healAllies?: {
    amount: number;     // 1体あたりの回復量
    selfHeal?: boolean; // 自分自身も回復対象にするか（デフォルト false）
  };
  // 状態変化ギミックを無視して固定の状態を持つ（指定しない場合は通常通り stateGimmick に従う）
  // 例: ヒーラーの弱点属性を固定にしたい場合
  fixedState?: Element | null;
  // Stage 5 Wave 3 ボス: HP 閾値で雑魚を召喚する
  summonOnHpThreshold?: Array<{
    hpRatio: number;        // 0.7 = HP 70% 以下に達したら発動
    summonEnemyId: string;  // 召喚する敵の id（後述 summonableEnemies で解決）
    count: number;          // 召喚体数
  }>;
  // Stage 5 Wave 3 ボス: N ラウンドごとにチャージ → 次ラウンドに強攻撃
  chargeAttack?: {
    interval: number;       // 何ラウンドごとにチャージ開始（3 = 3,6,9... 開始）
    damage: number;         // チャージ後の強攻撃ダメージ
    chargeMessage?: string; // チャージ中のセリフ（任意）
  };
  // Stage 6 Wave 5 学習型ラスボス: 行動履歴に応じた適応を受ける
  // true の場合、バトル開始前に AdaptationConfig が適用される
  adaptive?: boolean;
}

// Wave 内で「召喚専用」として登録される敵テンプレート
// Wave 3 のような simultaneous バトルで、ボスが召喚する雑魚を予め定義する
export interface SummonableEnemy {
  templateId: string;       // EnemyData.summonOnHpThreshold.summonEnemyId と一致させる
  enemy: EnemyData;         // 実際の敵データ
}

// Stage4 専用: 状態ギミック
export interface StateGimmick {
  type: "wave1" | "wave2"; // wave1=3属性ランダム, wave2=5属性ランダム
}

// ─── ステータス異常・バフ ──────────────────────────────

export type StatusEffectType = "燃焼" | "感電";
export type BuffType = "攻撃力アップ" | "防御アップ";
export type DebuffType = "防御力低下" | "攻撃力低下";

export interface ActiveEffect {
  type: StatusEffectType | DebuffType;
  remainingRounds: number;
}

export interface ActiveBuff {
  type: BuffType;
  value: number;
  remainingRounds: number;
}

// ─── バトル状態 ────────────────────────────────────────

export interface BattleState {
  // プレイヤー
  playerHp: number;
  maxPlayerHp: number;
  playerMp: number;
  maxPlayerMp: number;
  playerAttack: number;

  // 敵
  enemyHp: number;
  maxEnemyHp: number;
  enemy: EnemyData;

  // Stage4 状態ギミック
  stateGimmick: StateGimmick | null;
  currentEnemyState: Element | null; // 現在の敵状態

  // ラウンド
  round: number;

  // 効果
  enemyEffects: ActiveEffect[];  // 敵に付与されているエフェクト
  playerBuffs: ActiveBuff[];     // プレイヤーのバフ
  playerDefending: boolean;      // この round 防御() を使ったか

  // バトル進行
  phase: "battle" | "victory" | "defeat";

  // ログ
  log: LogEntry[];
}

// ─── プレイヤー行動 ─────────────────────────────────────

export type PlayerAction =
  | { type: "MagicUse"; magic: MagicName; targetIndex?: number }  // targetIndex: 1-based、未指定なら先頭
  | { type: "Defend" }
  | { type: "Heal" }
  | { type: "Wait" };

// ─── ログ ──────────────────────────────────────────────

export type LogCategory =
  | "roundStart"
  | "mpRecovery"    // ラウンド開始時のMP回復（Round 2以降）
  | "playerAction"
  | "comboMagic"
  | "enemyAction"
  | "statusEffect"
  | "result";

export interface LogEntry {
  round: number;
  category: LogCategory;
  message: string;
  delta?: {
    playerHp?: number;
    enemyHp?: number;
    playerMp?: number;
    enemyIndex?: number; // 多体バトル用: どの敵のHPが変化したか（0-based）
  };
}

// ─── ステージ設定 ─────────────────────────────────────

export interface StageConfig {
  stageNumber: number;          // 1〜6
  initialMaxMp: number;         // 戦闘開始時の最大MP (50, 60, ...)
  playerAttack: number;         // 攻撃力 (20, 25, ...)
  stateGimmick: StateGimmick | null;
}

// ─── バトル結果 ────────────────────────────────────────

export interface BattleResult {
  phase: "victory" | "defeat" | "timeout";
  rounds: number;
  log: LogEntry[];
  finalPlayerHp: number;
  finalPlayerMp: number;
  finalMaxPlayerMp: number;
  finalEnemyHp: number;
}
