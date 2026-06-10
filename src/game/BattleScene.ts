import * as PIXI from "pixi.js";

import tutorialGroundUrl from "../assets/backgrounds/チュートリアル/ground.png";
import tutorialPillarUrl from "../assets/backgrounds/チュートリアル/pillar.png";
import tutorialWallUrl from "../assets/backgrounds/チュートリアル/wall.png";
import enemyAttackUrl from "../assets/characters/battle/チュートリアル/敵/攻撃/body_export_攻撃.png";
import enemyDamageUrl from "../assets/characters/battle/チュートリアル/敵/ダメージ/body_export_ダメージ.png";
import enemyIdleUrl from "../assets/characters/battle/チュートリアル/敵/待機/body_export_待機.png";
import playerAttackUrl from "../assets/characters/battle/チュートリアル/攻撃/body_export_攻撃.png";
import playerDamageUrl from "../assets/characters/battle/チュートリアル/ダメージ/body_export_ダメージ.png";
import playerIdleUrl from "../assets/characters/battle/チュートリアル/待機/body_export_待機.png";
import {
  calculateLayerLayout,
  type LayerVerticalAlign,
} from "./backgroundLayout";
import {
  buildRadialBurstPoints,
  buildVolleyOffsets,
  easeOutCubic,
  getEnemyAttackMotion,
  getPlayerAttackMotion,
  sampleAttackArc,
  type CombatMotionProfile,
} from "./combatMotion";

interface BackgroundLayer {
  src: string;
  verticalAlign: LayerVerticalAlign;
}

const BACKGROUND_LAYERS: BackgroundLayer[] = [
  { src: tutorialWallUrl, verticalAlign: "center" },
  { src: tutorialPillarUrl, verticalAlign: "center" },
  { src: tutorialGroundUrl, verticalAlign: "bottom" },
];

interface SpriteSheetDefinition {
  src: string;
  columns: number;
  rows: number;
}

interface CharacterSheetDefinition {
  idle: SpriteSheetDefinition;
  attack: SpriteSheetDefinition;
  damage: SpriteSheetDefinition;
  targetHeight: number;
}

interface CharacterAnimations {
  idle: PIXI.Texture[];
  attack: PIXI.Texture[];
  damage: PIXI.Texture[];
}

const PLAYER_SHEETS: CharacterSheetDefinition = {
  idle: { src: playerIdleUrl, columns: 8, rows: 8 },
  attack: { src: playerAttackUrl, columns: 7, rows: 7 },
  damage: { src: playerDamageUrl, columns: 5, rows: 5 },
  targetHeight: 235,
};

const ENEMY_SHEETS: CharacterSheetDefinition = {
  idle: { src: enemyIdleUrl, columns: 8, rows: 8 },
  attack: { src: enemyAttackUrl, columns: 6, rows: 5 },
  damage: { src: enemyDamageUrl, columns: 6, rows: 5 },
  targetHeight: 220,
};

// Pixi.jsアプリケーションインスタンス
let app: PIXI.Application | null = null;

// スプライトの参照
let playerSprite: PIXI.AnimatedSprite | null = null;
let enemySprite: PIXI.AnimatedSprite | null = null;
let playerShadow: PIXI.Graphics | null = null;
let enemyShadow: PIXI.Graphics | null = null;
let playerAnimations: CharacterAnimations | null = null;
let enemyAnimations: CharacterAnimations | null = null;
let enemyBaseScale = 1;
let idleTicker: ((ticker: PIXI.Ticker) => void) | null = null;
let idleStartTime = 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animateFor(
  durationMs: number,
  onFrame: (progress: number, easedProgress: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);

      onFrame(progress, easeOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

async function loadCharacterAnimations(
  definition: CharacterSheetDefinition,
): Promise<CharacterAnimations> {
  const [idle, attack, damage] = await Promise.all([
    loadAnimationFrames(definition.idle),
    loadAnimationFrames(definition.attack),
    loadAnimationFrames(definition.damage),
  ]);

  return { idle, attack, damage };
}

async function loadAnimationFrames(
  definition: SpriteSheetDefinition,
): Promise<PIXI.Texture[]> {
  const texture = await PIXI.Assets.load<PIXI.Texture>(definition.src);
  const frameWidth = Math.floor(texture.width / definition.columns);
  const frameHeight = Math.floor(texture.height / definition.rows);
  const frames: PIXI.Texture[] = [];

  for (let row = 0; row < definition.rows; row += 1) {
    for (let column = 0; column < definition.columns; column += 1) {
      frames.push(
        new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(
            column * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
          ),
        }),
      );
    }
  }

  return frames;
}

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
    await drawBackground();

    // チュートリアル用キャラクターアニメーションを読み込み
    [playerAnimations, enemyAnimations] = await Promise.all([
      loadCharacterAnimations(PLAYER_SHEETS),
      loadCharacterAnimations(ENEMY_SHEETS),
    ]);

    // キャラクターを配置
    createPlayerSprite();
    createEnemySprite();
    startIdleMotion();

    return app;
  } catch (error) {
    console.error("バトルシーンの初期化に失敗:", error);
    return null;
  }
}

// 背景の描画
async function drawBackground() {
  if (!app || !app.stage) return;

  const activeApp = app;
  const viewport = {
    width: activeApp.screen.width,
    height: activeApp.screen.height,
  };

  for (const layer of BACKGROUND_LAYERS) {
    const texture = await PIXI.Assets.load<PIXI.Texture>(layer.src);
    if (app !== activeApp || !activeApp.stage) return;

    const layout = calculateLayerLayout({
      viewport,
      texture: { width: texture.width, height: texture.height },
      verticalAlign: layer.verticalAlign,
    });
    const sprite = new PIXI.Sprite(texture);

    sprite.x = layout.x;
    sprite.y = layout.y;
    sprite.scale.set(layout.scale);

    activeApp.stage.addChild(sprite);
  }
}

function createGroundShadow(x: number, y: number, width: number): PIXI.Graphics {
  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 0, width, 13);
  shadow.fill({ color: 0x000000, alpha: 0.34 });
  shadow.x = x;
  shadow.y = y;
  return shadow;
}

// プレイヤースプライトの作成
function createPlayerSprite() {
  if (!app || !app.stage || !playerAnimations) return;

  const x = app.screen.width * 0.25;
  const y = app.screen.height * 0.72;
  playerShadow = createGroundShadow(x, y + 6, 58);
  app.stage.addChild(playerShadow);

  playerSprite = createCharacterSprite(
    playerAnimations,
    PLAYER_SHEETS.targetHeight,
    x,
    y,
  );

  app.stage.addChild(playerSprite);
}

// 敵スプライトの作成
function createEnemySprite() {
  if (!app || !app.stage || !enemyAnimations) return;

  const x = app.screen.width * 0.75;
  const y = app.screen.height * 0.72;
  enemyShadow = createGroundShadow(x, y + 5, 64);
  app.stage.addChild(enemyShadow);

  enemySprite = createCharacterSprite(
    enemyAnimations,
    ENEMY_SHEETS.targetHeight,
    x,
    y,
  );
  enemyBaseScale = enemySprite.scale.x;

  app.stage.addChild(enemySprite);
}

function createCharacterSprite(
  animations: CharacterAnimations,
  targetHeight: number,
  x: number,
  y: number,
): PIXI.AnimatedSprite {
  const sprite = new PIXI.AnimatedSprite(animations.idle);
  const scale = targetHeight / Math.max(1, sprite.texture.height);

  sprite.anchor.set(0.5, 1);
  sprite.x = x;
  sprite.y = y;
  sprite.scale.set(scale);
  sprite.animationSpeed = 0.16;
  sprite.loop = true;
  sprite.play();

  return sprite;
}

function setCharacterAnimation(
  sprite: PIXI.AnimatedSprite | null,
  animations: CharacterAnimations | null,
  state: keyof CharacterAnimations,
  options: { loop: boolean; speed: number },
) {
  if (!sprite || !animations) return;

  sprite.textures = animations[state];
  sprite.loop = options.loop;
  sprite.animationSpeed = options.speed;
  sprite.gotoAndPlay(0);
}

function restoreIdleAnimation(
  sprite: PIXI.AnimatedSprite | null,
  animations: CharacterAnimations | null,
) {
  setCharacterAnimation(sprite, animations, "idle", {
    loop: true,
    speed: 0.16,
  });
}

async function playMomentaryCharacterAnimation(
  sprite: PIXI.AnimatedSprite | null,
  animations: CharacterAnimations | null,
  state: "attack" | "damage",
  durationMs: number,
) {
  setCharacterAnimation(sprite, animations, state, {
    loop: false,
    speed: 0.34,
  });
  await wait(durationMs);
  restoreIdleAnimation(sprite, animations);
}

function startIdleMotion() {
  if (!app || !playerSprite || !enemySprite) return;

  const activeApp = app;
  idleStartTime = Date.now();
  idleTicker = () => {
    if (app !== activeApp || !playerSprite || !enemySprite) return;

    const elapsed = (Date.now() - idleStartTime) / 1000;
    const playerBob = Math.sin(elapsed * 2.1) * 3;
    const enemyBob = Math.sin(elapsed * 1.8 + 0.6) * 5;
    const enemyBreath = Math.sin(elapsed * 1.8 + 0.6) * 0.025;

    playerSprite.y = activeApp.screen.height * 0.72 + playerBob;
    enemySprite.y = activeApp.screen.height * 0.72 + enemyBob;
    enemySprite.scale.set(
      enemyBaseScale * (1 - enemyBreath),
      enemyBaseScale * (1 + enemyBreath),
    );

    if (playerShadow) {
      playerShadow.scale.set(1 + Math.abs(playerBob) * 0.008, 1);
      playerShadow.alpha = 0.28 + Math.abs(playerBob) * 0.015;
    }

    if (enemyShadow) {
      enemyShadow.scale.set(1 + Math.abs(enemyBob) * 0.01, 1);
      enemyShadow.alpha = 0.28 + Math.abs(enemyBob) * 0.014;
    }
  };

  activeApp.ticker.add(idleTicker);
}

// 攻撃アニメーション
export function playAttackAnimation(
  attackType: "fire" | "ice" | "thunder" | "normal" = "fire",
): Promise<void> {
  return playPlayerAttack(attackType);
}

async function playPlayerAttack(
  attackType: "fire" | "ice" | "thunder" | "normal",
): Promise<void> {
  if (!app || !app.stage || !playerSprite || !enemySprite) {
    return;
  }

  const activeApp = app;
  const motion = getPlayerAttackMotion(attackType);
  const colors: Record<typeof attackType, number> = {
    fire: 0xe94560,
    ice: 0x3b82f6,
    thunder: 0xfbbf24,
    normal: 0xffffff,
  };
  const color = colors[attackType];

  setCharacterAnimation(playerSprite, playerAnimations, "attack", {
    loop: false,
    speed: 0.34,
  });
  await playCasterAnticipation(playerSprite, motion);

  if (app !== activeApp || !playerSprite || !enemySprite) {
    return;
  }

  const start = { x: playerSprite.x + 54, y: playerSprite.y - 36 };
  const target = { x: enemySprite.x, y: enemySprite.y - 8 };
  const { projectile, trails } = createProjectileEffect(
    color,
    motion.projectileRadius,
    motion.trailCopies,
  );

  activeApp.stage.addChild(...trails, projectile);

  await animateProjectile(activeApp, projectile, trails, start, target, motion);
  removeDisplayObjects([projectile, ...trails]);

  if (app !== activeApp) {
    return;
  }

  playImpactFlash(color, motion.impactFlashAlpha);
  playHitEffect(target.x, target.y, color, motion);
  void playMomentaryCharacterAnimation(
    enemySprite,
    enemyAnimations,
    "damage",
    360,
  );
  shakeStage(Math.max(4, motion.impactShake * 0.28), motion.stageShakeMs);

  if (enemySprite) {
    shakeSprite(enemySprite, motion.impactShake, motion.targetShakeMs);
  }

  await wait(motion.hitStopMs + motion.recoveryMs);
  restoreIdleAnimation(playerSprite, playerAnimations);
}

function createProjectileEffect(
  color: number,
  radius: number,
  trailCopies: number,
): { projectile: PIXI.Graphics; trails: PIXI.Graphics[] } {
  const projectile = new PIXI.Graphics();
  projectile.circle(0, 0, radius);
  projectile.fill({ color, alpha: 0.96 });
  projectile.circle(0, 0, radius * 0.45);
  projectile.fill({ color: 0xffffff, alpha: 0.58 });

  const trails = Array.from({ length: trailCopies }, (_, index) => {
    const trail = new PIXI.Graphics();
    trail.circle(0, 0, radius * Math.max(0.42, 1 - index * 0.1));
    trail.fill({ color, alpha: 0.22 });
    trail.alpha = 0;
    return trail;
  });

  return { projectile, trails };
}

async function animateProjectile(
  activeApp: PIXI.Application,
  projectile: PIXI.Graphics,
  trails: PIXI.Graphics[],
  start: { x: number; y: number },
  target: { x: number; y: number },
  motion: CombatMotionProfile,
): Promise<void> {
  await animateFor(motion.travelMs, (progress, easedProgress) => {
    if (app !== activeApp) return;

    const point = sampleAttackArc({
      start,
      target,
      progress: easedProgress,
      arcHeight: motion.arcHeight,
    });

    projectile.x = point.x;
    projectile.y = point.y;
    projectile.scale.set(1 + Math.sin(progress * Math.PI) * 0.28);

    trails.forEach((trail, index) => {
      const trailProgress = Math.max(0, easedProgress - (index + 1) * 0.045);
      const trailPoint = sampleAttackArc({
        start,
        target,
        progress: trailProgress,
        arcHeight: motion.arcHeight,
      });

      trail.x = trailPoint.x;
      trail.y = trailPoint.y;
      trail.alpha = Math.max(0, (0.34 - index * 0.045) * progress);
    });
  });
}

async function playCasterAnticipation(
  sprite: PIXI.AnimatedSprite,
  motion: CombatMotionProfile,
): Promise<void> {
  const originalX = sprite.x;
  const originalY = sprite.y;
  const originalScaleX = sprite.scale.x;
  const originalScaleY = sprite.scale.y;

  await animateFor(motion.startupMs, (progress) => {
    const pull = Math.sin(progress * Math.PI);
    sprite.x = originalX + motion.anticipationX * pull;
    sprite.y = originalY + motion.anticipationY * pull;
    sprite.scale.set(
      originalScaleX * (1 + pull * 0.045),
      originalScaleY * (1 - pull * 0.025),
    );
  });

  sprite.x = originalX;
  sprite.y = originalY;
  sprite.scale.set(originalScaleX, originalScaleY);
}

function removeDisplayObjects(objects: PIXI.Graphics[]) {
  for (const object of objects) {
    try {
      app?.stage?.removeChild(object);
      object.destroy();
    } catch {
      // 無視
    }
  }
}

// ヒットエフェクト
function playHitEffect(
  x: number,
  y: number,
  color: number,
  motion: CombatMotionProfile = getPlayerAttackMotion("normal"),
) {
  if (!app || !app.stage) return;

  const hitEffect = new PIXI.Graphics();
  hitEffect.x = x;
  hitEffect.y = y;

  for (const point of buildRadialBurstPoints(
    motion.burstCount,
    motion.burstRadius,
  )) {
    hitEffect.circle(point.x, point.y, 5);
  }
  hitEffect.fill(color);

  app.stage.addChild(hitEffect);

  void animateFor(240, (progress) => {
    hitEffect.alpha = 1 - progress;
    hitEffect.scale.set(1 + progress * 0.95);
  }).then(() => {
    try {
      app?.stage?.removeChild(hitEffect);
      hitEffect.destroy();
    } catch {
      // 無視
    }
  });
}

function playImpactFlash(color: number, alpha: number) {
  if (!app || !app.stage) return;

  const flash = new PIXI.Graphics();
  flash.rect(0, 0, app.screen.width, app.screen.height);
  flash.fill({ color, alpha });
  app.stage.addChild(flash);

  void animateFor(180, (progress) => {
    flash.alpha = 1 - progress;
  }).then(() => {
    try {
      app?.stage?.removeChild(flash);
      flash.destroy();
    } catch {
      // 無視
    }
  });
}

function shakeStage(amount: number, durationMs: number) {
  if (!app || !app.stage) return;

  const activeApp = app;
  const originalX = activeApp.stage.x;
  const originalY = activeApp.stage.y;

  void animateFor(durationMs, (progress) => {
    if (app !== activeApp) return;
    const decay = 1 - progress;
    activeApp.stage.x =
      originalX + Math.sin(progress * Math.PI * 10) * amount * decay;
    activeApp.stage.y =
      originalY + Math.cos(progress * Math.PI * 8) * amount * 0.45 * decay;
  }).then(() => {
    if (app === activeApp) {
      activeApp.stage.x = originalX;
      activeApp.stage.y = originalY;
    }
  });
}

// スプライトを揺らす
function shakeSprite(
  sprite: PIXI.AnimatedSprite,
  amount: number = 10,
  durationMs: number = 300,
) {
  if (!sprite) return;

  const originalX = sprite.x;

  void animateFor(durationMs, (progress) => {
    const decay = 1 - progress;
    sprite.x = originalX + Math.sin(progress * Math.PI * 9) * amount * decay;
  }).then(() => {
    sprite.x = originalX;
  });
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
  return playEnemyAttack(attackType, isBlocked);
}

async function playEnemyAttack(
  attackType: "normal" | "heavy" | "multi",
  isBlocked: boolean,
): Promise<void> {
  if (!app || !app.stage || !playerSprite || !enemySprite) {
    return;
  }

  const activeApp = app;
  const motion = getEnemyAttackMotion(attackType, isBlocked);
  const colors: Record<typeof attackType, number> = {
    normal: 0xff6b6b,
    heavy: 0xff0000,
    multi: 0x8b5cf6,
  };
  const color = colors[attackType];

  setCharacterAnimation(enemySprite, enemyAnimations, "attack", {
    loop: false,
    speed: 0.34,
  });
  await playCasterAnticipation(enemySprite, motion);

  if (app !== activeApp || !playerSprite || !enemySprite) {
    return;
  }

  const volleyOffsets = buildVolleyOffsets(
    motion.volleyCount,
    motion.volleySpread,
  );

  for (let index = 0; index < volleyOffsets.length; index += 1) {
    await playEnemyProjectile(
      activeApp,
      color,
      motion,
      isBlocked,
      volleyOffsets[index],
    );

    if (index < volleyOffsets.length - 1) {
      await wait(motion.volleyDelayMs);
    }
  }

  await wait(motion.recoveryMs);
  restoreIdleAnimation(enemySprite, enemyAnimations);
}

async function playEnemyProjectile(
  activeApp: PIXI.Application,
  color: number,
  motion: CombatMotionProfile,
  isBlocked: boolean,
  verticalOffset: number = 0,
): Promise<void> {
  if (!playerSprite || !enemySprite) return;

  const start = { x: enemySprite.x - 54, y: enemySprite.y + verticalOffset };
  const target = {
    x: playerSprite.x,
    y: playerSprite.y - 30 + verticalOffset * 0.35,
  };
  const { projectile, trails } = createProjectileEffect(
    color,
    motion.projectileRadius,
    motion.trailCopies,
  );

  activeApp.stage.addChild(...trails, projectile);
  await animateProjectile(activeApp, projectile, trails, start, target, motion);
  removeDisplayObjects([projectile, ...trails]);

  if (app !== activeApp) {
    return;
  }

  if (isBlocked) {
    playBlockEffect(target.x, target.y, motion);
  } else {
    playHitEffect(target.x, target.y, color, motion);
    void playMomentaryCharacterAnimation(
      playerSprite,
      playerAnimations,
      "damage",
      360,
    );
  }

  playImpactFlash(
    isBlocked ? 0x3b82f6 : color,
    motion.impactFlashAlpha,
  );
  shakeStage(Math.max(3, motion.impactShake * 0.25), motion.stageShakeMs);

  if (playerSprite && !isBlocked) {
    shakeSprite(playerSprite, motion.impactShake, motion.targetShakeMs);
  }

  await wait(motion.hitStopMs);
}

// 防御成功エフェクト
function playBlockEffect(
  x: number,
  y: number,
  motion: CombatMotionProfile = getEnemyAttackMotion("normal", true),
) {
  if (!app || !app.stage) return;

  const blockEffect = new PIXI.Graphics();
  blockEffect.x = x;
  blockEffect.y = y;

  // シールド形状
  blockEffect.circle(0, 0, 40);
  blockEffect.stroke({ color: 0x3b82f6, width: 4 });
  blockEffect.fill({ color: 0x3b82f6, alpha: 0.3 });

  for (const point of buildRadialBurstPoints(8, motion.burstRadius * 0.74)) {
    blockEffect.circle(point.x, point.y, 3);
  }
  blockEffect.fill({ color: 0xb9dcff, alpha: 0.58 });

  app.stage.addChild(blockEffect);

  void animateFor(320, (progress) => {
    blockEffect.alpha = 1 - progress;
    blockEffect.scale.set(1 + progress * 0.65);
  }).then(() => {
    try {
      app?.stage?.removeChild(blockEffect);
      blockEffect.destroy();
    } catch {
      // 無視
    }
  });
}

// クリーンアップ
export function destroyBattleScene() {
  if (app) {
    try {
      if (idleTicker) {
        app.ticker.remove(idleTicker);
      }
      app.destroy(true, { children: true });
    } catch {
      // 無視
    }
    app = null;
  }

  playerSprite = null;
  enemySprite = null;
  playerShadow = null;
  enemyShadow = null;
  playerAnimations = null;
  enemyAnimations = null;
  enemyBaseScale = 1;
  idleTicker = null;
}
