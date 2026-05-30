import type { EnemyIntent } from "../engine/EnemyAI";

interface EnemyTelegraph {
  className: string;
  icon: string;
  label: string;
  damageLabel: string | null;
}

const DANGEROUS_INTENTS = new Set([
  "attack_normal",
  "attack_heavy",
  "attack_multi",
  "charging",
]);

export function getEnemyTelegraph(
  intent: EnemyIntent | null,
): EnemyTelegraph | null {
  if (!intent) {
    return null;
  }

  const tone = DANGEROUS_INTENTS.has(intent.type) ? "danger" : "calm";

  return {
    className: `enemy-telegraph ${tone} ${intent.type}`,
    icon: intent.icon,
    label: intent.description,
    damageLabel: intent.damage > 0 ? String(intent.damage) : null,
  };
}
