// --- プログラムの開始 ---
Program = _ statements:Statement* !. { return statements; }

// --- 各文の定義 ---
Statement
  = s:(LoopStatement / IfStatement / VariableDecl / FunctionCall) _ ";"? _
    { return s; }

LoopStatement
  = "繰り返す" _ "(" _ count:Number _ ")" _ "{" _ body:Statement* _ "}" _
    { return { type: "Loop", count: count, body: body }; }

IfStatement
  = "もし" _ "(" _ condition:Condition _ ")" _ "{" _ body:Statement* _ "}" _
    { return { type: "If", condition: condition, body: body }; }

Condition
  = left:Expression _ op:ComparisonOp _ right:Expression
    { return { type: "Condition", left: left, op: op, right: right }; }

ComparisonOp = "<=" / ">=" / "<" / ">" / "==" / "!="

VariableDecl
  = "変数" _ name:Identifier _ "=" _ value:Expression _
    { return { type: "VariableDecl", name: name, value: value }; }

FunctionCall
  = name:Identifier _ ( "(" / "（" ) _ args:Arguments _ ( ")" / "）" ) _
    { return { type: "FunctionCall", name: name, args: args }; }

Arguments
  = head:Expression tail:(_ ( "," / "、" ) _ Expression)* {
      return [head].concat(tail.map(function(t) { return t[3]; }));
    }
  / "" { return []; }

Expression = StringLiteral / Number / Identifier

// --- リテラルと基本要素 ---
StringLiteral
  = [\"'“] chars:[^\"'”]* [\"'”] { return chars.join(""); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

Identifier
  = chars:[a-zA-Z_\u3005\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u30FC]+ 
    { return chars.join(""); }

_ = [ \t\n\r\u3000]*