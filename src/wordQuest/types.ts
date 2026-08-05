export type WordCategory =
  | "subject"
  | "condition"
  | "connector"
  | "action"
  | "modifier";

export type SentenceSlot =
  | "subject"
  | "condition"
  | "connector"
  | "action"
  | "target"
  | "modifier";

export type WordRarity = "basic" | "common" | "rare";
export type WordId = string;
export type EnemyId = string;

export type ConditionEffectId =
  | "always"
  | "enemy_near"
  | "player_hurt"
  | "player_attacked"
  | "enemy_enraged"
  | "enemy_watching"
  | "enemy_not_watching"
  | "enemy_stopped"
  | "enemy_bound"
  | "enemy_named";

export type ActionEffectId =
  | "attack"
  | "guard"
  | "heal"
  | "stop"
  | "bind"
  | "call_name"
  | "shine"
  | "counter";

export type ConnectorEffectId = "then" | "after" | "whenever";
export type ModifierEffectId = "once" | "twice" | "again" | "negate";
export type SubjectEffectId = "self" | "enemy" | "weakest" | "last_actor";

export type WordRuntimeEffect =
  | { kind: "subject"; subject: SubjectEffectId }
  | { kind: "condition"; condition: ConditionEffectId }
  | { kind: "connector"; connector: ConnectorEffectId }
  | {
      kind: "action";
      action: ActionEffectId;
      basePower: number;
      allowedTargets: readonly SubjectEffectId[];
      requiresEnemyStatus?: EnemyStatus;
    }
  | { kind: "modifier"; modifier: ModifierEffectId };

export interface VocabularyWord {
  id: WordId;
  label: string;
  category: WordCategory;
  grammarRole: string;
  effect: WordRuntimeEffect;
  allowedSlots: readonly SentenceSlot[];
  connectsFrom: readonly WordCategory[];
  connectsTo: readonly WordCategory[];
  rarity: WordRarity;
  rewardWeight: number;
  tooltip: string;
  example: string;
  unlockAfterBattle: number;
  duplicateRule: {
    kind: "upgrade";
    maxRank: number;
    powerPerRank: number;
  };
}

export interface StrategySentence {
  id: string;
  subject: WordId | null;
  condition: WordId | null;
  connector: WordId | null;
  action: WordId | null;
  target: WordId | null;
  modifier: WordId | null;
}

export interface WordOwnership {
  count: number;
  rank: number;
}

export type WordInventory = Readonly<Record<WordId, WordOwnership>>;

export type EnemyStatus =
  | "enraged"
  | "watching"
  | "illuminated"
  | "named"
  | "stopped"
  | "bound"
  | "exposed";

export type PlayerStatus = "guarded" | "wounded" | "attacked";

export type ReactionTrigger =
  | { kind: "after-action"; action: ActionEffectId }
  | { kind: "repeat-action" }
  | { kind: "enemy-status-added"; status: EnemyStatus };

export type ReactionEffect =
  | { kind: "add-enemy-power"; amount: number }
  | { kind: "heal-enemy"; amount: number }
  | { kind: "damage-enemy"; amount: number }
  | { kind: "add-enemy-status"; status: EnemyStatus }
  | { kind: "remove-enemy-status"; status: EnemyStatus }
  | { kind: "add-score"; amount: number };

export interface EnemyReactionRule {
  id: string;
  trigger: ReactionTrigger;
  effects: readonly ReactionEffect[];
  log: string;
}

export interface EnemySolutionHint {
  id: string;
  label: string;
  description: string;
  kind: "basic" | "special" | "mastery";
  requiresActions: readonly ActionEffectId[];
  requiresStatuses: readonly EnemyStatus[];
  bonusScore: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  epithet: string;
  description: string;
  readingClue: string;
  maxHp: number;
  basePower: number;
  initialStatuses: readonly EnemyStatus[];
  reactions: readonly EnemyReactionRule[];
  solutionHints: readonly EnemySolutionHint[];
  rewardPool: readonly WordId[];
  icon: string;
  accent: string;
  isBoss: boolean;
}

export interface PlayerRunState {
  hp: number;
  maxHp: number;
  statuses: readonly PlayerStatus[];
}

export interface BattleState {
  enemyId: EnemyId;
  enemyHp: number;
  enemyPower: number;
  enemyStatuses: readonly EnemyStatus[];
  turn: number;
}

export type CausalLogKind =
  | "condition"
  | "action"
  | "reaction"
  | "enemy"
  | "success"
  | "failure"
  | "grammar";

export interface CausalLogEntry {
  id: string;
  sequence: number;
  sentenceIndex: number | null;
  kind: CausalLogKind;
  status: "passed" | "failed" | "neutral";
  title: string;
  detail: string;
}

export interface SentenceValidation {
  sentenceId: string;
  valid: boolean;
  issue: string | null;
  missingSlot: SentenceSlot | null;
}

export interface BattleResolution {
  valid: boolean;
  victory: boolean;
  defeat: boolean;
  logs: readonly CausalLogEntry[];
  player: PlayerRunState;
  battle: BattleState;
  usedActions: readonly ActionEffectId[];
  earnedDiscoveries: readonly string[];
  scoreDelta: number;
}

export interface BattleRecord {
  enemyId: EnemyId;
  victory: boolean;
  turns: number;
  rewardWordId: WordId | null;
  discoveries: readonly string[];
  score: number;
  strategies: readonly StrategySentence[];
  logs: readonly CausalLogEntry[];
}

export type RunPhase = "battle" | "reward" | "victory" | "defeat";

export interface WordQuestRunState {
  version: 1;
  seed: string;
  phase: RunPhase;
  encounterOrder: readonly EnemyId[];
  battleIndex: number;
  player: PlayerRunState;
  inventory: WordInventory;
  strategies: readonly StrategySentence[];
  currentBattle: BattleState;
  rewardChoices: readonly WordId[];
  history: readonly BattleRecord[];
  discoveries: readonly string[];
  totalScore: number;
  lastResolution: BattleResolution | null;
}
