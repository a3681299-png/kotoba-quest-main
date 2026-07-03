export type PreparationPlanCard = {
  id: string;
  command: string;
};

export type PreparationBattlePlan = {
  cardIds: string[];
  code: string;
};

export function buildPreparationBattlePlan(
  preparedCards: PreparationPlanCard[],
  selectedCard: PreparationPlanCard,
): PreparationBattlePlan {
  const battleCards = preparedCards.length > 0 ? preparedCards : [selectedCard];
  return {
    cardIds: battleCards.map((card) => card.id),
    code: battleCards.map((card) => card.command).join("\n"),
  };
}