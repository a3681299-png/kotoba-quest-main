// 有効文字数 = 空白・改行・コロンを除いた文字数

export function countEffectiveChars(code: string): number {
  let count = 0;
  for (const ch of code) {
    if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r" && ch !== ":") {
      count++;
    }
  }
  return count;
}

// 文字数制限によるダメージ補正
// limit を超えた分だけダメージが比例して減る
export function applyCharLimit(damage: number, effectiveChars: number, limit: number): number {
  if (effectiveChars <= limit) return damage;
  return Math.floor(damage * limit / effectiveChars);
}
