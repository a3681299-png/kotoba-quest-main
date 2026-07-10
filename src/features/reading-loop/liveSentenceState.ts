export interface PeriodAvailabilityInput {
  sentenceComplete: boolean;
  sceneReady: boolean;
  controlsLocked: boolean;
}

export function isPeriodEnabled({
  sentenceComplete,
  sceneReady,
  controlsLocked,
}: PeriodAvailabilityInput): boolean {
  return sentenceComplete && sceneReady && !controlsLocked;
}
export interface MotionStatusInput {
  isExecuting: boolean;
  activeLabel: string;
  hasDisplayedOutcome: boolean;
  resultTitle: string;
  resultDetail: string;
  reviewMode: boolean;
}

export function getMotionStatusText({
  isExecuting,
  activeLabel,
  hasDisplayedOutcome,
  resultTitle,
  resultDetail,
  reviewMode,
}: MotionStatusInput): string {
  if (isExecuting) {
    return activeLabel === "result" && hasDisplayedOutcome
      ? `実行結果：${resultTitle}。${resultDetail}`
      : `実行中：${activeLabel}`;
  }

  return reviewMode ? resultTitle : "作戦を編集できる";
}
