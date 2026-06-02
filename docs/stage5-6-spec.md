# Stage 5・6 確定仕様

最終更新: 2026-05-30

本書は Stage 5（総合課題）と Stage 6（ボスラッシュ）の実装用仕様を整理する。
基本仕様（言語・バトル計算式・属性相性）は `prototype-5173/docs/requirements.md` と `prototype-5173/docs/language-spec.md` を正本とし、本書はそれらを前提に Stage 固有の確定事項のみを記述する。

---

## 1. Stage 5：総合課題

### 1-1. ステージ設定

| 項目 | 値 |
|------|----|
| 攻撃力 | 40 |
| 初期最大MP | 90 |
| プレイヤーHP | 100（全ステージ共通） |
| NPC | なし |
| クリア報酬 | なし |
| ウェーブ数 | 3 |

### 1-2. 学習テーマ

- 新しい構文を導入しない。Stage 1〜4 で学んだ要素を組み合わせて使う総合課題
- 単一の正解ではなく、複数の攻略方針が成立することを設計の前提とする
- Stage 6 ボスラッシュへの入り口として「学んできたことで勝てた」達成感を与える

### 1-3. Wave 構成

#### Wave 1：性質の違う 2 体

「どちらを先に倒すべきか」を判断させる。

| 敵 | HP | 防御 | 攻撃 | 属性 | 役割 |
|----|----|------|------|------|------|
| ゴブリンアタッカー | 60 | 3 | 25〜30 | 火型（水弱点） | 高火力・低耐久 |
| トロルガード | 180 | 12 | 8〜12 | 水型（雷弱点） | 高耐久・低火力 |

- 同時バトル（simultaneous: true）
- 学習: アタッカーから倒すか、ガードを先に削るかの判断
- 属性相性を読まないと長期戦になる

#### Wave 2：状態変化 + 回復役

「先に倒す優先度」を考えさせる。

| 敵 | HP | 防御 | 攻撃 | 特殊 |
|----|----|------|------|------|
| 状態変化スライム | 120 | 8 | 12〜18 | wave2 ギミック（毎ラウンド5属性ランダム / 有効1x・他0.25x） |
| ヒーラー | 80 | 8 | 8〜10 | **毎ラウンド味方を +20HP 回復**（敵側回復・新規エンジン機能） |

- 同時バトル
- 学習: 回復役を放置すると永遠に倒せない → 優先順位の判断
- 状態変化スライムは Stage 4 のギミックを再利用

#### Wave 3：総合ボス

「合体魔法を撃つタイミング」を学ばせる。

| 敵 | HP | 防御 | 攻撃 | 特殊 |
|----|----|------|------|------|
| 総合ボス | 400 | 8 | 22〜28 | 3 ラウンドごとに「チャージ」→次ラウンド 60 ダメージ |
| 雑魚（コボルト）× 最大 6 | 30 | 3 | 8〜12 | HP 70% / 30% で 3 体ずつ召喚（新規エンジン機能） |

- ボスのみが攻撃。雑魚は登場後すぐに攻撃する
- HP 閾値で 3 体が一括召喚（HP 280 と HP 120 のタイミングで）
- 3 ラウンドごとに「チャージ中」状態となり、翌ラウンドに 60 ダメージの強攻撃が来る
- 強攻撃は `防御()` で軽減可能（-10 → 50 ダメージ）
- 学習: 合体魔法は「撃てる時に撃つ」のではなく、雑魚召喚・強攻撃のタイミングを見て撃つ

---

## 2. Stage 6：ボスラッシュ総合振り返り

### 2-1. ステージ設定

| 項目 | 値 |
|------|----|
| 攻撃力 | 45 |
| 初期最大MP | 100 |
| プレイヤーHP | 100 |
| NPC | Wave 3 のみ登場（マリア再登場） |
| クリア報酬 | エンディング |
| ウェーブ数 | 5（例外） |

### 2-2. 学習テーマ

- 新しい構文や新システムは導入しない
- Wave 1-4 は Stage 1-4 の代表ボスを **強化版** で再登場
- Wave 5 は **行動履歴に適応する学習型ラスボス**

### 2-3. Wave 構成（概要）

| Wave | 振り返るステージ | 敵 |
|------|------------------|----|
| Wave 1 | Stage 1 | スライムキング 強化版 |
| Wave 2 | Stage 2 | コードウォール 強化版 |
| Wave 3 | Stage 3 | ゴーレムキング 強化版（NPC 連携必須） |
| Wave 4 | Stage 4 | 状態変化ボス 強化版 |
| Wave 5 | Stage 1〜5 | 学習型ラスボス |

※ Wave 1-4 の詳細ステータスと NPC の扱いは別途決定する（本書は Wave 5 のラスボス実装方針に集中する）。

### 2-4. 学習型ラスボスの実装方針（**確定**）

#### 集計範囲

- **Stage 1〜5 のすべてのクリア時データ** を localStorage に永続化
- バトル終了時（victory 判定後）に `actionHistory` に集計値を加算する
- 既存の `useGameStore.ts` 内の `recordMagicUse`・`recordAction` を使う

#### 適応のタイミング

- **Wave 5 開始時に一括計算**してボスステータス・ギミック係数を確定
- Wave 中は適応値を固定（バトル中の動的変動なし）

#### 行動履歴の記録項目

`useGameStore.ts` の `ActionHistory` を以下の構造で運用する。

```ts
interface ActionHistory {
  magicUsage: Record<MagicName, number>;  // 属性ごとの使用回数
  comboCount: number;                      // 合体魔法発動回数
  defendCount: number;                     // 防御()使用回数
  healCount: number;                       // 回復()使用回数
  totalRounds: number;                     // 総バトルラウンド数
  totalBattles: number;                    // 総バトル数
}
```

#### 適応ロジック（3 つ）

##### ① 単属性魔法への耐性

- 全プレイ中で **最も使用回数が多い単属性魔法 上位 2 種** に対して 0.5x ダメージ
- 例: フレイム 120 回・アクア 80 回 → フレイムとアクアが 0.5x

##### ② 合体魔法ダメージ減衰

- `comboCount / totalRounds` が **0.15 以上**（おおむね 7 ラウンドに 1 回以上発動）の場合
- 合体魔法のダメージを **30% 減衰**（× 0.7）

##### ③ チャージ攻撃の頻度上昇

- `(defendCount + healCount) / totalRounds` が **0.30 以上**（防御・回復依存型）の場合
- ラスボスのチャージ→強攻撃のサイクルを **3 ラウンド → 2 ラウンド**に短縮

#### 適応データ型と適用箇所

```ts
// engine/adaptation.ts（新規）
export interface AdaptationConfig {
  resistMagics: MagicName[];     // ダメージ0.5xになる魔法
  comboDamageMultiplier: number; // 合体魔法ダメージ係数（1.0 or 0.7）
  chargeInterval: number;        // チャージ攻撃の発動間隔（3 or 2）
}

export function calcAdaptation(history: ActionHistory): AdaptationConfig
```

- `multiBattle.ts` の単属性ダメージ計算で `resistMagics` を判定
- 合体魔法のダメージ計算で `comboDamageMultiplier` を掛ける
- チャージサイクル処理で `chargeInterval` を参照

#### プレイヤーへの開示

- バトル開始時にラスボスのセリフで適応内容を**間接的に**伝える
  - 例: 「お前のフレイムは見切った」「合体魔法の威力を抑えてやる」「お前は守りが多いな…」
- バトル中の HP バー横に「適応中」バッジを表示してもよい（任意）

---

## 3. 実装に必要な新機能（横断）

Stage 5・6 を実装するために必要な、エンジン側の新規追加項目。

### 3-1. 敵側の能力

| 機能 | 用途 | 実装場所 |
|------|------|---------|
| **敵が味方を回復** | Stage 5 Wave 2 ヒーラー | `multiBattle.ts` の enemyTurn 拡張 |
| **HP 閾値で雑魚召喚** | Stage 5 Wave 3 ボス | `MultiEnemy` 配列を実行中に push |
| **チャージ → 強攻撃の 2 ラウンドサイクル** | Stage 5 Wave 3 / Stage 6 Wave 5 | 敵に `state: "charging"` を持たせる |
| **攻撃力低下のデバフ** | Stage 5 Wave 2 を経由する戦略上必要 | 既存の `playerBuffs` を流用 |

### 3-2. 行動履歴の蓄積

| 機能 | 実装場所 |
|------|---------|
| バトル終了時に履歴記録 | `battle.ts` / `multiBattle.ts` の victory 判定後にコールバックを呼ぶ |
| 履歴データ構造の確定 | `store/useGameStore.ts` の `ActionHistory` 型を本書 §2-4 に合わせて拡張 |
| `totalRounds`・`totalBattles` の追加 | 同上 |

### 3-3. 学習型ラスボス専用

| 機能 | 実装場所 |
|------|---------|
| `engine/adaptation.ts` 新規ファイル | `calcAdaptation(history): AdaptationConfig` |
| `EnemyData` に `adaptation` フラグを追加 | `engine/types.ts` |
| ラスボス専用の damage 計算分岐 | `multiBattle.ts` |
| ラスボスのセリフ表示 | `BattleAnimator.tsx` または専用コンポーネント |

### 3-4. UI 拡張

| 機能 | 実装場所 |
|------|---------|
| 敵の `charging` 状態の視覚的予告 | `BattleAnimator.tsx`（敵カードに「⚡ チャージ中」表示） |
| ヒーラーの回復モーション/ログ | `BattleAnimator.tsx`（ログに緑色で「ヒーラーが+20HP回復」） |
| 雑魚召喚の出現演出 | `BattleAnimator.tsx`（既存の `multiEnemyHps` を動的に拡張） |

---

## 4. データモデル変更点

### 4-1. `EnemyData` 拡張案

```ts
export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  defense: number;
  element: EnemyElement;
  attackPatterns: EnemyAttackPattern[];
  charLimit?: number;                  // Stage 4
  // ▼ Stage 5・6 追加
  healAllies?: { amount: number };     // ヒーラー: 毎ラウンド全味方を +HP
  summonOnHpThreshold?: Array<{        // 雑魚召喚
    hpRatio: number;                   // 0.7 = HP 70% で発動
    enemyId: string;                   // 出現する雑魚の id
    count: number;                     // 出現数
  }>;
  chargeAttack?: {                     // チャージ → 強攻撃
    interval: number;                  // 何ラウンドごとにチャージ
    damage: number;                    // チャージ後の強攻撃ダメージ
  };
  adaptation?: boolean;                // true → 学習型ラスボス
}
```

### 4-2. `WaveData` 拡張なし

Wave 構造は Stage 4 までに確立した形（simultaneous / stateGimmickOverride）で十分。

### 4-3. `ActionHistory` 拡張

```ts
interface ActionHistory {
  magicUsage: Record<string, number>;
  comboCount: number;
  defendCount: number;
  healCount: number;
  totalRounds: number;    // 新規
  totalBattles: number;   // 新規
}
```

---

## 5. 実装順序の推奨

1. **`ActionHistory` 拡張**（`useGameStore.ts`）と、バトル終了時の履歴記録フック（`battle.ts` / `multiBattle.ts`）
2. **Stage 5 Wave 1**（既存エンジンのみで実装可能）
3. **敵側の回復**（Stage 5 Wave 2）
4. **HP 閾値での雑魚召喚 + チャージ攻撃**（Stage 5 Wave 3）
5. **Stage 6 Wave 1-4**（既存ボスの強化版コピー）
6. **`adaptation.ts` の実装**と **Stage 6 Wave 5**

各ステップで vitest テストを追加し、回帰を防ぐ。

---

## 6. 未確定事項（Stage 6 の Wave 1-4）

- Wave 1-4 の「強化版」の方向性（数値強化のみ vs 新ギミック追加）
- Wave 3 の NPC（マリア）の扱い（バグあり vs バグなし）
- Wave 4 のギミック（Stage 4 と同じ vs アレンジ）
- ラスボスのセリフ文面
- 適応バッジの UI 詳細

これらは Stage 5 と Stage 6 Wave 5（ラスボス）の実装完了後、コンテンツ設計フェーズで確定する。
