import * as PIXI from "pixi.js";

// Pixi.jsアプリケーションインスタンス
let app: PIXI.Application | null = null;

// スプライトの参照
let playerSprite: PIXI.Graphics | null = null;
let enemySprite: PIXI.Graphics | null = null;

// バトルシーンの初期化
export async function initBattleScene(
  container: HTMLElement,
): Promise<PIXI.Application | null> {
  // 既存のアプリがあれば先に破棄
  destroyBattleScene();

  // コンテナ内の既存のキャンバスを削除
  const existingCanvas = container.querySelector("canvas");
  if (existingCanvas) {
    existingCanvas.remove();
  }

  try {
    // コンテナのサイズを取得
    const containerRect = container.getBoundingClientRect();
    const width = Math.max(containerRect.width || 800, 400);
    const height = Math.max(containerRect.height || 300, 200);

    // 新しいアプリケーションを作成
    app = new PIXI.Application();

    await app.init({
      background: 0x1a1a2e,
      width: width,
      height: height,
      antialias: true,
    });

    // キャンバスをコンテナに追加
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    container.appendChild(app.canvas);

    // 背景を描画
    drawBackground();

    // キャラクターを配置
    createPlayerSprite();
    createEnemySprite();

    return app;
  } catch (error) {
    console.error("バトルシーンの初期化に失敗:", error);
    return null;
  }
}

// 背景の描画
function drawBackground() {
  if (!app || !app.stage) return;

  const bgGraphics = new PIXI.Graphics();

  // 地面
  bgGraphics.rect(
    0,
    app.screen.height * 0.7,
    app.screen.width,
    app.screen.height * 0.3,
  );
  bgGraphics.fill(0x16213e);

  // 魔法陣
  bgGraphics.circle(app.screen.width / 2, app.screen.height * 0.8, 100);
  bgGraphics.stroke({ color: 0x2d3748, width: 2 });

  app.stage.addChild(bgGraphics);
}

// プレイヤースプライトの作成
function createPlayerSprite() {
  if (!app || !app.stage) return;

  playerSprite = new PIXI.Graphics();

  // ローブ
  playerSprite.rect(-30, -20, 60, 80);
  playerSprite.fill(0x3b82f6);

  // 頭
  playerSprite.circle(0, -40, 25);
  playerSprite.fill(0xfbbf24);

  // 帽子
  playerSprite.poly([
    { x: -30, y: -50 },
    { x: 0, y: -90 },
    { x: 30, y: -50 },
  ]);
  playerSprite.fill(0x6366f1);

  // 杖
  playerSprite.rect(35, -30, 8, 100);
  playerSprite.fill(0x8b5cf6);

  // 杖の先端
  playerSprite.circle(39, -35, 10);
  playerSprite.fill(0xfbbf24);

  // 位置を設定
  playerSprite.x = app.screen.width * 0.25;
  playerSprite.y = app.screen.height * 0.6;

  app.stage.addChild(playerSprite);
}

// 敵スプライトの作成（スライム風）
function createEnemySprite() {
  if (!app || !app.stage) return;

  enemySprite = new PIXI.Graphics();

  // スライムの体
  enemySprite.ellipse(0, 0, 50, 40);
  enemySprite.fill(0x22c55e);

  // 目（左）
  enemySprite.circle(-15, -10, 8);
  enemySprite.fill(0xffffff);
  enemySprite.circle(-15, -10, 4);
  enemySprite.fill(0x000000);

  // 目（右）
  enemySprite.circle(15, -10, 8);
  enemySprite.fill(0xffffff);
  enemySprite.circle(15, -10, 4);
  enemySprite.fill(0x000000);

  // 口
  enemySprite.arc(0, 5, 15, 0, Math.PI);
  enemySprite.stroke({ color: 0x000000, width: 3 });

  // 位置を設定
  enemySprite.x = app.screen.width * 0.75;
  enemySprite.y = app.screen.height * 0.6;

  app.stage.addChild(enemySprite);
}

// 攻撃アニメーション
export function playAttackAnimation(
  attackType: "fire" | "ice" | "thunder" | "normal" = "fire",
  didHit: boolean = true,
): Promise<void> {
  return new Promise((resolve) => {
    if (!app || !app.stage || !playerSprite || !enemySprite) {
      resolve();
      return;
    }

    const colors: Record<string, number> = {
      fire: 0xe94560,
      ice: 0x3b82f6,
      thunder: 0xfbbf24,
      normal: 0xffffff,
    };

    const color = colors[attackType];

    // 攻撃エフェクトの作成
    const attackEffect = new PIXI.Graphics();
    attackEffect.circle(0, 0, 15);
    attackEffect.fill(color);
    attackEffect.x = playerSprite.x + 50;
    attackEffect.y = playerSprite.y - 30;

    app.stage.addChild(attackEffect);

    // アニメーション
    const targetX = enemySprite.x;
    // 空振り時は少し下を通るようにして、ジャンプ回避を見せる
    const targetY = didHit ? enemySprite.y : enemySprite.y + 55;
    const startX = attackEffect.x;
    const startY = attackEffect.y;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      if (!app || !app.stage) {
        resolve();
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      attackEffect.x = startX + (targetX - startX) * easeProgress;
      attackEffect.y = startY + (targetY - startY) * easeProgress;
      attackEffect.scale.set(1 + Math.sin(progress * Math.PI) * 0.5);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // ヒットエフェクト
        if (didHit) {
          playHitEffect(targetX, targetY, color);
        }

        // エフェクトを削除
        try {
          app?.stage?.removeChild(attackEffect);
          attackEffect.destroy();
        } catch {
          // 無視
        }

        // 命中したときだけ敵を揺らす
        if (didHit && enemySprite) {
          shakeSprite(enemySprite);
        }

        setTimeout(resolve, 300);
      }
    };

    requestAnimationFrame(animate);
  });
}

// 敵のジャンプアニメーション
export function playEnemyJumpAnimation(): Promise<void> {
  return new Promise((resolve) => {
    if (!enemySprite || !app || !app.stage) {
      resolve();
      return;
    }

    // 少し大きめの跳躍にして、空中にいるのが分かるようにする
    const startY = enemySprite.y;
    const jumpHeight = 70;
    const duration = 450;
    const startTime = Date.now();

    const animate = () => {
      if (!enemySprite || !app || !app.stage) {
        resolve();
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const arc = Math.sin(progress * Math.PI);

      enemySprite.y = startY - jumpHeight * arc;
      enemySprite.scale.set(1 + arc * 0.08);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        enemySprite.y = startY;
        enemySprite.scale.set(1);
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

// ヒットエフェクト
function playHitEffect(x: number, y: number, color: number) {
  if (!app || !app.stage) return;

  const hitEffect = new PIXI.Graphics();
  hitEffect.x = x;
  hitEffect.y = y;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 30;
    hitEffect.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 5);
  }
  hitEffect.fill(color);

  app.stage.addChild(hitEffect);

  let alpha = 1;
  const fadeOut = () => {
    alpha -= 0.1;
    hitEffect.alpha = alpha;
    hitEffect.scale.set(hitEffect.scale.x + 0.1);

    if (alpha > 0) {
      requestAnimationFrame(fadeOut);
    } else {
      try {
        app?.stage?.removeChild(hitEffect);
        hitEffect.destroy();
      } catch {
        // 無視
      }
    }
  };

  requestAnimationFrame(fadeOut);
}

// スプライトを揺らす
function shakeSprite(sprite: PIXI.Graphics) {
  if (!sprite) return;

  const originalX = sprite.x;
  const shakeAmount = 10;
  let shakeCount = 0;
  const maxShakes = 6;

  const shake = () => {
    if (shakeCount >= maxShakes) {
      sprite.x = originalX;
      return;
    }

    sprite.x = originalX + (shakeCount % 2 === 0 ? shakeAmount : -shakeAmount);
    shakeCount++;

    setTimeout(shake, 50);
  };

  shake();
}

// 敵のHPを更新
export function updateEnemyAppearance(hpPercent: number) {
  if (!enemySprite) return;

  if (hpPercent < 0.3) {
    enemySprite.tint = 0xff6b6b;
  } else if (hpPercent < 0.6) {
    enemySprite.tint = 0xffa500;
  } else {
    enemySprite.tint = 0xffffff;
  }
}

// シールド中の見た目を更新
export function setEnemyShieldVisual(isShielded: boolean) {
  if (!enemySprite) return;

  if (isShielded) {
    enemySprite.tint = 0x60a5fa;
  }
}

// 敵を倒したときのアニメーション
export function playDefeatAnimation(): Promise<void> {
  return new Promise((resolve) => {
    if (!enemySprite || !app || !app.stage) {
      resolve();
      return;
    }

    let scale = 1;
    let alpha = 1;

    const animate = () => {
      if (!enemySprite) {
        resolve();
        return;
      }

      scale += 0.05;
      alpha -= 0.05;

      enemySprite.scale.set(scale);
      enemySprite.alpha = alpha;

      if (alpha > 0) {
        requestAnimationFrame(animate);
      } else {
        try {
          app?.stage?.removeChild(enemySprite);
          enemySprite.destroy();
        } catch {
          // 無視
        }
        enemySprite = null;
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

// 敵の攻撃アニメーション
export function playEnemyAttackAnimation(
  attackType: "normal" | "heavy" | "multi" = "normal",
  isBlocked: boolean = false,
): Promise<void> {
  return new Promise((resolve) => {
    if (!app || !app.stage || !playerSprite || !enemySprite) {
      resolve();
      return;
    }

    const colors: Record<string, number> = {
      normal: 0xff6b6b,
      heavy: 0xff0000,
      multi: 0x8b5cf6,
    };

    const color = colors[attackType];
    const effectSize = attackType === "heavy" ? 25 : 15;

    // 敵から攻撃エフェクトを発射
    const attackEffect = new PIXI.Graphics();
    attackEffect.circle(0, 0, effectSize);
    attackEffect.fill(color);
    attackEffect.x = enemySprite.x - 50;
    attackEffect.y = enemySprite.y;

    app.stage.addChild(attackEffect);

    // アニメーション
    const targetX = playerSprite.x;
    const targetY = playerSprite.y - 30;
    const startX = attackEffect.x;
    const startY = attackEffect.y;
    const duration = attackType === "heavy" ? 600 : 400;
    const startTime = Date.now();

    const animate = () => {
      if (!app || !app.stage) {
        resolve();
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      attackEffect.x = startX + (targetX - startX) * easeProgress;
      attackEffect.y = startY + (targetY - startY) * easeProgress;

      // 強攻撃は大きくなる
      if (attackType === "heavy") {
        attackEffect.scale.set(1 + progress * 0.5);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // ヒットエフェクト
        if (isBlocked) {
          // 防御成功エフェクト（青い輝き）
          playBlockEffect(targetX, targetY);
        } else {
          // 通常ヒット
          playHitEffect(targetX, targetY, color);
        }

        // エフェクトを削除
        try {
          app?.stage?.removeChild(attackEffect);
          attackEffect.destroy();
        } catch {
          // 無視
        }

        // プレイヤーを揺らす
        if (playerSprite && !isBlocked) {
          shakeSprite(playerSprite);
        }

        setTimeout(resolve, 300);
      }
    };

    requestAnimationFrame(animate);
  });
}

// 防御成功エフェクト
function playBlockEffect(x: number, y: number) {
  if (!app || !app.stage) return;

  const blockEffect = new PIXI.Graphics();
  blockEffect.x = x;
  blockEffect.y = y;

  // シールド形状
  blockEffect.circle(0, 0, 40);
  blockEffect.stroke({ color: 0x3b82f6, width: 4 });
  blockEffect.fill({ color: 0x3b82f6, alpha: 0.3 });

  app.stage.addChild(blockEffect);

  let alpha = 1;
  let scale = 1;
  const fadeOut = () => {
    alpha -= 0.08;
    scale += 0.05;
    blockEffect.alpha = alpha;
    blockEffect.scale.set(scale);

    if (alpha > 0) {
      requestAnimationFrame(fadeOut);
    } else {
      try {
        app?.stage?.removeChild(blockEffect);
        blockEffect.destroy();
      } catch {
        // 無視
      }
    }
  };

  requestAnimationFrame(fadeOut);
}

// クリーンアップ
export function destroyBattleScene() {
  if (app) {
    try {
      app.destroy(true, { children: true });
    } catch {
      // 無視
    }
    app = null;
  }

  playerSprite = null;
  enemySprite = null;
}
