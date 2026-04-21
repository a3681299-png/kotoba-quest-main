import type { TutorialStep } from "../data/stages";

export interface TutorialGuideContent {
  stepLabel: string;
  helperText: string;
  jumpLabel?: string;
  sampleCode?: string;
}

export function getTutorialGuideContent(
  step: TutorialStep,
  sampleCode?: string,
): TutorialGuideContent {
  switch (step.waitForAction) {
    case "code_input":
      return {
        stepLabel: "やること",
        jumpLabel: "入力欄へ移動",
        helperText: "お手本を入力すると自動で次に進みます。",
        sampleCode,
      };
    case "execute":
      return {
        stepLabel: "次の操作",
        jumpLabel: "実行ボタンへ移動",
        helperText: "入力ができたら実行ボタンで魔法を唱えます。",
      };
    case "none":
    default:
      return {
        stepLabel: "やること",
        helperText: "内容を読んだら次へ進んでください。",
      };
  }
}
