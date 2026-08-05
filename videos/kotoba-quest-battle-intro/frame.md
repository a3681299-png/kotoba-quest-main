---
name: "Kotoba Quest Shadow Cut"
colors:
  primary: "#090908"
  on-primary: "#f1e4c7"
  surface: "#3a352a"
  ash: "#8d897e"
  gold: "#c3ad75"
  accent: "#c44b38"
typography:
  headline:
    fontFamily: "Noto Sans JP"
    fontSize: "7.5rem"
    fontWeight: 700
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Noto Sans JP"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "JetBrains Mono"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  none: "0px"
  sm: "2px"
spacing:
  sm: "8px"
  md: "24px"
  lg: "64px"
motion:
  energy: "high"
  easing:
    entry: "expo.out"
    settle: "power3.out"
    ambient: "sine.inOut"
  duration:
    entrance: 0.55
    hold: 1.3
    resolve: 0.35
  atmosphere:
    - "deep-shadow"
    - "hairline-rules"
    - "paper-grain"
---

## Overview

既存のことばクエスト戦闘UIを基準にした、暗い幻想活劇のタイトルシークエンス。`Shadow Cut` の強い明暗と一色の火炎アクセントを土台にし、ゲーム固有の骨色と古金色を加える。青空の遺跡と火喰らいの獣の橙を対立させ、文字が「詠唱」ではなく「戦術として組み上がる」感触を出す。

## The Frame

- 戦闘背景は全画面の子要素として敷き、左下のプレイヤー、右下の敵、左上から中央の大見出しで三角形の視線経路を作る。
- 主役コピーは画面幅の60〜75%を使う。中央に浮かせず、左端の規則線と下端のメタ情報へ接続する。
- 既存素材は変形用ラッパーと画像本体を分け、登場と緩い押し込みを同じ要素へ競合させない。
- 背景・人物・前景の規則線／火花の三層を常に維持する。

## Colors

- `primary` は背景を落ち着かせる黒。純黒は使わない。
- `on-primary` は主コピー、`gold` は規則線と小見出し、`accent` は火花と決めの一語だけに使う。
- 写真素材の色を置き換えない。可読性は局所的な暗幕と文字影で確保する。

## Typography

- 日本語の主コピーは埋め込み済みの `Noto Sans JP` 700。太さと大きさで重みを出し、疑似的な明朝体へ置き換えない。
- 英数字の章番号とタイムコードだけ `JetBrains Mono` を使い、戦闘記録の声として分離する。
- 本文に改行タグを使わず、短い語群を個別の行として配置する。

## Motion

- 最初の0.2秒は背景の静けさを残す。プレイヤーは左から滑り、敵は右奥から重量感を伴って着地する。
- 文字は一字ずつ散らさず、意味のまとまりごとに切断面から組み上げる。強調語だけ短く脈動させる。
- 2.5秒を超えるため、中盤で一度だけ規則線と火花の向きを反転し、パターンを中断する。
- 最終コピーは1.5秒以上保持し、黒へ戻さず完成状態で終える。

## Do's and Don'ts

- 既存の骨色、古金、血赤を使い、青紫ネオンや汎用的なグラデーション文字を加えない。
- 角丸カード、Webダッシュボード風の枠、架空のゲーム数値を追加しない。
- 人物素材を別キャラクターへ描き直さず、元画像の輪郭と透明部分を保つ。
- 無限ループ、実時間、ランダム値、ホバーやスクロール依存の動きを使わない。
