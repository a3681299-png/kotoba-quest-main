---
workflow: motion-graphics
flow: automation
storyboard: no
message: "ことばを組み立てる一手が、戦況を動かす"
destination: desktop-game-review
aspect: 1920x1080
language: ja
audience: "ことばクエストの開発メンバーとプレイヤー"
length: 8s
angle: battle-intro
---

## Intent

ことばクエストの既存素材を使い、戦闘開始前の緊張と「ことばを編んで戦う」体験を短い一幕で伝える。ゲーム本体へ直接組み込まず、HyperFrames の制作・検証手順を試せる独立したモーショングラフィックにする。

## Assets

- `src/assets/backgrounds/チュートリアル/background.png` — 戦闘背景。制作領域へ複製して使用する。
- `src/assets/characters/battle/チュートリアル/プレイヤー/player.png` — プレイヤー立ち絵。制作領域へ複製して使用する。
- `src/assets/characters/battle/チュートリアル/敵/火喰らいの獣.png` — 敵の立ち絵。制作領域へ複製して使用する。
- `src/assets/UI/hp/装飾フレーム.png` — 既存UIの意匠を示す装飾素材。必要な場合のみ使用する。

## Customizations

- 1ショット・無音・約8秒。奥行きのあるカメラ移動、文字の組み上がり、対峙する両者の着地を主な動きにする。
- 日本語コピーは短くし、最終ホールドで「ことばを編め。戦況を変えろ。」を読める状態にする。

## Notes

- ユーザー指定: WSL 側のことばクエストで HyperFrames skills を実際に使い、アニメーションを制作する。
- 推定: 使用先の指定がないため、既存ゲームと同じ横長の 1920x1080 を採用する。
- 推定: 細かな演出指定がないため、既存の暗い幻想戦闘画面と金色UIを視覚的な基準にする。
- 既存の未コミット変更、React の戦闘ロジック、元素材は変更しない。
