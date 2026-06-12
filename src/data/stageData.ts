import type { Element } from "../parser/ast";
import type { EnemyData, StageConfig, SummonableEnemy } from "../engine/types";

// ─── Wave・ステージ型定義 ─────────────────────────────

export interface WaveData {
  waveNumber: number;
  title: string;
  description: string;
  enemies: EnemyData[];
  hint: string;
  codeExample?: string;
  // StageConfig.stateGimmick を Wave 単位で上書き
  stateGimmickOverride?: import("../engine/types").StateGimmick | null;
  // true の場合、Wave 内の敵が同時に出現する（Stage4 Wave3 専用）
  simultaneous?: boolean;
  // Stage 5 Wave 3 以降: 召喚可能な敵テンプレート（ボスがランタイムで召喚する）
  summonableEnemies?: SummonableEnemy[];
  // Stage3 以降: NPC コード領域
  npc?: {
    name: string;              // NPC の名前（例: "マリア"）
    buggyCode: string;         // バグが埋め込まれた初期コード（プレイヤーが修正する）
    correctCode: string;       // 正解コード（ヒント表示やデバッグ用）
    bugDescription: string;    // バグの説明（ヒント用）
    npcSpeech?: string;        // バグに気づくきっかけのセリフ
  };
}

export interface StageData {
  stageNumber: number;
  title: string;
  theme: string;               // "順次実行と単属性魔法の基本"
  waves: WaveData[];
  config: StageConfig;
  clearReward: ClearReward;
}

export interface ClearReward {
  unlocksAttribute: Element | null;
  message: string;
}

// ─── Stage 1 ─────────────────────────────────────────

export const STAGE1: StageData = {
  stageNumber: 1,
  title: "はじめての魔法",
  theme: "順次実行と単属性魔法の基本",
  config: {
    stageNumber: 1,
    initialMaxMp: 50,
    playerAttack: 20,
    stateGimmick: null,
  },
  clearReward: {
    unlocksAttribute: null,
    message: "ステージ1クリア！魔法の基本を覚えた！",
  },
  waves: [
    {
      waveNumber: 1,
      title: "Wave 1 — はじめての戦い",
      description: "コードを書くと魔法が出る。敵の様子を見て有効な魔法を選ぼう。",
      hint: "「魔法(フレイム)」と書くと火の魔法が出るよ。繰り返しループの中に書くと毎ラウンド使えるよ！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  魔法(フレイム)",
      enemies: [
        {
          id: "slime_w1",
          name: "みどりスライム",
          maxHp: 40,
          defense: 5,
          element: null,
          attackPatterns: [{ minDamage: 5, maxDamage: 8 }],
        },
      ],
    },
    {
      waveNumber: 2,
      title: "Wave 2 — 2体の敵",
      description: "片方は攻撃してくる。防御コマンドも使ってみよう。",
      hint: "「防御()」を使うと敵の攻撃ダメージを10減らせるよ。MPが残っているときは魔法で攻撃しよう！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  もし 自分のHP が 50 以下 ならば:\n    防御()\n  そうでなければ:\n    魔法(フレイム)",
      enemies: [
        {
          id: "slime_a",
          name: "あかスライム",
          maxHp: 30,
          defense: 3,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 18 }],
        },
        {
          id: "slime_b",
          name: "あおスライム",
          maxHp: 30,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 0, maxDamage: 0 }],
        },
      ],
    },
    {
      waveNumber: 3,
      title: "Wave 3 — ボス戦",
      description: "HPの高いボスが登場。MPを管理しながら戦おう。",
      hint: "MPが足りなくなったら「待機()」でMPを回復させよう。回復量はラウンドごとに増えるよ！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  もし 自分のMP が 10 以上 ならば:\n    魔法(フレイム)\n  そうでなければ:\n    待機()",
      enemies: [
        {
          id: "slime_king",
          name: "スライムキング",
          maxHp: 150,
          defense: 10,
          element: null,
          attackPatterns: [
            { minDamage: 15, maxDamage: 20 },
            { minDamage: 25, maxDamage: 30, condition: "hp_below_half" },
          ],
        },
      ],
    },
  ],
};

// ─── Stage 2 ─────────────────────────────────────────

export const STAGE2: StageData = {
  stageNumber: 2,
  title: "繰り返しの力",
  theme: "繰り返しと行動の効率化",
  config: {
    stageNumber: 2,
    initialMaxMp: 60,
    playerAttack: 25,
    stateGimmick: null,
  },
  clearReward: {
    unlocksAttribute: "氷",
    message: "ステージ2クリア！氷の魔法「フロスト」が使えるようになった！",
  },
  waves: [
    {
      waveNumber: 1,
      title: "Wave 1 — くり返して倒せ",
      description: "同じ攻撃を何度も書かなくてもいい方法がある。",
      hint: "「繰り返す(3):」の中に魔法を書くと3回まとめて使えるよ。コードが短くなる！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  繰り返す(3):\n    魔法(アクア)",
      enemies: [
        {
          id: "rock_slime_w1",
          name: "いわスライム",
          maxHp: 60,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 10, maxDamage: 12 }],
        },
      ],
    },
    {
      waveNumber: 2,
      title: "Wave 2 — 長いコードは通じない",
      description: "この敵はコードが長いと攻撃を弾いてしまう！短くまとめよう。",
      hint: "「繰り返す」を使うとコードが短くなって、この敵にしっかりダメージが通るよ！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  繰り返す(4):\n    魔法(スパーク)",
      enemies: [
        {
          id: "code_resist_a",
          name: "まものA（コード耐性あり）",
          maxHp: 80,
          defense: 5,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 15 }],
        },
        {
          id: "code_resist_b",
          name: "まものB（コード耐性あり）",
          maxHp: 80,
          defense: 5,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 15 }],
        },
      ],
    },
    {
      waveNumber: 3,
      title: "Wave 3 — 繰り返しボス",
      description: "長いコードをはじくボス。短く書いて突破しよう！",
      hint: "ボスは有効文字数が多いとほとんどダメージを弾く。繰り返し構文で短くまとめよう！",
      codeExample: "繰り返す(敵が生きている あいだ):\n  繰り返す(5):\n    魔法(フレイム)",
      enemies: [
        {
          id: "loop_boss",
          name: "コードウォール",
          maxHp: 200,
          defense: 15,
          element: null,
          attackPatterns: [
            { minDamage: 18, maxDamage: 22 },
            { minDamage: 28, maxDamage: 35, condition: "hp_below_half" },
          ],
        },
      ],
    },
  ],
};

// ─── Stage 3〜6 はプレースホルダー ────────────────────
// (コンテンツ設計フェーズで詳細を追加予定)

export const STAGE3: StageData = {
  stageNumber: 3,
  title: "なかまとの連携",
  theme: "変数・属性選択・協力コードの修正",
  config: { stageNumber: 3, initialMaxMp: 70, playerAttack: 30, stateGimmick: null },
  clearReward: { unlocksAttribute: "風", message: "ステージ3クリア！風の魔法「ゲイル」が使えるようになった！" },
  waves: [
    {
      waveNumber: 1,
      title: "Wave 1 — なかまの登場",
      description: "マリアという仲間が一緒に戦ってくれる。でも、なんだか風魔法の威力が弱い気がする…",
      hint: "なかまのコードを見てみよう。「NPC のコード」タブを開いて、使っている魔法を確認してみて！",
      codeExample:
        "繰り返す(敵が生きている あいだ):\n  魔法(フレイム)\n  魔法(アクア)",
      enemies: [
        {
          id: "kaze_slime_w1",
          name: "かぜよけスライム",
          maxHp: 60,
          defense: 5,
          element: null,
          attackPatterns: [{ minDamage: 10, maxDamage: 15 }],
        },
      ],
      npc: {
        name: "マリア",
        npcSpeech: "風の魔法がうまく通らない気がする…なんでだろう？",
        bugDescription: "「魔法(フレイム)」を使っているが、本当は「魔法(ゲイル)」を使うべき",
        buggyCode:
          "繰り返す(敵が生きている あいだ):\n  魔法(フレイム)",
        correctCode:
          "繰り返す(敵が生きている あいだ):\n  魔法(ゲイル)",
      },
    },
    {
      waveNumber: 2,
      title: "Wave 2 — 変数で連携",
      description: "プレイヤーが変数を使ってなかまに合図を送れる。なかまのコードを読んで、変数名のズレを直そう。",
      hint: "プレイヤーコードの変数名と、なかまが参照している変数名を合わせよう。「プレイヤー.変数名」で参照できるよ。",
      codeExample:
        "繰り返す(敵が生きている あいだ):\n  あいず = 1\n  魔法(フレイム)\n  魔法(アクア)",
      enemies: [
        {
          id: "iron_slime_a",
          name: "てつスライムA",
          maxHp: 60,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 16 }],
        },
        {
          id: "iron_slime_b",
          name: "てつスライムB",
          maxHp: 60,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 16 }],
        },
      ],
      npc: {
        name: "マリア",
        npcSpeech: "あれ…プレイヤーが合図を出してくれているはずなのに、うまく受け取れていないみたい",
        bugDescription: "「プレイヤー.しんごう」を参照しているが、プレイヤーが設定しているのは「あいず」。変数名のズレを修正する必要がある",
        buggyCode:
          "繰り返す(敵が生きている あいだ):\n  もし プレイヤー.しんごう が 1 と等しい ならば:\n    魔法(ゲイル)\n  そうでなければ:\n    待機()",
        correctCode:
          "繰り返す(敵が生きている あいだ):\n  もし プレイヤー.あいず が 1 と等しい ならば:\n    魔法(ゲイル)\n  そうでなければ:\n    待機()",
      },
    },
    {
      waveNumber: 3,
      title: "Wave 3 — 連携合体魔法",
      description: "ボスには合体魔法が必要！プレイヤーとなかまの魔法を合わせて3属性以上にすると合体魔法が発動するよ。なかまのコードに2つのバグがある。",
      hint: "なかまのコードを直して、プレイヤーとなかまで3属性（火・水・風など）を揃えよう！合体魔法のMPは80以上必要だよ。",
      codeExample:
        "繰り返す(敵が生きている あいだ):\n  もし 自分のMP が 80 以上 ならば:\n    魔法(フレイム)\n    魔法(アクア)\n  そうでなければ:\n    待機()",
      enemies: [
        {
          id: "combo_boss",
          name: "ゴーレムキング",
          maxHp: 160,
          defense: 8,
          element: null,
          attackPatterns: [
            { minDamage: 12, maxDamage: 18 },
            { minDamage: 20, maxDamage: 28, condition: "hp_below_half" },
          ],
        },
      ],
      npc: {
        name: "マリア",
        npcSpeech: "一緒に大技を出そう！…あれ、うまく発動しない。コードを見直してみて",
        bugDescription: "バグ1: 「待機()」ではなく「魔法(ゲイル)」を使うべき。バグ2: MPの条件が「80以上」ではなく「80以下」になっている",
        buggyCode:
          "繰り返す(敵が生きている あいだ):\n  もし 自分のMP が 80 以上 ならば:\n    待機()\n  そうでなければ:\n    待機()",
        correctCode:
          "繰り返す(敵が生きている あいだ):\n  もし 自分のMP が 80 以上 ならば:\n    魔法(ゲイル)\n  そうでなければ:\n    待機()",
      },
    },
  ],
};

export const STAGE4: StageData = {
  stageNumber: 4,
  title: "条件分岐と合体魔法",
  theme: "条件分岐と合体魔法の本格導入",
  config: { stageNumber: 4, initialMaxMp: 80, playerAttack: 35, stateGimmick: { type: "wave1" } },
  clearReward: { unlocksAttribute: null, message: "ステージ4クリア！五属性合体魔法を使いこなした！" },
  waves: [
    {
      waveNumber: 1,
      title: "Wave 1 — 状態を見抜け",
      description: "敵がラウンドごとに属性状態を変える。有効な属性だけ通り、間違えると敵のHPが回復する！",
      hint: "「もし 敵が火状態 ならば: 魔法(フレイム)」のように状態に合わせて魔法を選ぼう。間違えると逆効果！",
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 敵が火状態 ならば:",
        "    魔法(フレイム)",
        "  そうでなければ もし 敵が水状態 ならば:",
        "    魔法(アクア)",
        "  そうでなければ:",
        "    魔法(スパーク)",
      ].join("\n"),
      enemies: [
        {
          id: "s4_state_slime_w1",
          name: "へんしんスライム",
          maxHp: 80,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 18 }],
        },
      ],
    },
    {
      waveNumber: 2,
      title: "Wave 2 — 2体同時の状態変化",
      description: "2体それぞれが別の有効属性を持つ。5属性すべてに対応するコードを書こう。",
      hint: "2体の敵の状態は独立してランダムに変わる。「敵[1番目]へ 魔法(…)」でターゲットを指定できるよ。",
      stateGimmickOverride: { type: "wave2" },
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 敵が火状態 ならば:",
        "    魔法(フレイム)",
        "  そうでなければ もし 敵が水状態 ならば:",
        "    魔法(アクア)",
        "  そうでなければ もし 敵が雷状態 ならば:",
        "    魔法(スパーク)",
        "  そうでなければ もし 敵が氷状態 ならば:",
        "    魔法(フロスト)",
        "  そうでなければ:",
        "    魔法(ゲイル)",
      ].join("\n"),
      enemies: [
        { id: "s4_2a", name: "へんしんスライムA", maxHp: 70, defense: 8, element: null, attackPatterns: [{ minDamage: 10, maxDamage: 15 }] },
        { id: "s4_2b", name: "へんしんスライムB", maxHp: 70, defense: 8, element: null, attackPatterns: [{ minDamage: 10, maxDamage: 15 }] },
      ],
    },
    {
      waveNumber: 3,
      title: "Wave 3 — 五属性合体魔法で一掃！",
      description: "4体のゴーレムとボスが同時登場！MP 120 を溜めて五属性合体魔法でまとめて吹き飛ばせ！ボスはコードが長いとダメージを下げてくる。",
      hint: "有効文字数 80 を超えるとダメージが下がる。繰り返し構文で短くまとめよう。MP120 になったら 5 種の魔法を同じラウンドで使って五属性合体魔法を発動！",
      stateGimmickOverride: { type: "wave2" },
      simultaneous: true,
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 120 以上 ならば:",
        "    魔法(フレイム)",
        "    魔法(アクア)",
        "    魔法(スパーク)",
        "    魔法(フロスト)",
        "    魔法(ゲイル)",
        "  そうでなければ:",
        "    防御()",
      ].join("\n"),
      enemies: [
        { id: "s4_mob_a", name: "ゴーレムA", maxHp: 120, defense: 5, element: null, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] },
        { id: "s4_mob_b", name: "ゴーレムB", maxHp: 120, defense: 5, element: null, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] },
        { id: "s4_mob_c", name: "ゴーレムC", maxHp: 120, defense: 5, element: null, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] },
        { id: "s4_mob_d", name: "ゴーレムD", maxHp: 120, defense: 5, element: null, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] },
        { id: "s4_boss", name: "コードウォール", maxHp: 200, defense: 15, element: null, charLimit: 80,
          attackPatterns: [{ minDamage: 20, maxDamage: 30 }, { minDamage: 30, maxDamage: 45, condition: "hp_below_half" }] },
      ],
    },
  ],
};

export const STAGE5: StageData = {
  stageNumber: 5,
  title: "総合課題",
  theme: "これまで学んだすべてを使いこなす",
  config: { stageNumber: 5, initialMaxMp: 90, playerAttack: 40, stateGimmick: null },
  clearReward: { unlocksAttribute: null, message: "ステージ5クリア！総合力を身につけた！" },
  waves: [
    {
      waveNumber: 1,
      title: "Wave 1 — 性質の違う2体",
      description: "ゴブリンは高火力・低耐久、トロルは低火力・高耐久。どちらを先に倒すべきか判断しよう。",
      hint: "ゴブリンを早く倒さないと連続でダメージを受ける。トロルは水属性、弱点は雷。「敵[1番目]へ」「敵[2番目]へ」でターゲット指定できるよ。",
      simultaneous: true,
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 10 以上 ならば:",
        "    敵[1番目]へ 魔法(アクア)",
        "  そうでなければ:",
        "    防御()",
      ].join("\n"),
      enemies: [
        {
          id: "s5_goblin",
          name: "ゴブリンアタッカー",
          maxHp: 60,
          defense: 3,
          element: "火",
          attackPatterns: [{ minDamage: 25, maxDamage: 30 }],
        },
        {
          id: "s5_troll",
          name: "トロルガード",
          maxHp: 180,
          defense: 12,
          element: "水",
          attackPatterns: [{ minDamage: 8, maxDamage: 12 }],
        },
      ],
    },
    {
      waveNumber: 2,
      title: "Wave 2 — 回復役を見抜け",
      description: "状態変化スライムをいくら倒してもヒーラーが回復してしまう。先に倒すべきは…？",
      hint: "ヒーラーは毎ラウンド味方を +20HP 回復させる。先にヒーラーを倒そう！ヒーラーは火属性タイプ（弱点はアクア=水）で属性は変わらない。状態変化スライム（1番目）は毎ラウンド状態が変わるよ。",
      simultaneous: true,
      stateGimmickOverride: { type: "wave2" },
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 10 以上 ならば:",
        "    敵[2番目]へ 魔法(アクア)",
        "  そうでなければ:",
        "    防御()",
      ].join("\n"),
      enemies: [
        {
          id: "s5_state_slime",
          name: "状態変化スライム",
          maxHp: 120,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 12, maxDamage: 18 }],
        },
        {
          id: "s5_healer",
          name: "ヒーラー",
          maxHp: 80,
          defense: 8,
          element: "火",  // 火属性タイプ → 通常相性で アクア が 2x 弱点
          attackPatterns: [{ minDamage: 8, maxDamage: 10 }],
          healAllies: { amount: 20 },
          // 状態変化ギミックの影響を受けず、通常の属性相性のみで判定する
          fixedState: null,
        },
      ],
    },
    {
      waveNumber: 3,
      title: "Wave 3 — 総合ボス",
      description: "総合ボスはチャージして大攻撃を撃ってくる。HP が減ると雑魚を呼ぶ！合体魔法を撃つタイミングを見極めよう。",
      hint: "ボスは3ラウンドごとにチャージ→次ラウンドで60ダメージ！防御()で軽減できるよ。HP70%と30%で雑魚を3体ずつ召喚。合体魔法（全体攻撃）の出しどころに注意。",
      simultaneous: true,
      summonableEnemies: [
        {
          templateId: "s5_kobold",
          enemy: {
            id: "s5_kobold",
            name: "コボルト",
            maxHp: 30,
            defense: 3,
            element: null,
            attackPatterns: [{ minDamage: 8, maxDamage: 12 }],
          },
        },
      ],
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 120 以上 ならば:",
        "    魔法(フレイム)",
        "    魔法(アクア)",
        "    魔法(スパーク)",
        "    魔法(フロスト)",
        "    魔法(ゲイル)",
        "  そうでなければ もし 自分のHP が 50 以下 ならば:",
        "    防御()",
        "  そうでなければ:",
        "    魔法(フレイム)",
      ].join("\n"),
      enemies: [
        {
          id: "s5_boss",
          name: "総合ボス",
          maxHp: 400,
          defense: 8,
          element: null,
          attackPatterns: [{ minDamage: 22, maxDamage: 28 }],
          chargeAttack: {
            interval: 3,
            damage: 60,
            chargeMessage: "総合ボスが力を溜めている…！次のラウンドに大攻撃が来る！",
          },
          summonOnHpThreshold: [
            { hpRatio: 0.7, summonEnemyId: "s5_kobold", count: 3 },
            { hpRatio: 0.3, summonEnemyId: "s5_kobold", count: 3 },
          ],
        },
      ],
    },
  ],
};

export const STAGE6: StageData = {
  stageNumber: 6,
  title: "最終決戦",
  theme: "学習型ラスボスによる総合振り返り",
  config: { stageNumber: 6, initialMaxMp: 100, playerAttack: 45, stateGimmick: null },
  clearReward: { unlocksAttribute: null, message: "エンディング！すべてを乗り越えた！" },
  waves: [
    // ─── Wave 1: Stage 1 ボス強化版 ─────────────────
    {
      waveNumber: 1,
      title: "Wave 1 — スライムキング 再戦",
      description: "ステージ1のスライムキングが強くなって帰ってきた。基本に立ち返り、確実に攻めよう。",
      hint: "Stage 1 と同じく、MP 管理しながら魔法と防御を切り替えよう。",
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 10 以上 ならば:",
        "    魔法(フレイム)",
        "  そうでなければ:",
        "    待機()",
      ].join("\n"),
      enemies: [
        {
          id: "s6_slime_king",
          name: "スライムキング・強",
          maxHp: 225,    // 150 × 1.5
          defense: 15,   // 10 × 1.5
          element: null,
          attackPatterns: [
            { minDamage: 22, maxDamage: 30 },  // 15-20 × 1.5
            { minDamage: 37, maxDamage: 45, condition: "hp_below_half" },  // 25-30 × 1.5
          ],
        },
      ],
    },
    // ─── Wave 2: Stage 2 ボス強化版 ─────────────────
    {
      waveNumber: 2,
      title: "Wave 2 — コードウォール 再戦",
      description: "コードウォールが帰還。短く整理したコードで突破しよう。",
      hint: "繰り返し構文で短く書こう！文字数を抑えると有利になる。",
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  繰り返す(5):",
        "    魔法(アクア)",
      ].join("\n"),
      enemies: [
        {
          id: "s6_code_wall",
          name: "コードウォール・強",
          maxHp: 300,   // 200 × 1.5
          defense: 22,  // 15 × 1.5
          element: null,
          attackPatterns: [
            { minDamage: 27, maxDamage: 33 },  // 18-22 × 1.5
            { minDamage: 42, maxDamage: 52, condition: "hp_below_half" },  // 28-35 × 1.5
          ],
        },
      ],
    },
    // ─── Wave 3: Stage 3 ボス強化版（NPC マリア再登場）─────
    {
      waveNumber: 3,
      title: "Wave 3 — ゴーレムキング 再戦",
      description: "再びマリアと共に戦う。正しいコードを書いて連携合体魔法で突破しよう。",
      hint: "プレイヤーとなかまで3属性を揃えると連携合体魔法が発動！マリアは風魔法を使うよ。",
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 80 以上 ならば:",
        "    魔法(フレイム)",
        "    魔法(アクア)",
        "  そうでなければ:",
        "    待機()",
      ].join("\n"),
      enemies: [
        {
          id: "s6_golem_king",
          name: "ゴーレムキング・強",
          maxHp: 240,    // 160 × 1.5
          defense: 12,   // 8 × 1.5
          element: null,
          attackPatterns: [
            { minDamage: 18, maxDamage: 27 },  // 12-18 × 1.5
            { minDamage: 30, maxDamage: 42, condition: "hp_below_half" },  // 20-28 × 1.5
          ],
        },
      ],
      npc: {
        name: "マリア",
        npcSpeech: "また一緒に戦えるね！合体魔法で決めよう！",
        bugDescription: "今回はバグなし。マリアが風魔法を使うだけ。",
        buggyCode: [
          "繰り返す(敵が生きている あいだ):",
          "  もし 自分のMP が 80 以上 ならば:",
          "    魔法(ゲイル)",
          "  そうでなければ:",
          "    待機()",
        ].join("\n"),
        correctCode: [
          "繰り返す(敵が生きている あいだ):",
          "  もし 自分のMP が 80 以上 ならば:",
          "    魔法(ゲイル)",
          "  そうでなければ:",
          "    待機()",
        ].join("\n"),
      },
    },
    // ─── Wave 4: Stage 4 ボス強化版 ─────────────────
    {
      waveNumber: 4,
      title: "Wave 4 — 状態変化ボス 再戦",
      description: "状態変化ボスが強化されて帰還。条件分岐で属性を切り替えよう。",
      hint: "敵の状態に合わせて魔法を切り替えよう。MP が貯まれば五属性合体魔法で一掃！",
      stateGimmickOverride: { type: "wave2" },
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のMP が 120 以上 ならば:",
        "    魔法(フレイム)",
        "    魔法(アクア)",
        "    魔法(スパーク)",
        "    魔法(フロスト)",
        "    魔法(ゲイル)",
        "  そうでなければ もし 敵が火状態 ならば:",
        "    魔法(フレイム)",
        "  そうでなければ もし 敵が水状態 ならば:",
        "    魔法(アクア)",
        "  そうでなければ もし 敵が雷状態 ならば:",
        "    魔法(スパーク)",
        "  そうでなければ もし 敵が氷状態 ならば:",
        "    魔法(フロスト)",
        "  そうでなければ:",
        "    魔法(ゲイル)",
      ].join("\n"),
      enemies: [
        {
          id: "s6_state_boss",
          name: "状態変化ボス・強",
          maxHp: 300,    // 200 × 1.5
          defense: 22,   // 15 × 1.5
          element: null,
          attackPatterns: [
            { minDamage: 30, maxDamage: 45 },  // 20-30 × 1.5
            { minDamage: 45, maxDamage: 67, condition: "hp_below_half" },  // 30-45 × 1.5
          ],
        },
      ],
    },
    // ─── Wave 5: 学習型ラスボス ─────────────────────
    {
      waveNumber: 5,
      title: "Wave 5 — 学習型ラスボス",
      description: "お前の戦い方は全て見ていた。お前の癖に適応した最後の試練だ。",
      hint: "ラスボスは過去の戦いから学習している。よく使う属性は通りにくい。合体魔法に頼り切ると威力が落ちる。守りが多いと強攻撃の間隔が短くなる。今までと違う戦い方を試そう！",
      simultaneous: true,
      codeExample: [
        "繰り返す(敵が生きている あいだ):",
        "  もし 自分のHP が 50 以下 ならば:",
        "    防御()",
        "  そうでなければ もし 自分のMP が 100 以上 ならば:",
        "    魔法(フレイム)",
        "    魔法(アクア)",
        "    魔法(スパーク)",
        "    魔法(フロスト)",
        "  そうでなければ:",
        "    魔法(ゲイル)",
      ].join("\n"),
      enemies: [
        {
          id: "s6_final_boss",
          name: "学習型ラスボス",
          maxHp: 500,
          defense: 10,
          element: null,
          adaptive: true,
          attackPatterns: [
            { minDamage: 25, maxDamage: 35 },
            { minDamage: 35, maxDamage: 50, condition: "hp_below_half" },
          ],
          chargeAttack: {
            interval: 3,
            damage: 70,
            chargeMessage: "ラスボスが力を溜めている…！次のラウンドに大攻撃が来る！",
          },
        },
      ],
    },
  ],
};

// ─── ステージ一覧 ─────────────────────────────────────

export const ALL_STAGES: StageData[] = [STAGE1, STAGE2, STAGE3, STAGE4, STAGE5, STAGE6];

export function getStage(stageNumber: number): StageData {
  const s = ALL_STAGES.find((s) => s.stageNumber === stageNumber);
  if (!s) throw new Error(`Stage ${stageNumber} が見つかりません`);
  return s;
}
