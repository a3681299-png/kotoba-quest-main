# Design QA: 複合実行UI（2026-08-14）

## 対象と比較条件

- source visual truth: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-1a190c0d-38bb-4e52-ae63-c0da264f5671.png`（1920 x 1080、RGB）。右下の大きい主操作と小さいカウンターの組み合わせを参照した。
- supplied asset: `src/assets/UI/icon/hud/execution.png`（1254 x 1254、RGBA）。画像内の大円を実行ボタン、小円をターン表示として使用した。
- implementation full view: `/tmp/word-quest-execution-cluster-battle.png`（1920 x 1080）。
- implementation focused view: `/tmp/word-quest-execution-cluster-ready-region.png`（440 x 430）。
- combined comparison: `/tmp/word-quest-execution-reference-comparison.png`（920 x 480）。参照画像の右下640 x 420と実装の右下440 x 430を同じ画像内で比較した。
- viewport/density: CSS viewport 1920 x 1080、device scale factor 1。比較はどちらも等倍の右下領域を使い、密度変換はしていない。
- state: 初回戦闘。未完成時は残りターン3/3で実行不可、条件と行動を選んだ状態は2/3で実行可能。

## Findings

未解決のP0、P1、P2はありません。参照画像と同じく、大きい円を主操作、その左下の小さい円を数値表示として読める。背景の長方形や区切り線はなく、右下へ固定した装飾画像だけが戦闘画面に重なる。

## 比較履歴

- 初回比較で、大円と小円の位置関係、右下への固定、素材の透明境界、2/3の中央揃えを確認した。
- 大円のクリック領域は画像内の円と一致し、小円は実行操作を受けない。初回比較にP0、P1、P2はなかったため、比較後の修正はない。
- 参考画像は別作品の画面全体であり、文字や色の複製はせず、支給された `execution.png` の意匠を基準にした。

## 必須確認面

- 文字: 大円の「実行」は支給画像内の文字をそのまま使用。小円だけに `TURN` と残り/合計を重ね、2/3と3/3が中央に収まる。
- 間隔: 複合画像は360 x 360pxで右下固定。大円の操作領域は画像内の円に沿う48%、小円の表示領域は32%で、互いに重ならない。
- 色: 支給PNGの黒、骨色、赤を維持。未完成時だけ明度と彩度を落とし、実行可能時は素材本来の色と弱い赤い光へ戻す。
- 画像品質: 1254 x 1254のPNGを再生成、再圧縮せず `object-fit: contain` で表示。透明境界、縦横比、細い装飾線に欠けはない。
- 文言: 主操作は画像内の「実行」、小円はターン数だけに限定した。以前の補助操作や語彙コストは戻していない。
- レスポンシブ: 900px以下では複合画像を300pxへ縮小。390px幅では既存の1080px戦闘キャンバス内の右端に収まり、このUIによる追加の横方向オーバーフローはない。
- アクセシビリティ: 大円は実際の `button` で、円形のキーボードフォーカス、disabled、title、`aria-label` を維持。小円は `role="meter"` と `aria-valuemin/max/now/text` を持つ。

## 操作と自動検証

- ブラウザ: 初回戦闘を開始し、新しい `execution.png` が読み込まれた状態を1920 x 1080で確認。Viteエラーオーバーレイと実行時エラーはなし。
- 操作: 初期3/3、行動選択後2/3、実行後3/3を確認。大円は未完成時disabled、完成時enabledになり、実行後に再びdisabledへ戻る。
- ESLint: passed
- Vitest（`src`）: 34 files、174 tests passed
- TypeScript/Vite production build: passed
- `git diff --check`: passed

final result: passed

---

# Design QA: 行動回数と実行ボタンの画像UI（2026-08-14）

## 対象と比較条件

- source visual truth: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-93b2bcc6-ec23-4fc5-9ae8-4c6a7afaf8bc.png`（440 x 283）。置き換え前の操作領域と削除対象の確認に使用。
- supplied assets: `src/assets/UI/icon/hud/turn.png`（765 x 326、RGBA）と `src/assets/UI/icon/hud/execution.png`（2172 x 724、RGBA）。
- implementation screenshot: `/tmp/word-quest-battle-ui.png`（1920 x 1080、未完成状態）と `/tmp/word-quest-battle-ui-ready.png`（1920 x 1080、実行可能状態）。
- combined comparison: `/tmp/word-quest-ui-comparison.png`（920 x 330）。左に参照画像、右に実装の操作領域を440 x 283で同時表示した。
- viewport/density: CSS viewport 1920 x 1080、device scale factor 1。参照画像は等倍。実装側は同一スクリーンショットの右下440 x 283を切り出し、密度を変えずに比較した。
- state: 初回戦闘。通常時は行動3/3で実行不可、条件と動詞を選んだ実行可能時は行動2/3。

## Findings

未解決のP0、P1、P2はありません。`turn.png` 内に残り行動数が収まり、`execution.png` は未完成時の暗い状態と実行可能時の明るい状態を判別できる。いずれも透明領域を保ったまま欠けずに表示され、画面右下からはみ出していない。

## 比較履歴

- 初回比較で、旧「行動」メーターと「作戦実行」ボタンが支給画像へ置き換わり、文追加、文削除、交換、戻す、修飾解除、語彙コスト表示が操作領域から消えていることを確認した。
- 初回比較にP0、P1、P2はなかったため、比較後の視覚修正は不要だった。
- 実行可能状態も追加確認し、`execution.png` が明るくなり、ボタンのフォーカス表示を維持することを確認した。

## 必須確認面

- 文字: `execution.png` 内の「実行」は支給画像の文字をそのまま使用。行動数は既存UIと同じ残り/合計表記で、3/3から動詞選択後に2/3へ変化する。WSLのヘッドレスChromeには日本語フォントがないため、変更対象外のDOM文字は比較対象から除外した。
- 間隔: 440px幅の操作欄で、行動フレームを188 x 124px、実行ボタン領域を356 x 90pxに収めた。両方を中央揃えにし、1920 x 1080で下端まで表示できる。
- 色: 支給PNGの黒、骨色、赤を無加工で使用。未完成時だけ既存のdisabled表現に合わせて彩度と明度を落とし、実行可能時は素材本来の色へ戻す。
- 画像品質: 両PNGを再生成、再圧縮せず使用。縦横比を維持し、透明境界のハロー、引き伸ばし、代替CSS描画はない。
- 文言: 操作領域には「行動」と残数だけを重ね、実行ラベルは画像内の「実行」に統一。削除対象の補助文言は残していない。
- アクセシビリティ: 行動数は `role="meter"` と `aria-valuemin/max/now/text` を持つ。実行ボタンは画像を装飾扱いにし、`aria-label="作戦を実行"`、disabled、title、キーボードフォーカスを維持した。

## 操作と自動検証

- ブラウザ: 初回戦闘を開始し、両画像がnatural size 765 x 326、2172 x 724で読み込まれたことを確認。Viteエラーオーバーレイと実行時エラーはなし。
- 操作: 条件と動詞を選ぶと行動2/3、実行ボタン有効へ変化。実行後は行動3/3へ戻り、「作戦を実行しました。行動回数と語彙が回復しました。」が表示された。
- ESLint: passed
- Vitest（`src`）: 34 files、174 tests passed
- TypeScript/Vite production build: passed
- `git diff --check`: passed

final result: passed

---

# Design QA: キャラ専用フレーム画像へ切り替え（2026-08-06）

## 対象と比較条件

- source visual truth: `src/assets/UI/icon/frame/lotta_frame.png`（1024 x 1024、RGBA、SHA-256 `7ca1cbde876502940f32ab184abfd4b6774f489caa6f2e538b263201795b484a`）。ロッタと破れ紙フレームが一枚に合成済みの支給素材。
- 追加素材確認: `cecile_frame.png`、`edgar_frame.png`、`eleanor_frame.png`、`lisette_frame.png`、`lotta_frame.png`、`lucien_frame.png`、`shion_frame.png`。現在のWord Quest戦闘プレイヤーはロッタ固定のため、実装対象は `lotta_frame.png`。
- before screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-specific-frame-before.png`（1190 x 780）。`Lotta_icon.png` と汎用 `frame.png` を別レイヤーで合成した旧実装。
- implementation screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-specific-frame-after.png`（1190 x 780）。`lotta_frame.png` 一枚だけを表示する新実装。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-specific-frame-comparison.png`（2400 x 780）。左が旧合成、右が専用フレーム。上段がPC、下段が狭幅。
- viewport/density: PCはHUD 595 CSS px幅、専用フレーム220 x 220 CSS px。狭幅はHUD 359 CSS px幅、専用フレーム150 x 150 CSS px。device scale factor 2。
- state: HP 100%、状態効果なし。キャラ、専用紙フレーム、HPバーの通常表示を比較した。
- full-view比較内で顔、六角形内周、破れ紙外周、HPバーとのgapを判別できるため、別のfocused-region切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。ロッタ専用フレームは支給素材どおりのキャラ位置・六角形・破れ紙外周で表示され、旧実装の二重レイヤーは残っていない。PC・狭幅ともHPバーとの間隔を保ち、画像欠けや縦横比の崩れはない。

## 比較履歴

- 初回比較でP0、P1、P2は検出されなかったため、追加の視覚修正は不要だった。
- `PlayerVitalBar` を `portraitFrameUrl` 一枚を受け取る構造へ変更し、ロッタには `lotta_frame.png` を割り当てた。旧 `Lotta_icon.png` と汎用 `frame.png` のimport・重ね表示・位置補正CSSを削除した。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、サイズ、ウェイト、行間、文言は変更していない。
- 間隔: 正方形素材に合わせてportraitのaspect ratioを1へ変更。幅とHPバーとのflex gapは維持し、PC・狭幅とも重なりはない。
- 色: `lotta_frame.png` の配色、光彩、透明度を無加工で使用。HP素材の色処理は変更していない。
- 画像品質: 1024 x 1024の支給PNGを再生成・再圧縮せず `object-fit: contain` で表示。引き伸ばし、透明境界のハロー、代替CSS描画はない。
- 文言: 画面内コピーは変更していない。
- アクセシビリティ: 専用フレームは既存どおり空altと `aria-hidden` の装飾画像。HP meterと戦闘状態groupを維持している。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: 六角形キャラ画像を左上へ調整（2026-08-06）

## 対象と比較条件

- ユーザー添付画像 `C:/Users/sm787/AppData/Local/Temp/codex-clipboard-40d443d0-94fd-41bf-af0b-ba0635f5a88d.png` は一時ファイル消失のため再読込不可。
- source visual truth: `src/assets/UI/icon/character/Lotta_icon.png`（1254 x 1254、RGBA、SHA-256 `3f1994796ebd9f17b4d2bb38fc31d6f4440b196da65c06d56a744960f8184837`）。六角形の透過外周を持つ更新済み素材。
- before screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hex-character-position-before.png`（1190 x 728）。更新素材を `top: 31%`、`left: 27%` で表示。
- implementation screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hex-character-position-after.png`（1190 x 728）。更新素材を `top: 27%`、`left: 23%` で表示。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hex-character-position-comparison.png`（2400 x 728）。左が修正前、右が修正後。上段がPC、下段が狭幅。
- viewport/density: PCはHUD 595 x 約204 CSS px、狭幅はHUD 359 x 約139 CSS px、device scale factor 2。修正前後を同じ寸法・密度へ正規化した。
- state: HP 100%、状態効果なし。六角形外周、紙フレームとの位置関係、HPバーとの間隔を比較した。
- full-view比較内で六角形の六辺、顔、紙フレームの内周を判別できるため、別のfocused-region切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。六角形キャラ画像はPCで約9px、狭幅で約6px相当だけ左上へ移り、紙フレーム中央で下寄りに見えていた配置が改善した。表示サイズ52%、フレーム、HPバー、gapは維持され、画像欠けや重なりはない。

## 比較履歴

- 初回比較でP0、P1、P2は検出されなかったため、追加の視覚修正は不要だった。
- `.word-game__vitals-portrait-image--character` の `top/left` だけを31%/27%から27%/23%へ変更した。幅・高さ・合成順には触れていない。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、サイズ、ウェイト、行間、文言は変更していない。
- 間隔: キャラだけを4%ずつ左上へ移動。紙フレーム、HPバー、flex gap、レスポンシブ幅は維持した。
- 色: 更新版 `Lotta_icon.png`、`frame.png`、HP素材の色、透明度、合成順は変更していない。
- 画像品質: 支給された六角形PNGを再生成・再圧縮せず使用。透過外周の六辺、縦横比、輪郭にハローや引き伸ばしはない。
- 文言: 画面内コピーは変更していない。
- アクセシビリティ: 装飾画像の空altと `aria-hidden`、HP meter、戦闘状態groupを維持している。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: キャラ画像を約30%縮小（2026-08-06）

## 対象と比較条件

- source visual truth: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-size-smaller-preview.png`（1190 x 728）。キャラを74%で重ねた直前のHUD。
- implementation screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-size-30-percent-preview.png`（1190 x 728）。キャラを52%へ縮小したHUD。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-size-30-percent-comparison.png`（2400 x 728）。左が修正前、右が修正後。上段がPC、下段が狭幅。
- viewport/density: PCはHUD 595 x 約204 CSS px、狭幅はHUD 359 x 約139 CSS px、device scale factor 2。修正前後を同じ寸法・密度へ正規化した。
- state: HP 100%、状態効果なし。キャラの縮小率、中心位置、フレームの見え方、HPバーとの間隔を比較した。
- full-view比較内でPCのキャラが約302pxから212px、狭幅が約206pxから145pxへ変化したことと顔の判別性を確認できるため、別のfocused-region切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。キャラの幅・高さは直前の表示から約30%縮小され、破れ紙の中央面と外周が明確に見える。PC・狭幅とも顔と衣装を判別でき、中心ずれ、画像欠け、HPバーとの重なりはない。

## 比較履歴

- 初回比較でP0、P1、P2は検出されなかったため、追加の視覚修正は不要だった。
- `.word-game__vitals-portrait-image--character` の `width/height` を74%から52%へ変更。見た目の中心を維持するため `top/left` を20%/16%から31%/27%へ移した。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、サイズ、ウェイト、行間、文言は変更していない。
- 間隔: フレーム、HPバー、flex gapは維持。キャラの周囲だけに余白を追加し、紙フレームの中央面を見せた。
- 色: `frame.png`、`Lotta_icon.png`、HP素材の色、透明度、合成順は変更していない。
- 画像品質: 1254 x 1254のキャラPNGを縦横比維持で縮小。狭幅でも約72.5 CSS px相当あり、表情を判別できる。ハロー、引き伸ばし、追加マスクはない。
- 文言: 画面内コピーは変更していない。
- アクセシビリティ: 装飾画像の空altと `aria-hidden`、HP meter、戦闘状態groupを維持している。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: キャラ画像を一回り縮小（2026-08-06）

## 対象と比較条件

- source visual truth: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/new-paper-frame-hud-preview.png`（1190 x 728）。更新版フレームへキャラを82%で重ねた修正前HUD。
- implementation screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-size-smaller-preview.png`（1190 x 728）。キャラだけを74%へ縮小した修正後HUD。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-size-smaller-comparison.png`（2400 x 728）。左が修正前、右が修正後。上段がPC、下段が狭幅。
- viewport/density: PCはHUD 595 x 約204 CSS px、狭幅はHUD 359 x 約139 CSS px、device scale factor 2。修正前後を同じCSS寸法、同じ密度へ正規化した。
- state: HP 100%、状態効果なし。フレーム、キャラ、HPバーの通常表示を比較した。
- full-view比較内でPCのキャラが約335pxから302px、狭幅が約228pxから206pxへ変わったことと透明境界を判別できるため、別のfocused-region切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。キャラは約10%小さくなり、顔の判別性を維持したまま破れ紙の上辺と左右が広く見える。見た目の中心、フレーム寸法、HPバー寸法、両者の間隔は修正前と同じで、PC・狭幅とも重なりや欠けはない。

## 比較履歴

- 初回比較でP0、P1、P2は検出されなかったため、追加の視覚修正は不要だった。
- 修正は `.word-game__vitals-portrait-image--character` のみ。`width/height` を82%から74%、`top/left` を16%/12%から20%/16%へ変え、画像中心を維持した。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、サイズ、ウェイト、行間、文言は変更していない。
- 間隔: フレームとHPバーの寸法・gapは維持。キャラの周囲だけに約4%ずつ余白を追加した。
- 色: `frame.png`、`Lotta_icon.png`、HP素材の色、透明度、合成順は変更していない。
- 画像品質: 1254 x 1254のキャラPNGを縦横比維持で縮小。透明境界のハロー、引き伸ばし、追加マスクはない。
- 文言: 画面内コピーは変更していない。
- アクセシビリティ: 装飾画像の空altと `aria-hidden`、HP meter、戦闘状態groupを維持している。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: 更新版の破れ紙フレームへ差し替え（2026-08-06）

## 対象と比較条件

- source visual truth: `src/assets/UI/icon/frame/frame.png`（830 x 770、RGBA）と `src/assets/UI/icon/character/Lotta_icon.png`（1254 x 1254、RGBA）。更新後の `frame.png` を再読込し、旧 `icon_frame.png` は比較・実装とも使用していない。
- implementation screenshot: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/new-paper-frame-hud-preview.png`（1190 x 728）。実PNGと最終CSS比率で描画したcode-rendered component。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/new-paper-frame-comparison.png`（1990 x 768）。左が更新版フレーム単体、右上がPC、右下が狭幅実装。
- viewport/density: PCはHUD 595 x 約204 CSS px、アイコン台紙220 x 約204 CSS px、device scale factor 2。狭幅はHUD 359 x 約139 CSS px、アイコン台紙150 x 約139 CSS px、device scale factor 2。sourceは縦横比を維持して700 x 649へ正規化した。
- state: HP 100%、状態効果なし。変更対象であるフレーム、キャラ、HPバーの通常表示を比較した。
- full-view comparisonで更新版フレームの外周、キャラの顔と輪郭、HPバーとの間隔を十分判別できるため、別のfocused-region切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。更新後の白い破れ紙フレームがキャラの背面に入り、上・左・右の破れた外周が見える。キャラは前面で大きく判別でき、PC・狭幅ともHPバーへ重ならない。

## 比較履歴

- 初回の最終比較で実装上のP0、P1、P2は検出されなかったため、視覚修正の反復は不要だった。
- QA証拠作成時に狭幅プレビューのキャンバス下端だけが不足していたため、実装変更ではなく比較画像の正規化として高さを728pxへ再取得した。再比較ではフレームとキャラ全体を確認できた。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、ウェイト、行間、文言は変更していない。
- 間隔: PCの台紙幅を最大220px、狭幅を150pxとし、台紙とゲージの間をそれぞれ10px、6px確保。キャラは台紙内の `top: 16%`、`left: 12%`、`width/height: 82%` へ配置し、端の紙装飾を残した。
- 色: 更新版 `frame.png` と既存 `Lotta_icon.png`、HP素材を色補正せず使用。新しいCSS描画や代替色は追加していない。
- 画像品質: 830 x 770の台紙と1254 x 1254のキャラを縦横比を維持して表示。透明境界のハロー、引き伸ばし、旧円形マスクはない。
- 文言: 今回は画像差し替えだけで、画面内コピーを変更していない。
- アクセシビリティ: 装飾画像の空altと `aria-hidden`、HP meterのARIA値、戦闘状態groupを維持している。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: 戦闘タイトル削除とキャラアイコン拡大（2026-08-05）

## 対象と比較条件

- ユーザー添付画像: `C:/Users/sm787/AppData/Local/Temp/codex-clipboard-e300b6c5-7b4c-44ad-a00d-ca176bf79124.png` は一時ファイル消失のため再読込不可。
- title source visual truth: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/split-stage-final.png`（1920 x 1080）。左上の「ことばクエスト」「語彙遠征・第1葉」の位置確認だけに使用し、旧アイコン意匠は比較対象外。
- icon size source visual truth: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-hud-desktop.png`（640 x 148）。修正前の320 x 74 CSS px HUDをdevice scale factor 2で描画したもの。
- desktop implementation: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-hud-large-desktop.png`（960 x 272）。480 x 136 CSS px、device scale factor 2。
- narrow implementation: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-hud-large-mobile.png`（608 x 192）。304 x 96 CSS px、device scale factor 2。
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-size-comparison.png`（1900 x 720）。左上が削除対象テキスト、左下が修正前HUD、右上がPC実装、右下が狭幅実装。
- state: HP 100%、状態効果なし。実PNG、既存ゲージ変換、最終CSS寸法を使ったcode-rendered component comparison。
- full-viewとfocused-regionを同じ比較画像に収め、削除対象テキスト、アイコンの顔、フレーム外周、HPバー幅を判別できるため追加切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。戦闘中の左上タイトルとサブタイトルは消え、PCではアイコン外周が修正前約74pxから136pxへ拡大した。中央の顔も約31pxから57px相当になり、キャラクターアイコンとして判別できる。HPバー本体は約236pxから334pxへ広がり、アイコン拡大の代わりにゲージを圧迫していない。狭幅でも外周96pxを維持する。

## 比較履歴

- ユーザー指摘を修正前findingとして扱った: タイトル2行が左上の面積を使い、アイコン外周約74px、顔約31pxでは人物の判別が難しかった。
- 修正: 戦闘mastheadからタイトル要素を削除。中央の手番をgrid column 2、終了操作をcolumn 3へ明示して配置崩れを防いだ。プレイヤーHUDを上へ移し、PC幅420〜480px、アイコン96〜136pxへ拡大した。
- 修正後証拠: combined comparison右上ではタイトルが占めていた高さへ大きいアイコンが入り、顔、両目、表情を判別できる。右下でもアイコンとHPバーの間に6px相当の間隔が残り、重なりはない。
- 状態: 解消

## 必須確認面

- 文字: 戦闘画面の「ことばクエスト」「語彙遠征・第N葉」だけを削除。手番と「本を閉じる」のフォント、サイズ、文言は維持し、開始画面や結果画面の固有文言には触れていない。
- 間隔: PCのプレイヤーHUDを `top: 2px`、幅 `clamp(420px, 25vw, 480px)`、アイコン幅 `clamp(96px, 29%, 136px)` とした。狭幅はHUD最大320px、アイコン96pxで固定し、HPバーの可読幅を確保した。
- 色: キャラ、フレーム、HPゲージのPNGと色処理は変更していない。既存トークンやコントラストにも変更なし。
- 画像品質: `Lotta_icon.png` と `icon_frame.png` を再生成・再圧縮せず拡大。元画像が1254px／1024pxあるため136px表示でも解像度不足や透明境界の荒れはない。
- 文言: ユーザー指定の戦闘タイトル2行のみ削除し、HP値、プレイヤー名、状態効果、手番表示を維持。
- アクセシビリティ: HP meterのARIA、戦闘状態group、終了ボタンは維持。装飾アイコンは引き続き読み上げ対象外。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: キャラアイコンと専用フレームのHP横配置（2026-08-05）

## 対象と比較条件

- source visual truth: `src/assets/UI/icon/character/Lotta_icon.png`（1254 x 1254）と `src/assets/UI/icon/frame/icon_frame.png`（1024 x 1024）。戦闘中の主人公ロッタへ支給素材をそのまま使う。
- source target: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-source-target.png`
- implementation focused region: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-implementation.png`
- desktop placement: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-hud-desktop.png`
- mobile placement: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-hud-mobile.png`
- combined comparison: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/character-icon-comparison.png`
- focused viewport/state: アイコン88 x 88 CSS px、device scale factor 4、実装画素352 x 352。sourceは1024 x 1024の基準合成を352 x 352へ正規化し、両方を12px余白付き376 x 376パネルで比較した。
- full-view viewport/state: HP 100%、状態効果なし。PCは320 x 74 CSS pxをdensity 2で640 x 148、狭幅は230 x 68 CSS pxをdensity 2で460 x 136へ描画した。
- ブラウザはユーザー指定がないため操作せず、変更対象を実PNGとCSSの実寸比でcode-renderした。

## Findings

未解決のP0、P1、P2はありません。ロッタの顔はフレーム中央の透過開口へ収まり、フレーム外への画像漏れはない。PCと狭幅のどちらもフレーム付きアイコンがHPバー左隣に独立して並び、ゲージとの重なりや切れはない。

## 比較履歴

- 初回比較でP0、P1、P2は検出されなかったため、視覚修正の反復は不要だった。
- combined comparison左2枚では、source targetと実装focused regionの顔位置、開口、フレーム外周が一致している。
- combined comparison右上はPC幅、右下は狭幅。アイコンとゲージの間隔をそれぞれ10px、6px相当確保し、両方とも同じ順序と比率を維持している。

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、ウェイト、行間、文言は変更していない。
- 間隔: アイコン枠を `clamp(68px, 23%, 88px)` とし、既存flex内でHP本体の左へ配置。320px幅では約74px、230px幅では68pxとなり、HP本体を圧迫しない。
- 色: `Lotta_icon.png` と `icon_frame.png` を色補正せず使用。既存の汎用金色borderとsepia filterは外した。
- 画像品質: 支給PNGを再生成・再圧縮していない。顔画像だけを `circle(21% at 50% 47%)` で実測したフレーム開口内へマスクし、フレームは縦横比を保持して前面へ重ねた。
- 文言: 既存の「旅人」、HP値、状態効果を維持。
- アクセシビリティ: 装飾画像は既存の戦闘状態group内で `aria-hidden` と空altを維持し、HP meterの読み上げを重複させない。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/?mode=reading-loop`: HTTP 200

final result: passed

---

# Design QA: HP色レイヤーの左右端を再調整（2026-08-05）

## 対象と比較条件

- ユーザー指摘: 前回実装では色レイヤーの左右端がフレーム端より内側に残っていた。
- 視覚上の基準: `src/assets/UI/hp/HPの色レイヤー.png` の見える左右端を、`src/assets/UI/hp/空のゲージ背景.png` の見える左右端へ一致させる。
- 修正前: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-ends-before.png`
- 修正後: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-ends-implementation.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-ends-comparison.png`
- viewport/state: 実装時のゲージ領域240 x 32 CSS px、device scale factor 1。比較では400 x 53へ同率拡大し、HP 100%と55%を確認。
- 最終比較がゲージ全体と左右端を十分判別できるfocused-regionを兼ねるため、追加切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。修正後は赤レイヤーの左右の尖端がフレームの左右端まで届き、上下辺も同じ表示境界へ収まっている。

## 比較履歴

### P1 同一キャンバス変換では色レイヤーの左右端が内側へ残った

- 初回証拠: `hp-color-ends-comparison.png` 左列。赤レイヤーの実画素は x=75..1459 で、フレームの x=0..1498 より狭いため、左右に明確な未着色部分が残っていた。
- 原因: 「同じ1536 x 1024キャンバスなら同じ変換でよい」と判断し、見える画像範囲の差を無視した。
- 修正: 色レイヤーの見える範囲 x=75..1459、y=341..603 をゲージの0〜100%へ写像し、フレームの見える端と一致させた。
- 修正後証拠: 同比較画像の右列。満タン時は左右の赤い尖端がフレーム端へ届き、55%時も左端と残量境界が崩れていない。
- 状態: 解消

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、文言は変更していない。
- 間隔: 色レイヤーだけを `top: -130.2%`、`left: -5.42%`、`width: 110.98%`、`height: 390.84%` に補正。アイコン枠とゲージ配置は維持。
- 色: 更新済みの赤い実画像と既存フレームのみを使用。色変換や追加描画はない。
- 画像品質: 元の透過PNGを再生成・再圧縮せず、見える端の座標に基づいて配置した。
- 文言: 既存のプレイヤー名、HP値、状態効果を維持。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/`: HTTP 200

final result: passed

---

# Design QA: 新しいHP色レイヤーの外周合わせ（2026-08-05）

## 対象と比較条件

- 画面資料: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-014eb5f6-579f-4997-a86e-93d7872dc81a.png`（441 x 173）
- 視覚上の基準: `src/assets/UI/hp/HPの色レイヤー.png` と `src/assets/UI/hp/空のゲージ背景.png`（ともに1536 x 1024の透過PNG）。新しい色レイヤーの形を背景フレーム外周へ一致させる。
- 修正前: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-layer-alignment-before.png`
- 修正後: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-layer-alignment-implementation.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-color-layer-alignment-comparison.png`
- viewport/state: 実装時のゲージ領域240 x 32 CSS px、device scale factor 1。比較画像では400 x 53へ同率拡大し、HP 100%と55%を確認。
- 変更対象はゲージ画像の重ね位置だけなので、最終比較画像をfull-view兼focused-regionとした。左右端と上下線を判別できる大きさのため、追加切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。修正後は新しい赤い色レイヤーの左右端、上辺、下辺が背景フレームの同じ位置へ収まり、満タン・途中残量の両状態で位置ずれがない。

## 比較履歴

### P2 旧レイヤー用の倍率で新しい色レイヤーの上下と両端が切れた

- 初回証拠: `hp-color-layer-alignment-comparison.png` 左列。HP 100%では左右の尖りがフレーム端とずれ、55%でも赤い上辺・下辺が太く切れている。
- 原因: 旧素材の細い色帯を拡大する `top: -272%`、`height: 650%` が、新素材の外周付きレイヤーにも残っていた。
- 修正: 2素材が同じ1536 x 1024キャンバス上で位置合わせ済みであることを確認し、色レイヤーへフレームと完全に同じ変換を適用した。
- 修正後証拠: 同比較画像の右列。HP 100%と55%の両方で左右端と上下線がフレーム内へ一致している。
- 状態: 解消

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、行間、文言は変更していない。
- 間隔: 色レイヤーをフレームと同じ `top: -148.5%`、`left: 0`、`width: 102.55%`、`height: 413%` に変更。ゲージ本体、名前、アイコン枠の配置は維持。
- 色: 更新された赤い色レイヤーと既存フレームの色を無加工で使用。色変換や追加グラデーションはない。
- 画像品質: ユーザーが更新した実PNGを再生成・再圧縮せず使用。透明境界の欠け、縦横比の不整合、代替CSS描画はない。
- 文言: 既存のプレイヤー名、HP値、状態効果を維持。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/`: HTTP 200

final result: passed

---

# Design QA: 選択素材を使った密着型HPフレーム（2026-08-05）

## 対象と比較条件

- 理想図: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-fab6e27e-a9a4-445e-9490-bc8e191381b7.png`（441 x 111）
- 使用フレーム: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-783cbf0c-b763-4cf0-a017-d4e36bcdb803.png`（1536 x 1024、透過PNG）。`src/assets/UI/hp/空のゲージ背景.png` とSHA-256が一致する同一素材。
- 初回実装: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-frame-implementation-before-overlay.png`
- 最終実装: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-frame-implementation.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-frame-comparison.png`
- viewport/state: 実装時のゲージ領域240 x 32 CSS px、device scale factor 1、HP 72%。比較では理想図のゲージ領域を410 x 55へ正規化し、実装も同じ410 x 55へ拡大した。
- 今回の対象はHPゲージ単体。最終比較画像が変更範囲のfull-view兼focused-regionで、細部を判定できる大きさのため追加切り抜きは不要。

## Findings

未解決のP0、P1、P2はありません。理想図と同じく、フレームがゲージの上下へ密着し、左端と右端の装飾まで一続きで見える。以前のような素材キャンバス由来の大きな上下余白はない。

## 比較履歴

### P2 赤いHPレイヤーが左端と上下のフレームを覆った

- 初回証拠: `hp-frame-implementation-before-overlay.png` では赤レイヤーを前面へ置いたため、選択素材の外周が塗りつぶされていた。
- 修正: 同じフレーム実画像を最前面にも重ね、`mix-blend-mode: darken` で赤い内側を維持しながら暗い外周だけを戻した。
- 修正後証拠: `hp-frame-comparison.png` 右側では、赤いHPの周囲に上下線と左右の装飾が連続している。
- 状態: 解消

## 必須確認面

- 文字: プレイヤー名、HP数値、フォント、行間、文言は変更していない。名前がゲージ上、数値がゲージ内という既存構造を維持。
- 間隔: ゲージ高を25〜32pxとし、素材の実画素範囲 y=368..615 がちょうど枠内へ収まる倍率へ変更。透明キャンバスを約11倍に拡大して中央だけ切る旧指定を廃止した。
- 色: 赤いHPと選択フレームの配色をそのまま使用。理想図の空部分は紫だが、今回はユーザーが選んだフレーム素材の象牙色を優先した意図的差分。
- 画像品質: フレームとHP色レイヤーは既存の透過PNGを再生成・再圧縮せず使用。CSS描画や代替画像は追加していない。
- 文言: プレイヤー名、HP値、状態効果を変更していない。

## 自動検証

- ESLint: passed
- Vitest（`src`）: 33 files、171 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- WSL開発サーバー `http://localhost:5174/`: HTTP 200
- 補足: 無指定の `npm run test:run` は `.agents/skills` 配下の独自実行スクリプトまでVitest suiteとして収集し、49件を「No test suite found」等で失敗扱いにする。アプリ本体の `src` テストは全件通過。

## Follow-up Polish

- P3: 理想図と同じ紫の空ゲージが必要なら、選択素材の象牙色部分を紫にした別レイヤーを用意するとさらに近づく。今回の密着配置には不要。

final result: passed

---

# Design QA: HP装飾の横枠を薄型化（2026-08-05）

## 対象と比較条件

- 参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-3906da32-7d66-4923-8a70-3316ae286921.png`（312 x 107）
- 修正前の実画面: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-7f3fc94b-fd7d-48e0-a163-9fc0f0c71269.png`（455 x 171）
- 修正後の実装コンポーネント: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-split-frame-tight-preview.png`（312 x 114）
- 比較画像: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-frame-spacing-final-comparison.png`
- 比較条件: 参考画像は原寸、修正前画面は幅312pxへ正規化、修正後はCSS幅312px相当。すべて満タン状態。
- 後日支給予定の顔アイコンとステータスアイコンは比較対象外。

## Findings

未解決のP0、P1、P2はありません。修正前は装飾画像の横枠全体を使っていたため、名前欄とHP欄の2段分が残っていた。修正後は同じ装飾画像を丸枠と横枠へ分け、丸枠を非変形のまま、横枠だけを薄くして参考画像と同じ上段へ寄せた。

## 比較履歴

### P1 透明部分ではなく横枠自体が太く、HP上側に余白が残った

- 証拠: 修正前実画面では横枠が約2段分の高さを持ち、赤いHPの上に独立した名前行があった。
- 原因: `装飾フレーム.png` の円形枠と横枠を1枚の画像として同じ倍率で表示していた。
- 修正: 装飾フレームを2回描画し、左32%を円形枠、右70%を横枠として切り分けた。横枠だけを縦90%のレイヤーへ再配置し、名前とHP数値を赤いゲージ上の1段へまとめた。
- 修正後証拠: `hp-frame-spacing-final-comparison.png` の下段では、横枠が円形枠の上側へ揃い、枠内の独立した空白行が消えている。
- 状態: 解消

## 必須確認面

- 文字: 名前とHP数値は同じゲージ行へ移動。既存のフォント、影、読み上げ用meter属性は維持した。
- 間隔: 横枠を薄型化し、ステータス表示位置を枠外の下段へ移した。円形枠の比率は変えていない。
- 色: 既存の赤いHP、暗い空ゲージ、金属装飾の実画像のみを使用した。
- 画像品質: 新素材、再生成、再圧縮は行っていない。同じ装飾PNGをCSSで左右に切り分けている。
- 文言: プレイヤー名、HP数値、状態効果の内容は変更していない。

## 自動検証

- ESLint: passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- 開発サーバーは `http://localhost:5174/` で継続中。今回の最終比較は変更対象のHPコンポーネント領域で実施した。

## Follow-up Polish

- P3: 装飾意匠まで参考画像と完全一致させる場合のみ、薄型の横枠と円形枠が分離された新素材が有効。余白解消には不要。

final result: passed

---

# Design QA: HPゲージ上側の余白除去（2026-08-05）

## 対象と比較条件

- 参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-3906da32-7d66-4923-8a70-3316ae286921.png`（312 x 107）
- 実装コンポーネント: `OrnateVitalBar` の満タン状態を、実際の3レイヤーとCSSの切り抜き座標で312 x 114へ描画
- 実装画像: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-no-gap-expanded-preview.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-gap-final-comparison.png`
- 比較密度: 1倍。参考画像の幅312pxに実装側を正規化し、高さの差7pxは装飾フレーム固有の縦横比として保持した。
- 状態: プレイヤーHP満タン。後日支給予定のアイコン画像は比較対象外。

## Findings

未解決のP0、P1、P2はありません。空ゲージ素材の白い銘板部分を表示対象から外し、暗いゲージ溝と赤いHPだけを装飾フレームの開口部へ拡大配置したため、不自然な白い余白は残っていない。

## 比較履歴

### P1 白い銘板部分がHPの上へ残り、大きな空白に見えた

- 初回比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-gap-comparison.png`
- 原因: `空のゲージ背景.png` 全体を装飾フレームへ重ね、素材上半分の白い領域まで表示していた。
- 修正: 空ゲージの暗い溝だけを `clip-path` で切り出した。
- 状態: 解消

### P2 切り抜いただけではゲージが開口部の下側へ偏った

- 修正: 空ゲージと色レイヤーだけを縦方向へ拡大し、装飾フレームの内側へ収めた。装飾フレームと円形アイコン枠は変形していない。
- 修正後証拠: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/05/019fd0f0-d5dc-7ec3-b666-c930f6fcc9b1/hp-gap-final-comparison.png`
- 状態: 解消

## 必須確認面

- 文字: 名前、HP数値、ARIA meterは既存実装を維持し、今回変更していない。
- 間隔: 赤いHPと暗い空ゲージをフレーム開口部へ収め、白い帯と過大な上下余白を除去した。
- 色: 元の赤いHP、暗い空ゲージ、金属装飾の実画像をそのまま使用した。
- 画像品質: 新規生成や再圧縮を行わず、既存PNGをCSSで切り抜いている。装飾フレームと円形枠は非変形。
- 文言: 名前、HP数値、状態効果の内容に変更なし。

## 自動検証

- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- ブラウザ全画面の再キャプチャは行わず、今回変更したHPコンポーネント領域を同一幅で比較した。

final result: passed

---

# Design QA: 石床で分ける戦場／カード卓（2026-08-02）

## 対象と比較条件

- 参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-f62563cd-6690-4dbd-abae-f14ccb4f1def.png`（1920 x 1080）
- 実装画面: `WordQuestRunScreen` 第1戦、1920 x 1080、device scale factor 1
- 通常時: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/split-stage-final.png`
- カードホバー: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/split-stage-final-hover.png`
- 1枚配置後: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/split-stage-final-placed.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/reference-vs-split-stage-final.png`
- ユーザー指定によりPC画面だけを対象とし、スマホ向けの設計・検証は行っていない。
- 一時プロファイルのChromeをCDPで操作し、ユーザーの通常ブラウザ状態には触れていない。

## 最終判定

未解決のP0、P1、P2はありません。

画面を上724px（67%）の戦場、下356px（33%）のカード卓へ明確に分けた。境界用の線や別パネルは描かず、既存背景画像に含まれる石床と足場の端を画面境界へ合わせた。上ではキャラクター、HP、攻略情報だけを扱い、下では文スロット、該当品詞のカード、実行操作だけを扱う。

## 参考画像との比較

- 画面骨格: 参考画像と同じく、キャラクター同士の対峙を上段へ、扇状の手札を下段へ分離した。カードが戦場中央へ常時浮く旧状態は廃止した。
- 境界: 背景画像の石床を下寄せし、キャラクターの接地位置を画面高92%へ合わせた。石床の直下から木の卓へ切り替わるため、UI罫線ではなくステージの地面が境界に見える。
- 戦闘密度: プレイヤーは左34%、敵は右78%へ配置。敵の表示高上限を528px相当へ上げ、参考画像の大きなボスとの対峙感へ寄せた。
- 手札密度: 通常カードは230 x 345px。下端を72px隠し、中央を高く、外側を低く傾けて展開する。ホバー／focusでは88px上昇して全面を読める。
- 文法への再構成: 参考画像のカード操作をそのままコピーせず、石床直下の79pxだけを文スロット列にした。対象スロットは色、役割印、輪郭で示し、カードの移動先を見失わない。
- 常時情報: 旧三列の敵情報・作戦・ログは撤去。敵の記述は戦場左の小型HUD、因果ログは発生時だけ表示し、下段には現在必要な品詞だけを残した。

## 修正履歴

### P1 カードと下部パネルが戦場へ重なり、上下の役割が曖昧だった

- 戦場とカード卓を67:33の固定二層へ変更した。
- `word-quest-stage-split.css`を最終レイヤーとして追加し、旧三列グリッドを一枚の木製卓へ置き換えた。
- カードの通常位置を下段内のy=807〜814へ収め、ホバー時だけ境界付近まで持ち上げる。
- 状態: 解消

### P1 境界が単なる黒線に見えた

- 戦場背景のcover位置を中央固定から縦28%アンカーへ変更した。
- 背景の石床上面をキャラクターの足元へ、足場の端を下段開始位置へ合わせた。
- 装飾線を追加せず、実際の背景素材だけで地面の厚みを作った。
- 状態: 解消

### P1 参考画像に比べて敵とカードが小さかった

- 敵のcommand stage表示を従来268px上限から528px相当へ拡大した。
- カードを192 x 288pxから230 x 345pxへ拡大し、札面の見出し、本文、フッターも再配置した。
- 最終横並び比較で、上段のボス優位と下段の大きなカード選択が同じ視線構造になった。
- 状態: 解消

### P2 文スロットを地面へ重ねるとキャラクターの足元を隠した

- 初回案の境界上配置をやめ、スロット列を木製卓の上端8pxへ移動した。
- 石床と接地影を完全に見せたまま、カードの直上で置き先を確認できる。
- 状態: 解消

## 操作とアクセシビリティ

- 条件カード「近くにいる」をクリックすると条件slotへ収まり、行動slotと行動カードへ自動移動することを実操作で確認した。
- 品詞タブ、tabpanel、カードbutton、slotのARIA、クリックとドラッグ、roving tabindex、`preventScroll`を維持した。
- 色だけでなく、主・条・接・動・修の役割印と異なる輪郭を残した。
- 収納時はカードをpointerとtab順から外し、品詞タブと再展開ボタンだけを残す。
- `prefers-reduced-motion`ではカード、slot、HPの遷移を1msへ短縮する。

## 実画面計測

- viewport: 1920 x 1080
- 戦場: x=0、y=0、1920 x 724
- カード卓: x=0、y=724、1920 x 356
- 文スロット列: x=384、y=732、1200 x 79
- 通常カード: 中央230 x 345、外側は回転後256 x 362
- 敵HP: x=1564、y=641、330 x 65
- 横overflow 0、縦overflow 0、runtime/console error 0

## 自動検証

- React best-practices review: passed（新しいeffect、データ取得、inline component、不要な派生stateなし。既存ARIAを維持）
- ESLint: passed
- Vitest: 33 files、170 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed

## 追加UIの要否

機能上必要な追加UIはない。次に素材を増やすなら、5品詞それぞれの透過PNG紋章が最も効果的。現在の漢字印を置き換えるだけで、カード、slot、タブの役割を文字量を増やさず強化できる。

final result: passed

---

# Design QA: `card.png`を使ったPC手札展開（2026-08-02）

## 対象と比較条件

- 参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-cda24611-e06a-4517-95d5-ca9e4016897d.png`（1920 x 1080）
- 使用素材: `src/assets/UI/card/card.png`（1024 x 1536、2:3）
- 実装画面: `WordQuestRunScreen` 第1戦、1920 x 1080、device scale factor 1
- 実装キャプチャ:
  - 展開: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-cardfan-final-initial.png`
  - ホバー: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-cardfan-final-hover.png`
  - 次品詞: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-cardfan-final-after-first-card.png`
  - 自動収納: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-cardfan-final-auto-collapsed.png`
  - 主体手札: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-cardfan-final-subject-open.png`
- 最終比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/comparison-cardfan-final.png`
- ユーザー指定によりPC画面だけを対象とし、スマホ向けの設計・検証は行っていない。
- 一時プロファイルのGoogle ChromeをCDPで操作し、ユーザーのブラウザ保存状態には触れていない。

## 最終判定

未解決のP0、P1、P2はありません。

品詞タブを選ぶと、その品詞かつ現在のslotに置ける語彙だけが、中央の束から重なりながら扇状に展開する。カードは指定の`card.png`を縦横比のまま使い、語彙名、文法上の役割、短い効果、使用状態を札面へ載せた。選択後は次の品詞へ手札が入れ替わり、文が完成すると自動で収納する。

1920 x 1080の下部UIは、展開時203.03px（18.8%）、収納時157.67px（14.6%）。以前の展開棚291.59px（27.0%）より88.56px縮み、カードは必要なときだけ戦場側へ重なる構造になった。

## 参照画像との比較

- 骨格: 参照画像の「中央の束から外側へ広がる」「中央ほど高く、外側ほど傾く」「札同士を重ねて面積を節約する」をそのまま採用した。
- 再構成: 参照画像のカード全面イラストはコピーせず、`card.png`の紙札に文法情報を載せた。カードの下には作戦文slotを残し、選んだ語がどこへ入るか見失わないようにした。
- 密度: 初期状態では条件3枚、条件選択後は行動3枚、主体タブでは主体2枚だけを描画する。未所持語や現在slotに置けない語は出さない。
- 色: 主体=茶、条件=紫、接続=ベージュ、行動=赤、修飾=灰を、札面上辺、役割印、文字、選択タブへ統一している。色以外にも短い役割印とタブ輪郭を残した。
- 質感: 明るい紙札を暗い卓上・金線・低彩度のカテゴリ色・重い影で囲み、背景上でも読める物理的な手札にした。

## 修正履歴

### P1 横長語彙ボタンのため、参考画像の「手札」に見えなかった

- 旧UIは156 x 84pxの横長ボタンで、棚の中へ横一列に並んでいた。
- 札を180 x 270pxへ変更し、`card.png`を実画像として各button内へ配置した。
- 札は中央基準の絶対配置にし、枚数に応じた間隔、外側の落差、4.4deg刻みの傾き、重なり順を計算する。
- 状態: 解消

### P1 下部棚を広げないとカードを見せられなかった

- 語彙欄を固定高の棚から、下端の48px品詞レールと戦場側へ浮く手札レイヤーへ分離した。
- 作戦文slotは手札の下に残し、展開中でも文構造を確認できる。
- 実測で下部UIは展開時18.8%、収納時14.6%。横overflow、Vite overlay、console/page errorは0件。
- 状態: 解消

### P2 展開アニメーションがホバー変形を上書きした

- 初回実装の`animation-fill-mode: both`が最終transformを保持し、hover selectorの持ち上がりが反映されなかった。
- fill modeを`backwards`へ変更し、展開後は通常のtransformへ制御を返した。
- 修正後はホバー札が39px持ち上がり、傾きがほぼ正面へ戻り、scale 1.075になることをcomputed styleと画像で確認した。
- 状態: 解消

### P2 再展開直後、自動フォーカスで画面が一瞬ずれた

- 再展開90ms時点でカードへfocusした際、ルートのscrollTopが265px動く状態を検出した。
- カードとroving tabのfocusを`preventScroll: true`へ変更した。
- 修正後は再展開90ms、260ms、500msの全時点でscrollTop 0。画面位置を保ったまま手札だけが動く。
- 状態: 解消

### P2 削除済みの旧カード画像参照で本番ビルドが止まった

- `PreparationScreen.tsx`と`preparationCards.ts`が、削除済みの`attack.png`、`branch.png`、`heal.png`、`observation.png`、`record.png`を参照していた。
- 新しい共通素材`card.png`へ統一し、既存カードデータと動作は残した。
- Vite production buildが通ることを確認した。
- 状態: 解消

## モーションと操作

- 品詞切り替え: 380ms、1枚ごとに48msずらし、中央の束から横へ広がる。
- 再展開: 90msでは収納位置、260msでほぼ展開、500msで静止する。途中で画面スクロールは発生しない。
- ホバー／focus-visible: 39px上昇、傾きを弱め、前面へ出して影とカテゴリ光を強める。
- 条件「いつでも」を選ぶと行動3枚へ自動更新し、次の行動カードへfocusする。
- 行動「攻撃する」を選ぶと作戦文が完成し、手札が自動収納して作戦実行へfocusする。
- 品詞タブは左右上下、Home、Endキーで移動できる。収納中のカードはpointerとtab順から外れる。
- `prefers-reduced-motion`では展開・収納・hover遷移を1msへ短縮する。

## アクセシビリティ

- `card.png`は装飾画像として読み上げ対象から外し、button自身には語彙名、説明、例文を残した。
- role tabは`aria-selected`とroving tabindex、tabpanelは`aria-labelledby`と収納状態に応じた`aria-hidden`を持つ。
- 現在のslot、品詞、語彙名は文字とラベルで判断でき、カテゴリ色だけに依存しない。
- ドラッグとクリックの両方を維持した。非表示の手札は操作対象にならない。

## 自動検証

- ESLint: passed
- Vitest: 33 files、170 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed
- Chrome 1920 x 1080: console/page error 0、Vite overlayなし、横overflowなし

## 追加UIの要否

現時点で操作に必要な追加UIはない。さらに世界観を強める場合だけ、主体・条件・接続・行動・修飾の5種類の透過PNG紋章と、収納時に見える共通カード裏面を用意すると効果が高い。機能完成には不要。

final result: passed

---

# Design QA: 文法スロットと展開式語彙棚（2026-08-01）

## 対象と比較条件

- 参考画像:
  - `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-2b28947d-87d6-4304-8187-9e76c048d4d8.png`（1920 x 1020、物理的な札とスロット）
  - `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-9eb85692-20fb-419d-aa80-861b9a80fb26.png`（1920 x 1080、役割島と選択状態）
  - `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-46ea6c1b-649b-40dd-b625-8355cbf0dd6c.png`（1920 x 1080、カード展開状態）
  - `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-5b359d4e-af09-423d-b45b-3e2296ff7dc3.png`（1920 x 1080、カード収納状態）
- 実装画面: `WordQuestRunScreen` の第1戦。初期文は条件と行動が空欄。
- 実装キャプチャ:
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1920x1080-initial.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1920x1080-after-first-card.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1920x1080-auto-collapsed.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1920x1080-subject-open.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1920x1080-max-sentences.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1024x768-initial.png` と `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-1024x768-auto-collapsed.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-390x844-battlefield.png`、`/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-390x844-initial.png`、`/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-390x844-auto-collapsed.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-800x700-initial.png` と `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/implementation-800x700-auto-collapsed.png`
- 比較画像:
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/comparison-behavior.png`
  - `/mnt/c/Users/sm787/.codex/visualizations/2026/08/01/019fbd63-f214-7960-b7b1-584dcf680c9f/comparison-language.png`
- 主比較は左右とも1920 x 1080、device scale factor 1。収納状態同士、展開状態同士を同じボードへ並べた。
- ブラウザは一時プロファイルのGoogle ChromeをCDPで操作し、ユーザーの保存状態には触れていない。

## 最終判定

未解決のP0、P1、P2はありません。

常時37%を占めていた下部UIを、必要な品詞だけが下端から開く文法ワークベンチへ変更した。1920 x 1080では、展開時の下部UIは291.59px（27.0%）、文完成後は167.39px（15.5%）。戦場の見える高さはそれぞれ約73%、約84.5%になった。

## 参照画像との比較

- 収納挙動: 参照の「戦場を主役にし、手札の存在だけ下端に残す」関係を、40pxの5分類レールへ置き換えた。完成後も分類、所持数、再展開操作が残り、状態を見失わない。
- 展開挙動: 参照の「選択対象だけが手札からせり上がる」構造を、選択スロットに置ける語彙だけを展開する棚へ置き換えた。条件を置くと行動棚へ移り、行動を置くと棚が収まる。
- スロットと質感: Book of Hoursの暗い窪み、札、低彩度の真鍮を、既存の古木テクスチャ、黒鉄、骨色文字、抑えた金線で再構成した。
- 役割表示: Cultist Simulatorの色・記号・形の重ね方を、主体のアーチ、条件の菱形、接続の橋形、行動の矢じり、修飾の歯車状切り欠きへ翻訳した。
- 教育ゲームとして、参照の極小文字やカード全面イラストはそのまま持ち込まず、語彙名と現在の問いを常時読める優先度にした。

## 修正履歴

### P1 全語彙の常時表示で戦場が狭かった

- 変更前は戦場63%、下部UI37%で、全カテゴリの語彙を90px棚へ常時表示していた。
- `LexiconDrawer`を追加し、現在のスロットに置ける品詞だけを描画する構造へ分離した。
- 文完成時は自動収納し、作戦実行を強調する。1920pxで下部15.5%、800px帯でも語彙棚195pxから40pxへ縮む。
- 状態: 解消

### P1 色だけでは役割が弱く、指定色とも一致しなかった

- 主体 `#8c6045`、条件 `#79558e`、接続 `#b5a174`、行動 `#a43f36`、修飾 `#74777b` へ統一した。
- スロット、タブ、カード、選択プロンプトへ同じ輪郭規則と短い役割印を適用した。
- computed styleと画面の両方で5色を確認した。
- 状態: 解消

### P1 旧CSSが新カードの背景と使用済み状態を上書きした

- 旧 `.is-fit` と `.is-imprinted.is-fit` の詳細度が新しい札より高く、すべて金枠、使用済みも不透明になる状態を確認した。
- 新画面ルート内で背景、透明度、grid row、最大幅、hover/focus transformを明示的に上書きした。
- 実測でPCカードは156 x 84px、`max-width:none`、カテゴリ別の上枠色、使用済みopacity 0.72になった。
- 状態: 解消

### P1 主体カテゴリ内のtarget専用語も主体枠へ表示される

- カテゴリだけで絞ると、後半で得るtarget専用主体語が主体枠にも「適合」として見える問題があった。
- `wordFitsSlot`で現在のslotまで検査し、実際に置ける語彙だけを展開するよう変更した。
- 状態: 解消

### P1 761〜900pxで下部へスクロールできなかった

- bodyのoverflowがhiddenのまま、画面だけが縦積みになる旧境界を確認した。
- 900px以下ではWord Questルート自身を100dvhの縦スクロール領域にした。
- 800 x 700ではroot clientHeight 700、open scrollHeight 938、collapsed 783、overflowY auto。横overflowなし。
- 状態: 解消

### P2 収納アニメーションとhoverがfill-modeで上書きされた

- `animation-fill-mode: both`を外し、遅延中だけ初期値を保つ`backwards`へ変更した。
- 収納後はtabpanel opacity 0、pointer-events none、scaleY 0.68。表示カード数0を実測した。
- 状態: 解消

### P2 カードが小さく、展開しても札らしく見えなかった

- 初回キャプチャではカード高66px、棚高112pxで、参照画像より展開差が弱かった。
- PCカードを84px、棚を140pxへ拡張し、文字、分類印、カテゴリ光、重なり、立ち上がり間隔を調整した。低いPCとスマホでは画面に応じて74px、68pxへ落とす。
- 再比較では、収納時の戦場比率を守りながら、展開元と選択対象が読める密度になった。
- 状態: 解消

### P2 配置後にキーボードフォーカスが失われた

- tabpanelの再マウントを廃止し、配置後は次の語彙カードへ、文完成後は作戦実行ボタンへフォーカスを移す。
- 1920pxと390pxで、1枚目後のactiveElementが行動カード、2枚目後が作戦実行ボタンになることを確認した。
- role tabはroving tabindexと左右上下/Home/Endキーに対応した。
- 状態: 解消

### P2 スマホで収納後も語彙棚の空行が残った

- 620px以下の収納時は2段のヘッダーだけを72pxに残し、カード行を0pxへする。
- 390 x 844ではopen 161px、collapsed 72px、表示カード数0、横方向のページoverflowなし。
- 状態: 解消

## 操作・アクセシビリティ

- 条件カード「いつでも」を選ぶと条件slotへ収まり、行動slotと行動カードへ自動移動する。
- 行動カード「攻撃する」を選ぶと文が完成し、棚が自動収納して作戦実行へフォーカスが移る。
- 主体タブを選ぶと主体枠へ移り、主体語2枚だけが再展開する。
- 棚の手動収納と再展開が動作し、左右矢印キーで主体から条件タブへ移動できる。
- 作戦文を3文まで追加しても、文タブ、現在の6slot、語彙棚は一画面内に収まる。削除後は2文へ戻る。
- カードはクリックとドラッグの両方に対応。非表示棚はtab順とpointer対象から外れる。
- tablistは`aria-selected`、tabpanelは`aria-labelledby`、各カードは語彙の説明と例文を読み上げられる。
- slotは分類、枠名、現在語を含むラベルと選択状態を持つ。色以外にも輪郭と役割印がある。
- `prefers-reduced-motion`では棚、カード、slot、HPの遷移を1msへ短縮する。

## レスポンシブと実画面

- 1920 x 1080: open 291.59px、collapsed 167.39px。横overflowなし。console/page error 0、Vite overlayなし。
- 1024 x 768: 一画面内で戦場、作戦文、展開棚を確認。完成後は戦場が約78%まで見える。
- 800 x 700: 900px境界内でroot縦スクロールが動作。収納時の語彙棚は40px。横overflowなし。
- 390 x 844: 戦場は506.39px（60svh）。rootは縦スクロール可能で全領域へ到達でき、ページ横overflowなし。open棚161px、collapsed 72px。

## 自動検証

- ESLint: passed
- Vitest: 33 files、170 tests passed
- TypeScript project build: passed
- Vite production build: passed（既存のeval警告とchunk size警告のみ）
- `git diff --check`: passed

## 任意の次回アート改善

- P3: 現状は漢字印と輪郭だけで役割を識別できる。さらに世界観を強めるなら、主体・条件・接続・行動・修飾の5種類だけ、透過PNGの固有紋章を用意するとカードとslotの物理感を一段上げられる。今回の完成条件には不要。

final result: passed

---

# Design QA: 背景画像と敵HP（2026-07-31）

## 対象

- 参考画像: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/31/019fb863-552e-7583-9b49-c0d276918658/reference-enemy-hp.png`
- 変更前画面: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/31/019fb863-552e-7583-9b49-c0d276918658/before-current-screen.png`
- 変更後画面: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/31/019fb863-552e-7583-9b49-c0d276918658/implementation-1920x1080.png`
- 全体と敵HPの比較画像: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/31/019fb863-552e-7583-9b49-c0d276918658/comparison-enemy-hp.png`
- 対象画面: `WordQuestRunScreen` の第1戦、敵HP 8/8
- 比較条件: 参考画像と変更後画面は1920 x 1080、CSS表示も1920 x 1080、device scale factor 1

## 判定

未解決のP0、P1、P2はありません。背景は `background.png` に切り替わり、敵HPは敵キャラクターの足元へ収まりました。

## 比較結果

- 全体比較: 比較画像の上段で、明るい遺跡背景への変更と戦場全体の収まりを確認した。
- 拡大比較: 比較画像の下段で、参考画像と同じく敵名、HPバー、状態表示が敵の直下に並ぶことを確認した。重要部分を十分読めるため、別の拡大画像は不要だった。
- 実測: 敵HP全体は x=1314.19、y=559.81、幅290、高さ62.94。中心は x=1459.19で、敵スプライトの配置中心である画面幅76%と一致する。
- 下部UIとの間隔: 敵HPの下端は622.75、戦場の下端は680.39。作戦UIへ重なっていない。

## 修正履歴

### P1 背景が指定画像ではなかった

- 変更前は `test-resized.png` を読み込み、暗い聖堂が表示されていた。
- `BattleScene` と `LiveBattlefield` の参照先を `background.png` へ変更した。
- 変更後のブラウザ記録では、読み込まれた背景資源が `background.png` になっている。比較画像でも明るい遺跡背景を確認できる。
- 状態: 解消

### P1 敵HPが大きな装飾HUDになっていた

- 変更前はプレイヤー用と同じ大型フレームを敵にも使っており、敵との結び付きが弱かった。
- 敵専用の小型表示へ分け、敵名、細いHPバー、状態表示だけを残した。配置は敵スプライトと同じ画面幅76%を基準にした。
- 変更後は敵の足元中央に収まり、参考画像と同じ読み順になった。
- 状態: 解消

## 見た目と内容

- 文字: 既存の明朝体、文字サイズ、色は変えていない。敵名とHP値は背景上でも読める。
- 間隔: 敵HPはキャラクター直下に置き、戦場下端と下部UIのどちらにも接触していない。
- 色: 敵HPの赤、枠の金、状態表示の色は既存の戦闘画面に合わせた。
- 画像: 指定された1920 x 1080の `background.png` を縦横比を崩さずcover表示している。キャラクター素材には手を加えていない。
- 文言: 敵名、現在HP、状態効果の内容は既存データをそのまま使っている。
- アクセシビリティ: HPは `role="meter"` と最小値、最大値、現在値を持つ。状態効果は文字と `aria-label` で判別できる。

## 実画面と自動確認

- 開始ボタンを押して戦闘画面へ遷移できた。
- Viteのエラー画面はなく、console errorとpage errorは0件だった。
- 1920 x 1080でキャンバス、背景、プレイヤーHP、敵HP、下部UIを確認した。
- `npm run build`: passed
- ESLint（変更したTypeScript 3ファイル）: passed
- Vitest（背景、キャラクター素材、作戦連携の3ファイル）: 8 tests passed
- `git diff --check`: passed

final result: passed

<details>
<summary>以前のQA記録</summary>

# Design QA

## 今回の対象

- 参照画像: `/home/sm787/Github-Projects/kotoba-quest-main/参考画像/ss_6a7d51d3a18202bc5044c694335cbdb7bdb7e4ec.1920x1080.jpg`
- 実装画面: `WordQuestRunScreen` の戦闘画面
- 使用素材: `src/assets/UI/hp/HPの色レイヤー.png`、`空のゲージ背景.png`、`装飾フレーム.png`
- 実装キャプチャ: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/29/019facbb-3a97-73c0-a894-7a7ae8cf918a/implementation-1920.png`
- 全体比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/29/019facbb-3a97-73c0-a894-7a7ae8cf918a/comparison-full.jpg`
- HP部分の拡大比較: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/29/019facbb-3a97-73c0-a894-7a7ae8cf918a/comparison-hp-focus.jpg`
- 画面幅別の記録: `implementation-1024.png` と `implementation-390.png`
- 比較条件: 参照とPC実装はともに1920 × 1080、device scale factor 1
- 状態: 旅人18/18、敵4/8、双方に状態効果あり

今回合わせたのは、参照画像にある「左上のプレイヤーHP」と「戦場内の敵HP」の読み方です。ゲーム全体の色や背景は、このリポジトリにあるWord Quest画面を残しています。

## 判定

P0、P1、P2の未解決項目はありません。

三枚のHP素材を同じ座標系で重ね、赤いレイヤーだけを残量に応じて切り取っています。18/18では右端まで赤く、4/8では約半分まで減ることを実画面で確認しました。フレームや空ゲージをCSSで描き直してはいません。

## 実測値

- 1920 × 1080: HPバーは約499 × 183 px。旅人は左上、敵は戦場右下
- 1024 × 768: 約300 × 110 px
- 390 × 844: 約187 × 68 px。縦スクロールは発生するが、横方向のはみ出しはなし
- 画像読込: 三レイヤーともnatural width 1536 px
- 満タン時の切り取り: `inset(41.5% 5% 36.4% 22.7%)`
- 敵4/8時の切り取り: `inset(41.5% 41.15% 36.4% 22.7%)`

## 指摘履歴

### P2 スマホ幅で通知とHPバーが重なった

- 初回の390 pxキャプチャでは、中央通知が旅人HPの右端と重なった。章表示にも近すぎた。
- `word-quest-game.css` の620 px以下の指定を直し、旅人HPを上から82 pxへ移動した。通知は右寄せにして最大幅を46vwへ絞った。
- 再撮影後は、章表示、HPバー、通知の間に空きがあり、文字も欠けていない。
- 状態: 解消

## 確認した見た目

- レイアウト: 参照と同じく、旅人は左上、敵は戦場の右下へ置いた。下部の作戦UIには食い込んでいない。
- 画像: 透過PNG三枚を原寸比のまま重ねた。フレームの輪郭、円形肖像、空ゲージに伸びや圧縮は見つからなかった。
- 文字: HP値は赤いゲージ上で読める。名前が長い場合は一行で省略する。
- 状態: HP残量は数値とゲージ長の両方で分かる。状態効果は「守」「怒」のような文字も併記している。
- 画面幅: PC、1024 px、390 pxで重なりと横スクロールを確認した。スマホでは下部UIを縦に並べている。
- 操作: 語彙「いつでも」をクリックし、第1文へ入るところまで確認した。通知は更新され、操作不能な覆いは出ていない。
- エラー: ブラウザのconsole errorとpage errorは0件。

## アクセシビリティ

- HP値は`role="meter"`と`aria-valuemin`、`aria-valuemax`、`aria-valuenow`を持つ。
- 各HPバーには人物名を含むラベルがある。
- 状態効果は色だけに頼らず、文字と`aria-label`を持つ。
- 装飾画像は読み上げ対象から外した。
- `prefers-reduced-motion`ではゲージを含む遷移時間を短くする。

## 自動検証

- TypeScript project build: passed
- ESLint（`WordQuestRunScreen.tsx`）: passed
- Vitest: 2 files、15 tests passed
- Vite production build: passed。HP素材三枚が生成物へ入った
- `git diff --check`: passed

## 以前の記録

<details>
<summary>2026-07-24のWord Quest画面QA</summary>

# 以前の Word Quest 画面QA（2026-07-24）

## Source truth and implementation

- Requirements: `C:\Users\sm787\OneDrive\デスクトップ\プロンプト.md`
- Primary structural and visual source: `C:\Users\sm787\AppData\Local\Temp\codex-clipboard-7bb6f168-550b-40bf-aaa7-ed6fbe54cb8d.png`
- Secondary illustration source: `C:\Users\sm787\AppData\Local\Temp\codex-clipboard-2af1a22c-b2b7-4d2c-a467-0b3c2bcdb643.png`
- Implementation screenshot: `/tmp/kotoba-qa-1920.png`
- Full-view comparison: `/tmp/kotoba-dd-comparison.png`
- Focused HUD comparison: `/tmp/kotoba-dd-hud-comparison.png`
- HUD implementation crop: `/tmp/kotoba-qa-hud-1920.png`
- Responsive captures: `/tmp/kotoba-game-1024.png`, `/tmp/kotoba-game-mobile-390.png`
- Source pixels: 1920 × 1080
- Implementation pixels: 1920 × 1080
- CSS viewport: 1920 × 1080, device scale factor 1
- Density normalization: both images were compared at 1920 × 1080 and then reduced equally to 960 × 540 in the combined board
- State: 忘名王戦、三つの完成済み作戦文、因果連携と文章圧縮が成立、実行前ログは空

The primary reference is used for region ratio, hierarchy, density, palette, and the relationship between stage and combat controls. It is not being copied as game art. The implementation keeps the project's supplied Gothic background and character sprites while translating the reference's battlefield-first structure into the word-composition system.

## Final measured composition

- Battlefield: x=0, y=0, 1920 × 680.39 px, 63% of viewport height
- Unified combat HUD: x=0, y=680.39, 1920 × 399.59 px, 37% of viewport height
- Enemy intelligence: x=12, y=691.39, 288 × 290.59 px
- Strategy area: x=300, y=691.39, 1281.61 × 290.59 px
- Command and log rail: x=1581.61, y=691.39, 326.39 × 290.59 px
- Vocabulary rack: x=12, y=981.98, 1896 × 90 px
- Character-linked vitals: 320 × 48 px below the player and enemy
- Strategy slots: 18 visible, zero clipped
- Page-level overflow at 1920 × 1080 and 1024 × 768: none

## Findings

No actionable P0, P1, or P2 findings remain.

The final combined view shows the same dominant relationship as the primary source: an uninterrupted combat stage above a single dense lower HUD. The implementation intentionally replaces the source's skill-grid content with the game's enemy clue, sentence builder, execution control, causal log, and vocabulary rack.

## Comparison history

### P1 — Bright paper UI split the screen into two visual products

- Location: full battle screen and the former `word-game__composer`.
- Evidence: the earlier implementation placed large cream parchment surfaces over a dark Gothic stage. In the prompt and primary source, the lower UI shares the battlefield's black, iron, muted-gold, and red visual grammar.
- Impact: the screen read as a dark game behind a separate light web application.
- Fix: rebuilt the lower 37% as one continuous combat band using the existing table texture, blackened wood, iron edges, muted gold, rust red, and ash. Removed the floating light composer and upper paper fragments.
- Post-fix evidence: `/tmp/kotoba-dd-comparison.png` shows a continuous stage-to-HUD transition and no bright paper panel.
- Status: resolved.

### P1 — Enemy information and logs occupied the battlefield instead of supporting the plan

- Location: enemy fragment, causal fragment, and battle-screen DOM.
- Evidence: the earlier version put both paper fragments at the upper corners of the stage. The updated brief places enemy intelligence at lower left and execution/log functions at lower right.
- Impact: secondary reading surfaces competed with the characters and broke the requested information priority.
- Fix: moved compact enemy identity and clue to the HUD's left column, put extended description and hints behind native disclosure, and moved the concise causal log beneath the execute controls at right.
- Post-fix evidence: the upper 63% now contains only stage, characters, progress, vitals, and small combat metadata.
- Status: resolved.

### P2 — Legacy paper rules kept strategy slots and vocabulary pieces bright

- Location: `.word-imprint-line > button` and `.word-type-piece` style inheritance.
- Evidence: the first dark-HUD capture still showed cream form-like slots and pale active vocabulary cards because legacy selectors were more specific.
- Impact: the core sentence builder still looked like a light form embedded in a dark shell.
- Fix: scoped the final slot and vocabulary selectors under `.word-game`, restored dark metal/wood fills in selected and imprinted states, and retained category recognition through mark, label, border treatment, and silhouette.
- Post-fix evidence: `/tmp/kotoba-dd-hud-comparison.png` shows dark command plates and tactile vocabulary pieces with restrained category accents.
- Status: resolved.

### P2 — The third strategy sentence clipped at 1024 × 768

- Location: low-height desktop HUD.
- Evidence: the first 1024 capture exposed only the first two sentences without scrolling.
- Impact: maximum-length plans would not be inspectable at once, contradicting the core one-screen requirement.
- Fix: at desktop heights up to 820 px, use a 61/39 stage-to-HUD ratio, a shorter vocabulary row, and single-row sentence plates while preserving all six slots.
- Post-fix evidence: `/tmp/kotoba-game-1024.png` shows all three sentences, all 18 slots, enemy clue, execute control, log, and vocabulary in one 1024 × 768 viewport.
- Status: resolved.

### P2 — Characters were visually subordinate to empty stage space

- Location: `LiveBattlefield` word-quest presentation.
- Evidence: in the first side-by-side comparison, character height was materially smaller than the primary source and weakened the requested second-level visual priority.
- Impact: the battle read as background-led instead of character-led.
- Fix: added a display-only `commandStage` scale mode for the word-quest screen, increasing both supplied sprites while retaining their home positions and battle-motion targets.
- Post-fix evidence: the final 1920, 1024, and 390 captures show larger full-body figures with clear separation from their HP bars and HUD.
- Status: resolved.

## Required fidelity surfaces

- Fonts and typography: Japanese Mincho is retained for old-record character. Gold display titles, bone strategy words, ash annotations, and red clue labels create a clear hierarchy. Dense slot text truncates only at 1024 where the complete composed reading remains available; no broken wrapping was found.
- Spacing and layout rhythm: stage and HUD use the source's roughly 60/40 split. The lower surface is one contiguous band with three functional columns and one spanning vocabulary row, not a set of floating cards.
- Colors and visual tokens: black, charcoal, muted gold, rust red, iron gray, and restrained category accents map to the brief. The new battle CSS uses the real table texture and solid color overlays; no bright pastel or cream paper remains in battle.
- Image quality and asset fidelity: the supplied 1920 × 1080 Gothic stage and existing character sprites are used directly. The stage is cover-fit without aspect distortion. No placeholder illustration, custom SVG, CSS-drawn character, or substituted avatar was introduced.
- Copy and content: enemy identity, clue, optional full description, strategy readings, compression summary, vocabulary ownership, execute state, and causal logs remain available. Empty log copy is short.
- Icons and categorization: each word retains a Japanese role mark, a category label, color, and distinct border/silhouette treatment. Statuses use labeled compact marks with native titles.
- States and interactions: click placement, native drag/drop, selected slot, invalid-word shake, placement settle, used-word state, disabled controls, add/remove sentence, sequential execution, causal log, synergy links, and sentence compression remain functional.
- Accessibility: semantic buttons, headings, `details/summary`, live status text, HP labels, focus rings, reduced motion, and click alternatives to drag are present.

## Responsive and interaction verification

- 1920 × 1080: all required surfaces visible, 18 slots visible, no horizontal or vertical page overflow.
- 1024 × 768: all three strategy sentences visible together; viewport scroll size remains 1024 × 768.
- 390 × 844: vertical battle document has no horizontal page overflow; all regions remain reachable; vocabulary click placement succeeds.
- Native drag/drop: `いつでも` successfully placed into the selected condition slot.
- Execute: a valid three-sentence plan produced 10 ordered causal entries and reached the success log.
- Browser console and page errors: none.

## Automated verification

- Vitest: 33 files and 169 tests passed
- ESLint: passed
- TypeScript project build: passed
- Vite production build: passed
- `git diff --check`: passed

## Follow-up polish

- P3: if a future art pass provides character sprites authored specifically for the woodcut background, their line weight can be matched more closely without changing this layout.

final result: passed


</details>

final result: passed

</details>

final result: passed
