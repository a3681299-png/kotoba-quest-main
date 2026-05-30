import * as peggy from "peggy";
import type { ASTNode, SourceLocation } from "./types";

// パース結果の型
export interface ParseResult {
  success: true;
  ast: ASTNode[];
}

export interface ParseError {
  success: false;
  error: {
    message: string;
    location: SourceLocation | null;
    expected: string[];
    found: string | null;
  };
}

// grammar ソース（location() を活用）
const grammarSource = `
Program = _ statements:Statement* !. { return statements; }

Statement
  = s:(LoopStatement / IfStatement / VariableDecl / FunctionCall) _ ";"? _
    { return s; }

LoopStatement
  = "繰り返す" _ "(" _ count:Number _ ")" _ "{" _ body:Statement* _ "}" _
    { return { type: "Loop", count: count, body: body, location: location() }; }

IfStatement
  = "もし" _ "(" _ condition:Condition _ ")" _ "{" _ body:Statement* _ "}" _
    { return { type: "If", condition: condition, body: body, location: location() }; }

Condition
  = left:Expression _ op:ComparisonOp _ right:Expression
    { return { type: "Condition", left: left, op: op, right: right, location: location() }; }

ComparisonOp = "<=" / ">=" / "<" / ">" / "==" / "!="

VariableDecl
  = "変数" _ name:Identifier _ "=" _ value:Expression _
    { return { type: "VariableDecl", name: name, value: value, location: location() }; }

FunctionCall
  = name:Identifier _ ( "(" / "（" ) _ args:Arguments _ ( ")" / "）" ) _
    { return { type: "FunctionCall", name: name, args: args, location: location() }; }

Arguments
  = head:Expression tail:(_ ( "," / "、" ) _ Expression)* {
      return [head].concat(tail.map(function(t) { return t[3]; }));
    }
  / "" { return []; }

Expression = StringLiteral / Number / Identifier

StringLiteral
  = [\\"'"] chars:[^\\"'"]* [\\"'"] { return chars.join(""); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

Identifier
  = chars:[a-zA-Z_\\u3005\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF\\u30FC]+ 
    { return chars.join(""); }

_ = [ \\t\\n\\r\\u3000]*
`;

// パーサーを生成（シングルトン）
let parser: peggy.Parser | null = null;

function getParser(): peggy.Parser {
  if (!parser) {
    parser = peggy.generate(grammarSource);
  }
  return parser;
}

// コードをパースしてASTを返す（新しいResult型）
export function parse(code: string): ParseResult | ParseError {
  try {
    const p = getParser();
    const ast = p.parse(code) as ASTNode[];
    return { success: true, ast };
  } catch (error) {
    if (isPeggyError(error)) {
      return {
        success: false,
        error: {
          message: error.message,
          location: error.location
            ? {
                start: error.location.start,
                end: error.location.end,
              }
            : null,
          expected:
            error.expected?.map(
              (e: ExpectedItem) => e.description || e.text || String(e),
            ) || [],
          found: error.found ?? null,
        },
      };
    }
    // 予期しないエラー
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "不明なエラー",
        location: null,
        expected: [],
        found: null,
      },
    };
  }
}

// Peggy エラーの型ガード
interface PeggyError {
  message: string;
  location?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  expected?: ExpectedItem[];
  found?: string;
}

interface ExpectedItem {
  type: string;
  description?: string;
  text?: string;
}

function isPeggyError(error: unknown): error is PeggyError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as PeggyError).message === "string"
  );
}

// 後方互換性のため、旧APIも維持
export function parseCode(code: string): ASTNode[] {
  const result = parse(code);
  if (result.success) {
    return result.ast;
  }
  throw new Error(result.error.message);
}

// エラーメッセージを日本語でフォーマット（旧API）
export function formatParseError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    if (message.includes("Expected")) {
      return "構文エラー: コードの書き方が正しくありません";
    }

    return `エラー: ${message}`;
  }
  return "不明なエラーが発生しました";
}
