import type { PlayerActionSemanticId } from "../../readingLoop";
import type { SentenceMotionOutcome } from "./sentenceMotion";

export interface LiveSentenceOutcomeCopy {
  eyebrow: string;
  title: string;
  detail: string;
}

export function getLiveSentenceOutcomeCopy(
  outcome: SentenceMotionOutcome | null,
  action: PlayerActionSemanticId | null,
): LiveSentenceOutcomeCopy {
  switch (outcome) {
    case "success":
      if (action === "player.guard_front") {
        return {
          eyebrow: "作戦が通った",
          title: "盾で突進を受け止めた",
          detail: "盾で正面の衝撃を受け止め、獣の突進を押し返した。",
        };
      }
      if (action === "player.attack") {
        return {
          eyebrow: "作戦が通った",
          title: "斬撃が突進を押し返した",
          detail: "斬撃が突進とぶつかり、獣を正面から押し戻した。",
        };
      }
      return {
        eyebrow: "作戦が通った",
        title: "突進が空を切った",
        detail: "横のレーンへ外れたため、獣は残像を追って行き過ぎた。",
      };
    case "conditionMiss":
      return {
        eyebrow: "条件で停止",
        title: "行動まで光が届かなかった",
        detail: "実際の兆候と条件文が一致せず、主人公は動かなかった。",
      };
    case "actionFail":
      if (action === "player.dodge_side") {
        return {
          eyebrow: "行動で失敗",
          title: "回避が突進に間に合わなかった",
          detail: "横へ動き始めたが、軸を外れる前に突進を受けた。",
        };
      }
      return action === "player.guard_front"
        ? {
            eyebrow: "行動で失敗",
            title: "防御ごと押し切られた",
            detail: "条件は働いたが、正面防御では突進を受け止めきれなかった。",
          }
        : {
            eyebrow: "行動で失敗",
            title: "攻撃が突進に潰された",
            detail: "条件は働いたが、正面からの攻撃では先に押し負けた。",
          };
    default:
      return {
        eyebrow: "未検証",
        title: "句点で作戦を確定する",
        detail: "結果は実行するまで表示されない。",
      };
  }
}
