import attackCardTextureUrl from "../assets/UI/card/attack.png";
import branchCardTextureUrl from "../assets/UI/card/branch.png";
import healCardTextureUrl from "../assets/UI/card/heal.png";
import observationCardTextureUrl from "../assets/UI/card/observation.png";
import recordCardTextureUrl from "../assets/UI/card/record.png";
import { getTacticalCardsForStage, type TacticalCardView } from "./tacticalCards";

export type PreparationSpellCard = {
  id: string;
  title: string;
  kind: string;
  command: string;
  cost: number;
  power: number;
  description: string;
  glyph: string;
  textureUrl: string;
};

const PREPARATION_VISIBLE_CARD_COUNT = 5;

export function getPreparationCardsForStage(stageId: number): PreparationSpellCard[] {
  return getTacticalCardsForStage(stageId)
    .slice(0, PREPARATION_VISIBLE_CARD_COUNT)
    .map(toPreparationCard);
}

function toPreparationCard(card: TacticalCardView): PreparationSpellCard {
  return {
    id: card.id,
    title: card.label,
    kind: getKindLabel(card),
    command: card.code,
    cost: card.cost,
    power: getCardPower(card),
    description: card.description,
    glyph: getCardGlyph(card),
    textureUrl: getCardTextureUrl(card),
  };
}

function getKindLabel(card: TacticalCardView): string {
  switch (card.kind) {
    case "action":
      return "Act";
    case "condition":
      return "If";
    case "memory":
      return "文脈";
    case "logic":
      return "Logic";
  }
}

function getCardPower(card: TacticalCardView): number {
  if (card.code.includes("攻撃する")) return 3;
  if (card.code.includes("話しかける")) return 3;
  if (card.code.includes("手を伸ばす")) return 3;
  if (card.code.includes("回復する")) return 2;
  return 1;
}

function getCardGlyph(card: TacticalCardView): string {
  if (card.id.includes("repeat")) return "↻";
  if (card.id.includes("plan")) return "{}";
  if (card.id.includes("run")) return "▶";
  if (card.code.includes("手を伸ばす")) return "+";
  if (card.code.includes("話しかける")) return "…";
  if (card.code.includes("記録")) return "▧";
  if (card.code.includes("もし")) return "Y";
  if (card.code.includes("攻撃")) return "╱";
  if (card.code.includes("観察")) return "◎";
  if (card.code.includes("回復")) return "✚";
  return "•";
}

function getCardTextureUrl(card: TacticalCardView): string {
  if (card.code.includes("記録")) return recordCardTextureUrl;
  if (card.code.includes("攻撃")) return attackCardTextureUrl;
  if (card.code.includes("観察")) return observationCardTextureUrl;
  if (card.code.includes("回復")) return healCardTextureUrl;
  return branchCardTextureUrl;
}
