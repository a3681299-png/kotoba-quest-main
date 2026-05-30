import { describe, expect, it } from "vitest";

import { getEnemyTelegraph } from "./enemyTelegraph";
import type { EnemyIntent } from "../engine/EnemyAI";

describe("getEnemyTelegraph", () => {
  it("marks attack intents as dangerous battlefield telegraphs", () => {
    const intent: EnemyIntent = {
      type: "attack_heavy",
      damage: 25,
      description: "力を溜めている！",
      hint: "防御しよう",
      icon: "💥",
      turnsUntilAction: 0,
    };

    expect(getEnemyTelegraph(intent)).toEqual({
      className: "enemy-telegraph danger attack_heavy",
      icon: "💥",
      label: "力を溜めている！",
      damageLabel: "25",
    });
  });

  it("marks idle intents as calm observation", () => {
    const intent: EnemyIntent = {
      type: "idle",
      damage: 0,
      description: "こちらを見ている...",
      hint: "",
      icon: "👀",
      turnsUntilAction: 0,
    };

    expect(getEnemyTelegraph(intent)).toEqual({
      className: "enemy-telegraph calm idle",
      icon: "👀",
      label: "こちらを見ている...",
      damageLabel: null,
    });
  });

  it("returns null when no intent is available", () => {
    expect(getEnemyTelegraph(null)).toBeNull();
  });
});
