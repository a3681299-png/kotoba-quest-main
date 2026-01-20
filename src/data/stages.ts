// ステージデータ定義
// 各ステージで1つのプログラミング概念に集中する設計

export interface TutorialStep {
  message: string;
  highlightElement?: string; // ハイライトするUI要素のセレクタ
  waitForAction?: "code_input" | "execute" | "none";
}

export interface StageData {
  id: number;
  name: string;
  enemyId: string;
  enemyName: string;
  enemyHp: number;
  learningGoal: string; // このステージで学ぶこと
  hint: string; // ヒントテキスト
  sampleCode: string; // お手本コード
  successMessage: string; // クリア時のメッセージ
  tutorialSteps?: TutorialStep[]; // チュートリアル（オプション）
}

export const STAGES: StageData[] = [
  // ステージ1: 攻撃の基本
  {
    id: 1,
    name: "はじめての魔法",
    enemyId: "slime",
    enemyName: "スライム",
    enemyHp: 10,
    learningGoal: "攻撃() コマンドを覚える",
    hint: `魔法を唱えて攻撃しよう！

攻撃("ファイア")

と入力して、▶️ボタンを押してね！`,
    sampleCode: `攻撃("ファイア")`,
    successMessage: "すごい！初めての魔法が成功したね！",
    tutorialSteps: [
      {
        message: "ようこそ！コードで魔法を唱えて敵を倒そう！",
        waitForAction: "none",
      },
      {
        message: '下のエディタに「攻撃("ファイア")」と入力してね',
        highlightElement: ".code-editor",
        waitForAction: "code_input",
      },
      {
        message: "▶️ボタンを押して魔法を唱えよう！",
        highlightElement: ".execute-button",
        waitForAction: "execute",
      },
    ],
  },

  // ステージ2: ループで連続攻撃
  {
    id: 2,
    name: "連続攻撃をマスター",
    enemyId: "slime_group",
    enemyName: "スライム軍団",
    enemyHp: 20,
    learningGoal: "繰り返す() で同じ処理を何度も実行",
    hint: `1回の攻撃では倒せない！
繰り返しを使おう！

繰り返す(2) {
  攻撃("ファイア")
}

これで2回攻撃できるよ！`,
    sampleCode: `繰り返す(2) {
  攻撃("ファイア")
}`,
    successMessage: "ループをマスター！同じコードを何度も書かなくていいね！",
  },

  // ステージ3: 防御を覚える
  {
    id: 3,
    name: "防御の重要性",
    enemyId: "goblin",
    enemyName: "ゴブリン",
    enemyHp: 30,
    learningGoal: "防御() でダメージを軽減",
    hint: `敵が攻撃してくる！
防御() でダメージを半分にできるよ！

攻撃("ファイア")
防御()

攻撃と防御を組み合わせよう！`,
    sampleCode: `攻撃("ファイア")
防御()`,
    successMessage: "防御バッチリ！敵の攻撃を読んで備えることが大切だね！",
  },

  // ステージ4: 変数でパワーアップ
  {
    id: 4,
    name: "変数でパワーアップ",
    enemyId: "ogre",
    enemyName: "オーガ",
    enemyHp: 50,
    learningGoal: "変数を使って攻撃力を上げる",
    hint: `敵が硬い！変数で攻撃力を上げよう！

変数 威力 = 20
攻撃("ファイア")
防御()

「威力」という名前の箱に20を入れると、
攻撃力が20になるよ！`,
    sampleCode: `変数 威力 = 20
攻撃("ファイア")
防御()`,
    successMessage: "変数を使いこなせるようになった！数を自由に変えられるよ！",
  },

  // ステージ5: 条件分岐で戦略
  {
    id: 5,
    name: "状況を見て判断",
    enemyId: "orc",
    enemyName: "オーク",
    enemyHp: 80,
    learningGoal: "もし() で条件によって行動を変える",
    hint: `敵のHPが多い時と少ない時で
攻撃を変えよう！

もし(敵の体力 > 50) {
  攻撃("ファイア")
} そうでなければ {
  攻撃("サンダー")
}
防御()

条件によって違う魔法を使えるよ！`,
    sampleCode: `もし(敵の体力 > 50) {
  攻撃("ファイア")
} そうでなければ {
  攻撃("サンダー")
}
防御()`,
    successMessage: "条件分岐をマスター！状況に合わせて行動を変えられるね！",
  },

  // ステージ6: ボス戦
  {
    id: 6,
    name: "ドラゴン討伐【ボス】",
    enemyId: "dragon",
    enemyName: "ドラゴン",
    enemyHp: 150,
    learningGoal: "全ての技術を組み合わせる",
    hint: `最強の敵、ドラゴン！
今まで学んだことを全て使おう！

変数 威力 = 25
繰り返す(3) {
  攻撃("ファイア")
}
防御()

変数 + 繰り返し + 防御 の組み合わせだ！`,
    sampleCode: `変数 威力 = 25
繰り返す(3) {
  攻撃("ファイア")
}
防御()`,
    successMessage:
      "🎉 ドラゴンを倒した！全クリおめでとう！君は立派なプログラマーだ！",
  },
];

// ステージIDからステージデータを取得
export function getStageById(id: number): StageData | undefined {
  return STAGES.find((stage) => stage.id === id);
}

// 次のステージを取得
export function getNextStage(currentId: number): StageData | undefined {
  const currentIndex = STAGES.findIndex((stage) => stage.id === currentId);
  if (currentIndex >= 0 && currentIndex < STAGES.length - 1) {
    return STAGES[currentIndex + 1];
  }
  return undefined;
}
