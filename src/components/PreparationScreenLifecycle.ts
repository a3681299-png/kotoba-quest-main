export type PreparationSceneSetupInput = {
  selectedCardId: string;
  onCardSelect: unknown;
};

export function getPreparationSceneSetupKey({
  onCardSelect,
}: PreparationSceneSetupInput) {
  return onCardSelect;
}
