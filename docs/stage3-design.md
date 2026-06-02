# Stage 3 設計書：なかまとの連携

最終更新: 2026-06-02

---

## 概要

| 項目 | 値 |
|------|----|
| ステージ番号 | 3 |
| タイトル | なかまとの連携 |
| テーマ | 変数・属性選択・協力コードの修正 |
| Wave 数 | 3 |
| 攻撃力 | 30 |
| 初期最大 MP | 70 |
| プレイヤー HP | 100 |
| NPC | マリア（全 Wave に登場） |
| 状態ギミック | なし |
| クリア報酬 | 風属性解放（「ゲイル」が使用可能） |

**学習目標**: NPC（マリア）のバグコードを修正しながら「変数共有」と「複数属性による合体魔法」を学ぶ。条件分岐（`もし〜ならば`）の実践的使用。

---

## ギミック 1: NPC コード（バグ修正）

各 Wave に NPC が登場し、バグのあるコードを持った状態で参戦する。プレイヤーは NPC コードを修正することで戦力を最大化できる。

### NPC コードの構造（`WaveData.npc`）

```ts
npc?: {
  name: string;          // NPC の表示名
  buggyCode: string;     // バグ入り初期コード（プレイヤーが修正する）
  correctCode: string;   // 正解コード（デバッグヒント用）
  bugDescription: string; // バグの内容説明
  npcSpeech?: string;    // バグに気づくセリフ
}
```

### NPC コードの実行フロー

`battle.ts:processPlayerTurn` にて:

1. プレイヤーコードを `executeRoundBody(body, state, { selfId: "プレイヤー" })` で実行し、変数（`playerVars`）を取得
2. NPC コードを `executeRoundBody(npcBody, state, { selfId: "なかま", peerVariables: playerVars })` で実行
3. NPC はプレイヤーの変数を **`プレイヤー.変数名`** という形で参照できる（循環依存防止のため、プレイヤーの実行結果が確定してから NPC に渡す）

### NPC の MP 消費

- NPC の魔法は **プレイヤーの MP を消費しない**
- ダメージ計算は `applyNpcMagic()` で行い、プレイヤーと同じ攻撃力を使用するが MP を減らさない

```ts
function applyNpcMagic(magic: MagicName, state: BattleState): void {
  const mult = getAffinityMultiplier(magic, state.enemy.element);
  const damage = Math.max(1, Math.floor(state.playerAttack * mult) - state.enemy.defense);
  // ...
}
```

---

## ギミック 2: 合体魔法（3属性以上）

プレイヤーと NPC の魔法を合算して **3 属性以上**が揃い、かつ `playerMp >= COMBO_MP_COST[count]` を満たすと合体魔法が発動。

### 合体魔法の MP コスト

```ts
// src/engine/affinity.ts
export const COMBO_MP_COST: Record<3 | 4 | 5, number> = {
  3: 80,
  4: 100,
  5: 120,
};
```

### 合体魔法のダメージ計算

`battle.ts:applyComboMagic`:

```ts
const damage = Math.max(1, Math.floor(attackPower * count * maxMult) - enemy.defense);
// count = 使用属性数（3〜5）
// maxMult = 使用属性のうち最大の相性倍率
```

攻撃力 × 属性数 × 最大相性倍率 でスケール。5属性なら単発の 5 倍のベースダメージ。

### 判定ロジック（`battle.ts:processPlayerTurn`）

```ts
const usedElements = new Set<Element>(
  [...playerMagicActions, ...npcMagicActions].map((a) => MAGIC_TO_ELEMENT[a.magic])
);
if (usedElements.size >= 3 && usedElements.size <= 5) {
  const comboCost = COMBO_MP_COST[count];
  if (state.playerMp >= comboCost) {
    state.playerMp -= comboCost;
    applyComboMagic([...usedElements], count, state);
    return; // 合体魔法発動後は単属性処理をスキップ
  }
}
```

---

## Wave 構成

### Wave 1 — なかまの登場

**学習**: NPC コードの読み方・属性間違いのバグ修正

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 |
|----|----|------|--------------|------|
| かぜよけスライム | 60 | 5 | 10〜15 | 無属性 |

**NPC バグ内容**:

| 項目 | 内容 |
|------|------|
| バグ | `魔法(フレイム)` を使っているが `魔法(ゲイル)` が正解 |
| バグコード | `繰り返す(敵が生きている あいだ):\n  魔法(フレイム)` |
| 正解コード | `繰り返す(敵が生きている あいだ):\n  魔法(ゲイル)` |
| NPC セリフ | 「風の魔法がうまく通らない気がする…なんでだろう？」 |

バグを直さなくてもクリア可能だが、マリアの貢献度が下がる（属性合体のヒント提示）。

---

### Wave 2 — 変数で連携

**学習**: プレイヤーが設定した変数を NPC が `プレイヤー.変数名` で参照する仕組み

| 敵 | HP | 防御 | 攻撃ダメージ | 属性 |
|----|----|------|--------------|------|
| てつスライムA | 60 | 8 | 12〜16 | 無属性 |
| てつスライムB | 60 | 8 | 12〜16 | 無属性 |

**NPC バグ内容**:

| 項目 | 内容 |
|------|------|
| バグ | NPC が `プレイヤー.しんごう` を参照しているが、プレイヤーが設定しているのは `あいず` |
| バグコード | `もし プレイヤー.しんごう が 1 と等しい ならば:` |
| 正解コード | `もし プレイヤー.あいず が 1 と等しい ならば:` |
| NPC セリフ | 「あれ…プレイヤーが合図を出してくれているはずなのに、うまく受け取れていないみたい」 |

変数名の一致が「プログラムのインターフェース」であることを学ぶ。

**変数共有の仕組み**:

プレイヤーコードで `あいず = 1` と設定すると、`playerVars["あいず"] = 1` として NPC コードに渡される。NPC は `プレイヤー.あいず` でアクセスできる。

---

### Wave 3 — 連携合体魔法

**学習**: プレイヤー + NPC で 3 属性を揃えて合体魔法を発動する

| 敵 | HP | 防御 | 攻撃ダメージ | 備考 |
|----|----|------|--------------|------|
| ゴーレムキング | 160 | 8 | 12〜18（通常） | HP 半分以下で 20〜28 |

**NPC バグ内容（バグが 2 つ）**:

| 項目 | 内容 |
|------|------|
| バグ 1 | `魔法(ゲイル)` すべき箇所が `待機()` になっている |
| バグ 2 | MP 条件が `80 以上` ではなく `80 以下`（逆） |
| バグコード | `もし 自分のMP が 80 以上 ならば:\n  待機()\nそうでなければ:\n  待機()` |
| 正解コード | `もし 自分のMP が 80 以上 ならば:\n  魔法(ゲイル)\nそうでなければ:\n  待機()` |
| NPC セリフ | 「一緒に大技を出そう！…あれ、うまく発動しない。コードを見直してみて」 |

両方直すと：プレイヤーが火・水 2 属性 ＋ NPC が風 1 属性 = 計 3 属性 → MP 80 で合体魔法発動。

**合体魔法の発動条件（Wave 3）**:
- プレイヤー: `魔法(フレイム)` + `魔法(アクア)` → 火・水の 2 属性
- NPC（バグ修正後）: `魔法(ゲイル)` → 風の 1 属性
- 合計 3 属性 ＋ `playerMp >= 80` → 合体魔法発動

---

## エンジン・API の使用

| 関数 / 型 | ファイル | 役割 |
|-----------|---------|------|
| `runBattle(ast, enemy, config, npcAst)` | `src/engine/battle.ts` | NPC AST を第 4 引数で渡す |
| `executeRoundBody(body, state, { selfId, peerVariables })` | `src/engine/executor.ts` | プレイヤー・NPC それぞれのコード実行 |
| `applyNpcMagic()` | `src/engine/battle.ts` | NPC の魔法ダメージ（MP 消費なし） |
| `applyComboMagic()` | `src/engine/battle.ts` | 3〜5属性合体魔法の全体ダメージ |
| `COMBO_MP_COST` | `src/engine/affinity.ts` | 合体魔法の MP コスト定数（3→80, 4→100, 5→120） |
| `WaveData.npc` | `src/data/stageData.ts` | バグコード・正解コード・説明の定義 |

---

## 属性相性（Stage 3 での適用）

Stage 3 では全敵が無属性（`element: null`）のため `getAffinityMultiplier()` は 1x を返す。ただし合体魔法のダメージ計算でも `maxMult` は 1x 固定となる。

属性相性が実際に機能するのは Stage 4 以降。

---

## データ定義

```ts
export const STAGE3: StageData = {
  stageNumber: 3,
  config: { stageNumber: 3, initialMaxMp: 70, playerAttack: 30, stateGimmick: null },
  clearReward: { unlocksAttribute: "風", message: "ステージ3クリア！風の魔法「ゲイル」が使えるようになった！" },
};
```

---

## 未実装・将来対応事項

- NPC が `防御()` や `待機()` を使うケースは現在動作するが、Stage 3 の NPC コードには含まれていない
- NPC の魔法は合体魔法の属性カウントに含まれるが、NPC 単独では合体魔法を発動できない
- `correct` vs `buggy` の判定は UI 側で行い、エンジンは渡されたコードをそのまま実行する
