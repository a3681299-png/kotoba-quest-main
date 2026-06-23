export type PreparationSceneSetupInput = {
  selectedCardId: string;
  onCardSelect: (cardId: string) => void;
};

export function getPreparationSceneSetupKey({
  onCardSelect,
}: PreparationSceneSetupInput) {
  return onCardSelect;
}
