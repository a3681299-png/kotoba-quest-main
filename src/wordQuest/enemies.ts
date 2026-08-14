import type { EnemyDefinition, EnemyId } from "./types";

export const ENEMIES: readonly EnemyDefinition[] = [
  {
    id: "ember-maw",
    name: "火喰らいの獣",
    epithet: "焼き跡を積み上げるもの",
    description:
      "煤けた獣は、こちらが手を出すたびに炎を吐き戻し、同じ構えを続けるほど自らを焦がしていく。",
    readingClue:
      "私に触れるたび、その手には火の粉が残る。同じ手を使い続ければ、いずれ自分の炎に飲まれる。冷ます術を持つ者だけが、長く戦える。",
    maxHp: 16,
    basePower: 3,
    initialStatuses: [],
    reactions: [
      {
        id: "ember-rage-on-hit",
        trigger: { kind: "after-action", action: "attack" },
        effects: [
          { kind: "add-enemy-status", status: "enraged" },
          { kind: "add-enemy-power", amount: 1 },
        ],
        log: "傷が胸の火へ移り、敵の攻撃力が上がった。",
      },
    ],
    solutionHints: [
      {
        id: "ember-basic",
        label: "焚き付けを抑える",
        description: "冷ますを織り交ぜ、自滅しない程度に炎上を抑えて突破する。",
        kind: "basic",
        requiresActions: ["attack"],
        requiresStatuses: [],
        bonusScore: 0,
        maxEmberStackAtMost: 8,
      },
      {
        id: "ember-mastery",
        label: "火を飼いならす",
        description: "常に低い炎上を保ったまま、危険域に触れずに突破する。",
        kind: "mastery",
        requiresActions: ["attack"],
        requiresStatuses: [],
        bonusScore: 4,
        maxEmberStackAtMost: 4,
      },
    ],
    rewardPool: [
      "condition.player_attacked",
      "condition.enemy_enraged",
      "action.counter",
      "connector.after",
      "modifier.twice",
      "action.guard",
    ],
    icon: "火",
    accent: "#d85b42",
    isBoss: false,
  },
  {
    id: "gaze-idol",
    name: "見張りの石像",
    epithet: "視線で歩みを縫うもの",
    description:
      "石像の目は動くものだけを追う。強い光を受けると、瞼の紋様が閉じる。",
    readingClue:
      "私は見ている間だけ動きを縛る。けれど光を向けられると目を閉じ、その場で止まる。",
    maxHp: 30,
    basePower: 3,
    initialStatuses: ["watching"],
    reactions: [
      {
        id: "idol-stops-in-light",
        trigger: { kind: "after-action", action: "shine" },
        effects: [
          { kind: "add-enemy-status", status: "illuminated" },
          { kind: "add-enemy-status", status: "stopped" },
          { kind: "remove-enemy-status", status: "watching" },
        ],
        log: "光を受けた石像が目を閉じ、動きを止めた。",
      },
    ],
    solutionHints: [
      {
        id: "idol-basic",
        label: "正面突破",
        description: "基本攻撃でも石を削り切れる。",
        kind: "basic",
        requiresActions: ["attack"],
        requiresStatuses: [],
        bonusScore: 0,
      },
      {
        id: "idol-light",
        label: "視線を断つ",
        description: "視線を条件に光を当て、止まった隙を使う。",
        kind: "mastery",
        requiresActions: ["shine", "attack"],
        requiresStatuses: ["stopped"],
        bonusScore: 3,
      },
    ],
    rewardPool: [
      "condition.enemy_watching",
      "condition.enemy_not_watching",
      "condition.enemy_stopped",
      "action.shine",
      "action.stop",
      "modifier.negate",
    ],
    icon: "眼",
    accent: "#5b8fa8",
    isBoss: false,
  },
  {
    id: "echo-moth",
    name: "反響の蛾",
    epithet: "同じ言葉を食べるもの",
    description:
      "薄い羽は同じ言葉を二度と聞き入れない。繰り返そうとした声は、宙で虚しく反響するだけに終わる。",
    readingClue:
      "同じ言葉を続けて紡ぐ者を、私は聞き入れない。声を変え、また変え、飽きさせずに語りかけよ。",
    maxHp: 18,
    basePower: 2,
    initialStatuses: [],
    reactions: [],
    solutionHints: [
      {
        id: "moth-basic",
        label: "言葉を選ぶ",
        description: "攻撃と防御などを言い換えながら攻めれば突破できる。",
        kind: "basic",
        requiresActions: ["attack"],
        requiresStatuses: [],
        bonusScore: 0,
      },
      {
        id: "moth-variety",
        label: "三様の構え",
        description: "攻撃、停止、反撃と三種の言葉を使い分けて隙なく攻める。",
        kind: "special",
        requiresActions: ["stop", "attack", "counter"],
        requiresStatuses: [],
        bonusScore: 2,
      },
    ],
    rewardPool: [
      "connector.whenever",
      "connector.after",
      "modifier.again",
      "modifier.twice",
      "action.bind",
      "condition.enemy_bound",
      "subject.weakest",
    ],
    icon: "響",
    accent: "#a16fb5",
    isBoss: false,
  },
  {
    id: "forgotten-king",
    name: "忘名王アステル",
    epithet: "名を失った王",
    description:
      "王冠の内側には古い名が刻まれている。名を思い出した瞬間だけ、石の身体に隙が生まれる。",
    readingClue:
      "剣も火も、名のない私を止められない。昔の名を呼ばれた時だけ身体が止まり、鎖が届く。",
    maxHp: 12,
    basePower: 3,
    initialStatuses: [],
    reactions: [
      {
        id: "king-remembers-name",
        trigger: { kind: "after-action", action: "call_name" },
        effects: [
          { kind: "add-enemy-status", status: "named" },
          { kind: "add-enemy-status", status: "stopped" },
          { kind: "add-enemy-status", status: "exposed" },
          { kind: "add-score", amount: 2 },
        ],
        log: "アステルの名が玉座へ響き、王の身体が止まった。",
      },
      {
        id: "king-bound-opening",
        trigger: { kind: "enemy-status-added", status: "bound" },
        effects: [
          { kind: "add-enemy-status", status: "exposed" },
          { kind: "damage-enemy", amount: 2 },
        ],
        log: "停止した王へ鎖が届き、王冠の隙が開いた。",
      },
    ],
    solutionHints: [
      {
        id: "king-basic",
        label: "消耗戦",
        description: "初期語彙でも三つの攻撃文を重ねれば届く。",
        kind: "basic",
        requiresActions: ["attack"],
        requiresStatuses: [],
        bonusScore: 0,
      },
      {
        id: "king-name-chain",
        label: "真名の鎖",
        description: "名前を呼び、停止を条件に拘束し、最後に攻撃する。",
        kind: "mastery",
        requiresActions: ["call_name", "bind", "attack"],
        requiresStatuses: ["named", "bound"],
        bonusScore: 5,
      },
    ],
    rewardPool: [],
    icon: "王",
    accent: "#c4a45b",
    isBoss: true,
  },
] as const;

export const ENEMY_BY_ID: Readonly<Record<EnemyId, EnemyDefinition>> =
  Object.fromEntries(ENEMIES.map((enemy) => [enemy.id, enemy]));

export const NORMAL_ENEMY_IDS = ENEMIES.filter((enemy) => !enemy.isBoss).map(
  (enemy) => enemy.id,
);

export const BOSS_ENEMY_ID = "forgotten-king";

export function getEnemy(enemyId: EnemyId): EnemyDefinition {
  const enemy = ENEMY_BY_ID[enemyId];
  if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);
  return enemy;
}
