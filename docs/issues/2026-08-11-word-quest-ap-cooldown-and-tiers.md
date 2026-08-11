# Word Quest: AP＋クールタイム制の導入と三層ステージ拡張

## 背景・目的

現在の Word Quest (`src/wordQuest/`) は「作戦文を最大3つ並べ、条件が成立すれば行動を実行する」という仕組みだが、行動の実行にコストが一切ないため、`attack` を条件だけ揃えて並べ続ければクリアできてしまう。リソース管理の緊張感がない。

参考にするのは Library Of Ruina の「光」システム（行動ごとにコストを消費する行動力プール、ターンで一部回復）。今回はその発展形として、**AP（行動値、持ち越しあり）** と **動詞ごとのクールタイム（CT）** の二軸で行動を制約する方式を採用する。

あわせて、Word Quest の Tier1 を「AP/CTの使い方を段階的に教えるチュートリアル4戦」として新規に作り直し、現行のギミック多めの敵4体（ember-maw, gaze-idol, echo-moth, forgotten-king）は Tier2 へ移設する。三層構成の全体像はキャラ一覧（ルシアン・ヴァルモン等7人・7文法カテゴリ）とは直接紐付けず、既存の「敵の性質による読解パズル」路線の続きとして機能拡張する層と位置づける。

## 現状の仕組み（前提整理）

- `src/wordQuest/types.ts` — `WordQuestRunState`, `VocabularyWord`, `EnemyDefinition` などの型定義
- `src/wordQuest/enemies.ts` — 敵4体（ember-maw, gaze-idol, echo-moth, forgotten-king=ボス）を固定順で連戦
- `src/wordQuest/vocabulary.ts` — 語彙（主体・条件・接続・行動・修飾）の定義。`unlockAfterBattle` で解禁
- `src/wordQuest/grammar.ts` — 作戦文のスロット妥当性検証 (`validatePlan` / `validateSentence`)
- `src/wordQuest/battle.ts` — `simulateStrategyPlan` が実際の戦闘シミュレーションを行う。条件評価→行動実行→敵の反応(`reactions`)→敵の反撃、の順で処理
- `src/wordQuest/runState.ts` — 1周（`WordQuestRunState`）の進行管理。`createEncounterOrder` で敵順を作り、ボス撃破で `phase: "victory"`
- `src/wordQuest/rewards.ts` — 戦闘勝利後の語彙報酬選択
- `src/features/word-quest/WordQuestRunScreen.tsx` — メインUI。HPバー、作戦文エディタ、語彙ドロワー、結果オーバーレイ
- `src/features/word-quest/LexiconDrawer.tsx` — 手持ち語彙の一覧・選択UI

行動(`ActionEffectId`): `attack`, `guard`, `heal`, `stop`, `bind`, `call_name`, `shine`, `counter`
現状は全て「コストなし」「回数無制限」（`connector.whenever` や `modifier.twice`/`again` で実行回数が増えるのみ）。

---

## Part A: AP＋クールタイム制の導入

### コンセプト

- **AP（行動値）**：1ターンに使える行動回数の上限。初期値 3。**毎ターン+3回復し、使い切らなければ次ターンへ持ち越せる（上限6）**。
- **クールタイム（CT）**：動詞（action語彙）ごとに個別の数値を設定。使用すると、そのCTターン数の間は同じ動詞を再使用できない。
- 「APはあるが強い技はCT中」「弱い技を連打してAP切れ」「今ターン温存して次ターンに一気に使う」といったジレンマを生み、殴り続けるだけのクリアを防ぐ。

### AP持ち越しルール（確定仕様）

- ターン開始時: `actionPoints = min(actionPoints + 3, 6)`
- 上限6を超える回復分は切り捨て（無駄になる）
- 毎ターン使い切る必要はなく、温存して次ターンに大技＋複数行動を狙う戦略が成立する

### 動詞別コスト・CT案（叩き台、要バランス調整）

| 動詞 | apCost | cooldown | 備考 |
|---|---|---|---|
| `attack`（通常攻撃） | 2 | 0 | 基本の連打軸 |
| `guard`（防御） | 2 | 1 | |
| `heal`（回復） | 1 | 2 | 連発させない。1-1で必須級の役割 |
| `stop` | 1 | 1 | |
| `bind` | 2 | 2 | stopped前提の上位技 |
| `call_name` | 2 | 3 | ボス戦の決め手級、乱発防止 |
| `shine` | 1 | 1 | |
| `counter`（反撃） | 1 | 2 | attacked条件があるが明示的にも縛る |

Tier1専用の新規行動として「弱攻撃」を追加する（後述）。

### データ層の変更

- `src/wordQuest/types.ts`
  - `WordRuntimeEffect` の `action` 効果分岐に `apCost: number`, `cooldown: number` を追加
  - `PlayerRunState` に `actionPoints: number`, `cooldowns: Readonly<Record<ActionEffectId, number>>` を追加
- `src/wordQuest/vocabulary.ts`
  - 各 `action.*` 語彙の `effect` に上記コスト値を設定

### ロジック層の変更

- `src/wordQuest/battle.ts` の `executeAction` 呼び出し前後（実行ループ内、`simulateStrategyPlan` の `strategies.forEach` 内、`executeAction` を呼ぶ箇所）
  - 実行前チェック: `actionPoints >= apCost` かつ `cooldowns[action] === 0` を確認
  - 不足時は実行せず、因果ログ（`appendLog`）に「行動値が足りない」「まだ構えが整っていない（CT中）」を出して、条件不成立時と同様に因果を打ち切る
  - 実行時: `actionPoints -= apCost`、`cooldowns[action] = cooldown` をセット
  - `whenever` / `twice` / `again` による同一文内の繰り返し実行も同じチェックを通す（＝1回目の発動で即CTがセットされるため、同一ターン内の2回目実行はCTで弾かれる可能性がある点は仕様として明示・許容する）
- ターン終了処理（`toBattleState` 相当、`battle.turn` をインクリメントする箇所）
  - 各 `cooldowns` の値を1ずつ減算
  - `actionPoints = min(actionPoints + 3, 6)` で回復（持ち越しあり・上限6）
- `src/wordQuest/runState.ts`
  - `createWordQuestRun` の初期 `player` 生成箇所で `actionPoints: 3`, `cooldowns: {}` を設定

### UI層の変更

- `src/features/word-quest/WordQuestRunScreen.tsx`
  - `PlayerVitalBar` 付近にAP残量表示（ゲージ or 数値、`◆`アイコンの行動ジェム表示 `strategy-dock__action-gems` は既存にあるため流用/転用を検討）
  - ターン表示 (`word-game__turn`) 近辺にAP表示を追加するのが自然。持ち越し分が視覚的にわかる表現が望ましい（例: 上限6マスのうち今何マス埋まっているか）
- `src/features/word-quest/LexiconDrawer.tsx`
  - CT中の動詞語彙をグレーアウト表示、残りCTターン数を表示

### 作戦文の上限をTierごとに拡張

現状、作戦文（`strategies`）は常に最大3文まで（`WordQuestRunScreen.tsx` の `addSentence` が `run.strategies.length >= 3` でガード）。これをTierに応じて段階的に解放する。

- **Tier1: 上限2文**
- **Tier2: 上限3文**
- **Tier3: 上限4文**

Tierが上がるごとに使える文が増え、AP/CTの制約下でも複雑な作戦（複数条件・複数行動の組み合わせ）を組めるようになる、という成長曲線にする。Tier1を2文からスタートすることで、1ターンに「条件A→行動X」「条件B→行動Y」の2系統を同時に仕込めるようになる（詳細は下記「Tier1・2文上限の机上検証結果」を参照）。

- `src/wordQuest/types.ts`
  - `TierDefinition` に `maxSentences: number` を追加
- `src/wordQuest/enemies.ts`
  - `TIERS` 配列の各層に `maxSentences: 2 | 3 | 4` を設定
- `src/features/word-quest/WordQuestRunScreen.tsx`
  - `addSentence` のガード条件 `run.strategies.length >= 3` を、現在の `tierIndex` に対応する `TIERS[...].maxSentences` を参照する形に変更
  - `strategy-dock__add-sentence` ボタンの `disabled` 条件も同様に動的化
- `src/wordQuest/runState.ts`
  - Tier遷移時（`tier-clear` → 次Tier開始）に、既存の `strategies` 配列が新しい上限内に収まっているか確認（減る方向はないため実質問題ないが、Tier開始時に上限に応じた空文を用意するか検討）

### 影響確認が必要な箇所

- `src/wordQuest/enemies.ts` の `solutionHints`（各敵の「読み筋」）が、AP/CT制約下でも1〜3文・数ターンで実現可能か個別チェックが必要
  - 例: `forgotten-king` の `king-name-chain` は `call_name → bind → attack` の3手が必要。CT設定次第では複数ターンにまたがる想定にする必要がある
- `src/wordQuest/rewards.ts` の報酬重み付けは変更不要見込みだが、AP/CT導入後のバランステストで調整の可能性あり
- Tier1は上限2文のため、1-1〜1-4の各敵ギミックが「2文で条件分岐を組める」前提で設計されているか要確認（詳細は下記「Tier1・2文上限の机上検証結果」を参照）

---

## Part B: Tier1 新規敵4体（AP/CTチュートリアル）＋既存敵のTier2移設

Tier1は「AP＋CTシステムの使い方を1戦ごとに1つずつ教える」チュートリアル的な4連戦として新規に作る。現行の Tier1 敵（ember-maw, gaze-idol, echo-moth, forgotten-king）はギミックが複合的なため、そのまま **Tier2** の敵として据え置く（`tier: 2` に変更するのみで、内容そのものは変更しない）。

### 1-1: 「積み重ねの見張り」（仮称）

**目的**: 回復を使わないと理論上勝てないことを教える。

- プレイヤーが使える行動: `attack`（通常攻撃）, `heal`（回復）, ~~コスト回復~~ の3種類のみ
  - 「コスト回復」に相当する新規行動を追加するか、AP自然回復（+3/ターン、上限6）で代替するかは実装時に決定。まずは既存のAP回復の仕組みで代替できないか検証してから、専用の「休む」的行動の要否を判断する
- 敵の行動パターン: 固定周期（例: 1・3・5ターン目に攻撃、2・4ターン目は休む）
- バランス方針: Tier1は上限2文のため、「1文目: 自分が傷ついているなら回復する／2文目: いつでも攻撃する」のように**回復と攻撃を同一ターンに両立できる**（AP消費: heal 1 + attack 2 = 3、初期APでちょうど収まる）。この両立を許容した上で、敵の攻撃頻度・威力を引き上げてバランスを取る（回復を入れ忘れる、あるいは温存APを使い切って攻撃に寄せすぎると負ける、という緊張感に調整する）。回復の効果量は敵の1回の攻撃ダメージを上回る値にする（例: 敵攻撃8ダメージ、heal回復量10以上）
- 参照実装箇所: `src/wordQuest/enemies.ts` に敵定義を追加する形。攻撃周期は `reactions` や新規の「ターン数に応じた行動選択」ロジックが必要（現状 `enemies.ts` の `EnemyDefinition` には行動パターンの概念がないため、`battle.ts` 側で敵の行動決定ロジックを新設する可能性が高い）

### 1-2: 「怯みを教える一戦」（仮称）

**目的**: 弱攻撃の存在とAP配分の駆け引きを教える。

- 1-1クリア報酬として「弱攻撃」（新規 `ActionEffectId`）を獲得。通常攻撃よりコストが低く威力も低いが、連打効率（DPS）は通常攻撃を上回る
  - 通常攻撃: apCost 2, 与ダメージ大
  - 弱攻撃: apCost 1, 与ダメージ小（2連発でのDPSが通常攻撃を上回るよう調整）
- 1ターンAP3（自然回復・持ち越し込みで実際は変動する）。基本の選択は「通常攻撃1回」か「弱攻撃2回」のどちらか（防御はこの2択には含まない）。Tier1は上限2文のため、「弱攻撃を2文に分けて2回撃つ」構成も可能（この場合も `weak_attack` の cooldown は0である必要がある。詳細は下記「Tier1・2文上限の机上検証結果」を参照）
- 弱攻撃を当てると、敵の**次の攻撃ダメージが減少する**（怯み。完全無効ではなく軽減効果）
- 敵は通常攻撃を毎ターン行ってくる想定。プレイヤーは弱攻撃で怯みを取りつつ被弾を抑えるか、通常攻撃を押し切るかを選べる
- 敵HPが**50%以下になると1ターンスタン（行動不可）**を挟む。これにより「通常攻撃を押し切る」プレイでも、道中の被弾を抑えられればギリギリ勝てるバランスに調整する
- 通常攻撃を最初から最後まで撃ち続けると、スタンが入る前に被弾が蓄積してプレイヤーが先に倒れる想定（＝弱攻撃を絡めた立ち回りの方が安定するが、通常攻撃のみでも理論上クリア可能というライン）
- 想定される勝ち筋: 弱攻撃と通常攻撃を織り交ぜる、または弱攻撃を多用してHPを削り切る（後者はクリアはできるがHPがギリギリになる想定）

### 1-3: 「疲労する脅威」（仮称）

**目的**: 1-2で得た弱攻撃の使い所（安全に手数を稼げるタイミングの見極め）を実戦で使わせる。

- 敵は「強攻撃 → 1ターン目疲労（行動不可）→ 2ターン目疲労（行動不可）→ 強攻撃 → …」を繰り返す周期行動
- 強攻撃は重いダメージ。疲労中は完全に行動不可なので、その2ターンの間はプレイヤーが安全に弱攻撃を連打できるチャンスターンになる
- 1-2で得た「弱攻撃を絡める」感覚がここで実践的に活きる設計

### 1-4: 「これまでの集大成」（仮称）

**目的**: 1-1〜1-3で学んだ知識（回復、弱攻撃、疲労読み）を組み合わせて突破させる、Tier1の締め。

- 敵の行動パターン: 通常攻撃→通常攻撃→強攻撃…の周期（比率2:1）を繰り返す
- 過度に新規ギミックを足さず、これまでの学習内容の総合力で押し切れる難易度に留める

### Tier1実装に伴う設計上の論点

- **敵の行動パターン（周期・状態遷移）をどう表現するか**：現行の `EnemyDefinition.reactions` はプレイヤーの行動に反応するトリガー式（`after-action` / `repeat-action` / `enemy-status-added`）であり、「ターン数に応じて自律的に行動を変える」概念が存在しない。Tier1のために新しいフィールド（例: `attackPattern: readonly ("attack" | "strong-attack" | "rest" | "stunned")[]` の周期配列、または状態機械）を `EnemyDefinition` に追加する必要がある
- **「弱攻撃」を新規語彙として追加する**：`src/wordQuest/vocabulary.ts` に `action.weak_attack` を追加。`ActionEffectId` に `"weak_attack"` を追加し、`battle.ts` の `executeAction` の switch文にケースを追加する必要がある
- **「怯み」効果**：敵に新しい状態（例: `EnemyStatus` に `"staggered"` を追加）を持たせ、次の敵攻撃ダメージ計算時に軽減する。敵の反撃ダメージ計算は `battle.ts` の `simulateStrategyPlan` 内、`context.battle.enemyPower - context.guard` の箇所が該当し、ここに `staggered` 状態の軽減を組み込む
- **敵のHPしきい値によるスタン**：敵の行動決定ロジック（新設予定）の中で `enemyHp <= maxHp * 0.5` を判定し、スタン状態を挟む処理が必要

---

## Part C: 三層ステージ全体構成（更新版）

- **Tier1**: 新規4戦（1-1〜1-4、上記）。AP/CTチュートリアル。作戦文上限 **2文**
- **Tier2**: 現行の4体をそのまま移設（ember-maw, gaze-idol, echo-moth, forgotten-king=ボス）。`tier: 2` に変更するのみ。作戦文上限 **3文**
- **Tier3**: 新規4戦（雑魚3体＋ボス1体）。詳細は Tier1・Tier2 のバランスが固まってから改めて設計する。作戦文上限 **4文**

### データ層の設計

- `src/wordQuest/types.ts`
  - `EnemyDefinition` に `tier: number` を追加
  - `TierDefinition`（`tier`, `name`, `introClue`, `maxSentences`）を新設
  - `RunPhase` に `"tier-clear"` を追加
  - `WordQuestRunState` に `tierIndex: number` を追加
- `src/wordQuest/enemies.ts`
  - 既存4体を `tier: 2` に設定（内容は変更しない）
  - Tier1に新規4体（1-1〜1-4）を追加
  - `TIERS` 配列（3層分のメタ情報。`maxSentences: 2, 3, 4`）を新設
  - Tier3は後日設計

### ロジック層の変更

- `src/wordQuest/runState.ts`
  - `createEncounterOrder` を層単位に対応させる
  - ボス撃破時、最終層でなければ `phase: "victory"` ではなく `"tier-clear"` にし、次層の `encounterOrder` を生成する処理を追加（`chooseRunReward` や `executeRunBattle` のボス分岐箇所）
  - `totalScore` ・ `inventory`（語彙）は層をまたいで引き継ぐ
  - Tier1の1-1〜1-3にはボスがいないため、「ボス撃破で次層へ」ではなく「Tier内最後の敵を倒したら次層へ」という判定に一般化する必要がある（Tier2以降はボス制を維持するなら、Tierごとに「最終戦かどうか」の判定方法を統一しておく）
- `src/wordQuest/save.ts`
  - シリアライズ／復元の型ガード (`isRunState`) に `tierIndex` を追加

### UI層の変更

- `src/features/word-quest/WordQuestRunScreen.tsx`
  - `run.phase === "tier-clear"` 用のオーバーレイ（層クリア演出＋次層の `introClue` 表示）を追加（`phase === "reward"` や `"victory"/"defeat"` のオーバーレイ実装箇所が参考になる）
  - 章リスト (`word-game__chapters`, `run.encounterOrder.map(...)`) を層ごとに区切って表示

---

## 未確定事項（着手前に詰める）

1. Tier1で「コスト回復」に相当する専用行動を作るか、AP自然回復（+3/ターン・上限6）だけで足りるかの検証
2. 動詞別 apCost / cooldown の最終数値バランス（特に1-1のheal量 vs 敵攻撃力、1-2の弱攻撃DPS倍率）
3. 敵の「ターン周期に応じた行動パターン」をどう `EnemyDefinition` / `battle.ts` に実装するか（新規フィールド設計）
4. 「怯み」状態（staggered）の軽減率
5. Tier3敵ギミックの詳細（Tier1・Tier2確定後に設計）
6. 語彙 `unlockAfterBattle` を層をまたいで通し番号にするか、層ごとに区切るか
7. Tierを跨いだ「最終戦判定」の統一方法（Tier1はボス無し、Tier2・Tier3はボス有りの想定にどう整合性を持たせるか）
8. Tier1（2文上限）で、条件・接続・行動・対象を含むフルスロットの作戦文が毎ターン成立するか（1文構成での机上検証は下記の通り済み。2文構成への変更に伴う再検証結果も反映済み）

### Tier1・文上限の机上検証結果（実装前シミュレーション）

`grammar.ts` の `validateSentence` により、1文は必ず `subject → condition → connector → action → target (→ modifier)` の単一構造。1ターンに評価できる条件は1文につき1つ、実行できる基本行動も1つ（`whenever`/`twice`/`again` で複数回になる場合のみ例外）。まず1文上限で机上シミュレーションし、その後 **Tier1の初期上限を2文に変更**した上で再検証した。

**1文上限での検証（初期案、不採用）**:
- 1-1で「攻撃」と「回復」が同一ターンに両立できず、回復ターンは火力ゼロになる制約が発生
- 1-4でも「防御しつつ攻撃する」が不可能という同種の制約が発生
- これらは意図的な緊張感にはなるが、Tier1のチュートリアル性としてはやや窮屈と判断し、**初期文上限を2文に変更**した

**2文上限での再検証（採用）**:
- **1-1**: 2文により「1文目: 自分が傷ついているなら回復する／2文目: いつでも攻撃する」の形で**回復と攻撃を同一ターンに両立できる**（AP消費: heal 1 + attack 2 = 3、初期APでちょうど収まる）。この両立を許容した上で、敵の攻撃頻度・威力を引き上げてバランスを取る方針とする（回復を怠ると負ける緊張感は、両立可否ではなく数値バランスで作る）
- **1-2**: 「弱攻撃を2回」は2文に分けて表現できるようになる（1文目・2文目それぞれで `weak_attack` を1回ずつ使う構成）。この場合も **`weak_attack` に cooldown が設定されていると1文目の使用で即CTが入り、2文目がブロックされる**ため、`weak_attack` の cooldown は **0 に確定**（1文構成のときと結論は変わらない）。ただし2文構成では「弱攻撃1回＋防御1回」のような新しい組み合わせも選べてしまうため、当初想定していた「通常攻撃1回 vs 弱攻撃2回」というシンプルな二択の設計意図がやや薄まる点は許容する
- **1-3**: 「敵が疲労中」を判定する条件が現行 `ConditionEffectId` に存在しない。新規条件（例: `enemy_exhausted`）の追加が必要。2文あることで疲労ターン中の弱攻撃連打がさらに撃ちやすくなる（1文構成より手数が増える）
- **1-4**: 2文により「防御しつつ攻撃する」が可能になり、総合力を試す締めの戦闘としては選択の幅が増える方向に働く（1-1と同じ理由）

**結論**: Tier1の初期文上限は **2文** で確定する。1文構成で想定していた「排他選択の緊張感」は、2文化によって「両立できるがAP/CTで無制限にはできない」という形に置き換わる。この置き換えに伴い、次の2点を実装前に確定させる必要がある。
1. `weak_attack` の `cooldown` は 0 とする（apCostのみで連射制御する）
2. 1-3用に新規条件 `enemy_exhausted`（または同等の疲労判定）を `ConditionEffectId` に追加する
3. 1-1・1-4は「両立を許容した上で敵を強める」方針のため、敵の攻撃頻度・威力の数値設計をこの前提でやり直す（1文構成を前提にした数値をそのまま流用しない）

## 着手順

1. Part A: AP＋クールタイム制の基盤実装（`types.ts` → `vocabulary.ts` → `battle.ts` → `runState.ts` → UI）
2. Part B: Tier1新規4戦の実装（敵の行動パターン機構の新設を含む）。1-1から順にバランス調整しながら進める
3. 既存4体を Tier2 として `tier: 2` に設定し、AP/CT制下での `solutionHints` 成立を確認・調整
4. Part C: Tier3設計・実装（Tier1・Tier2のバランスが固まってから）
