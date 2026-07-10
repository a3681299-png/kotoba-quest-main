import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlayerActionSemanticId } from "../../readingLoop";
import { LiveSentenceStage } from "./LiveSentenceStage";
import type { StrategyChoiceView } from "./types";

const choices: readonly StrategyChoiceView[] = [
  {
    id: "player.dodge_side",
    label: "横へ回避する",
    shortLabel: "横回避",
    description: "正面の軸から外れる",
  },
  {
    id: "player.guard_front",
    label: "正面で防御する",
    shortLabel: "正面防御",
    description: "正面で衝撃を受け止める",
  },
  {
    id: "player.attack",
    label: "そのまま攻撃する",
    shortLabel: "攻撃",
    description: "予兆の間に斬りかかる",
  },
];

function renderStage(
  selectedAction: PlayerActionSemanticId | null,
  executionStatus: "incomplete" | "complete" | "running",
) {
  return renderToStaticMarkup(
    <LiveSentenceStage
      conditionLabel="鎧の継ぎ目が赤く光る"
      choices={choices}
      selectedAction={selectedAction}
      evidenceFragments={[]}
      executionStatus={executionStatus}
      onSelectAction={() => undefined}
      onBeginExecution={() => null}
      onExecutionComplete={() => undefined}
      onExecutionCancel={() => undefined}
    />,
  );
}

function periodButton(markup: string) {
  return markup.match(
    /<button[^>]*data-motion-id="period-trigger"[^>]*>/,
  )?.[0];
}

describe("LiveSentenceStage period trigger", () => {
  it("keeps the period disabled while the sentence is incomplete", () => {
    const markup = renderStage(null, "incomplete");
    expect(periodButton(markup)).toContain("disabled");
    expect(markup).toContain("行動を選ぶと、文末の句点が使える。");
  });

  it("keeps the completed sentence locked until the battlefield is ready", () => {
    const markup = renderStage("player.dodge_side", "complete");
    expect(periodButton(markup)).toContain("disabled");
    expect(periodButton(markup)).toContain("句点を置いて作戦文を実行");
  });

  it("locks the period and action choices while execution is running", () => {
    const markup = renderStage("player.dodge_side", "running");
    expect(periodButton(markup)).toContain("disabled");
    expect(markup).toContain("<fieldset disabled=\"\"");
  });
});
