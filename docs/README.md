# Kotoba Quest 実装ドキュメント

最終更新: 2026-05-30

本ディレクトリは **実装に直結する Stage 5・6 の確定仕様** と実装ステータスをまとめる。
ゲーム全体の要件・言語仕様の正本は `../prototype-5173/docs/` 配下にあり、本書はそれを前提として Stage 単位の決定事項のみを扱う。

## ドキュメント一覧

### ステージ設計書（各ステージのギミック・API・実装詳細）

| ファイル | 内容 |
|---------|------|
| [stage1-design.md](./stage1-design.md) | Stage 1：はじめての魔法（順次実行・MP管理・防御） |
| [stage2-design.md](./stage2-design.md) | Stage 2：繰り返しの力（有効文字数制限ギミック） |
| [stage3-design.md](./stage3-design.md) | Stage 3：なかまとの連携（NPC・変数共有・合体魔法） |
| [stage4-design.md](./stage4-design.md) | Stage 4：条件分岐と合体魔法（状態変化ギミック・wave1/wave2） |
| [stage5-design.md](./stage5-design.md) | Stage 5：総合課題（新規エンジン機能・healAllies・chargeAttack・summonOnHpThreshold） |
| [stage6-design.md](./stage6-design.md) | Stage 6：最終決戦（学習型ラスボス・adaptation.ts 設計） |

### 仕様書・要件定義

| ファイル | 内容 |
|---------|------|
| [stage5-6-spec.md](./stage5-6-spec.md) | Stage 5・6 の確定仕様（Wave 構成・ラスボス適応ロジック） |
| `../prototype-5173/docs/requirements.md` | ゲーム全体の要件定義書（正本） |
| `../prototype-5173/docs/language-spec.md` | 独自言語の仕様書（正本） |

---

## 実装ステータス（2026-05-30 時点）

### ✅ 実装済み

- **言語パーサー**（Ohm.js）: 全構文対応・36 テストパス
  - 順次実行・繰り返し（条件付き / 回数指定）・条件分岐（elif 含む）・変数代入・相互参照（`プレイヤー.変数` / `なかま.変数`）・全角スペース対応
- **バトルエンジン**: 単体 / 多体（同時）両対応
  - 属性相性（循環型 水→火→氷→風→雷→水）
  - 単属性魔法ダメージ / 合体魔法（3〜5属性・5属性は固定 200）
  - MP 管理（毎ラウンド回復 / 最大MP増加）
  - Stage 4 状態ギミック（wave1 / wave2）
  - 文字数制限ボス（Stage 4 Wave 3）
  - 回復()の1ラウンド1回制限
- **Wave 進行システム**
  - Wave 間の HP/MP リセット
  - Wave 内の HP/MP 引き継ぎ
- **UI**
  - タイトル / ステージ選択 / バトル / Wave結果 / ステージクリア画面
  - リアルタイムバトルアニメーション（再生・一時停止・速度切替）
  - コードハイライト・有効文字数カウンター・全敵HPバー表示
  - 使用可能魔法リスト表示

### 🚧 実装中・予定

- **Stage 5**（総合課題）— 要件確定済み・未実装
- **Stage 6**（ボスラッシュ + 学習型ラスボス）— ラスボス実装方針のみ確定

### 🔴 未確定事項

- Stage 6 Wave 1-4 の強化版ボスの方向性
- 合体魔法 16 種の固有名（コンテンツ設計）
- 各 Wave の細かいバランス調整

---

## ステージ別の確定仕様

### Stage 1：はじめての魔法
攻撃力 20 / 初期MP 50 / 3 Wave / 単属性魔法と順次実行を学ぶ

### Stage 2：繰り返しの力
攻撃力 25 / 初期MP 60 / 3 Wave / クリア報酬で**氷属性解放** / 繰り返し構文を学ぶ

### Stage 3：なかまとの連携
攻撃力 30 / 初期MP 70 / 3 Wave / クリア報酬で**風属性解放** / NPC マリアとの連携・変数の相互参照・コード修正

### Stage 4：条件分岐と合体魔法
攻撃力 35 / 初期MP 80 / 3 Wave
- Wave 1：状態変化（火/水/雷ランダム・誤ると吸収）
- Wave 2：状態変化（5属性ランダム）2体
- Wave 3：5体同時バトル + 文字数制限ボス + 五属性合体魔法で全体攻撃

### Stage 5：総合課題
攻撃力 40 / 初期MP 90 / 3 Wave / NPC なし
- 詳細は [stage5-6-spec.md](./stage5-6-spec.md) §1 を参照

### Stage 6：ボスラッシュ
攻撃力 45 / 初期MP 100 / 5 Wave / 学習型ラスボス
- 詳細は [stage5-6-spec.md](./stage5-6-spec.md) §2 を参照

---

## アーキテクチャ要約

```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx               # 画面ルーティング（screen 状態で切替）
├── components/
│   ├── TitleScreen.tsx
│   ├── StageSelectScreen.tsx
│   ├── BattleScreen.tsx       # コード入力・実行ボタン・NPC タブ
│   ├── BattleAnimator.tsx     # リアルタイムバトル表示
│   ├── WaveResultScreen.tsx
│   └── StageResultScreen.tsx
├── parser/
│   ├── ast.ts                 # AST 型定義
│   ├── grammar.ohm            # Ohm.js 文法
│   ├── preprocessor.ts        # インデント → ブレース変換
│   ├── parser.ts              # パーサー + セマンティクス
│   └── parser.test.ts
├── engine/
│   ├── types.ts               # BattleState・EnemyData・LogEntry
│   ├── affinity.ts            # 属性相性テーブル
│   ├── executor.ts            # AST → アクションリスト
│   ├── charCounter.ts         # 有効文字数カウンター
│   ├── battle.ts              # 単体バトル
│   ├── multiBattle.ts         # 多体同時バトル（Stage 4 Wave 3+）
│   ├── waveRunner.ts          # Wave 進行・HP/MP 引き継ぎ
│   └── *.test.ts
├── data/
│   └── stageData.ts           # 全ステージのデータ定義
└── store/
    └── useGameStore.ts        # Zustand + persist
```

---

## テスト

```bash
npm run test:run    # 全テスト一括実行
npm run test        # watch モード
npm run dev         # 開発サーバー（localhost:3001）
```

現在 36 テストすべてパス。
