# Stage 1 設計書：はじめての魔法

最終更新: 2026-06-02

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 1 |
| タイトル | はじめての魔法 |
| テーマ | 順次実行と単属性魔法の基本 |
| Wave 数 | 3 |
| 攻撃力 | 20 |
| 初期最大 MP | 50 |
| プレイヤー HP | 100（全ステージ共通） |
| NPC | なし |
| 状態ギミック | なし |
| クリア報酬 | なし（解放属性なし） |

**学習目標**: `繰り返す(敵が生きている あいだ):` のメインループ構造、`魔法()` / `防御()` / `待機()` の 3 コマンドを習得する。

---

## Wave 構成

### Wave 1 — はじめての戦い

**学習**: メインループと単属性魔法の基本操作

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 |
|----|----|------|--------------|------|
| みどりスライム | 40 | 5 | 5〜8 | 無属性 |

**ギミック**: なし。無属性の弱い敵で「コードを書くと魔法が出る」という基礎体験を提供する。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  魔法(フレイム)
```

---

### Wave 2 — 2体の敵

**学習**: 同時多体バトル（`simultaneous: true`）と `防御()` コマンドの使い方

| 敵 | HP | 防御 | 攻撃ダメージ | 備考 |
|----|----|------|--------------|------|
| あかスライム | 30 | 3 | 12〜18 | 高火力 |
| あおスライム | 30 | 8 | 0 | 攻撃なし・高防御 |

**ギミック**: 2 体同時登場。あかスライムが攻撃してくるので `防御()` で被ダメを抑えながら戦うことを学ぶ。

**エンジン処理**: `runSimultaneousBattle()` を使用。両敵が倒れるまでループ。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  もし 自分のHP が 50 以下 ならば:
    防御()
  そうでなければ:
    魔法(フレイム)
```

---

### Wave 3 — ボス戦

**学習**: MP 管理と `待機()` による MP 回復

| 敵 | HP | 防御 | 攻撃ダメージ | 攻撃条件 |
|----|----|------|--------------|----------|
| スライムキング | 150 | 10 | 15〜20 | 常時 |
| スライムキング（激怒） | — | — | 25〜30 | HP 50% 以下（`hp_below_half`） |

**ギミック**: HP が半分以下になると攻撃パターンが強化（`condition: "hp_below_half"`）。MPが切れたときに `待機()` で回復する MP 管理を体験させる。

**コード例**:
```
繰り返す(敵が生きている あいだ):
  もし 自分のMP が 10 以上 ならば:
    魔法(フレイム)
  そうでなければ:
    待機()
```

---

## エンジン・API の使用

### 使用するエンジン関数

| 関数 | ファイル | 役割 |
|------|---------|------|
| `runBattle()` | `src/engine/battle.ts` | Wave 1 / Wave 3（単体バトル） |
| `runSimultaneousBattle()` | `src/engine/multiBattle.ts` | Wave 2（2体同時） |
| `runWave()` | `src/engine/waveRunner.ts` | Wave 全体のオーケストレーション |
| `executeRoundBody()` | `src/engine/executor.ts` | プレイヤーコードの AST 実行 |
| `getAffinityMultiplier()` | `src/engine/affinity.ts` | 属性相性計算（Stage 1 は全敵が無属性 → 常に 1x） |

### MP 回復ロジック（`battle.ts:processRoundStart`）

- ラウンド 2 以降、毎ラウンド開始時に以下を実行:
  - `maxPlayerMp += 10`（最大 MP が毎ラウンド上昇）
  - `playerMp = min(maxPlayerMp, playerMp + floor(maxPlayerMp / 3))`
- `待機()` は追加の MP 回復は行わない（ログに「待機した」を出力するだけ）

### 防御ロジック（`battle.ts:processEnemyTurn`）

- `防御()` 実行時: `state.playerDefending = true`
- 敵ターンで `playerDefending === true` の場合: `actualDamage = max(1, baseDamage - 10)`

### 攻撃パターン切り替え（Wave 3）

`EnemyAttackPattern.condition: "hp_below_half"` を参照して、HP が半分以下になると配列 index 1 のパターンに切り替わる（`multiBattle.ts:enemyTurn` の `hpRatio <= 0.5` 判定）。

---

## データ定義

```ts
// src/data/stageData.ts
export const STAGE1: StageData = {
  stageNumber: 1,
  config: { stageNumber: 1, initialMaxMp: 50, playerAttack: 20, stateGimmick: null },
  clearReward: { unlocksAttribute: null, message: "ステージ1クリア！魔法の基本を覚えた！" },
  // waves: [...] (3波)
};
```

---

## Wave 間 HP/MP 引き継ぎ

`calcWaveTransition()` によって Wave 完了後に以下が適用される:

- HP: `min(100, finalPlayerHp + 40)`（Wave 間回復 +40）
- MP: `max(initialMaxMp, finalPlayerMp)`（初期最大 MP を下回らない）

---

## 未実装・将来対応事項

- Stage 1 では属性相性（弱点・耐性）は発揮されない（全敵が無属性）
- `待機()` に追加効果（MP ボーナス等）は現在なし
- 状態異常（燃焼・感電）は Stage 1 では使用しない
