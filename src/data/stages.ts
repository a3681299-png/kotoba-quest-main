// チュートリアル6ステージ定義
// 仕様書の「言葉の意味を探すRPG」を5分程度で体験するための短い構成

export interface StageDialogueLine {
  speaker: "player" | "enemy";
  name: string;
  text: string;
}

export interface StageData {
  id: number;
  name: string;
  enemyId: string;
  enemyName: string;
  enemyHp: number;
  learningGoal: string;
  hint: string;
  sampleCode: string;
  successMessage: string;
  concept: string;
  mentorName: string;
  mentorRole: string;
  playerName: string;
  enemyTrait: string;
  introDialogue: StageDialogueLine[];
}

export const STAGES: StageData[] = [
  {
    id: 1,
    name: "命令の糸",
    enemyId: "training_doll",
    enemyName: "木偶の影",
    enemyHp: 20,
    concept: "順次実行",
    mentorName: "人形師",
    mentorRole: "言葉を命令として扱う",
    playerName: "人形師",
    enemyTrait: "攻撃がそのまま意味を持つ相手",
    introDialogue: [
      {
        speaker: "enemy",
        name: "木偶の影",
        text: "書かれた順にしか、私は動かない。先に来た言葉が、先に刃になる。",
      },
      {
        speaker: "player",
        name: "人形師",
        text: "なら、命令を並べれば糸はつながる。まずは順番を確かめよう。",
      },
    ],
    learningGoal: "命令を上から順番に実行する",
    hint: `命令は上から順番に動く。

攻撃する
回復する
攻撃する

まずは、書いた順番どおりに行動が進むことを見よう。`,
    sampleCode: `攻撃する
回復する
攻撃する`,
    successMessage: "命令の糸がつながった。書いた順番が、そのまま行動になった。",
  },
  {
    id: 2,
    name: "契約の一文",
    enemyId: "contract_beast",
    enemyName: "弱った契約獣",
    enemyHp: 10,
    concept: "条件分岐",
    mentorName: "契約者",
    mentorRole: "条件を満たした時だけ言葉を発動させる",
    playerName: "契約者",
    enemyTrait: "弱っている時だけ攻撃が通る",
    introDialogue: [
      {
        speaker: "enemy",
        name: "弱った契約獣",
        text: "弱っている時だけ、契約の言葉を受け入れよう。",
      },
      {
        speaker: "player",
        name: "契約者",
        text: "場面を見て選ぶ。条件に合う時だけ攻撃する。",
      },
    ],
    learningGoal: "もし を使って状況に応じた行動を選ぶ",
    hint: `契約は条件が合う時だけ動く。

もし 敵HP が 少ない なら 攻撃する
そうでなければ 観察する

敵が弱っているなら攻撃、そうでなければ様子を見る。`,
    sampleCode: `もし 敵HP が 少ない なら 攻撃する
そうでなければ 観察する`,
    successMessage: "条件が合った。言葉は、場面を選ぶことで力を持つ。",
  },
  {
    id: 3,
    name: "めぐる庭",
    enemyId: "thorn_root",
    enemyName: "からみ根",
    enemyHp: 30,
    concept: "くりかえし",
    mentorName: "植物の魔女",
    mentorRole: "言葉を循環として扱う",
    playerName: "植物の魔女",
    enemyTrait: "一度ではほどけないが、同じ働きの反復に弱い",
    introDialogue: [
      {
        speaker: "enemy",
        name: "からみ根",
        text: "一度の言葉では、この根はほどけない。",
      },
      {
        speaker: "player",
        name: "植物の魔女",
        text: "同じ働きをまとめて巡らせる。回数で流れを作る。",
      },
    ],
    learningGoal: "同じ命令を決まった回数くりかえす",
    hint: `植物は一度で育たない。

3回 くりかえす 攻撃する

同じ命令を何度も書かず、回数でまとめよう。`,
    sampleCode: `3回 くりかえす 攻撃する`,
    successMessage: "めぐる言葉が根をほどいた。くりかえしは、少しずつ効いていく。",
  },
  {
    id: 4,
    name: "忘れ名の書庫",
    enemyId: "nameless",
    enemyName: "名前を忘れた敵",
    enemyHp: 15,
    concept: "変数",
    mentorName: "司書",
    mentorRole: "言葉を記録として扱う",
    playerName: "司書",
    enemyTrait: "記録した言葉を使うと反応する",
    introDialogue: [
      {
        speaker: "enemy",
        name: "名前を忘れた敵",
        text: "名は消えた。さっきの言葉も、もう思い出せない。",
      },
      {
        speaker: "player",
        name: "司書",
        text: "なら記録する。残した言葉を、次の判断に使う。",
      },
    ],
    learningGoal: "情報を記録して、後の判断に使う",
    hint: `まず情報を残す。

敵の言葉を 記録する
もし 敵の言葉 が 前と同じ なら 話しかける

記録した言葉を条件に使うと、敵の反応が変わる。`,
    sampleCode: `敵の言葉を 記録する
もし 敵の言葉 が 前と同じ なら 話しかける`,
    successMessage: "書き残した言葉が道を開いた。変数は、あとで使うための記録だ。",
  },
  {
    id: 5,
    name: "塔からの作戦",
    enemyId: "sealed_cage",
    enemyName: "閉ざされた鳥籠",
    enemyHp: 20,
    concept: "関数",
    mentorName: "幽閉の姫",
    mentorRole: "言葉をまとまった命令として渡す",
    playerName: "幽閉の姫",
    enemyTrait: "まとまった作戦でだけ開く",
    introDialogue: [
      {
        speaker: "enemy",
        name: "閉ざされた鳥籠",
        text: "ばらばらの命令では、この檻は開かない。",
      },
      {
        speaker: "player",
        name: "幽閉の姫",
        text: "まとまりに名前をつける。作戦として呼び出せば届く。",
      },
    ],
    learningGoal: "複数の命令を作戦としてまとめて呼び出す",
    hint: `何度も使う流れには名前をつける。

作戦A は { 観察する 話しかける }
作戦A を 実行する

命令のまとまりを呼び出せば、作戦として扱える。`,
    sampleCode: `作戦A は { 観察する 話しかける }
作戦A を 実行する`,
    successMessage: "塔から届いた作戦が鳥籠を開いた。関数は、命令のまとまりだ。",
  },
  {
    id: 6,
    name: "敵ではない影",
    enemyId: "exception_shadow",
    enemyName: "敵ではない影",
    enemyHp: 20,
    concept: "そうでなければ",
    mentorName: "道化師",
    mentorRole: "言葉を反転と例外として扱う",
    playerName: "道化師",
    enemyTrait: "敵ではない時だけ手を伸ばせる",
    introDialogue: [
      {
        speaker: "enemy",
        name: "敵ではない影",
        text: "敵と呼ぶなら、私は敵になる。",
      },
      {
        speaker: "player",
        name: "道化師",
        text: "呼び方を疑う。敵ではないなら、攻撃ではなく手を伸ばす。",
      },
    ],
    learningGoal: "条件に当てはまらない場合や例外を読む",
    hint: `正面から見た意味だけが答えではない。

もし 敵が敵ではない なら 手を伸ばす
そうでなければ 観察する

条件の裏側を読むと、攻撃ではない突破口が見える。`,
    sampleCode: `もし 敵が敵ではない なら 手を伸ばす
そうでなければ 観察する`,
    successMessage: "影は敵ではなかった。言葉の意味は、場面によって変わる。",
  },
];

export function getStageById(id: number): StageData | undefined {
  return STAGES.find((stage) => stage.id === id);
}

export function getNextStage(currentId: number): StageData | undefined {
  const currentIndex = STAGES.findIndex((stage) => stage.id === currentId);
  if (currentIndex >= 0 && currentIndex < STAGES.length - 1) {
    return STAGES[currentIndex + 1];
  }
  return undefined;
}
