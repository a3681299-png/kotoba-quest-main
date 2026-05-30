export type CombatTextType = "normal" | "damage" | "success" | "block";

export interface CombatTextEntry {
  type: CombatTextType;
  message: string;
}

const COMBAT_LOG_PATTERN = /^\[(normal|damage|success|block)\]\s*/;

export function parseCombatLogEntry(log: string): CombatTextEntry {
  const match = log.match(COMBAT_LOG_PATTERN);

  if (!match) {
    return {
      type: "normal",
      message: log,
    };
  }

  return {
    type: match[1] as CombatTextType,
    message: log.replace(COMBAT_LOG_PATTERN, ""),
  };
}
