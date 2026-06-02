# Stage 4 設計書：条件分岐と合体魔法

最終更新: 2026-06-02

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 4 |
| タイトル | 条件分岐と合体魔法 |
| テーマ | 条件分岐と合体魔法の本格導入 |
| Wave 数 | 3 |
| 攻撃力 | 35 |
| 初期最大 MP | 80 |
| プレイヤー HP | 100 |
| NPC | なし |
| 状態ギミック | wave1（デフォルト） / wave2（Wave 2〜3 でオーバーライド） |
| クリア報酬 | なし |

**学習目標**: 敵の「現在の状態」に応じて魔法を動的に切り替える条件分岐と、5 属性合体魔法の最終形を習得する。状態が間違っていると吸収・大幅減衰が発生するため、正確な条件判定が必須となる。

---

## ギミック: 状態変化（State Gimmick）

Stage 4 の核心ギミック。敵が **毎ラウンド開始時にランダムに属性状態を変化**させ、その状態に合った魔法のみが有効ダメージを与えられる。

### StateGimmick 型

```ts
// src/engine/types.ts
export interface StateGimmick {
  type: "wave1" | "wave2";
}
```

### 状態のランダム決定

`battle.ts:rollEnemyState` / `multiBattle.ts:rollState`:

```ts
const wave1Elements: Element[] = ["火", "水", "雷"];
const allElements: Element[] = ["火", "水", "雷", "氷", "風"];
const pool = gimmick.type === "wave1" ? wave1Elements : allElements;
return pool[Math.floor(Math.random() * pool.length)];
```

- **wave1**: 火・水・雷 の 3 属性からランダム
- **wave2**: 火・水・雷・氷・風 の全 5 属性からランダム

### 属性判定ロジック

`getGimmickResult(magic, currentState, gimmickType)` — `src/engine/affinity.ts`:

```ts
const magicElement = MAGIC_TO_ELEMENT[magic]; // 魔法 → 属性

if (magicElement === currentState) return { type: "effective", multiplier: 1 };

if (gimmickType === "wave1") {
  const initialThree: Element[] = ["火", "水", "雷"];
  if (initialThree.includes(magicElement)) {
    return { type: "absorb", multiplier: 1 }; // 敵HP回復！
  }
  return { type: "reduced", multiplier: 0.25 }; // 氷・風は 0.25x
}

// wave2: 有効以外すべて 0.25x
return { type: "reduced", multiplier: 0.25 };
```

### 判定結果まとめ

| ギミック種別 | 使用魔法 | 敵状態との関係 | 効果 |
|------------|----------|---------------|------|
| wave1 / wave2 | 一致 | 有効属性 | 通常ダメージ（1x） |
| wave1 | 不一致（火・水・雷） | 間違い3属性 | **敵HPを回復**（absorb） |
| wave1 | 不一致（氷・風） | 残り2属性 | 0.25x ダメージ |
| wave2 | 不一致（任意） | 有効以外 | 0.25x ダメージ |

### 吸収（absorb）時の処理

`battle.ts:applySingleMagic`:

```ts
if (result.type === "absorb") {
  const healAmt = Math.max(1, Math.floor(attackPower) - enemy.defense);
  state.enemyHp = Math.min(state.maxEnemyHp, state.enemyHp + healAmt);
  addLog(state, "playerAction", `${magic} → 吸収！敵HP +${healAmt}`);
  return;
}
```

間違った魔法を使うと敵の HP が回復する。wave1 限定の最もペナルティが強い仕組み。

### Wave 単位での上書き（`stateGimmickOverride`）

Stage 4 のデフォルト設定は `wave1`。Wave 2・3 は `stateGimmickOverride: { type: "wave2" }` で wave2 に切り替える。

`waveRunner.ts:runWave` で適用:

```ts
const waveConfig: StageConfig =
  wave.stateGimmickOverride !== undefined
    ? { ...config, stateGimmick: wave.stateGimmickOverride }
    : config;
```

---

## Wave 構成

### Wave 1 — 状態を見抜け

**学習**: 3 属性ランダム変化（wave1）に対して `もし〜ならば` で正確に対応する

| 敵 | HP | 防御 | 攻撃ダメージ | `stateGimmick` |
|----|----|------|--------------|----------------|
| へんしんスライム | 80 | 8 | 12〜18 | wave1（火・水・雷） |

**重要**: 氷・風は使うと吸収されない（0.25x 減衰）が、火・水・雷を間違えると吸収されてHP回復される。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  もし 敵が火状態 ならば:
    魔法(フレイム)
  そうでなければ もし 敵が水状態 ならば:
    魔法(アクア)
  そうでなければ:
    魔法(スパーク)
```

---

### Wave 2 — 2体同時の状態変化

**学習**: 2体それぞれが独立して状態変化する（wave2、全5属性）

| 敵 | HP | 防御 | 攻撃ダメージ | `stateGimmickOverride` |
|----|----|------|--------------|------------------------|
| へんしんスライムA | 70 | 8 | 10〜15 | wave2（全5属性） |
| へんしんスライムB | 70 | 8 | 10〜15 | wave2（全5属性） |

各敵の状態は独立してランダムに決まる。`multiBattle.ts:roundStart` で全敵に対して `rollState()` を呼び出す。

**ターゲット指定構文**: `敵[1番目]へ 魔法(…)` で特定の敵を狙える。

```ts
// multiBattle.ts:playerTurn
if (action.targetIndex !== undefined) {
  const idx = action.targetIndex - 1;
  target = state.enemies[idx];
}
```

**コード例**:
```
繰り返す(敵が生きている あいだ):
  もし 敵が火状態 ならば:
    魔法(フレイム)
  そうでなければ もし 敵が水状態 ならば:
    魔法(アクア)
  そうでなければ もし 敵が雷状態 ならば:
    魔法(スパーク)
  そうでなければ もし 敵が氷状態 ならば:
    魔法(フロスト)
  そうでなければ:
    魔法(ゲイル)
```

---

### Wave 3 — 五属性合体魔法で一掃！

**学習**: 文字数制限（charLimit）＋ MP 120 貯め ＋ 5属性合体魔法の複合課題

| 敵 | HP | 防御 | 攻撃ダメージ | 特殊 |
|----|----|------|--------------|------|
| ゴーレムA | 120 | 5 | 0 | 攻撃なし |
| ゴーレムB | 120 | 5 | 0 | 攻撃なし |
| ゴーレムC | 120 | 5 | 0 | 攻撃なし |
| ゴーレムD | 120 | 5 | 0 | 攻撃なし |
| コードウォール | 200 | 15 | 20〜30（通常） / 30〜45（HP半分以下） | `charLimit: 80` |

**ギミック 1 — 文字数制限（charLimit: 80）**:

コードウォールのみ `charLimit: 80` を持つ。有効文字数が 80 を超えると `applyCharLimit()` でダメージが減少する。合体魔法にも適用される。

**ギミック 2 — 5属性合体魔法（全体攻撃）**:

`applyComboAoE()` により、合体魔法は全ての生存敵に同時ダメージを与える:

```ts
// multiBattle.ts:applyComboAoE
const damage = Math.max(1, Math.floor(atk * count * maxMult) - enemy.data.defense);
```

- count = 5（5属性）で基本ダメージが 5 倍スケール
- 全体攻撃のため 4体のゴーレム + ボスを一掃できる

**コード例**:
```
繰り返す(敵が生きている あいだ):
  もし 自分のMP が 120 以上 ならば:
    魔法(フレイム)
    魔法(アクア)
    魔法(スパーク)
    魔法(フロスト)
    魔法(ゲイル)
  そうでなければ:
    防御()
```

---

## エンジン・API の使用

| 関数 / 型 | ファイル | 役割 |
|-----------|---------|------|
| `getGimmickResult()` | `src/engine/affinity.ts` | 状態ギミックの効果判定（effective/absorb/reduced） |
| `rollEnemyState()` | `src/engine/battle.ts` | 単体バトルの敵状態ランダム決定 |
| `rollState()` | `src/engine/multiBattle.ts` | 多体バトルの敵状態ランダム決定 |
| `applySingleMagic()` | `src/engine/battle.ts` | 単体への吸収/減衰/通常ダメージ処理 |
| `applySingleMagicToEnemy()` | `src/engine/multiBattle.ts` | 多体バトルの単属性ダメージ（charLimit 補正含む） |
| `applyComboAoE()` | `src/engine/multiBattle.ts` | 合体魔法の全体攻撃（charLimit 補正含む） |
| `countEffectiveChars()` | `src/engine/charCounter.ts` | 有効文字数計算（Wave 3 で使用） |
| `applyCharLimit()` | `src/engine/charCounter.ts` | 文字数超過ダメージ補正 |
| `StateGimmick` 型 | `src/engine/types.ts` | wave1 / wave2 の型定義 |
| `stateGimmickOverride` | `src/data/stageData.ts` | Wave 単位での状態ギミック上書き |

---

## 属性マッピング

```ts
// src/engine/affinity.ts
export const MAGIC_TO_ELEMENT: Record<MagicName, Element> = {
  フレイム: "火",
  アクア:   "水",
  スパーク: "雷",
  フロスト: "氷",
  ゲイル:   "風",
};
```

`敵が火状態` の判定は `executor.ts` で評価され、`currentEnemyState === "火"` と照合する。

---

## データ定義

```ts
export const STAGE4: StageData = {
  stageNumber: 4,
  config: {
    stageNumber: 4,
    initialMaxMp: 80,
    playerAttack: 35,
    stateGimmick: { type: "wave1" }, // デフォルトは wave1
  },
  clearReward: { unlocksAttribute: null, message: "ステージ4クリア！五属性合体魔法を使いこなした！" },
};

// Wave 2・3 で wave2 にオーバーライド
{ stateGimmickOverride: { type: "wave2" } }

// Wave 3 のコードウォール
{ id: "s4_boss", charLimit: 80 }
```

---

## 未実装・将来対応事項

- Wave 2 での 2 体個別ターゲット（`敵[1番目]へ`）の完全対応は実装済みだが、UI 上のヒントが弱い
- wave1 での「吸収」がプレイヤーに直感的に伝わるようにするための UI 表現（例: 赤い演出で逆効果を強調）
- 合体魔法時の `charLimit` 適用は `applyComboAoE` 内で行われているが、単体バトルの `applyComboMagic` では未適用（Stage 4 Wave 3 は常に多体バトルのため問題なし）
