export type SyntaxTokenType =
  | "plain"
  | "keyword"
  | "command"
  | "number"
  | "operator"
  | "stat";

export interface SyntaxToken {
  text: string;
  type: SyntaxTokenType;
}

const TOKEN_PATTERN =
  /(それ以外なら|もし|なら|終わり|強攻撃|攻撃|防御|バフ|敵HP|自分HP|HP|\d+|[<>=+\-*/(),（）])/g;

const KEYWORDS = new Set(["それ以外なら", "もし", "なら", "終わり"]);
const COMMANDS = new Set(["強攻撃", "攻撃", "防御", "バフ"]);
const STATS = new Set(["敵HP", "自分HP", "HP"]);

function classifyToken(text: string): SyntaxTokenType {
  if (KEYWORDS.has(text)) return "keyword";
  if (COMMANDS.has(text)) return "command";
  if (STATS.has(text)) return "stat";
  if (/^\d+$/.test(text)) return "number";
  if (/^[<>=+\-*/(),（）]$/.test(text)) return "operator";
  return "plain";
}

export function tokenizeCodeLine(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, index), type: "plain" });
    }

    const text = match[0];
    tokens.push({ text, type: classifyToken(text) });
    lastIndex = index + text.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), type: "plain" });
  }

  return tokens.length > 0 ? tokens : [{ text: line || " ", type: "plain" }];
}
