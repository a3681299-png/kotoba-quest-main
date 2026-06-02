# Stage 6 設計書：最終決戦

最終更新: 2026-06-02

> **実装状況**: `src/data/stageData.ts` に定義あり、`waves: []` で未実装。
> 詳細仕様は `docs/stage5-6-spec.md §2` が正本。本書はエンジン設計の観点から補足する。
> Wave 1〜4 の詳細ステータスは未確定（`stage5-6-spec.md §6` 参照）。

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 6 |
| タイトル | 最終決戦 |
| テーマ | 学習型ラスボスによる総合振り返り |
| Wave 数 | 5 |
| 攻撃力 | 45 |
| 初期最大 MP | 100 |
| プレイヤー HP | 100 |
| NPC | Wave 3 のみ（マリア再登場） |
| 状態ギミック | Wave 4 に wave2（確定ではない） |
| クリア報酬 | エンディング |

**コンセプト**: Stage 1〜5 の代表ボスを強化版で再戦させることで振り返りを促す「ボスラッシュ」。そして Wave 5 の学習型ラスボスが、プレイヤーが今まで取ってきた行動履歴を読んで適応してくる。

---

## Wave 構成

### Wave 1 — スライムキング（強化版）

振り返るステージ: **Stage 1**

- HP・攻撃力の数値強化版
- 既存エンジンで実装可能（詳細ステータスは未確定）

### Wave 2 — コードウォール（強化版）

振り返るステージ: **Stage 2**

- 文字数制限（`charLimit`）を持つ強化版
- 詳細ステータスは未確定

### Wave 3 — ゴーレムキング（強化版）＋ NPC 連携

振り返るステージ: **Stage 3**

- NPC マリアが再登場
- バグありコードで登場するか、バグなしで連携のみを担うかは未確定
- 合体魔法（3属性以上）が解法となる

### Wave 4 — 状態変化ボス（強化版）

振り返るステージ: **Stage 4**

- 状態変化ギミック（wave2）を持つ強化版
- 詳細ステータスは未確定

---

### Wave 5 — 学習型ラスボス

Stage 6 の核心。プレイヤーの **Stage 1〜5 の行動履歴** を読んで適応してくる唯一のボス。

---

## ギミック: 学習型ラスボスの適応ロジック

### 行動履歴データ（`ActionHistory`）

`src/store/useGameStore.ts` の Zustand ストアに永続化（localStorage）:

```ts
interface ActionHistory {
  magicUsage: Record<MagicName, number>; // 属性ごとの使用回数（累計）
  comboCount: number;                    // 合体魔法発動回数（累計）
  defendCount: number;                   // 防御()使用回数（累計）
  healCount: number;                     // 回復()使用回数（累計）
  totalRounds: number;                   // 総バトルラウンド数（累計）
  totalBattles: number;                  // 総バトル数（累計）
}
```

集計は **Stage 1〜5 のすべてのクリア時** に蓄積される。

### 適応計算（`engine/adaptation.ts` — 新規ファイル）

```ts
export interface AdaptationConfig {
  resistMagics: MagicName[];     // ダメージ 0.5x になる魔法（最大 2 種）
  comboDamageMultiplier: number; // 合体魔法ダメージ係数（1.0 または 0.7）
  chargeInterval: number;        // チャージ攻撃の発動間隔（3 または 2 ラウンド）
}

export function calcAdaptation(history: ActionHistory): AdaptationConfig;
```

### 適応ロジック（3 つ）

#### ① 単属性魔法への耐性

- 全プレイ中で **最も使用回数が多い単属性魔法 上位 2 種** に対して 0.5x ダメージ
- 例: `magicUsage = { フレイム: 120, アクア: 80, ... }` → フレイムとアクアが 0.5x

実装箇所: `multiBattle.ts:applySingleMagicToEnemy` で、ラスボス（`enemy.data.adaptation === true`）かつ使用魔法が `resistMagics` に含まれる場合に 0.5 を掛ける。

#### ② 合体魔法ダメージ減衰

条件: `comboCount / totalRounds >= 0.15`（おおむね 7 ラウンドに 1 回以上合体魔法を使っている）

- 合体魔法のダメージを **× 0.7** に減衰

実装箇所: `multiBattle.ts:applyComboAoE` で `comboDamageMultiplier` を掛ける。

#### ③ チャージ攻撃の頻度上昇

条件: `(defendCount + healCount) / totalRounds >= 0.30`（防御・回復依存型の戦術）

- チャージ → 強攻撃のサイクルを **3 ラウンド → 2 ラウンド** に短縮

実装箇所: `multiBattle.ts` のチャージ判定で `chargeInterval` を参照。

### 適応のタイミング

- **Wave 5 開始時に一括計算**して `AdaptationConfig` を確定
- バトル中は適応値を固定（動的変動なし）

---

## ラスボスのデータ定義（予定）

```ts
// src/data/stageData.ts（Stage 6 Wave 5）
{
  id: "final_boss",
  name: "ラストエネミー",          // 名称は未確定
  maxHp: 500,                     // 未確定
  defense: 10,                    // 未確定
  element: null,
  attackPatterns: [
    { minDamage: 25, maxDamage: 35 },
    { minDamage: 40, maxDamage: 50, condition: "hp_below_half" },
  ],
  chargeAttack: {
    interval: 3,          // calcAdaptation で 2 に変わる場合あり
    damage: 70,           // チャージ後の強攻撃ダメージ（未確定）
  },
  adaptation: true,       // 学習型フラグ
}
```

### `EnemyData` 拡張（Stage 5・6 で追加）

```ts
// src/engine/types.ts
interface EnemyData {
  // ... 既存フィールド ...
  chargeAttack?: { interval: number; damage: number }; // Stage 5〜6
  adaptation?: boolean; // true → 学習型ラスボス（Stage 6 のみ）
}
```

---

## プレイヤーへの適応内容の開示

Wave 5 開始時にラスボスのセリフで **間接的に** 適応内容を伝える:

| 適応 | ラスボスのセリフ例 |
|------|--------------------|
| フレイム耐性 | 「お前のフレイムは見切った」 |
| 合体魔法減衰 | 「合体魔法の威力を抑えてやる」 |
| チャージ頻度アップ | 「お前は守りが多いな…」 |

セリフはビットフラグで組み合わせ可能（0〜3 つの適応が発動する）。

---

## エンジン・API の使用（Stage 6 全体）

| 関数 / 機能 | ファイル | 状態 |
|------------|---------|------|
| `calcAdaptation()` | `engine/adaptation.ts` | **新規ファイル** |
| `AdaptationConfig` 型 | `engine/adaptation.ts` | **新規ファイル** |
| ラスボス単属性耐性判定 | `multiBattle.ts` | **新規実装** |
| 合体魔法ダメージ係数 | `multiBattle.ts` | **新規実装** |
| `chargeAttack` 処理 | `multiBattle.ts` | Stage 5 で追加済み |
| `useGameStore.recordMagicUse()` | `store/useGameStore.ts` | 既存 |
| `useGameStore.recordAction()` | `store/useGameStore.ts` | 既存 |
| NPC（Wave 3）処理 | `battle.ts` | 既存 |
| `runSimultaneousBattle()` | `multiBattle.ts` | 既存 |

---

## 実装推奨順序

1. Stage 5 の実装完了（`chargeAttack` / `healAllies` / `summonOnHpThreshold` の追加）
2. `engine/adaptation.ts` の実装と単体テスト
3. Stage 6 Wave 1〜4（ステータス確定後、既存エンジンのみで実装可能）
4. Stage 6 Wave 5（`adaptation.ts` と `multiBattle.ts` の統合）
5. UI 拡張（「チャージ中」バッジ、ラスボスセリフ表示）

---

## 未確定事項

- Wave 1〜4 の強化ボスのステータス数値
- Wave 3 NPC マリアのバグあり／なしの方針
- Wave 4 のギミック詳細（wave2 をそのまま使うか、追加要素を加えるか）
- ラスボスのセリフ文面
- 「適応中」バッジの UI 詳細
- ラスボスの名称・HP・防御力の最終値
