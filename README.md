# Kotoba Quest

ReactとPixi.jsを使用した、プログラミングバトルゲームプロジェクトです。
プレイヤーはコードを記述してユニット（ポーンなど）を制御し、相手のキングを倒すことを目指します。

## プロジェクト概要

「Kotoba Quest」は、独自の簡易言語を使用してユニットの行動をプログラムする戦略ゲームです。
Peggyを用いて生成されたパーサーがプレイヤーのコードを解析し、その意図に基づいてユニットが自動的に行動します。

## 主な機能

- **コードエディタ**: ゲーム内ブラウザでユニットの行動ロジックを記述。
- **カスタム言語パーサー**: Peggy (pegjs) で定義された文法に基づく、柔軟なコマンド解析。
- **リアルタイムバトル**: Pixi.jsによる高速でスムーズな2D描画。
- **ステート管理**: Zustandを使用した効率的なゲーム状態の管理。

## 技術スタック

- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite
- **Rendering**: Pixi.js v8
- **Parser Generator**: Peggy
- **State Management**: Zustand
- **Testing**: Vitest

## ディレクトリ構成

- `src/components`: React UIコンポーネント (エディタ、デバッグパネルなど)
- `src/game`: Pixi.jsを使用したゲームループ、描画ロジック (`BattleScene.ts` 等)
- `src/parser`: Peggyの文法定義 (`grammar.pegjs`) と生成されたパーサー
- `src/interpreter`: パースされたコードを実行するインタプリタ
- `src/store`: Zustandストア (ゲーム状態管理)

## セットアップと実行

依存関係のインストール:
```bash
npm install
```

開発サーバーの起動:
```bash
npm run dev
```

ビルド:
```bash
npm run build
```

リント:
```bash
npm run lint
```
