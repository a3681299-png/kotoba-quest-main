import { simulateStrategyPlan } from "./battle";
import {
  BOSS_ENEMY_ID,
  NORMAL_ENEMY_IDS,
  getEnemy,
} from "./enemies";
import { createStrategySentence } from "./grammar";
import { seededShuffle } from "./random";
import { generateRewardChoices, grantVocabulary } from "./rewards";
import type {
  BattleRecord,
  BattleState,
  StrategySentence,
  WordId,
  WordQuestRunState,
} from "./types";
import { createStarterInventory } from "./vocabulary";

export function createEncounterOrder(seed: string): readonly string[] {
  return [
    ...seededShuffle(NORMAL_ENEMY_IDS, `${seed}:encounters`),
    BOSS_ENEMY_ID,
  ];
}

export function createBattleState(enemyId: string): BattleState {
  const enemy = getEnemy(enemyId);
  return {
    enemyId,
    enemyHp: enemy.maxHp,
    enemyPower: enemy.basePower,
    enemyStatuses: [...enemy.initialStatuses],
    turn: 1,
    emberStacks: 0,
    lastPlayerAction: null,
  };
}

export function createWordQuestRun(seed: string): WordQuestRunState {
  const normalizedSeed = seed.trim() || "KOTOBA-001";
  const encounterOrder = createEncounterOrder(normalizedSeed);
  const firstEnemy = encounterOrder[0];
  if (!firstEnemy) throw new Error("No encounters configured.");
  return {
    version: 1,
    seed: normalizedSeed,
    phase: "battle",
    encounterOrder,
    battleIndex: 0,
    player: {
      hp: 50,
      maxHp: 50,
      statuses: [],
      actionPoints: 4,
    },
    inventory: createStarterInventory(),
    strategies: [createStrategySentence(0)],
    currentBattle: createBattleState(firstEnemy),
    rewardChoices: [],
    history: [],
    discoveries: [],
    totalScore: 0,
    lastResolution: null,
  };
}

export function updateRunStrategies(
  run: WordQuestRunState,
  strategies: readonly StrategySentence[],
): WordQuestRunState {
  if (run.phase !== "battle" || strategies.length < 1 || strategies.length > 2) {
    return run;
  }
  return {
    ...run,
    strategies: strategies.map((sentence) => ({ ...sentence })),
    lastResolution: null,
  };
}

function appendBattleRecord(
  run: WordQuestRunState,
  record: BattleRecord,
): readonly BattleRecord[] {
  return [...run.history, record];
}

export function executeRunBattle(run: WordQuestRunState): WordQuestRunState {
  if (run.phase !== "battle") return run;
  const resolution = simulateStrategyPlan({
    player: run.player,
    battle: run.currentBattle,
    strategies: run.strategies,
    inventory: run.inventory,
  });
  if (!resolution.valid) {
    return { ...run, lastResolution: resolution };
  }

  const enemy = getEnemy(run.currentBattle.enemyId);
  const totalScore =
    run.totalScore + resolution.scoreDelta + (resolution.victory ? 3 : 0);
  const discoveries = [
    ...new Set([...run.discoveries, ...resolution.earnedDiscoveries]),
  ];

  if (resolution.defeat) {
    return {
      ...run,
      phase: "defeat",
      player: resolution.player,
      currentBattle: resolution.battle,
      lastResolution: resolution,
      totalScore,
      discoveries,
      history: appendBattleRecord(run, {
        enemyId: enemy.id,
        victory: false,
        turns: resolution.battle.turn - 1,
        rewardWordId: null,
        discoveries: resolution.earnedDiscoveries,
        score: resolution.scoreDelta,
      }),
    };
  }

  if (!resolution.victory) {
    return {
      ...run,
      player: resolution.player,
      currentBattle: resolution.battle,
      lastResolution: resolution,
      totalScore,
      discoveries,
    };
  }

  const history = appendBattleRecord(run, {
    enemyId: enemy.id,
    victory: true,
    turns: resolution.battle.turn - 1,
    rewardWordId: null,
    discoveries: resolution.earnedDiscoveries,
    score: resolution.scoreDelta + 3,
  });
  if (enemy.isBoss) {
    return {
      ...run,
      phase: "victory",
      player: resolution.player,
      currentBattle: resolution.battle,
      lastResolution: resolution,
      totalScore,
      discoveries,
      history,
    };
  }

  const withResolution: WordQuestRunState = {
    ...run,
    phase: "reward",
    player: resolution.player,
    currentBattle: resolution.battle,
    lastResolution: resolution,
    totalScore,
    discoveries,
    history,
  };
  return {
    ...withResolution,
    rewardChoices: generateRewardChoices(withResolution),
  };
}

export function chooseRunReward(
  run: WordQuestRunState,
  wordId: WordId,
): WordQuestRunState {
  if (run.phase !== "reward" || !run.rewardChoices.includes(wordId)) return run;
  const grant = grantVocabulary(run.inventory, wordId);
  const nextBattleIndex = run.battleIndex + 1;
  const nextEnemyId = run.encounterOrder[nextBattleIndex];
  if (!nextEnemyId) return run;
  const healedHp = Math.min(run.player.maxHp, run.player.hp + 2);
  const history = run.history.map((record, index) =>
    index === run.history.length - 1
      ? { ...record, rewardWordId: wordId }
      : record,
  );
  return {
    ...run,
    phase: "battle",
    battleIndex: nextBattleIndex,
    player: {
      ...run.player,
      hp: healedHp,
      statuses:
        healedHp === run.player.maxHp
          ? []
          : run.player.statuses.filter((status) => status === "wounded"),
      actionPoints: 4,
    },
    inventory: grant.inventory,
    currentBattle: createBattleState(nextEnemyId),
    rewardChoices: [],
    history,
    totalScore: run.totalScore + grant.scoreBonus,
    lastResolution: null,
  };
}

export function retryWordQuestRun(
  run: WordQuestRunState,
  seed = run.seed,
): WordQuestRunState {
  return createWordQuestRun(seed);
}
