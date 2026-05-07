export type StageOneSpell = "フレイム" | "アクア" | "スパーク";
export type StageOneEnemyAction = "attack" | "defend";

export interface StageOneEnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  weakness: StageOneSpell;
  attackDamage: number;
  actionPattern: StageOneEnemyAction[];
  visibleHints: string[];
  notes: string[];
}

export interface StageOneWaveDefinition {
  id: number;
  name: string;
  learningGoal: string;
  notes: string[];
  sampleCode: string;
  enemies: StageOneEnemyDefinition[];
}

export interface StageOneDefinition {
  id: number;
  name: string;
  theme: string;
  startingPlayerHp: number;
  startingMaxMp: number;
  sampleCode: string;
  rules: string[];
  waves: StageOneWaveDefinition[];
}

export const STAGE_ONE_DEFINITION: StageOneDefinition = {
  id: 1,
  name: "順次実行と単属性魔法の基本",
  theme: "見た目のヒントを読みながら、単属性魔法を順番に実行して 3 ウェーブを突破する",
  startingPlayerHp: 100,
  startingMaxMp: 50,
  sampleCode: `使用(フレイム)
使用(スパーク)
使用(スパーク)
使用(アクア)
ぼうぎょする()
使用(アクア)
使用(アクア)`,
  rules: [
    "1行が1ターンの行動になります。",
    "Wave をクリアするとコード欄は空になり、次の Wave 用のコードを入れ直します。",
    "Wave に失敗した時は、その Wave 開始時点の HP / MP に戻って再挑戦できます。",
    "ターゲット指定は未実装のため、常に一番手前の生存敵を自動で狙います。",
    "単属性魔法の消費MPは 10。ターン終了ごとに最大MP +10、その時点の最大MPの 1/3 だけ回復します。",
    "防御中の敵に攻撃するとダメージが半分になります。",
    "ぼうぎょする() を使うと、そのターンの被ダメージを半分にできます。",
  ],
  waves: [
    {
      id: 1,
      name: "ふわふわした敵",
      learningGoal: "火が効きそうな見た目から、最初の単属性魔法を選ぶ",
      sampleCode: `使用(フレイム)`,
      notes: [
        "まずは順番に命令を書く体験を優先します。",
        "敵は倒されると攻撃前に消えるため、弱点を突けばノーダメージで突破できます。",
      ],
      enemies: [
        {
          id: "stage1-wave1-wata-slime",
          name: "わたスライム",
          maxHp: 23,
          weakness: "フレイム",
          attackDamage: 6,
          actionPattern: ["attack"],
          visibleHints: [
            "ふわふわした体で、火がつきやすそうに見える。",
            "基本攻撃しか使わない。",
          ],
          notes: ["フレイムなら一撃、他属性なら二撃前後を想定。"],
        },
      ],
    },
    {
      id: 2,
      name: "攻撃役と防御役",
      learningGoal: "敵ごとの行動の違いを見ながら、雷弱点を使って突破する",
      sampleCode: `使用(スパーク)
使用(スパーク)`,
      notes: [
        "ターゲット指定が未実装でも成立するよう、2体ともスパーク弱点にしています。",
        "攻撃役を先に倒すと被ダメージを減らせます。",
      ],
      enemies: [
        {
          id: "stage1-wave2-biri-kabuto",
          name: "びりカブト",
          maxHp: 23,
          weakness: "スパーク",
          attackDamage: 8,
          actionPattern: ["attack"],
          visibleHints: [
            "金属の殻が青く光り、雷に弱そうに見える。",
            "毎ターンこちらを殴ろうとする。",
          ],
          notes: ["一番前にいるため、自動ターゲットでは先に狙われます。"],
        },
        {
          id: "stage1-wave2-mamori-kabuto",
          name: "まもりカブト",
          maxHp: 23,
          weakness: "スパーク",
          attackDamage: 8,
          actionPattern: ["defend", "attack"],
          visibleHints: [
            "重い殻を持ち、ときどき身をかがめて守りを固める。",
            "防御中はダメージが通りにくい。",
          ],
          notes: ["防御ターンに殴るとダメージが半減します。"],
        },
      ],
    },
    {
      id: 3,
      name: "熱を帯びたボス",
      learningGoal: "水弱点のボスを相手に、少し長い戦闘を順番に組み立てる",
      sampleCode: `使用(アクア)
ぼうぎょする()
使用(アクア)
使用(アクア)`,
      notes: [
        "攻撃と防御を交互に使うので、敵の構えを見る練習になります。",
        "現状のサンプルコードでは防御なしでも突破できますが、防御を挟む余地は残しています。",
      ],
      enemies: [
        {
          id: "stage1-wave3-nettou-golem",
          name: "ねっとうゴーレム",
          maxHp: 57,
          weakness: "アクア",
          attackDamage: 12,
          actionPattern: ["attack", "defend"],
          visibleHints: [
            "体から熱い湯気が立ちのぼっていて、水が効きそうに見える。",
            "攻撃と防御を交互に使う。",
          ],
          notes: ["アクア2回と、防御中に当てる最後の1回で倒せる想定です。"],
        },
      ],
    },
  ],
};
