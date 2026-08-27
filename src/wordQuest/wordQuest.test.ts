import { describe, expect, it } from "vitest";
import {
  HEAVY_ATTACK_GUARD_MULTIPLIER,
  HEAVY_ATTACK_MAX_HP_RATIO,
  getEnemyAttackPreview,
  simulateStrategyPlan,
} from "./battle";
import { BOSS_ENEMY_ID, NORMAL_ENEMY_IDS, getEnemy } from "./enemies";
import { createStrategySentence, validateSentence } from "./grammar";
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
  PlayerStatus,
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

function healSentence(index: number): StrategySentence {
  return {
    id: `heal-${index}`,
    subject: "subject.self",
    condition: "condition.player_hurt",
    connector: "connector.then",
    action: "action.heal",
    target: "subject.self",
    modifier: "modifier.once",
  };
}

function guardSentence(index: number): StrategySentence {
  return {
    id: `guard-${index}`,
    subject: "subject.self",
    condition: "condition.always",
    connector: "connector.then",
    action: "action.guard",
    target: "subject.self",
    modifier: "modifier.once",
  };
}

function actionSentence(
  index: number,
  action: WordId,
  target: WordId,
): StrategySentence {
  return {
    id: `action-${index}`,
    subject: "subject.self",
    condition: "condition.always",
    connector: "connector.then",
    action,
    target,
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

function testPlayer(overrides: {
  hp: number;
  maxHp: number;
  statuses?: readonly PlayerStatus[];
  actionPoints?: number;
}) {
  return {
    hp: overrides.hp,
    maxHp: overrides.maxHp,
    statuses: overrides.statuses ?? [],
    actionPoints: overrides.actionPoints ?? 99,
  };
}

function callNameSentence(index: number): StrategySentence {
  return {
    id: `call-${index}`,
    subject: "subject.enemy",
    condition: "condition.always",
    connector: "connector.then",
    action: "action.call_name",
    target: "subject.enemy",
    modifier: "modifier.once",
  };
}

function executeUntilTransition(
  run: WordQuestRunState,
  strategies: readonly StrategySentence[] = run.strategies,
): WordQuestRunState {
  let current = run;
  for (let turn = 0; turn < 20 && current.phase === "battle"; turn += 1) {
    const fallback = strategies[0] ?? attackSentence(0);
    const enemyAttack = getEnemyAttackPreview(
      current.currentBattle,
      current.player.maxHp,
    );
    const plan = [
      current.player.statuses.includes("sealed")
        ? callNameSentence(0)
        : enemyAttack.kind === "heavy"
          ? guardSentence(0)
          : current.currentBattle.enemyId === "echo-moth" &&
              current.currentBattle.lastPlayerAction === "attack"
            ? healSentence(0)
            : fallback,
    ];
    current = executeRunBattle(updateRunStrategies(current, plan));
  }
  return current;
}

describe("word quest grammar", () => {
  it("accepts a complete starter sentence", () => {
    const sentence = attackSentence(0);
    expect(
      validateSentence(sentence, createStarterInventory()),
    ).toMatchObject({ valid: true, issue: null });
  });

  it("reports the exact missing slot", () => {
    const sentence = { ...attackSentence(0), action: null };
    expect(
      validateSentence(sentence, createStarterInventory()),
    ).toMatchObject({ valid: false, missingSlot: "action" });
  });

  it("rejects an enemy condition attached to the player", () => {
    const sentence = { ...attackSentence(0), subject: "subject.self" };
    expect(
      validateSentence(sentence, createStarterInventory()),
    ).toMatchObject({ valid: false, missingSlot: "subject" });
  });

  it("accepts after and again in a single strategy sentence", () => {
    const inventory = inventoryWith("connector.after", "modifier.again");
    const after = { ...attackSentence(0), connector: "connector.after" };
    const again = { ...attackSentence(0), modifier: "modifier.again" };
    expect(validateSentence(after, inventory).valid).toBe(true);
    expect(validateSentence(again, inventory).valid).toBe(true);
  });
});

describe("word quest enemy data", () => {
  it("uses the names printed on the stage artwork", () => {
    expect(
      ["gaze-idol", "echo-moth", "ember-maw", BOSS_ENEMY_ID].map(
        (enemyId) => getEnemy(enemyId).name,
      ),
    ).toEqual([
      "見張りの石像",
      "反響の翅",
      "火喰らいの獣",
      "亡名神",
    ]);
  });
});

describe("word quest battle simulation", () => {
  it("previews a heavy attack every third turn", () => {
    const battle = createBattleState("gaze-idol");
    const previews = [1, 2, 3, 4, 5, 6].map((turn) =>
      getEnemyAttackPreview({ ...battle, turn }, 50),
    );

    expect(previews.map((preview) => preview.kind)).toEqual([
      "normal",
      "normal",
      "heavy",
      "normal",
      "normal",
      "heavy",
    ]);
    expect(previews.map((preview) => preview.turnsUntilHeavyAttack)).toEqual([
      2,
      1,
      0,
      2,
      1,
      0,
    ]);
    expect(previews[0]?.power).toBe(battle.enemyPower);
    expect(previews[2]?.power).toBe(40);
    expect(getEnemyAttackPreview({ ...battle, turn: 3 }, 100).power).toBe(80);
  });

  it("releases a bound enemy before the next heavy attack preview", () => {
    const resolution = simulateStrategyPlan({
      player: testPlayer({ hp: 50, maxHp: 50 }),
      battle: {
        ...createBattleState("gaze-idol"),
        turn: 5,
        enemyStatuses: ["bound"],
      },
      strategies: [attackSentence(0)],
      inventory: createStarterInventory(),
    });

    expect(resolution.effects.playerDamageTaken).toBe(0);
    expect(resolution.battle.enemyStatuses).not.toContain("bound");
    expect(resolution.battle.turn).toBe(6);
    expect(
      getEnemyAttackPreview(resolution.battle, resolution.player.maxHp),
    ).toMatchObject({
      kind: "heavy",
      turnsUntilHeavyAttack: 0,
    });
  });

  it("takes about 80 percent of max HP without guard on the third turn", () => {
    const battle = { ...createBattleState("gaze-idol"), turn: 3 };
    const unguarded = simulateStrategyPlan({
      player: testPlayer({ hp: 50, maxHp: 50 }),
      battle,
      strategies: [attackSentence(0)],
      inventory: createStarterInventory(),
    });
    const guarded = simulateStrategyPlan({
      player: testPlayer({ hp: 50, maxHp: 50 }),
      battle,
      strategies: [guardSentence(0)],
      inventory: createStarterInventory(),
    });

    expect(unguarded.effects.playerDamageTaken).toBe(
      Math.round(50 * HEAVY_ATTACK_MAX_HP_RATIO),
    );
    expect(unguarded.logs.at(-1)).toMatchObject({
      title: "見張りの石像の大技",
      detail: "40ダメージを受けた。残りHP 10。",
    });
    expect(guarded.effects).toMatchObject({
      guardApplied: 3,
      damageBlocked: 3 * HEAVY_ATTACK_GUARD_MULTIPLIER,
      playerDamageTaken: 4,
    });
    expect(guarded.logs.at(-1)).toMatchObject({
      title: "見張りの石像の大技",
      detail: "「守る」で36軽減し、4ダメージを受けた。残りHP 46。",
    });
  });

  it("stops a sentence when its condition is false", () => {
    const sentence: StrategySentence = {
      ...attackSentence(0),
      subject: "subject.self",
      condition: "condition.player_hurt",
    };
    const resolution = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: createBattleState("ember-maw"),
      strategies: [sentence],
      inventory: createStarterInventory(),
    });
    expect(resolution.battle.enemyHp).toBe(24);
    expect(resolution.logs.map((log) => log.status)).toContain("failed");
  });

  it("applies healing before the enemy counter and records both HP changes", () => {
    const resolution = simulateStrategyPlan({
      player: testPlayer({ hp: 10, maxHp: 18 }),
      battle: createBattleState("gaze-idol"),
      strategies: [healSentence(0)],
      inventory: createStarterInventory(),
    });

    expect(resolution.effects).toMatchObject({
      playerHpAfterActions: 18,
      playerHealing: 8,
      playerDamageTaken: 6,
    });
    expect(resolution.player.hp).toBe(12);
  });

  it("reduces the enemy counter by the guard card's actual power", () => {
    const resolution = simulateStrategyPlan({
      player: testPlayer({ hp: 10, maxHp: 18 }),
      battle: createBattleState("gaze-idol"),
      strategies: [guardSentence(0)],
      inventory: createStarterInventory(),
    });

    expect(resolution.effects).toMatchObject({
      guardApplied: 3,
      damageBlocked: 3,
      playerDamageTaken: 3,
    });
    expect(resolution.player.hp).toBe(7);
    expect(resolution.player.statuses).not.toContain("guarded");
  });

  it("expires temporary combat statuses when the enemy cannot counter", () => {
    const stopSentence: StrategySentence = {
      id: "stop",
      subject: "subject.enemy",
      condition: "condition.enemy_near",
      connector: "connector.then",
      action: "action.stop",
      target: "subject.enemy",
      modifier: "modifier.once",
    };
    const resolution = simulateStrategyPlan({
      player: testPlayer({
        hp: 10,
        maxHp: 18,
        statuses: ["attacked", "guarded"],
      }),
      battle: { ...createBattleState("gaze-idol"), turn: 3 },
      strategies: [stopSentence],
      inventory: inventoryWith("action.stop"),
    });

    expect(resolution.effects).toMatchObject({
      guardApplied: 0,
      damageBlocked: 0,
      playerDamageTaken: 0,
    });
    expect(resolution.player.statuses).not.toContain("guarded");
    expect(resolution.player.statuses).not.toContain("attacked");
    expect(resolution.logs.some((log) => log.title.includes("大技"))).toBe(false);
  });

  it("executes every current action card's runtime effect", () => {
    const resolve = ({
      action,
      target,
      player = testPlayer({ hp: 10, maxHp: 18 }),
      battle = createBattleState("gaze-idol"),
    }: {
      action: WordId;
      target: WordId;
      player?: ReturnType<typeof testPlayer>;
      battle?: ReturnType<typeof createBattleState>;
    }) =>
      simulateStrategyPlan({
        player,
        battle,
        strategies: [actionSentence(0, action, target)],
        inventory: inventoryWith(action),
      });

    const attack = resolve({ action: "action.attack", target: "subject.enemy" });
    expect(attack.battle.enemyHp).toBeLessThan(
      createBattleState("gaze-idol").enemyHp,
    );

    const guard = resolve({ action: "action.guard", target: "subject.self" });
    expect(guard.effects.damageBlocked).toBe(3);

    const heal = resolve({ action: "action.heal", target: "subject.self" });
    expect(heal.effects.playerHealing).toBe(8);

    const stop = resolve({ action: "action.stop", target: "subject.enemy" });
    expect(stop.effects.playerDamageTaken).toBe(0);

    const bind = resolve({
      action: "action.bind",
      target: "subject.enemy",
      battle: {
        ...createBattleState("gaze-idol"),
        enemyStatuses: ["stopped"],
      },
    });
    expect(bind.battle.enemyStatuses).toContain("bound");

    const callName = resolve({
      action: "action.call_name",
      target: "subject.enemy",
    });
    expect(callName.battle.enemyStatuses).toContain("named");

    const shine = resolve({ action: "action.shine", target: "subject.enemy" });
    expect(shine.battle.enemyStatuses).toContain("illuminated");
    expect(shine.battle.enemyStatuses).not.toContain("watching");

    const counter = resolve({
      action: "action.counter",
      target: "subject.enemy",
    });
    expect(counter.battle.enemyHp).toBeLessThan(
      createBattleState("gaze-idol").enemyHp,
    );

    const douse = resolve({
      action: "action.douse",
      target: "subject.self",
      battle: {
        ...createBattleState("ember-maw"),
        emberStacks: 4,
      },
    });
    expect(douse.battle.emberStacks).toBe(0);

    const recharge = resolve({
      action: "action.recharge",
      target: "subject.self",
      player: testPlayer({ hp: 10, maxHp: 18, actionPoints: 0 }),
    });
    expect(recharge.player.actionPoints).toBe(4);
  });

  it("uses the after connector only when the previous turn had an action", () => {
    const sentence = {
      ...attackSentence(0),
      connector: "connector.after",
    };
    const withoutPreviousAction = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: createBattleState("gaze-idol"),
      strategies: [sentence],
      inventory: inventoryWith("connector.after"),
    });

    expect(
      withoutPreviousAction.logs.find(
        (log) => log.kind === "condition" && log.sentenceIndex === 0,
      ),
    ).toMatchObject({
      status: "failed",
      detail: "前の手番で行動していないため、「その後」は成立しなかった。",
    });

    const afterPreviousAction = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: {
        ...createBattleState("gaze-idol"),
        lastPlayerAction: "guard",
        usedPlayerActions: ["guard"],
      },
      strategies: [sentence],
      inventory: inventoryWith("connector.after"),
    });
    expect(afterPreviousAction.usedActions).toEqual(["attack"]);

    const skippedTurn = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: {
        ...createBattleState("gaze-idol"),
        lastPlayerAction: "guard",
        usedPlayerActions: ["guard"],
      },
      strategies: [healSentence(0)],
      inventory: createStarterInventory(),
    });
    expect(skippedTurn.battle.lastPlayerAction).toBeNull();
  });

  it("executes again within one strategy sentence", () => {
    const sentence = {
      ...attackSentence(0),
      modifier: "modifier.again",
    };
    const resolution = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: createBattleState("gaze-idol"),
      strategies: [sentence],
      inventory: inventoryWith("modifier.again"),
    });

    expect(resolution.usedActions).toEqual(["attack", "attack"]);
    expect(resolution.battle.enemyHp).toBe(18);
  });

  it("applies each enemy's data-driven reaction", () => {
    const ember = simulateStrategyPlan({
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: createBattleState("ember-maw"),
      strategies: [attackSentence(0)],
      inventory: createStarterInventory(),
    });
    expect(ember.battle.enemyStatuses).toContain("enraged");
    expect(ember.battle.enemyPower).toBe(4);

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
      player: testPlayer({ hp: 18, maxHp: 18 }),
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
      player: testPlayer({ hp: 18, maxHp: 18 }),
      battle: createBattleState("echo-moth"),
      strategies: [repeated],
      inventory: inventoryWith("modifier.twice"),
    });
    expect(moth.battle.enemyHp).toBe(12);
    expect(
      moth.logs.some(
        (log) => log.status === "failed" && log.detail.includes("反響"),
      ),
    ).toBe(true);
  });

  it("breaks the king's silence and attacks on the next turn", () => {
    const callName = simulateStrategyPlan({
      player: testPlayer({
        hp: 50,
        maxHp: 50,
        statuses: ["sealed"],
      }),
      battle: {
        ...createBattleState(BOSS_ENEMY_ID),
        enemyHp: 4,
        kingSealCooldown: 3,
      },
      strategies: [callNameSentence(0)],
      inventory: inventoryWith("action.call_name", "connector.after"),
    });
    expect(callName.player.statuses).not.toContain("sealed");
    expect(callName.battle.enemyStatuses).toContain("named");

    const attack = simulateStrategyPlan({
      player: callName.player,
      battle: callName.battle,
      strategies: [
        { ...attackSentence(0), connector: "connector.after" },
      ],
      inventory: inventoryWith("connector.after"),
    });
    expect(attack.victory).toBe(true);
    expect(attack.earnedDiscoveries).toContain("真名の鎖");
    expect(attack.battle.usedPlayerActions).toEqual(
      expect.arrayContaining(["call_name", "attack"]),
    );
  });

  it("blocks non-call_name actions while the king has sealed the player", () => {
    const resolution = simulateStrategyPlan({
      player: testPlayer({
        hp: 50,
        maxHp: 50,
        statuses: ["sealed"],
      }),
      battle: {
        ...createBattleState(BOSS_ENEMY_ID),
        kingSealCooldown: 3,
      },
      strategies: [attackSentence(0)],
      inventory: createStarterInventory(),
    });
    expect(
      resolution.logs.some(
        (log) => log.status === "failed" && log.detail.includes("沈黙"),
      ),
    ).toBe(true);
    expect(resolution.player.statuses).toContain("sealed");
  });
});

describe("word quest run growth and persistence", () => {
  it("keeps exactly one editable strategy sentence", () => {
    const run = createWordQuestRun("single-strategy");
    expect(run.strategies).toEqual([createStrategySentence(0)]);

    const unchanged = updateRunStrategies(run, [
      attackSentence(0),
      attackSentence(1),
    ]);
    expect(unchanged).toBe(run);
  });

  it("recovers action slots after each valid strategy execution", () => {
    const run = updateRunStrategies(createWordQuestRun("action-recovery"), [
      attackSentence(0),
    ]);

    const next = executeRunBattle(run);

    expect(next.currentBattle.turn).toBe(run.currentBattle.turn + 1);
    expect(next.strategies).toEqual([createStrategySentence(0)]);
  });

  it("keeps encounters and rewards deterministic for a seed", () => {
    const order = createEncounterOrder("deterministic-seed");
    expect(order).toEqual(createEncounterOrder("deterministic-seed"));
    expect(order.slice(0, 3).sort()).toEqual([...NORMAL_ENEMY_IDS].sort());
    expect(order.at(-1)).toBe(BOSS_ENEMY_ID);

    const plan = [attackSentence(0)];
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
    const plan = [attackSentence(0)];
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

    const legacyRun = {
      ...run,
      strategies: [createStrategySentence(0), createStrategySentence(1)],
      currentBattle: {
        ...run.currentBattle,
        usedPlayerActions: undefined,
      },
    };
    const restoredLegacyRun = restoreWordQuestRun(JSON.stringify(legacyRun));
    expect(restoredLegacyRun?.strategies).toEqual([createStrategySentence(0)]);
    expect(restoredLegacyRun?.currentBattle.usedPlayerActions).toEqual([]);

    expect(restoreWordQuestRun("not json")).toBeNull();
    expect(retryWordQuestRun(run).seed).toBe("save-me");
    expect(retryWordQuestRun(run, "new-seed").seed).toBe("new-seed");
  });
});
