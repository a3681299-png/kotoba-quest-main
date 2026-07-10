import { describe, expect, it } from "vitest";
import { simulateStrategyPlan } from "./battle";
import { BOSS_ENEMY_ID, NORMAL_ENEMY_IDS } from "./enemies";
import { validateSentence } from "./grammar";
import {
  chooseRunReward,
  createBattleState,
  createEncounterOrder,
  createWordQuestRun,
  executeRunBattle,
  retryWordQuestRun,
  updateRunStrategies,
} from "./runState";
import { grantVocabulary } from "./rewards";
import { restoreWordQuestRun, serializeWordQuestRun } from "./save";
import type {
  StrategySentence,
  WordId,
  WordInventory,
  WordQuestRunState,
} from "./types";
import { createStarterInventory } from "./vocabulary";

function attackSentence(index: number): StrategySentence {
  return {
    id: `attack-${index}`,
    subject: "subject.enemy",
    condition: "condition.enemy_near",
    connector: "connector.then",
    action: "action.attack",
    target: "subject.enemy",
    modifier: "modifier.once",
  };
}

function inventoryWith(...wordIds: readonly WordId[]): WordInventory {
  return wordIds.reduce<WordInventory>(
    (inventory, wordId) => ({
      ...inventory,
      [wordId]: { count: 1, rank: 1 },
    }),
    createStarterInventory(),
  );
}

function executeUntilTransition(run: WordQuestRunState): WordQuestRunState {
  let current = run;
  for (let turn = 0; turn < 5 && current.phase === "battle"; turn += 1) {
    current = executeRunBattle(current);
  }
  return current;
}

describe("word quest grammar", () => {
  it("accepts a complete starter sentence", () => {
    const sentence = attackSentence(0);
    expect(
      validateSentence(sentence, 0, [sentence], createStarterInventory()),
    ).toMatchObject({ valid: true, issue: null });
  });

  it("reports the exact missing slot", () => {
    const sentence = { ...attackSentence(0), action: null };
    expect(
      validateSentence(sentence, 0, [sentence], createStarterInventory()),
    ).toMatchObject({ valid: false, missingSlot: "action" });
  });

  it("rejects an enemy condition attached to the player", () => {
    const sentence = { ...attackSentence(0), subject: "subject.self" };
    expect(
      validateSentence(sentence, 0, [sentence], createStarterInventory()),
    ).toMatchObject({ valid: false, missingSlot: "subject" });
  });

  it("requires a previous sentence for after and again", () => {
    const inventory = inventoryWith("connector.after", "modifier.again");
    const after = { ...attackSentence(0), connector: "connector.after" };
    const again = { ...attackSentence(0), modifier: "modifier.again" };
    expect(validateSentence(after, 0, [after], inventory).valid).toBe(false);
    expect(validateSentence(again, 0, [again], inventory).valid).toBe(false);
  });
});

describe("word quest battle simulation", () => {
  it("stops a sentence when its condition is false", () => {
    const sentence: StrategySentence = {
      ...attackSentence(0),
      subject: "subject.self",
      condition: "condition.player_hurt",
    };
    const resolution = simulateStrategyPlan({
      player: { hp: 18, maxHp: 18, statuses: [] },
      battle: createBattleState("ember-maw"),
      strategies: [sentence],
      inventory: createStarterInventory(),
    });
    expect(resolution.battle.enemyHp).toBe(8);
    expect(resolution.logs.map((log) => log.status)).toContain("failed");
  });

  it("applies each enemy's data-driven reaction", () => {
    const ember = simulateStrategyPlan({
      player: { hp: 18, maxHp: 18, statuses: [] },
      battle: createBattleState("ember-maw"),
      strategies: [attackSentence(0)],
      inventory: createStarterInventory(),
    });
    expect(ember.battle.enemyStatuses).toContain("enraged");
    expect(ember.battle.enemyPower).toBe(3);

    const shineSentence: StrategySentence = {
      id: "shine",
      subject: "subject.enemy",
      condition: "condition.enemy_watching",
      connector: "connector.then",
      action: "action.shine",
      target: "subject.enemy",
      modifier: "modifier.once",
    };
    const gaze = simulateStrategyPlan({
      player: { hp: 18, maxHp: 18, statuses: [] },
      battle: createBattleState("gaze-idol"),
      strategies: [shineSentence],
      inventory: inventoryWith("condition.enemy_watching", "action.shine"),
    });
    expect(gaze.battle.enemyStatuses).not.toContain("watching");
    expect(gaze.player.hp).toBe(18);
    expect(
      gaze.logs.some(
        (log) => log.kind === "reaction" && log.title.includes("反応"),
      ),
    ).toBe(true);

    const repeated = {
      ...attackSentence(0),
      modifier: "modifier.twice",
    };
    const moth = simulateStrategyPlan({
      player: { hp: 18, maxHp: 18, statuses: [] },
      battle: createBattleState("echo-moth"),
      strategies: [repeated],
      inventory: inventoryWith("modifier.twice"),
    });
    expect(moth.battle.enemyHp).toBe(4);
    expect(moth.logs.some((log) => log.kind === "reaction")).toBe(true);
  });

  it("resolves a three-sentence boss chain with ordered causal logs", () => {
    const strategies: readonly StrategySentence[] = [
      {
        id: "name",
        subject: "subject.self",
        condition: "condition.always",
        connector: "connector.then",
        action: "action.call_name",
        target: "subject.enemy",
        modifier: "modifier.once",
      },
      {
        id: "bind",
        subject: "subject.enemy",
        condition: "condition.enemy_stopped",
        connector: "connector.after",
        action: "action.bind",
        target: "subject.enemy",
        modifier: "modifier.once",
      },
      {
        ...attackSentence(2),
        condition: "condition.enemy_bound",
        connector: "connector.after",
        modifier: "modifier.twice",
      },
    ];
    const resolution = simulateStrategyPlan({
      player: { hp: 18, maxHp: 18, statuses: [] },
      battle: createBattleState(BOSS_ENEMY_ID),
      strategies,
      inventory: inventoryWith(
        "action.call_name",
        "condition.enemy_stopped",
        "connector.after",
        "action.bind",
        "condition.enemy_bound",
        "modifier.twice",
      ),
    });
    expect(resolution.victory).toBe(true);
    expect(resolution.earnedDiscoveries).toContain("真名の鎖");
    expect(resolution.logs.map((log) => log.sequence)).toEqual(
      resolution.logs.map((_, index) => index + 1),
    );
    expect(resolution.logs.at(-1)?.kind).toBe("success");
  });
});

describe("word quest run growth and persistence", () => {
  it("keeps encounters and rewards deterministic for a seed", () => {
    const order = createEncounterOrder("deterministic-seed");
    expect(order).toEqual(createEncounterOrder("deterministic-seed"));
    expect(order.slice(0, 3).sort()).toEqual([...NORMAL_ENEMY_IDS].sort());
    expect(order.at(-1)).toBe(BOSS_ENEMY_ID);

    const plan = [attackSentence(0), attackSentence(1), attackSentence(2)];
    const first = executeUntilTransition(
      updateRunStrategies(createWordQuestRun("reward-seed"), plan),
    );
    const second = executeUntilTransition(
      updateRunStrategies(createWordQuestRun("reward-seed"), plan),
    );
    expect(first.phase).toBe("reward");
    expect(first.rewardChoices).toEqual(second.rewardChoices);
    expect(new Set(first.rewardChoices).size).toBe(3);
  });

  it("upgrades duplicates and converts max-rank copies to score", () => {
    const base = createStarterInventory();
    const rankTwo = grantVocabulary(base, "action.attack");
    const rankThree = grantVocabulary(rankTwo.inventory, "action.attack");
    const overflow = grantVocabulary(rankThree.inventory, "action.attack");
    expect(rankTwo.inventory["action.attack"]?.rank).toBe(2);
    expect(rankThree.inventory["action.attack"]?.rank).toBe(3);
    expect(overflow.inventory["action.attack"]?.rank).toBe(3);
    expect(overflow.scoreBonus).toBe(2);
  });

  it("plays three normal battles, rewards, and the boss to victory", () => {
    const plan = [attackSentence(0), attackSentence(1), attackSentence(2)];
    let run = updateRunStrategies(createWordQuestRun("full-run"), plan);

    for (let encounter = 0; encounter < 4; encounter += 1) {
      run = executeUntilTransition(run);
      if (encounter < 3) {
        expect(run.phase).toBe("reward");
        expect(run.rewardChoices).toHaveLength(3);
        run = chooseRunReward(run, run.rewardChoices[0] as WordId);
        run = updateRunStrategies(run, plan);
      }
    }

    expect(run.phase).toBe("victory");
    expect(run.history).toHaveLength(4);
    expect(run.history.every((record) => record.victory)).toBe(true);
  });

  it("restores a run and retries with the same or a new seed", () => {
    const run = createWordQuestRun("save-me");
    expect(restoreWordQuestRun(serializeWordQuestRun(run))).toEqual(run);
    expect(restoreWordQuestRun("not json")).toBeNull();
    expect(retryWordQuestRun(run).seed).toBe("save-me");
    expect(retryWordQuestRun(run, "new-seed").seed).toBe("new-seed");
  });
});
