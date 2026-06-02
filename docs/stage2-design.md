# Stage 2 設計書：繰り返しの力

最終更新: 2026-06-02

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 2 |
| タイトル | 繰り返しの力 |
| テーマ | 繰り返しと行動の効率化 |
| Wave 数 | 3 |
| 攻撃力 | 25 |
| 初期最大 MP | 60 |
| プレイヤー HP | 100 |
| NPC | なし |
| 状態ギミック | なし |
| クリア報酬 | 氷属性解放（「フロスト」が使用可能） |

**学習目標**: `繰り返す(N):` による固定回数ループ。有効文字数制限ギミックを通して「短くまとめる＝強い」という感覚を習得する。

---

## ギミック: 有効文字数制限（Code Character Limit）

Stage 2 の核心ギミック。コードが長いほどダメージが下がる。

### 有効文字数の定義

`countEffectiveChars(code)` — `src/engine/charCounter.ts`

```ts
// 空白・タブ・改行・コロン を除いた文字数
for (const ch of code) {
  if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r" && ch !== ":") count++;
}
```

空白・改行・コロンはコードの見た目上の「構造」であり、ロジックの量に含めない。

### ダメージ補正式

`applyCharLimit(damage, effectiveChars, limit)` — `src/engine/charCounter.ts`

```ts
if (effectiveChars <= limit) return damage;
return Math.floor(damage * limit / effectiveChars);
```

- 有効文字数が制限値以内 → ダメージそのまま
- 超過した場合 → `damage × (limit / effectiveChars)` に比例減少

### 適用箇所

`multiBattle.ts:applySingleMagicToEnemy` にて、対象敵の `charLimit` が設定されている場合に `applyCharLimit()` を呼び出す:

```ts
if (enemy.data.charLimit) {
  damage = applyCharLimit(damage, state.effectiveChars, enemy.data.charLimit);
}
```

`effectiveChars` は `runSimultaneousBattle()` 開始時に一括計算し `MultiState` に保持（バトル中は不変）。

---

## Wave 構成

### Wave 1 — くり返して倒せ

**学習**: `繰り返す(N):` の基本使い方

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 | `charLimit` |
|----|----|------|--------------|------|-------------|
| いわスライム | 60 | 8 | 10〜12 | 無属性 | なし |

**ギミック**: なし。文字数制限を体験する前の「まず繰り返しを使ってみる」フェーズ。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  繰り返す(3):
    魔法(アクア)
```

---

### Wave 2 — 長いコードは通じない

**学習**: 文字数制限ギミックとループを使った効率化

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 | `charLimit` |
|----|----|------|--------------|------|-------------|
| まものA（コード耐性あり） | 80 | 5 | 12〜15 | 無属性 | 暗黙（Waveの特性） |
| まものB（コード耐性あり） | 80 | 5 | 12〜15 | 無属性 | 暗黙 |

**ギミック**: 2体同時（`simultaneous: true`）。プレイヤーが長いコードを書くとダメージが下がることを体感させる。`繰り返す` を使うと同じ効果をより短く書けることを学ぶ。

> **注**: Wave 2 のコード耐性はゲームフレーバーとしての説明であり、`charLimit` フィールドは Wave 3 のボスのみに設定されている。Wave 2 の「耐性」は短いコードを書くよう誘導するヒントとして機能する。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  繰り返す(4):
    魔法(スパーク)
```

---

### Wave 3 — 繰り返しボス

**学習**: 文字数制限ボスに対して `繰り返す` でコードを短縮する実践

| 敵 | HP | 防御 | 攻撃ダメージ | `charLimit` |
|----|----|------|--------------|-------------|
| コードウォール | 200 | 15 | 18〜22（通常） | なし（Wave全体の教訓） |
| コードウォール（HP半分以下） | — | — | 28〜35 | — |

**ギミック**: HP 半分以下で攻撃強化（`hp_below_half`）。このボスは `charLimit` フィールドを持たないが、Stage 4 の同名ボスには `charLimit: 80` が設定されており、Stage 2 はその予告として位置づける。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  繰り返す(5):
    魔法(フレイム)
```

---

## エンジン・API の使用

| 関数 | ファイル | 役割 |
|------|---------|------|
| `countEffectiveChars()` | `src/engine/charCounter.ts` | コードの有効文字数を計算 |
| `applyCharLimit()` | `src/engine/charCounter.ts` | 文字数超過時のダメージ補正 |
| `runSimultaneousBattle()` | `src/engine/multiBattle.ts` | Wave 2（2体同時） |
| `runBattle()` | `src/engine/battle.ts` | Wave 1 / Wave 3 |
| `runWave()` | `src/engine/waveRunner.ts` | Wave オーケストレーション |

---

## データ定義

```ts
// src/data/stageData.ts
export const STAGE2: StageData = {
  stageNumber: 2,
  config: { stageNumber: 2, initialMaxMp: 60, playerAttack: 25, stateGimmick: null },
  clearReward: { unlocksAttribute: "氷", message: "ステージ2クリア！氷の魔法「フロスト」が使えるようになった！" },
};
```

`charLimit` は `EnemyData` フィールドとして設定:
```ts
// src/engine/types.ts
interface EnemyData {
  charLimit?: number; // このボスが生きている間、有効文字数がこの値を超えるとダメージが減る
}
```

---

## 属性相性（Stage 2 での適用）

Stage 2 では全敵が無属性（`element: null`）のため、`getAffinityMultiplier()` は常に 1x を返す。ただし Wave 1 のヒントで「アクア」（水魔法）を推奨しているのは、Stage 3 以降の属性学習への伏線。

---

## 未実装・将来対応事項

- Wave 2 の「コード耐性」という説明とエンジン実装のギャップ（教育的フレーバーのみで `charLimit` は非適用）を、将来的に敵データとして明示してもよい
- `繰り返す(N)` ループ内の MP 消費は単純に N 回 `魔法()` が実行される形（ループのネストによる MP 効率は変わらない）
