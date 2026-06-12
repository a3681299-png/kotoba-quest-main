import { animate } from "animejs";
import * as PIXI from "pixi.js";

import tutorialGroundUrl from "../assets/backgrounds/チュートリアル/ground.png";
import tutorialPillarUrl from "../assets/backgrounds/チュートリアル/pillar.png";
import tutorialWallUrl from "../assets/backgrounds/チュートリアル/wall.png";
import {
  ENEMY_SHEETS,
  PLAYER_SHEETS,
  type CharacterSheetDefinition,
  type SpriteSheetDefinition,
} from "./characterAssets";
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
import {
  buildPlayerMeleeAttackPlan,
  type CameraTransform,
} from "./cameraMotion";
import {
  buildImpactEffectPlan,
  buildScatterOffsets,
  type ImpactEffectPlan,
} from "./battleEffects";

interface BackgroundLayer {
  src: string;
  verticalAlign: LayerVerticalAlign;
}

const BACKGROUND_LAYERS: BackgroundLayer[] = [
  { src: tutorialWallUrl, verticalAlign: "center" },
  { src: tutorialPillarUrl, verticalAlign: "center" },
  { src: tutorialGroundUrl, verticalAlign: "bottom" },
];

interface CharacterAnimations {
  idle: PIXI.Texture[];
  attack: PIXI.Texture[];
  damage: PIXI.Texture[];
}

interface PlayerEngagement {
  home: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  };
  shadowHome: { x: number; y: number } | null;
}

// Pixi.jsアプリケーションインスタンス
let app: PIXI.Application | null = null;
let battleWorld: PIXI.Container | null = null;

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
let isPlayerAttackAnimating = false;
let playerIdleBaseY = 0;
let playerEngagement: PlayerEngagement | null = null;

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

function tweenNumberProps(
  target: Record<string, number>,
  values: Record<string, number>,
  options: { duration: number; ease?: string; onRender?: () => void },
): Promise<void> {
  return animate(target, {
    ...values,
    duration: options.duration,
    ease: options.ease ?? "outQuad",
    onRender: options.onRender,
  }).then(() => undefined);
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

    battleWorld = new PIXI.Container();
    app.stage.addChild(battleWorld);

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
  if (!app || !battleWorld) return;

  const activeApp = app;
  const activeWorld = battleWorld;
  const viewport = {
    width: activeApp.screen.width,
    height: activeApp.screen.height,
  };

  for (const layer of BACKGROUND_LAYERS) {
    const texture = await PIXI.Assets.load<PIXI.Texture>(layer.src);
    if (app !== activeApp || battleWorld !== activeWorld) return;

    const layout = calculateLayerLayout({
      viewport,
      texture: { width: texture.width, height: texture.height },
      verticalAlign: layer.verticalAlign,
    });
    const sprite = new PIXI.Sprite(texture);

    sprite.x = layout.x;
    sprite.y = layout.y;
    sprite.scale.set(layout.scale);

    activeWorld.addChild(sprite);
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
  if (!app || !battleWorld || !playerAnimations) return;

  const x = app.screen.width * 0.25;
  const y = app.screen.height * 0.72;
  playerIdleBaseY = y;
  playerShadow = createGroundShadow(x, y + 6, 58);
  battleWorld.addChild(playerShadow);

  playerSprite = createCharacterSprite(
    playerAnimations,
    PLAYER_SHEETS.targetHeight,
    x,
    y,
  );

  battleWorld.addChild(playerSprite);
}

// 敵スプライトの作成
function createEnemySprite() {
  if (!app || !battleWorld || !enemyAnimations) return;

  const x = app.screen.width * 0.75;
  const y = app.screen.height * 0.72;
  enemyShadow = createGroundShadow(x, y + 5, 64);
  battleWorld.addChild(enemyShadow);

  enemySprite = createCharacterSprite(
    enemyAnimations,
    ENEMY_SHEETS.targetHeight,
    x,
    y,
  );
  enemyBaseScale = enemySprite.scale.x;

  battleWorld.addChild(enemySprite);
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
  speed = 0.28,
) {
  setCharacterAnimation(sprite, animations, state, {
    loop: false,
    speed,
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

    if (!isPlayerAttackAnimating) {
      playerSprite.y = playerIdleBaseY + playerBob;
    }
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
  damageAmount?: number,
): Promise<void> {
  if (isPlayerAttackAnimating) {
    return Promise.resolve();
  }

  isPlayerAttackAnimating = true;
  return playPlayerAttack(attackType, damageAmount).finally(() => {
    isPlayerAttackAnimating = false;
  });
}

async function playPlayerAttack(
  attackType: "fire" | "ice" | "thunder" | "normal",
  damageAmount?: number,
): Promise<void> {
  if (!app || !battleWorld || !playerSprite || !enemySprite) {
    return;
  }

  const activeApp = app;
  const activeWorld = battleWorld;
  const motion = getPlayerAttackMotion(attackType);
  const colors: Record<typeof attackType, number> = {
    fire: 0xe94560,
    ice: 0x3b82f6,
    thunder: 0xfbbf24,
    normal: 0xffffff,
  };
  const color = colors[attackType];
  const hitDirection = enemySprite.x >= playerSprite.x ? 1 : -1;
  const impactPlan = buildImpactEffectPlan({
    motion,
    direction: hitDirection,
    damage: damageAmount,
  });

  const wasEngaged = playerEngagement !== null;
  if (!playerEngagement) {
    playerEngagement = {
      home: {
        x: playerSprite.x,
        y: playerSprite.y,
        scaleX: playerSprite.scale.x,
        scaleY: playerSprite.scale.y,
      },
      shadowHome: playerShadow
        ? { x: playerShadow.x, y: playerShadow.y }
        : null,
    };
  }

  const plan = buildPlayerMeleeAttackPlan({
    viewport: {
      width: activeApp.screen.width,
      height: activeApp.screen.height,
    },
    player: { x: playerSprite.x, y: playerSprite.y },
    enemy: { x: enemySprite.x, y: enemySprite.y },
    isEngaged: wasEngaged,
  });

  if (plan.shouldEnter) {
    await applyCameraTransform(activeWorld, plan.closeUp, motion.startupMs);
    if (app !== activeApp || battleWorld !== activeWorld || !playerSprite) {
      return;
    }

    playCharacterAfterimages(playerSprite, impactPlan.afterimages);
    await Promise.all([
      applyCameraTransform(activeWorld, plan.follow, motion.travelMs),
      movePlayerTowardEnemy(playerSprite, playerShadow, plan.approach, motion),
    ]);
  }

  if (
    app !== activeApp ||
    battleWorld !== activeWorld ||
    !playerSprite ||
    !enemySprite
  ) {
    return;
  }

  await applyCameraTransform(
    activeWorld,
    plan.strike,
    plan.shouldEnter
      ? motion.strikeFocusMs
      : Math.round(motion.strikeFocusMs * 0.45),
  );

  if (app !== activeApp || battleWorld !== activeWorld || !playerSprite) {
    return;
  }

  setCharacterAnimation(playerSprite, playerAnimations, "attack", {
    loop: false,
    speed: motion.animationSpeed,
  });
  await playCasterAnticipation(playerSprite, motion);

  const target = { x: enemySprite.x, y: enemySprite.y - 22 };
  playImpactEffects({
    targetSprite: enemySprite,
    x: target.x,
    y: target.y,
    color,
    plan: impactPlan,
  });
  void playMomentaryCharacterAnimation(
    enemySprite,
    enemyAnimations,
    "damage",
    Math.max(420, motion.targetShakeMs),
    motion.animationSpeed,
  );
  shakeStage(Math.max(4, motion.impactShake * 0.28), motion.stageShakeMs);

  await wait(motion.hitStopMs);
  await playSlowMotionBeat([playerSprite, enemySprite], motion);
  restoreIdleAnimation(playerSprite, playerAnimations);
}

export async function settlePlayerAttackSequence(): Promise<void> {
  if (
    !app ||
    !battleWorld ||
    !playerSprite ||
    !playerEngagement ||
    isPlayerAttackAnimating
  ) {
    return;
  }

  const activeApp = app;
  const activeWorld = battleWorld;
  const engagement = playerEngagement;
  const motion = getPlayerAttackMotion("normal");

  isPlayerAttackAnimating = true;
  try {
    await Promise.all([
      applyCameraTransform(
        activeWorld,
        { x: 0, y: 0, scale: 1 },
        motion.recoveryMs,
      ),
      resetPlayerPosition(
        playerSprite,
        playerShadow,
        engagement.home,
        engagement.shadowHome,
        motion,
      ),
    ]);
  } finally {
    if (app === activeApp && battleWorld === activeWorld) {
      playerEngagement = null;
      playerIdleBaseY = engagement.home.y;
    }
    isPlayerAttackAnimating = false;
  }
}

function applyCameraTransform(
  world: PIXI.Container,
  transform: CameraTransform,
  durationMs: number,
): Promise<void> {
  const target = {
    x: world.x,
    y: world.y,
    scale: world.scale.x,
  };

  return tweenNumberProps(
    target,
    {
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
    },
    {
      duration: durationMs,
      ease: "outCubic",
      onRender: () => {
        world.x = target.x;
        world.y = target.y;
        world.scale.set(target.scale);
      },
    },
  );
}

async function playSlowMotionBeat(
  sprites: Array<PIXI.AnimatedSprite | null>,
  motion: CombatMotionProfile,
): Promise<void> {
  const states = sprites
    .filter((sprite): sprite is PIXI.AnimatedSprite => Boolean(sprite))
    .map((sprite) => ({
      sprite,
      animationSpeed: sprite.animationSpeed,
    }));

  for (const state of states) {
    state.sprite.animationSpeed = Math.min(
      state.sprite.animationSpeed,
      motion.slowMotionAnimationSpeed,
    );
  }

  await wait(motion.slowMotionMs);

  for (const state of states) {
    if (!state.sprite.destroyed) {
      state.sprite.animationSpeed = state.animationSpeed;
    }
  }
}

function movePlayerTowardEnemy(
  sprite: PIXI.AnimatedSprite,
  shadow: PIXI.Graphics | null,
  approach: { x: number; y: number },
  motion: CombatMotionProfile,
): Promise<void> {
  const target = {
    x: sprite.x,
    y: sprite.y,
    scaleX: sprite.scale.x,
    scaleY: sprite.scale.y,
    shadowX: shadow?.x ?? sprite.x,
    shadowY: shadow?.y ?? sprite.y + 6,
  };

  return tweenNumberProps(
    target,
    {
      x: approach.x,
      y: approach.y,
      scaleX: sprite.scale.x * 1.08,
      scaleY: sprite.scale.y * 0.98,
      shadowX: approach.x,
      shadowY: approach.y + 6,
    },
    {
      duration: motion.travelMs,
      ease: "inOutCubic",
      onRender: () => {
        sprite.x = target.x;
        sprite.y = target.y;
        sprite.scale.set(target.scaleX, target.scaleY);
        playerIdleBaseY = target.y;
        if (shadow) {
          shadow.x = target.shadowX;
          shadow.y = target.shadowY;
        }
      },
    },
  );
}

function resetPlayerPosition(
  sprite: PIXI.AnimatedSprite,
  shadow: PIXI.Graphics | null,
  playerHome: { x: number; y: number; scaleX: number; scaleY: number },
  shadowHome: { x: number; y: number } | null,
  motion: CombatMotionProfile,
): Promise<void> {
  const target = {
    x: sprite.x,
    y: sprite.y,
    scaleX: sprite.scale.x,
    scaleY: sprite.scale.y,
    shadowX: shadow?.x ?? playerHome.x,
    shadowY: shadow?.y ?? playerHome.y + 6,
  };

  return tweenNumberProps(
    target,
    {
      x: playerHome.x,
      y: playerHome.y,
      scaleX: playerHome.scaleX,
      scaleY: playerHome.scaleY,
      shadowX: shadowHome?.x ?? playerHome.x,
      shadowY: shadowHome?.y ?? playerHome.y + 6,
    },
    {
      duration: motion.recoveryMs,
      ease: "outCubic",
      onRender: () => {
        sprite.x = target.x;
        sprite.y = target.y;
        sprite.scale.set(target.scaleX, target.scaleY);
        playerIdleBaseY = target.y;
        if (shadow) {
          shadow.x = target.shadowX;
          shadow.y = target.shadowY;
        }
      },
    },
  );
}

function removeDisplayObject(object: PIXI.Container) {
  try {
    object.parent?.removeChild(object);
    object.destroy();
  } catch {
    // 無視
  }
}

function playImpactEffects({
  targetSprite,
  x,
  y,
  color,
  plan,
}: {
  targetSprite: PIXI.AnimatedSprite;
  x: number;
  y: number;
  color: number;
  plan: ImpactEffectPlan;
}) {
  if (!battleWorld) return;

  playLandingFlash(x, y, color, plan);
  playShockwave(x, y, color, plan);
  playTransparentRipple(x, y, plan);
  playSlashLines(x, y, color, plan);
  playDamageNumber(x, y, plan);
  playTextFragments(x, y, color, plan);
  playPaperFragments(x, y, plan);
  playAshParticles(x, y, plan);
  playScreenDarkFlash(plan);
  blinkSprite(targetSprite, plan);
  knockbackSprite(targetSprite, plan);
}

function playLandingFlash(
  x: number,
  y: number,
  color: number,
  plan: ImpactEffectPlan,
) {
  if (!battleWorld) return;

  const flash = new PIXI.Graphics();
  flash.circle(0, 0, plan.flash.radius);
  flash.fill({ color, alpha: plan.flash.alpha });
  flash.x = x;
  flash.y = y;
  flash.scale.set(0.28);
  battleWorld.addChild(flash);

  const target = { scale: 0.28, alpha: plan.flash.alpha };
  void tweenNumberProps(
    target,
    { scale: 1.6, alpha: 0 },
    {
      duration: plan.flash.durationMs,
      ease: "outCubic",
      onRender: () => {
        flash.scale.set(target.scale);
        flash.alpha = target.alpha;
      },
    },
  ).then(() => removeDisplayObject(flash));
}

function playShockwave(
  x: number,
  y: number,
  color: number,
  plan: ImpactEffectPlan,
) {
  if (!battleWorld) return;

  const wave = new PIXI.Graphics();
  wave.circle(0, 0, plan.shockwave.innerRadius);
  wave.stroke({ color, width: 5 });
  wave.x = x;
  wave.y = y;
  wave.alpha = plan.shockwave.alpha;
  battleWorld.addChild(wave);

  const target = {
    scale: plan.shockwave.outerRadius / plan.shockwave.innerRadius,
    alpha: 0,
  };
  const start = { scale: 1, alpha: plan.shockwave.alpha };
  void tweenNumberProps(
    start,
    target,
    {
      duration: plan.shockwave.durationMs,
      ease: "outExpo",
      onRender: () => {
        wave.scale.set(start.scale);
        wave.alpha = start.alpha;
      },
    },
  ).then(() => removeDisplayObject(wave));
}

function playTransparentRipple(x: number, y: number, plan: ImpactEffectPlan) {
  if (!battleWorld) return;

  const ripple = new PIXI.Graphics();
  ripple.circle(0, 0, plan.ripple.innerRadius);
  ripple.stroke({ color: 0xffffff, width: 2 });
  ripple.x = x;
  ripple.y = y;
  ripple.alpha = plan.ripple.alpha;
  battleWorld.addChild(ripple);

  const target = {
    scale: plan.ripple.outerRadius / plan.ripple.innerRadius,
    alpha: 0,
  };
  const start = { scale: 1, alpha: plan.ripple.alpha };
  void tweenNumberProps(
    start,
    target,
    {
      duration: plan.ripple.durationMs,
      ease: "outQuad",
      onRender: () => {
        ripple.scale.set(start.scale);
        ripple.alpha = start.alpha;
      },
    },
  ).then(() => removeDisplayObject(ripple));
}

function playSlashLines(
  x: number,
  y: number,
  color: number,
  plan: ImpactEffectPlan,
) {
  if (!battleWorld) return;

  for (let index = 0; index < plan.slashLines.count; index += 1) {
    const slash = new PIXI.Graphics();
    slash.rect(-plan.slashLines.length / 2, -2, plan.slashLines.length, 4);
    slash.fill({ color, alpha: 0.88 });
    slash.x = x + (index - 0.5) * 14;
    slash.y = y - 18 + index * 14;
    slash.rotation = -0.58 + index * 0.2;
    slash.alpha = 0.88;
    slash.scale.set(0.42, 1);
    battleWorld.addChild(slash);

    const target = { scaleX: 0.42, alpha: 0.88 };
    void tweenNumberProps(
      target,
      { scaleX: 1.25, alpha: 0 },
      {
        duration: plan.slashLines.durationMs,
        ease: "outCubic",
        onRender: () => {
          slash.scale.set(target.scaleX, 1);
          slash.alpha = target.alpha;
        },
      },
    ).then(() => removeDisplayObject(slash));
  }
}

function playDamageNumber(x: number, y: number, plan: ImpactEffectPlan) {
  if (!battleWorld) return;

  const label = new PIXI.Text({
    text: plan.damageLabel,
    style: {
      fill: 0xfff0b8,
      fontFamily: "Georgia, serif",
      fontSize: 30,
      fontWeight: "700",
      stroke: { color: 0x24140d, width: 5 },
    },
  });
  label.anchor.set(0.5);
  label.x = x;
  label.y = y - 34;
  battleWorld.addChild(label);

  const target = { y: label.y, scale: 0.8, alpha: 1 };
  void tweenNumberProps(
    target,
    { y: label.y - 64, scale: 1.18, alpha: 0 },
    {
      duration: 720,
      ease: "outCubic",
      onRender: () => {
        label.y = target.y;
        label.alpha = target.alpha;
        label.scale.set(target.scale);
      },
    },
  ).then(() => removeDisplayObject(label));
}

function playTextFragments(
  x: number,
  y: number,
  color: number,
  plan: ImpactEffectPlan,
) {
  if (!battleWorld) return;

  const glyphs = ["言", "葉", "命", "令", "if", "{}", ";", "!"];
  const offsets = buildScatterOffsets(
    plan.textFragments.count,
    plan.textFragments.radius,
  );

  offsets.forEach((offset, index) => {
    const fragment = new PIXI.Text({
      text: glyphs[index % glyphs.length],
      style: {
        fill: index % 2 === 0 ? color : 0xf9f0d0,
        fontFamily: "Georgia, serif",
        fontSize: 16,
        fontWeight: "700",
      },
    });
    fragment.anchor.set(0.5);
    fragment.x = x;
    fragment.y = y;
    fragment.alpha = 0.9;
    battleWorld?.addChild(fragment);

    const target = {
      x,
      y,
      rotation: 0,
      alpha: 0.9,
    };
    void tweenNumberProps(
      target,
      {
        x: x + offset.x,
        y: y + offset.y - 18,
        rotation: (index % 2 === 0 ? 1 : -1) * 1.4,
        alpha: 0,
      },
      {
        duration: plan.textFragments.durationMs,
        ease: "outCubic",
        onRender: () => {
          fragment.x = target.x;
          fragment.y = target.y;
          fragment.rotation = target.rotation;
          fragment.alpha = target.alpha;
        },
      },
    ).then(() => removeDisplayObject(fragment));
  });
}

function playPaperFragments(x: number, y: number, plan: ImpactEffectPlan) {
  if (!battleWorld) return;

  const offsets = buildScatterOffsets(
    plan.paperFragments.count,
    plan.paperFragments.radius,
  );

  offsets.forEach((offset, index) => {
    const paper = new PIXI.Graphics();
    paper.rect(-4, -2, 8, 4);
    paper.fill({ color: index % 2 === 0 ? 0xf4e7bf : 0xc9b88f, alpha: 0.9 });
    paper.x = x;
    paper.y = y;
    paper.rotation = index * 0.7;
    battleWorld?.addChild(paper);

    const target = { x, y, rotation: paper.rotation, alpha: 0.9 };
    void tweenNumberProps(
      target,
      {
        x: x + offset.x,
        y: y + offset.y + 18,
        rotation: paper.rotation + 2.2,
        alpha: 0,
      },
      {
        duration: plan.paperFragments.durationMs,
        ease: "outQuad",
        onRender: () => {
          paper.x = target.x;
          paper.y = target.y;
          paper.rotation = target.rotation;
          paper.alpha = target.alpha;
        },
      },
    ).then(() => removeDisplayObject(paper));
  });
}

function playAshParticles(x: number, y: number, plan: ImpactEffectPlan) {
  if (!battleWorld) return;

  const offsets = buildScatterOffsets(
    plan.ashParticles.count,
    plan.ashParticles.radius,
  );

  offsets.forEach((offset, index) => {
    const ash = new PIXI.Graphics();
    ash.circle(0, 0, 2 + (index % 3));
    ash.fill({ color: 0x111111, alpha: 0.68 });
    ash.x = x;
    ash.y = y;
    battleWorld?.addChild(ash);

    const target = { x, y, alpha: 0.68, scale: 0.65 };
    void tweenNumberProps(
      target,
      {
        x: x + offset.x * 0.78,
        y: y + offset.y * 0.78 - 28,
        alpha: 0,
        scale: 1.35,
      },
      {
        duration: plan.ashParticles.durationMs,
        ease: "outQuad",
        onRender: () => {
          ash.x = target.x;
          ash.y = target.y;
          ash.alpha = target.alpha;
          ash.scale.set(target.scale);
        },
      },
    ).then(() => removeDisplayObject(ash));
  });
}

function playScreenDarkFlash(plan: ImpactEffectPlan) {
  if (!app || !app.stage || plan.darkFlash.alpha <= 0) return;

  const flash = new PIXI.Graphics();
  flash.rect(0, 0, app.screen.width, app.screen.height);
  flash.fill({ color: 0x000000, alpha: plan.darkFlash.alpha });
  app.stage.addChild(flash);

  const target = { alpha: plan.darkFlash.alpha };
  void tweenNumberProps(
    target,
    { alpha: 0 },
    {
      duration: plan.darkFlash.durationMs,
      ease: "outQuad",
      onRender: () => {
        flash.alpha = target.alpha;
      },
    },
  ).then(() => removeDisplayObject(flash));
}

function blinkSprite(sprite: PIXI.AnimatedSprite, plan: ImpactEffectPlan) {
  const originalTint = sprite.tint;
  const totalFrames = Math.max(1, plan.enemyBlink.count * 2);
  let frame = 0;

  const tick = () => {
    if (frame >= totalFrames) {
      sprite.tint = originalTint;
      return;
    }

    sprite.tint = frame % 2 === 0 ? plan.enemyBlink.tint : originalTint;
    frame += 1;
    window.setTimeout(tick, plan.enemyBlink.durationMs / totalFrames);
  };

  tick();
}

function knockbackSprite(sprite: PIXI.AnimatedSprite, plan: ImpactEffectPlan) {
  const start = {
    x: sprite.x,
    y: sprite.y,
  };
  const impact = {
    x: sprite.x,
    y: sprite.y,
  };

  void tweenNumberProps(
    impact,
    {
      x: start.x + plan.knockback.x,
      y: start.y + plan.knockback.y,
    },
    {
      duration: plan.knockback.impactMs,
      ease: "outCubic",
      onRender: () => {
        sprite.x = impact.x;
        sprite.y = impact.y;
      },
    },
  ).then(() => {
    void tweenNumberProps(
      impact,
      start,
      {
        duration: plan.knockback.recoverMs,
        ease: "outCubic",
        onRender: () => {
          sprite.x = impact.x;
          sprite.y = impact.y;
        },
      },
    );
  });
}

function playCharacterAfterimages(
  sprite: PIXI.AnimatedSprite,
  plan: ImpactEffectPlan["afterimages"],
) {
  for (let index = 0; index < plan.count; index += 1) {
    window.setTimeout(() => {
      if (!battleWorld || !sprite.texture) return;

      const image = new PIXI.Sprite(sprite.texture);
      image.anchor.set(sprite.anchor.x, sprite.anchor.y);
      image.x = sprite.x;
      image.y = sprite.y;
      image.scale.set(sprite.scale.x, sprite.scale.y);
      image.alpha = 0.26;
      image.tint = 0xe7d7ff;
      battleWorld.addChild(image);

      const target = { alpha: image.alpha, scale: 1 };
      void tweenNumberProps(
        target,
        { alpha: 0, scale: 1.06 },
        {
          duration: plan.durationMs,
          ease: "outQuad",
          onRender: () => {
            image.alpha = target.alpha;
            image.scale.set(sprite.scale.x * target.scale, sprite.scale.y);
          },
        },
      ).then(() => removeDisplayObject(image));
    }, index * plan.spacingMs);
  }
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
      object.parent?.removeChild(object);
      object.destroy();
    } catch {
      // 無視
    }
  }
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
    if (!enemySprite || !app || !battleWorld) {
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
          battleWorld?.removeChild(enemySprite);
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
  if (!app || !battleWorld || !playerSprite || !enemySprite) {
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
    speed: motion.animationSpeed,
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

  battleWorld?.addChild(...trails, projectile);
  await animateProjectile(activeApp, projectile, trails, start, target, motion);
  removeDisplayObjects([projectile, ...trails]);

  if (app !== activeApp) {
    return;
  }

  if (isBlocked) {
    playBlockEffect(target.x, target.y, motion);
  } else {
    const impactPlan = buildImpactEffectPlan({
      motion,
      direction: playerSprite.x >= enemySprite.x ? 1 : -1,
    });

    playImpactEffects({
      targetSprite: playerSprite,
      x: target.x,
      y: target.y,
      color,
      plan: impactPlan,
    });
    void playMomentaryCharacterAnimation(
      playerSprite,
      playerAnimations,
      "damage",
      Math.max(360, motion.targetShakeMs),
      motion.animationSpeed,
    );
  }

  playImpactFlash(
    isBlocked ? 0x3b82f6 : color,
    motion.impactFlashAlpha,
  );
  shakeStage(Math.max(3, motion.impactShake * 0.25), motion.stageShakeMs);

  await wait(motion.hitStopMs);
  if (!isBlocked) {
    await playSlowMotionBeat([playerSprite, enemySprite], motion);
  }
}

// 防御成功エフェクト
function playBlockEffect(
  x: number,
  y: number,
  motion: CombatMotionProfile = getEnemyAttackMotion("normal", true),
) {
  if (!battleWorld) return;

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

  battleWorld.addChild(blockEffect);

  void animateFor(320, (progress) => {
    blockEffect.alpha = 1 - progress;
    blockEffect.scale.set(1 + progress * 0.65);
  }).then(() => {
    try {
      blockEffect.parent?.removeChild(blockEffect);
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

  battleWorld = null;
  playerSprite = null;
  enemySprite = null;
  playerShadow = null;
  enemyShadow = null;
  playerAnimations = null;
  enemyAnimations = null;
  enemyBaseScale = 1;
  idleTicker = null;
  isPlayerAttackAnimating = false;
  playerIdleBaseY = 0;
  playerEngagement = null;
}
