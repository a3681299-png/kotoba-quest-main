# Stage 5 設計書：総合課題

最終更新: 2026-06-13

> **実装状況**: `src/data/stageData.ts` に定義あり、`waves: []` で未実装。
> 本書を Stage 5 の Wave 構成・固有ギミック・実装設計の正本とする。
> 基本仕様（言語・バトル計算式・属性相性）は `requirements-v3.md` と言語仕様を前提とする。

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 5 |
| タイトル | 総合課題 |
| テーマ | これまで学んだすべてを使いこなす |
| Wave 数 | 3 |
| 攻撃力 | 40 |
| 初期最大 MP | 90 |
| プレイヤー HP | 100 |
| NPC | なし |
| 状態ギミック | Wave 2 のみ wave2 |
| クリア報酬 | なし |

**学習目標**: Stage 1〜4 の要素（順次実行・繰り返し・変数・条件分岐・NPC 連携・合体魔法・状態変化・文字数制限）を組み合わせた実践問題。新構文は導入しない。

**設計方針**:
- 単一の正解ではなく、複数の攻略方針が成立することを前提にする
- Stage 6 ボスラッシュへの入り口として「学んできたことで勝てた」達成感を与える
- 新規エンジン機能は Stage 5 内で段階的に導入し、Stage 6 のラスボス実装にも再利用する

---

## Wave 構成

### Wave 1 — 性質の違う 2 体

**学習**: 「どちらを先に倒すか」の優先度判断と属性相性の読み

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 | 役割 |
|----|----|------|--------------|------|------|
| ゴブリンアタッカー | 60 | 3 | 25〜30 | 火型（水が弱点） | 高火力・低耐久 |
| トロルガード | 180 | 12 | 8〜12 | 水型（雷が弱点） | 高耐久・低火力 |

- `simultaneous: true`、状態ギミックなし
- アタッカーを先に倒せば被ダメが激減する。逆にガードを先に攻撃すると高防御+高HPで長期戦化
- 属性相性を読まないと長期戦になる

**使用エンジン**:
- `runSimultaneousBattle()` (`multiBattle.ts`)
- `getAffinityMultiplier()` (`affinity.ts`) — 水→火が 2x, 雷→水が 2x
- 弱点属性を使うかどうかでダメージが倍変わることを体験させる

**必要な実装**: 既存エンジンで実装可能。敵データを `stageData.ts` に追加するだけ。

---

### Wave 2 — 状態変化 + 回復役

**学習**: 優先度判断（回復役を先に倒さないと永遠に終わらない）

| 敵 | HP | 防御 | 攻撃ダメージ | 特殊 |
|----|----|------|--------------|------|
| 状態変化スライム | 120 | 8 | 12〜18 | `stateGimmick: wave2`（毎ラウンド5属性ランダム） |
| ヒーラー | 80 | 8 | 8〜10 | **毎ラウンド全味方を +20HP 回復** |

- `simultaneous: true`、`stateGimmickOverride: { type: "wave2" }`
- 状態変化スライムは Stage 4 Wave 2 のギミックを再利用する
- ヒーラーを放置すると回復量が蓄積し、戦闘が終わりにくくなる

**新規エンジン機能が必要: 敵側の回復（`healAllies`）**

`EnemyData` に以下を追加:
```ts
healAllies?: { amount: number }; // 毎ラウンド全生存味方をこの値だけ回復
```

`multiBattle.ts:enemyTurn` に回復処理を追加:
```ts
// ヒーラー処理（攻撃前 or 後）
for (const healer of state.enemies) {
  if (healer.hp <= 0 || !healer.data.healAllies) continue;
  for (const ally of state.enemies) {
    if (ally.hp <= 0) continue;
    ally.hp = Math.min(ally.data.maxHp, ally.hp + healer.data.healAllies.amount);
    addLog(state, "enemyAction", `${healer.data.name} が ${ally.data.name} を +${healer.data.healAllies.amount}HP 回復！`);
  }
}
```

**使用エンジン**:
- `getGimmickResult()` — 状態変化スライムの属性判定
- `rollState()` — 毎ラウンドの状態決定
- 新規: `healAllies` 処理（`multiBattle.ts` 追記）

---

### Wave 3 — 総合ボス

**学習**: チャージ攻撃の予告読みと、雑魚召喚タイミングを考慮した合体魔法の撃ち時判断

| 敵 | HP | 防御 | 攻撃ダメージ | 特殊 |
|----|----|------|--------------|------|
| 総合ボス | 400 | 8 | 22〜28（通常） / **60**（チャージ後） | チャージ攻撃・雑魚召喚 |
| コボルト（最大6体） | 30 | 3 | 8〜12 | HP 70% / 30% 閾値で 3 体ずつ召喚 |

- ボスのみが攻撃。雑魚は登場後すぐに攻撃する
- HP 閾値で 3 体が一括召喚される（HP 280 と HP 120 のタイミング）
- 3 ラウンドごとに「チャージ中」状態となり、翌ラウンドに 60 ダメージの強攻撃が来る
- 強攻撃は `防御()` で軽減可能（-10 → 50 ダメージ）

**新規エンジン機能 1: チャージ攻撃（`chargeAttack`）**

`EnemyData` に以下を追加:
```ts
chargeAttack?: {
  interval: number; // 何ラウンドごとにチャージ（通常 3）
  damage: number;   // チャージ後の強攻撃ダメージ（60）
};
```

エンジン処理のイメージ（`multiBattle.ts`）:
```ts
// 敵ターン処理内
if (enemy.data.chargeAttack) {
  if (enemy.chargingNextRound) {
    // 強攻撃
    const dmg = state.playerDefending
      ? Math.max(1, enemy.data.chargeAttack.damage - 10)
      : enemy.data.chargeAttack.damage;
    state.playerHp -= dmg;
    addLog(state, "enemyAction", `${enemy.data.name} の強攻撃！ ${dmg}ダメージ！`);
    enemy.chargingNextRound = false;
  } else if (state.round % enemy.data.chargeAttack.interval === 0) {
    // チャージ状態に入る（次のラウンドに強攻撃）
    enemy.chargingNextRound = true;
    addLog(state, "enemyAction", `${enemy.data.name} がチャージ中！`);
  }
}
```

**新規エンジン機能 2: HP 閾値での雑魚召喚（`summonOnHpThreshold`）**

`EnemyData` に以下を追加:
```ts
summonOnHpThreshold?: Array<{
  hpRatio: number;  // 閾値（0.7 = HP 70%）
  enemyId: string;  // 召喚する雑魚の id
  count: number;    // 召喚数
}>;
```

エンジン処理のイメージ（ダメージ後に判定）:
```ts
// プレイヤーターン後に閾値チェック
for (const boss of state.enemies) {
  if (!boss.data.summonOnHpThreshold) continue;
  for (const threshold of boss.data.summonOnHpThreshold) {
    if (!threshold._triggered && boss.hp / boss.data.maxHp <= threshold.hpRatio) {
      threshold._triggered = true;
      // 雑魚を state.enemies に push
      for (let i = 0; i < threshold.count; i++) {
        state.enemies.push(createMinion(threshold.enemyId));
      }
      addLog(state, "enemyAction", `${boss.data.name} が雑魚を ${threshold.count} 体召喚！`);
    }
  }
}
```

**ゲームプレイ上の教訓**:
- チャージ中に雑魚が出てきたら「防御で耐えるか合体魔法で一掃するか」の択が生まれる
- 合体魔法（MP 120 必要）を温存しすぎるとチャージ強攻撃で瀕死になる
- 合体魔法は「撃てる時に撃つ」のではなく、雑魚召喚・強攻撃のタイミングを見て撃つ

---

## 新規 EnemyData フィールド（Stage 5 で追加）

```ts
// src/engine/types.ts に追加
export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  defense: number;
  element: EnemyElement;
  attackPatterns: EnemyAttackPattern[];
  charLimit?: number;                  // Stage 2・4
  // ▼ Stage 5 追加
  healAllies?: { amount: number };     // ヒーラー: 毎ラウンド全味方を回復
  summonOnHpThreshold?: Array<{        // 雑魚召喚閾値
    hpRatio: number;
    enemyId: string;
    count: number;
  }>;
  chargeAttack?: {                     // チャージ → 強攻撃
    interval: number;
    damage: number;
  };
}
```

---

## 実装に必要な敵側能力

| 機能 | 用途 | 実装場所 |
|------|------|---------|
| 敵が味方を回復 | Wave 2 ヒーラー | `multiBattle.ts` の enemyTurn 拡張 |
| HP 閾値で雑魚召喚 | Wave 3 総合ボス | `MultiEnemy` 配列を実行中に push |
| チャージ → 強攻撃の 2 ラウンドサイクル | Wave 3 総合ボス / Stage 6 Wave 5 | 敵に `charging` 状態を持たせる |
| 攻撃力低下のデバフ | Wave 2 を経由する戦略上必要 | 既存の `playerBuffs` を流用 |

---

## 行動履歴の蓄積（Stage 5 が起点）

Stage 6 の学習型ラスボスのために、Stage 1〜5 のクリア時データを `ActionHistory` に蓄積する。Stage 5 実装時点で、バトル終了時の記録フックも整備する。

```ts
// src/store/useGameStore.ts
interface ActionHistory {
  magicUsage: Record<MagicName, number>; // 属性ごとの使用回数
  comboCount: number;                    // 合体魔法発動回数
  defendCount: number;                   // 防御()使用回数
  healCount: number;                     // 回復()使用回数
  totalRounds: number;                   // 総ラウンド数（新規）
  totalBattles: number;                  // 総バトル数（新規）
}
```

- バトル終了時（`victory` 判定後）に `battle.ts` / `multiBattle.ts` からコールバックで記録する
- `totalRounds` と `totalBattles` は Stage 6 の適応条件計算で使用する

---

## UI 拡張

| 機能 | 実装場所 |
|------|---------|
| 敵の `charging` 状態の視覚的予告 | `BattleAnimator.tsx`（敵カードに「チャージ中」表示） |
| ヒーラーの回復モーション/ログ | `BattleAnimator.tsx`（ログに「ヒーラーが+20HP回復」） |
| 雑魚召喚の出現演出 | `BattleAnimator.tsx`（既存の `multiEnemyHps` を動的に拡張） |

---

## エンジン・API の使用（Stage 5 全体）

| 関数 / 機能 | ファイル | 状態 |
|------------|---------|------|
| `runSimultaneousBattle()` | `multiBattle.ts` | 既存 |
| `getAffinityMultiplier()` | `affinity.ts` | 既存 |
| `getGimmickResult()` | `affinity.ts` | 既存（Wave 2） |
| `rollState()` | `multiBattle.ts` | 既存（Wave 2） |
| `healAllies` 処理 | `multiBattle.ts` | **新規実装** |
| `chargeAttack` 処理 | `multiBattle.ts` | **新規実装** |
| `summonOnHpThreshold` 処理 | `multiBattle.ts` | **新規実装** |
| `ActionHistory` 集計 | `battle.ts` / `multiBattle.ts` | **新規実装** |

---

## 実装推奨順序

1. `ActionHistory` に `totalRounds` / `totalBattles` を追加し、バトル終了時の記録フックを用意
2. Wave 1 を実装（既存エンジンのみで完結）
3. `healAllies` 処理を `multiBattle.ts` に追加 → Wave 2 を実装
4. `chargeAttack` + `summonOnHpThreshold` を追加 → Wave 3 を実装

各ステップで `vitest` テストを追加して回帰を防ぐ。
