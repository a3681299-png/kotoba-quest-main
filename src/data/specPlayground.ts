export type ElementType = "火" | "水" | "雷" | "氷" | "風";
export type AffinityLevel = "weak" | "normal" | "resist" | "null" | "absorb";
export type StressLevel = "low" | "medium" | "high";

export interface EnemySpec {
  id: string;
  name: string;
  role: string;
  hp: number;
  visibleHints: string[];
  analysisHints: string[];
  hiddenNotes: string[];
  behaviors: string[];
  gimmicks?: string[];
  affinity: Record<ElementType, AffinityLevel>;
}

export interface WaveSpec {
  id: number;
  name: string;
  goal: string;
  stress: StressLevel;
  notes: string[];
  enemies: EnemySpec[];
}

export interface StageSpec {
  id: number;
  name: string;
  theme: string;
  startMaxMp: number;
  unlockedElements: ElementType[];
  clearReward?: string;
  waveCount: number;
  specNotes: string[];
  samplePlayerCode: string;
  sampleNpcCode?: string;
  waves: WaveSpec[];
}

export const SINGLE_SPELLS: Record<ElementType, string> = {
  火: "フレイム",
  水: "アクア",
  雷: "スパーク",
  氷: "フロスト",
  風: "ゲイル",
};

export const MAGIC_COSTS = {
  single: 10,
  fusion3: 80,
  fusion4: 100,
  fusion5: 120,
} as const;

const defaultAffinity: Record<ElementType, AffinityLevel> = {
  火: "normal",
  水: "normal",
  雷: "normal",
  氷: "normal",
  風: "normal",
};

function createAffinity(
  overrides: Partial<Record<ElementType, AffinityLevel>>,
): Record<ElementType, AffinityLevel> {
  return { ...defaultAffinity, ...overrides };
}

export const SPEC_STAGES: StageSpec[] = [
  {
    id: 1,
    name: "順次実行の導入",
    theme: "単属性魔法と見た目のヒントで敵の弱点を見つける",
    startMaxMp: 50,
    unlockedElements: ["火", "水", "雷"],
    waveCount: 3,
    specNotes: [
      "Stage1 では弱点と通常だけを中心に見せる想定。",
      "見た目や固定ヒントから弱点を読める成功体験を作る。",
      "単属性魔法の基本性能差は作らず、属性相性で差を出す。",
    ],
    samplePlayerCode: `使用(フレイム)
ぼうぎょする()`,
    waves: [
      {
        id: 1,
        name: "攻撃の導入",
        goal: "見た目やヒントから弱点を考えて単属性魔法を撃つ流れを試す",
        stress: "low",
        notes: [
          "見た目だけでも突破できるが、ヒントを読むと手数が減る想定。",
          "if はまだ使わず、まずは順番に命令を書く感覚を優先する。",
        ],
        enemies: [
          {
            id: "s1-w1-wata-slime",
            name: "わたスライム",
            role: "導入用の雑魚",
            hp: 24,
            visibleHints: [
              "ふわふわした体で火がつきやすそう。",
              "攻撃はおだやかで、基本攻撃しか使わない。",
            ],
            analysisHints: [
              "火属性がよく効く。",
              "水属性と雷属性は通常ダメージ。",
            ],
            hiddenNotes: ["弱点を突くと1〜2手で倒せる想定。"],
            behaviors: ["通常攻撃"],
            affinity: createAffinity({ 火: "weak" }),
          },
        ],
      },
      {
        id: 2,
        name: "攻撃役と防御役",
        goal: "敵ごとに行動が違うことを理解しつつ、雷弱点を使い分ける",
        stress: "medium",
        notes: [
          "2体とも雷弱点にして、ターゲット仕様が未確定でも成立するようにしている。",
          "片方が防御することで、敵状態を見る導線を入れる。",
        ],
        enemies: [
          {
            id: "s1-w2-biri-kabuto",
            name: "びりカブト",
            role: "攻撃役",
            hp: 26,
            visibleHints: [
              "金属の殻が青くきらめいている。",
              "毎ターンこちらを殴ってくる。",
            ],
            analysisHints: [
              "雷属性がよく効く。",
              "防御はしないので先に倒しやすい。",
            ],
            hiddenNotes: ["雷弱点を見抜けるとテンポ良く倒せる。"],
            behaviors: ["通常攻撃"],
            affinity: createAffinity({ 雷: "weak" }),
          },
          {
            id: "s1-w2-mamori-kabuto",
            name: "まもりカブト",
            role: "防御役",
            hp: 32,
            visibleHints: [
              "重そうな殻を持ち、構えることが多い。",
              "ときどき防御を使ってダメージをしのぐ。",
            ],
            analysisHints: [
              "雷属性がよく効く。",
              "防御中はダメージが通りにくい。",
            ],
            hiddenNotes: ["防御タイミングに合わせて行動を組みたい敵。"],
            behaviors: ["通常攻撃", "防御"],
            gimmicks: ["防御中は被ダメージ軽減"],
            affinity: createAffinity({ 雷: "weak" }),
          },
        ],
      },
      {
        id: 3,
        name: "熱を帯びたボス",
        goal: "少し長い戦闘を組み立て、水弱点を軸に突破する",
        stress: "medium",
        notes: [
          "ボスらしく HP を高めにしつつ、まだ理不尽にはしない。",
          "攻撃と防御を使い分ける導入にする。",
        ],
        enemies: [
          {
            id: "s1-w3-nettou-golem",
            name: "ねっとうゴーレム",
            role: "チュートリアルボス",
            hp: 60,
            visibleHints: [
              "体から熱い湯気が立ちのぼっている。",
              "攻撃と防御を交互に使う。",
            ],
            analysisHints: [
              "水属性がよく効く。",
              "防御の後は少し隙ができる。",
            ],
            hiddenNotes: ["Stage1 のまとめとして 4〜5 手程度で倒せる想定。"],
            behaviors: ["通常攻撃", "防御"],
            gimmicks: ["防御後に隙ができる演出候補"],
            affinity: createAffinity({ 水: "weak" }),
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "繰り返しと短いコード",
    theme: "長いコードに耐性を持つ敵を相手に、繰り返しの価値を体験する",
    startMaxMp: 60,
    unlockedElements: ["火", "水", "雷"],
    clearReward: "氷",
    waveCount: 3,
    specNotes: [
      "長いコードほどダメージが通りにくい敵ギミックを主役にする。",
      "敵の見た目や固定ヒントでギミックの意味を伝える。",
    ],
    samplePlayerCode: `3 かい くりかえす:
    使用(フレイム)`,
    waves: [
      {
        id: 1,
        name: "短く書く練習",
        goal: "繰り返し構文に置き換える前提を作る",
        stress: "low",
        notes: ["まずは同じ行動をまとめる利点を見せる。"],
        enemies: [
          {
            id: "s2-w1-copy-slime",
            name: "こぴースライム",
            role: "ループ導入役",
            hp: 36,
            visibleHints: ["同じ攻撃を続ければ倒せる単純な敵。"],
            analysisHints: ["弱点は火属性寄り。", "短いコードほど魔法効率が良い。"],
            hiddenNotes: ["見た目と固定ヒントで長文耐性の導線を出す。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["長文耐性: 弱"],
            affinity: createAffinity({ 火: "weak" }),
          },
        ],
      },
      {
        id: 2,
        name: "長文耐性の敵",
        goal: "短く書くことでダメージ効率が上がることを体感する",
        stress: "medium",
        notes: ["長文耐性を敵ギミックとして見せるメイン wave。"],
        enemies: [
          {
            id: "s2-w2-compact-guard-a",
            name: "こうぶんガードA",
            role: "ギミック役",
            hp: 40,
            visibleHints: ["冗長な呪文を嫌う魔法障壁をまとっている。"],
            analysisHints: ["有効文字数が少ないほどダメージが通る。"],
            hiddenNotes: ["片方を倒した後も同じ書き方が使える構成にする。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["長文耐性: 中"],
            affinity: createAffinity({ 火: "weak" }),
          },
          {
            id: "s2-w2-compact-guard-b",
            name: "こうぶんガードB",
            role: "ギミック役",
            hp: 40,
            visibleHints: ["同じく長いコードを弾く結界を持つ。"],
            analysisHints: ["繰り返し構文を使うと突破しやすい。"],
            hiddenNotes: ["2体に同じ解法を適用できる。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["長文耐性: 中"],
            affinity: createAffinity({ 火: "weak" }),
          },
        ],
      },
      {
        id: 3,
        name: "長文嫌いのボス",
        goal: "繰り返しを使わないと苦しいボス戦で学びを定着させる",
        stress: "high",
        notes: ["クリア報酬で氷を解放する。"],
        enemies: [
          {
            id: "s2-w3-script-eater",
            name: "すくりぷとイーター",
            role: "ボス",
            hp: 88,
            visibleHints: [
              "長い呪文を食べてしまう性質を持つ。",
              "攻撃は単純だが、耐久が高い。",
            ],
            analysisHints: [
              "短く整理されたコードほど大きなダメージになる。",
              "火属性で安定して削れる。",
            ],
            hiddenNotes: ["長文耐性の強さをボスらしく引き上げる。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["長文耐性: 強"],
            affinity: createAffinity({ 火: "weak" }),
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "協力NPCとコード修正",
    theme: "NPC コードの不具合修正と風属性連携を学ぶ",
    startMaxMp: 70,
    unlockedElements: ["火", "水", "雷", "氷"],
    clearReward: "風",
    waveCount: 3,
    specNotes: [
      "NPC のコードは別枠だが、プレイヤーと相互参照する前提。",
      "プレイヤーには最初から『バグ』と言わず、違和感から修正を促す。",
    ],
    samplePlayerCode: `もし なかま.MP >= 10:
    使用(フロスト)
そうでなければ:
    ぼうぎょする()`,
    sampleNpcCode: `もし なかま.MP >= 10:
    使用(ゲイル)`,
    waves: [
      {
        id: 1,
        name: "風が必要な敵",
        goal: "NPC の風魔法が必要な敵で連携の意味を理解する",
        stress: "medium",
        notes: ["NPC だけが風属性を使える段階。"],
        enemies: [
          {
            id: "s3-w1-sealed-root",
            name: "ふういんルート",
            role: "連携必須",
            hp: 54,
            visibleHints: ["地面に根を張り、風でしか崩れない外殻を持つ。"],
            analysisHints: ["風属性で外殻が崩れる。", "氷属性は内部に通りやすい。"],
            hiddenNotes: ["NPC の風魔法が決まらないと削り切れない。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["風必須ギミック"],
            affinity: createAffinity({ 氷: "weak", 風: "weak", 火: "resist" }),
          },
        ],
      },
      {
        id: 2,
        name: "参照ずれの修正",
        goal: "NPC コードの参照先や属性を見直して連携を成立させる",
        stress: "high",
        notes: ["プレイヤーコードと NPC コードを見比べる想定。"],
        enemies: [
          {
            id: "s3-w2-link-beetle-a",
            name: "リンクビートルA",
            role: "属性選択テスト",
            hp: 48,
            visibleHints: ["風を当てると姿勢が崩れる甲虫。"],
            analysisHints: ["風で隙を作った後、氷が通る。"],
            hiddenNotes: ["NPC 側の参照ミスがあると風魔法が出ない。"],
            behaviors: ["通常攻撃", "防御"],
            gimmicks: ["NPC 風前提"],
            affinity: createAffinity({ 氷: "weak", 風: "weak" }),
          },
          {
            id: "s3-w2-link-beetle-b",
            name: "リンクビートルB",
            role: "属性選択テスト",
            hp: 48,
            visibleHints: ["A と同じ殻を持ち、連携を求めてくる。"],
            analysisHints: ["風で崩してから氷か雷を通す想定。"],
            hiddenNotes: ["複数体でも解法を転用できる。"],
            behaviors: ["通常攻撃"],
            gimmicks: ["NPC 風前提"],
            affinity: createAffinity({ 氷: "weak", 風: "weak", 雷: "weak" }),
          },
        ],
      },
      {
        id: 3,
        name: "連携ボス",
        goal: "NPC と合体魔法を成立させて Stage4 へつなぐ",
        stress: "high",
        notes: ["風解放への橋渡しとなる wave。"],
        enemies: [
          {
            id: "s3-w3-unison-core",
            name: "ユニゾンコア",
            role: "連携ボス",
            hp: 120,
            visibleHints: [
              "ひとりでは壊せない共鳴核を持つ。",
              "風で共鳴を乱した後に合体魔法が必要そう。",
            ],
            analysisHints: [
              "NPC の風魔法で共鳴を崩す必要がある。",
              "その後に 3 属性以上の合体魔法が有効。",
            ],
            hiddenNotes: ["Stage4 のプレイヤー主体の合体魔法につなぐ役。"],
            behaviors: ["通常攻撃", "強攻撃予備動作"],
            gimmicks: ["NPC 風必須", "合体魔法前提"],
            affinity: createAffinity({ 風: "weak", 氷: "weak" }),
          },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "条件分岐と五属性合体",
    theme: "通る属性を見抜きながら消耗し、最後に五属性合体で一掃する",
    startMaxMp: 80,
    unlockedElements: ["火", "水", "雷", "氷", "風"],
    waveCount: 3,
    specNotes: [
      "道中はあえてストレス高め、最終 wave で爽快感を回収する設計。",
      "敵の正確な内部状態は伏せ、見た目や固定ヒントで読み取る。",
    ],
    samplePlayerCode: `もし てき.いまのよわてん == フレイム:
    使用(フレイム)
そうでなければ:
    ぼうぎょする()`,
    waves: [
      {
        id: 1,
        name: "三属性の見抜き",
        goal: "火・水・雷のどれが通るかを条件分岐で切り替える",
        stress: "medium",
        notes: ["初期3属性の読み分けに集中する。"],
        enemies: [
          {
            id: "s4-w1-shift-slime",
            name: "へんようスライム",
            role: "状態ギミック",
            hp: 80,
            visibleHints: [
              "赤・青・黄のオーラを切り替える。",
              "選ばれていない属性は吸い込みそうに見える。",
            ],
            analysisHints: [
              "火・水・雷のうち、その時のオーラと同じ属性だけが通る。",
              "他の 2 属性は吸収、氷と風は 75% 軽減。",
            ],
            hiddenNotes: ["状態名と見た目の対応表を later 決定する。"],
            behaviors: ["通常攻撃", "状態変化"],
            gimmicks: ["属性切替", "誤属性吸収"],
            affinity: createAffinity({ 氷: "resist", 風: "resist" }),
          },
        ],
      },
      {
        id: 2,
        name: "五属性の消耗戦",
        goal: "2体の通る属性を読み分け、判断の負荷を上げる",
        stress: "high",
        notes: ["ここでかなりストレスを高める。"],
        enemies: [
          {
            id: "s4-w2-shift-knight-a",
            name: "へんようナイトA",
            role: "ギミック役",
            hp: 72,
            visibleHints: ["五色の紋章が順番に光る。"],
            analysisHints: ["五属性のうち 1 属性だけが通る。", "防御で時間を稼ぐことがある。"],
            hiddenNotes: ["最終 wave の 4 体編成の元になる敵。"],
            behaviors: ["通常攻撃", "防御", "状態変化"],
            gimmicks: ["五属性判定", "防御"],
            affinity: createAffinity({}),
          },
          {
            id: "s4-w2-shift-knight-b",
            name: "へんようナイトB",
            role: "ギミック役",
            hp: 72,
            visibleHints: ["A とは別のタイミングで紋章が光る。"],
            analysisHints: ["A とは別の有効属性を持つ。", "妨害行動でテンポを崩してくる。"],
            hiddenNotes: ["別属性を要求して判断の負荷を上げる。"],
            behaviors: ["通常攻撃", "妨害", "状態変化"],
            gimmicks: ["五属性判定", "妨害"],
            affinity: createAffinity({}),
          },
        ],
      },
      {
        id: 3,
        name: "五属性合体の回収",
        goal: "4体の中ボスと文字数制限ボスを耐え、最後に五属性合体で一掃する",
        stress: "high",
        notes: ["Stage2 の短く書く学びも再利用する。"],
        enemies: [
          {
            id: "s4-w3-shift-knight-pack",
            name: "へんようナイト隊",
            role: "中ボス集団",
            hp: 4 * 72,
            visibleHints: ["Wave2 の敵がまとめて現れ、属性判断を迫ってくる。"],
            analysisHints: ["個別には倒しにくいが、最終的にはまとめて消し飛ばせる。"],
            hiddenNotes: ["敵4体の圧力で合体魔法まで我慢させる。"],
            behaviors: ["通常攻撃", "妨害", "状態変化"],
            gimmicks: ["五属性判定", "多体圧力"],
            affinity: createAffinity({}),
          },
          {
            id: "s4-w3-rune-censor",
            name: "ルーンセンサー",
            role: "文字数制限ボス",
            hp: 110,
            visibleHints: ["長い詠唱を嫌う結界を張る。"],
            analysisHints: ["入力文字数制限をかける。", "五属性合体魔法が決まると結界ごと崩れる。"],
            hiddenNotes: ["最後の爽快感を最大化するための抑圧役。"],
            behaviors: ["文字数制限", "妨害"],
            gimmicks: ["入力文字数制限", "五属性合体で一掃される前提"],
            affinity: createAffinity({}),
          },
        ],
      },
    ],
  },
  {
    id: 5,
    name: "総合課題",
    theme: "既習要素を自分で選んで組み合わせる総合問題",
    startMaxMp: 90,
    unlockedElements: ["火", "水", "雷", "氷", "風"],
    waveCount: 3,
    specNotes: [
      "新構文は足さず、攻略方針の幅を持たせる。",
      "Stage6 よりヒントを多く残し、自力で解ける設計にする。",
    ],
    samplePlayerCode: `もし じぶん.MP >= 80:
    使用(フレイム)
    使用(アクア)
    使用(スパーク)
そうでなければ:
    ぼうぎょする()`,
    waves: [
      {
        id: 1,
        name: "優先順位の判断",
        goal: "敵2体のどちらを先に処理するか自分で決める",
        stress: "medium",
        notes: ["複数解法が成立する wave。"],
        enemies: [
          {
            id: "s5-w1-shield-priest",
            name: "シールドプリースト",
            role: "支援役",
            hp: 64,
            visibleHints: ["味方を守る術式を展開する。"],
            analysisHints: ["放置すると味方を強化する。"],
            hiddenNotes: ["先に落とすか無視するかで方針が分かれる。"],
            behaviors: ["強化", "防御"],
            affinity: createAffinity({ 雷: "weak" }),
          },
          {
            id: "s5-w1-breaker-orc",
            name: "ブレイカーオーク",
            role: "攻撃役",
            hp: 82,
            visibleHints: ["火力が高く、前に出てくる。"],
            analysisHints: ["強攻撃の前に構える。"],
            hiddenNotes: ["対処の優先順位を学ばせる。"],
            behaviors: ["通常攻撃", "強攻撃予備動作"],
            affinity: createAffinity({ 氷: "weak" }),
          },
        ],
      },
      {
        id: 2,
        name: "状態変化と回復",
        goal: "回復・強化・弱点変化を同時に見る",
        stress: "high",
        notes: ["条件分岐と MP 管理の総合。"],
        enemies: [
          {
            id: "s5-w2-shift-shaman",
            name: "シフトシャーマン",
            role: "弱点変化役",
            hp: 88,
            visibleHints: ["属性の仮面を付け替える。"],
            analysisHints: ["仮面ごとに通る属性が変わる。"],
            hiddenNotes: ["Stage4 の応用。"],
            behaviors: ["状態変化", "通常攻撃"],
            affinity: createAffinity({}),
          },
          {
            id: "s5-w2-mender-golem",
            name: "メンダーゴーレム",
            role: "回復役",
            hp: 96,
            visibleHints: ["青い修復光をまとっている。"],
            analysisHints: ["味方を回復する。", "雷が少し通りやすい。"],
            hiddenNotes: ["放置すると長期戦になる。"],
            behaviors: ["回復", "通常攻撃"],
            affinity: createAffinity({ 雷: "weak" }),
          },
        ],
      },
      {
        id: 3,
        name: "総合ボス",
        goal: "合体魔法を撃つべきタイミングを自分で選んで勝つ",
        stress: "high",
        notes: ["雑魚召喚と強攻撃予備動作で判断材料を増やす。"],
        enemies: [
          {
            id: "s5-w3-grand-overseer",
            name: "グランドオーバーシア",
            role: "総合ボス",
            hp: 180,
            visibleHints: [
              "部下を呼び出し、状態を切り替えながら戦う。",
              "大技の前には明確な前兆がある。",
            ],
            analysisHints: [
              "召喚、状態変化、防御、強攻撃準備を使う。",
              "合体魔法の打ちどころを見極める必要がある。",
            ],
            hiddenNotes: ["Stage5 の締めとして複数戦法を許容したい。"],
            behaviors: ["召喚", "防御", "強攻撃予備動作", "状態変化"],
            affinity: createAffinity({}),
          },
        ],
      },
    ],
  },
  {
    id: 6,
    name: "学習型ラスボス",
    theme: "過去の行動履歴に適応する 5 wave ボスラッシュ",
    startMaxMp: 100,
    unlockedElements: ["火", "水", "雷", "氷", "風"],
    waveCount: 5,
    specNotes: [
      "Wave1〜4 は過去ボスの強化版、Wave5 は適応ボス。",
      "実装上は機械学習ではなく、行動履歴の集計で対策を変える想定。",
    ],
    samplePlayerCode: `もし てき.けいこう == フレイムたいさく:
    使用(アクア)
    使用(フロスト)
    使用(ゲイル)
そうでなければ:
    使用(フレイム)
    使用(アクア)
    使用(スパーク)
    使用(フロスト)
    使用(ゲイル)`,
    waves: [
      {
        id: 1,
        name: "基礎の再確認",
        goal: "Stage1 ボスの強化版で基本を思い出す",
        stress: "medium",
        notes: ["導入 wave。"],
        enemies: [
          {
            id: "s6-w1-nettou-golem-plus",
            name: "ねっとうゴーレム改",
            role: "再登場ボス",
            hp: 110,
            visibleHints: ["見覚えのある湯気だが、以前より熱い。"],
            analysisHints: ["水弱点は同じだが、防御の切り替えが増えている。"],
            hiddenNotes: ["懐かしさを出しつつ緊張感を上げる。"],
            behaviors: ["通常攻撃", "防御"],
            affinity: createAffinity({ 水: "weak" }),
          },
        ],
      },
      {
        id: 2,
        name: "短く強く",
        goal: "Stage2 ボスの強化版で短いコードの価値を再確認する",
        stress: "medium",
        notes: ["長文耐性の再復習。"],
        enemies: [
          {
            id: "s6-w2-script-eater-plus",
            name: "すくりぷとイーター改",
            role: "再登場ボス",
            hp: 132,
            visibleHints: ["より強い長文抑制結界を張っている。"],
            analysisHints: ["短いコードほど依然として有利。"],
            hiddenNotes: ["Stage4 最終 wave の文字数制限ともつながる。"],
            behaviors: ["通常攻撃", "妨害"],
            gimmicks: ["長文耐性: 強"],
            affinity: createAffinity({ 火: "weak" }),
          },
        ],
      },
      {
        id: 3,
        name: "連携の再試験",
        goal: "Stage3 ボスの強化版で NPC 連携を再確認する",
        stress: "high",
        notes: ["相互参照の実装確認にも向く wave。"],
        enemies: [
          {
            id: "s6-w3-unison-core-plus",
            name: "ユニゾンコア改",
            role: "再登場ボス",
            hp: 148,
            visibleHints: ["共鳴核がさらに複雑に絡み合っている。"],
            analysisHints: ["NPC 風魔法と合体魔法の連携が引き続き必要。"],
            hiddenNotes: ["Stage3 の学びを忘れていないかを見る。"],
            behaviors: ["通常攻撃", "強攻撃予備動作"],
            gimmicks: ["NPC 風必須", "合体魔法前提"],
            affinity: createAffinity({ 風: "weak" }),
          },
        ],
      },
      {
        id: 4,
        name: "条件分岐の最終確認",
        goal: "Stage4 ボスの強化版で読みと五属性判断をもう一度行う",
        stress: "high",
        notes: ["ラスボス前の最終確認。"],
        enemies: [
          {
            id: "s6-w4-rune-censor-plus",
            name: "ルーンセンサー改",
            role: "再登場ボス",
            hp: 160,
            visibleHints: ["文字数制限と属性撹乱を同時に仕掛けてくる。"],
            analysisHints: ["通る属性の切り替えと文字数制限の両方に対応が必要。"],
            hiddenNotes: ["Stage4 の苦しさを凝縮する。"],
            behaviors: ["文字数制限", "妨害", "状態変化"],
            gimmicks: ["文字数制限", "五属性判定"],
            affinity: createAffinity({}),
          },
        ],
      },
      {
        id: 5,
        name: "学習型ラスボス",
        goal: "過去の戦い方を読まれた上で、攻略を組み替えて勝ち切る",
        stress: "high",
        notes: ["属性使用率や NPC 依存度などの履歴で対策を変える想定。"],
        enemies: [
          {
            id: "s6-w5-adaptive-lord",
            name: "アダプティブロード",
            role: "学習型ラスボス",
            hp: 220,
            visibleHints: [
              "こちらの戦い方を記録しているような観測眼を持つ。",
              "多用した戦法ほど通りにくくなる気配がある。",
            ],
            analysisHints: [
              "属性使用率、合体魔法頻度、NPC 依存度、防御傾向を見て対策を変える。",
              "同じ勝ち筋に固執すると対応されやすい。",
            ],
            hiddenNotes: [
              "技術的にはブラウザ保存の行動履歴を集計して判定する想定。",
            ],
            behaviors: ["適応行動", "耐性切替", "対策台詞"],
            gimmicks: ["行動履歴参照", "対策パターン切替"],
            affinity: createAffinity({}),
          },
        ],
      },
    ],
  },
];

export function getStageSpecById(stageId: number): StageSpec {
  const stage = SPEC_STAGES.find((item) => item.id === stageId);
  if (!stage) {
    return SPEC_STAGES[0];
  }
  return stage;
}

export function getStressLabel(level: StressLevel): string {
  switch (level) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    default:
      return level;
  }
}

export function getAffinityLabel(level: AffinityLevel): string {
  switch (level) {
    case "weak":
      return "弱点";
    case "normal":
      return "通常";
    case "resist":
      return "軽減";
    case "null":
      return "無効";
    case "absorb":
      return "吸収";
    default:
      return level;
  }
}
