// インデントベースのコードを { } ベースに変換する
// Ohm.js に渡す前に実行する前処理

export interface PreprocessError {
  line: number;
  message: string;
}

export interface PreprocessResult {
  output: string;
  errors: PreprocessError[];
}

export function preprocess(source: string): PreprocessResult {
  const errors: PreprocessError[] = [];
  const rawLines = source.split("\n");

  // 空行・コメント行を除きつつ、元の行番号を保持
  const lines: { text: string; indent: number; lineNo: number }[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const stripped = raw.trimEnd();

    // 空行はスキップ
    if (stripped.trim() === "") continue;

    const indent = countIndent(stripped);
    const text = stripped.trimStart();
    lines.push({ text, indent, lineNo: i + 1 });
  }

  const output: string[] = [];
  const indentStack: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    const { text, indent, lineNo } = lines[i];
    const current = indentStack[indentStack.length - 1];

    if (indent > current) {
      // インデント増加 → 直前のブロック開始
      indentStack.push(indent);
      output.push("{");
    } else if (indent < current) {
      // インデント減少 → ブロック終了（複数段階あり得る）
      while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
        indentStack.pop();
        output.push("}");
      }
      if (indentStack[indentStack.length - 1] !== indent) {
        errors.push({
          line: lineNo,
          message: `インデントが一致しません（${indent}スペース）`,
        });
      }
    }

    output.push(text);
  }

  // 残っているブロックを閉じる
  while (indentStack.length > 1) {
    indentStack.pop();
    output.push("}");
  }

  return {
    output: output.join("\n"),
    errors,
  };
}

function countIndent(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === " ") count++;
    else if (ch === "\t") count += 2; // タブは2スペース扱い
    else break;
  }
  return count;
}
