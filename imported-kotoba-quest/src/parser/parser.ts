import * as ohm from "ohm-js";
import { preprocess } from "./preprocessor";
import type {
  ASTNode,
  LoopWhileNode,
  LoopNNode,
  IfNode,
  ElseIfBranch,
  AssignNode,
  MagicCmdNode,
  DefendCmdNode,
  HealCmdNode,
  WaitCmdNode,
  TargetedMagicNode,
  Condition,
  WhileCondition,
  LVal,
  RVal,
  MagicArg,
  CompOp,
  Element,
} from "./ast";
import { MAGIC_NAMES } from "./ast";

// ─── 文法ロード（インライン）──────────────────────────
// fs/path 依存を避けるため grammar.ohm の内容を文字列として直接保持する

const GRAMMAR_SRC = `
KotobaQuest {

  Program = Statement*

  Statement
    = LoopWhile
    | LoopN
    | IfStatement
    | Assign
    | TargetedMagic
    | MagicCmd
    | DefendCmd
    | HealCmd
    | WaitCmd

  Block = "{" Statement* "}"

  LoopWhile = "繰り返す" "(" WhileCond "あいだ" ")" ":" Block
  LoopN     = "繰り返す" "(" intLit ")" ":" Block

  IfStatement = "もし" Cond "ならば" ":" Block ElseIf* ElsePart?
  ElseIf      = "そうでなければ" "もし" Cond "ならば" ":" Block
  ElsePart    = "そうでなければ" ":" Block

  Assign = ident "=" RVal

  TargetedMagic = "敵" "[" intLit "番目" "]" "へ" MagicCmd
  MagicCmd      = "魔法" "(" MagicArg ")"
  DefendCmd     = "防御" "(" ")"
  HealCmd       = "回復" "(" ")"
  WaitCmd       = "待機" "(" ")"

  MagicArg = MagicName | ident

  MagicName (魔法名)
    = "フレイム" | "アクア" | "スパーク" | "フロスト" | "ゲイル"

  WhileCond = EnemyAlive | Cond

  Cond = SimpleCond (LogicOp SimpleCond)*

  SimpleCond
    = EnemyState
    | EnemyAlive
    | CompCond

  EnemyAlive = "敵が生きている"
  EnemyState = "敵が" Element "状態"

  Element (属性) = "火" | "水" | "雷" | "氷" | "風"

  CompCond = LVal particle? RVal CompOp

  // 相互参照: プレイヤー.変数名 / なかま.変数名
  MemberRef = ("プレイヤー" | "なかま") "." ident

  LVal (左辺)
    = "敵のHP"
    | "自分のHP"
    | "自分のMP"
    | MemberRef
    | ident

  RVal (右辺) = intLit | MagicName | MemberRef | ident

  particle (助詞) = "が" | "を" | "は"

  CompOp (比較演算子)
    = "より小さい"
    | "より大きい"
    | "以上"
    | "以下"
    | "と等しい"
    | "と等しくない"

  LogicOp (論理演算子) = "かつ" | "または"

  intLit (整数) = digit+

  ident (識別子) = identChar+

  identChar
    = "\\u3040".."\\u309F"
    | "\\u30A0".."\\u30FF"
    | "\\u4E00".."\\u9FFF"
    | letter
    | digit
    | "_"

  // 改行もスペースとして扱う
  // ブロック境界・命令間の改行はすべてここで吸収する
  space := " " | "\\t" | "\\n" | "\\r" | "　" | "\u00A0"
}
`;

const grammar = ohm.grammar(GRAMMAR_SRC);

// ─── パース結果 ───────────────────────────────────────

export interface ParseSuccess {
  ok: true;
  ast: ASTNode[];
}

export interface ParseFailure {
  ok: false;
  message: string;
  line: number | null;
}

export type ParseResult = ParseSuccess | ParseFailure;

// ─── パーサー公開関数 ─────────────────────────────────

export function parse(source: string): ParseResult {
  // Step1: プリプロセッサでインデントを { } に変換
  const { output: preprocessed, errors: preErrors } = preprocess(source);

  if (preErrors.length > 0) {
    return {
      ok: false,
      message: preErrors[0].message,
      line: preErrors[0].line,
    };
  }

  // Step2: Ohm.js でパース
  const matchResult = grammar.match(preprocessed);

  if (matchResult.failed()) {
    return {
      ok: false,
      message: matchResult.message ?? "構文エラー",
      line: null,
    };
  }

  // Step3: セマンティクスアクションで AST を構築
  const ast = semantics(matchResult).toAST() as ASTNode[];
  return { ok: true, ast };
}

// ─── セマンティクスアクション ─────────────────────────

const semantics = grammar.createSemantics().addOperation<unknown>("toAST", {
  Program(stmts) {
    return stmts.children.map((s) => s.toAST());
  },

  // ─── ループ ─────────────────────────────────────────
  LoopWhile(_kw, _lp, cond, _aidaText, _rp, _colon, block) {
    return {
      type: "LoopWhile",
      condition: cond.toAST(),
      body: block.toAST(),
    } satisfies LoopWhileNode;
  },

  LoopN(_kw, _lp, count, _rp, _colon, block) {
    return {
      type: "LoopN",
      count: Number((count.toAST() as string)),
      body: block.toAST(),
    } satisfies LoopNNode;
  },

  // ─── 条件分岐 ────────────────────────────────────────
  IfStatement(_moshi, cond, _naraba, _colon, block, elseIfs, elsePart) {
    return {
      type: "If",
      condition: cond.toAST(),
      then: block.toAST(),
      elseIfs: (elseIfs.children as ohm.Node[]).map((e) => e.toAST() as ElseIfBranch),
      else: elsePart.children.length > 0
        ? (elsePart.children[0].toAST() as ASTNode[])
        : null,
    } satisfies IfNode;
  },

  ElseIf(_sou, _moshi, cond, _naraba, _colon, block) {
    return {
      condition: cond.toAST(),
      body: block.toAST(),
    } satisfies ElseIfBranch;
  },

  ElsePart(_sou, _colon, block) {
    return block.toAST();
  },

  Block(_open, stmts, _close) {
    return stmts.children.map((s) => s.toAST());
  },

  // ─── 代入 ────────────────────────────────────────────
  Assign(name, _eq, value) {
    return {
      type: "Assign",
      name: name.toAST() as string,
      value: value.toAST() as RVal,
    } satisfies AssignNode;
  },

  // ─── コマンド ────────────────────────────────────────
  TargetedMagic(_teki, _lb, idx, _ban, _rb, _e, magic) {
    const magicNode = magic.toAST() as MagicCmdNode;
    return {
      type: "TargetedMagic",
      targetIndex: Number(idx.toAST() as string),
      magic: magicNode,
    } satisfies TargetedMagicNode;
  },

  MagicCmd(_kw, _lp, arg, _rp) {
    return {
      type: "MagicCmd",
      arg: arg.toAST() as MagicArg,
      target: null,
    } satisfies MagicCmdNode;
  },

  DefendCmd(_kw, _lp, _rp) {
    return { type: "DefendCmd" } satisfies DefendCmdNode;
  },

  HealCmd(_kw, _lp, _rp) {
    return { type: "HealCmd" } satisfies HealCmdNode;
  },

  WaitCmd(_kw, _lp, _rp) {
    return { type: "WaitCmd" } satisfies WaitCmdNode;
  },

  MagicArg(node) {
    return node.toAST();
  },

  MagicName(node) {
    return node.sourceString as MagicArg;
  },

  // ─── 条件式 ──────────────────────────────────────────
  WhileCond(node) {
    return node.toAST() as WhileCondition;
  },

  Cond(first, ops, rests) {
    const left = first.toAST() as Condition;
    const opList = ops.children.map((o) => o.sourceString as "かつ" | "または");
    const rightList = rests.children.map((r) => r.toAST() as Condition);

    return opList.reduce(
      (acc: Condition, op, i) => ({
        type: "Logic" as const,
        op,
        left: acc,
        right: rightList[i],
      }),
      left
    );
  },

  SimpleCond(node) {
    return node.toAST() as Condition;
  },

  EnemyAlive(_) {
    return { type: "EnemyAlive" as const };
  },

  EnemyState(_tekiGa, element, _jo) {
    return {
      type: "EnemyState" as const,
      element: element.sourceString as Element,
    };
  },

  Element(node) {
    return node.sourceString as Element;
  },

  CompCond(left, _particle, right, op) {
    return {
      type: "Comp" as const,
      left: left.toAST() as LVal,
      op: op.sourceString as CompOp,
      right: right.toAST() as RVal,
    };
  },

  // 相互参照: "プレイヤー.varName" or "なかま.varName" を文字列として返す
  MemberRef(prefix, _dot, varName) {
    return `${prefix.sourceString}.${varName.sourceString}`;
  },

  LVal(node) {
    return node.sourceString;
  },

  RVal(node) {
    const s = node.sourceString;
    const n = Number(s);
    if (!isNaN(n) && s !== "") return n;
    if (MAGIC_NAMES.has(s as never)) return s;
    return s;
  },

  // ─── 基本要素 ─────────────────────────────────────────
  intLit(_digits) {
    return this.sourceString;
  },

  ident(_chars) {
    return this.sourceString;
  },

  particle(node) {
    return node.sourceString;
  },

  CompOp(node) {
    return node.sourceString as CompOp;
  },

  LogicOp(node) {
    return node.sourceString;
  },

  // Ohm.js 組み込みノード
  _iter(...children) {
    return children.map((c) => c.toAST());
  },

  _terminal() {
    return this.sourceString;
  },
});
