// AST ノード型定義

// ソース位置情報
export interface SourceLocation {
  start: {
    line: number;
    column: number;
    offset: number;
  };
  end: {
    line: number;
    column: number;
    offset: number;
  };
}

// 基底インターフェース（位置情報付き）
export interface BaseNode {
  location: SourceLocation;
}

export type ASTNode =
  | FunctionCallNode
  | VariableDeclNode
  | IfNode
  | LoopNode
  | PlanDefinitionNode;

export interface FunctionCallNode extends BaseNode {
  type: "FunctionCall";
  name: string;
  args: (string | number)[];
}

export interface VariableDeclNode extends BaseNode {
  type: "VariableDecl";
  name: string;
  value: string | number;
}

export interface ConditionNode extends BaseNode {
  type: "Condition";
  left: string | number;
  op: "<" | ">" | "<=" | ">=" | "==" | "!=" | "が";
  right: string | number;
}

export interface IfNode extends BaseNode {
  type: "If";
  condition: ConditionNode;
  body: ASTNode[];
  elseBody?: ASTNode[];
}

export interface LoopNode extends BaseNode {
  type: "Loop";
  count: number;
  body: ASTNode[];
}

export interface PlanDefinitionNode extends BaseNode {
  type: "PlanDefinition";
  name: string;
  body: ASTNode[];
}
