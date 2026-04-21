import { describe, expect, it } from "vitest";
import { getTutorialGuideContent } from "./tutorialGuide";

describe("getTutorialGuideContent", () => {
  it("コード入力ステップでは入力欄への導線とお手本コードを返す", () => {
    const content = getTutorialGuideContent(
      {
        message: '下のエディタに「攻撃("ファイア")」と入力してね',
        waitForAction: "code_input",
      },
      '攻撃("ファイア")',
    );

    expect(content.stepLabel).toBe("やること");
    expect(content.jumpLabel).toBe("入力欄へ移動");
    expect(content.helperText).toBe("お手本を入力すると自動で次に進みます。");
    expect(content.sampleCode).toBe('攻撃("ファイア")');
  });

  it("実行ステップでは実行ボタンへの導線を返す", () => {
    const content = getTutorialGuideContent({
      message: "▶️ボタンを押して魔法を唱えよう！",
      waitForAction: "execute",
    });

    expect(content.jumpLabel).toBe("実行ボタンへ移動");
    expect(content.helperText).toBe("入力ができたら実行ボタンで魔法を唱えます。");
    expect(content.sampleCode).toBeUndefined();
  });

  it("説明だけのステップでは次へボタン表示用のラベルを返す", () => {
    const content = getTutorialGuideContent({
      message: "ようこそ！コードで魔法を唱えて敵を倒そう！",
      waitForAction: "none",
    });

    expect(content.jumpLabel).toBeUndefined();
    expect(content.helperText).toBe("内容を読んだら次へ進んでください。");
  });
});
