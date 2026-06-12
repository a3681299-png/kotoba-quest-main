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
  buildDashPlan,
  buildRadialBurstPoints,
  buildVolleyOffsets,
  easeOutCubic,
  getEnemyAttackMotion,
  getPlayerAttackMotion,
  type CombatMotionProfile,
  type DashPlan,
} from "./combatMotion";
import {
  buildCameraTransform,
  buildPlayerMeleeAttackPlan,
  type CameraTransform,
} from "./cameraMotion";
import {
  buildClashSparkPlan,
  buildDustPlan,
  buildImpactEffectPlan,
  buildScatterOffsets,
  buildSpeedLinePlan,
  type ClashSparkPlan,
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
let isEnemyAttackAnimating = false;
let isEnemyDefeated = false;
// ヒットストップ中は全スプライトを静止させる
let isStageFrozen = false;
// ノックバック中はアイドルの上下動がトゥイーンと競合しないようロックする
let playerMotionLock = false;
let enemyMotionLock = false;
let playerIdleBaseY = 0;
let playerEngagement: PlayerEngagement | null = null;
let enemyHome: { x: number; y: number } | null = null;
let enemyShadowHome: { x: number; y: number } | null = null;

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
  enemyHome = { x, y };
  enemyShadowHome = { x, y: y + 5 };
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
  if (!sprite || sprite.destroyed || !animations) return;

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
    if (isStageFrozen) return;

    const elapsed = (Date.now() - idleStartTime) / 1000;
    const playerBob = Math.sin(elapsed * 2.1) * 3;
    const enemyBob = Math.sin(elapsed * 1.8 + 0.6) * 5;
    const enemyBreath = Math.sin(elapsed * 1.8 + 0.6) * 0.025;

    if (!isPlayerAttackAnimating && !playerMotionLock) {
      playerSprite.y = playerIdleBaseY + playerBob;
    }
    if (!isEnemyAttackAnimating && !enemyMotionLock) {
      enemySprite.y = activeApp.screen.height * 0.72 + enemyBob;
      enemySprite.scale.set(
        enemyBaseScale * (1 - enemyBreath),
        enemyBaseScale * (1 + enemyBreath),
      );
    }

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
    // 一瞬の溜め（しゃがみ込み）
    await Promise.all([
      applyCameraTransform(activeWorld, plan.closeUp, motion.startupMs),
      playCasterAnticipation(playerSprite, motion),
    ]);
    if (app !== activeApp || battleWorld !== activeWorld || !playerSprite) {
      return;
    }

    // 爆発的なダッシュで間合いを詰める
    const dashPlan = buildDashPlan({
      distance: plan.approach.x - playerSprite.x,
    });
    const dashMs = Math.min(dashPlan.durationMs, motion.travelMs);
    await Promise.all([
      applyCameraTransform(activeWorld, plan.follow, dashMs),
      dashCharacter(playerSprite, playerShadow, plan.approach, dashPlan, dashMs),
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

  // 斬撃: 振り始めから接触までの短い間
  setCharacterAnimation(playerSprite, playerAnimations, "attack", {
    loop: false,
    speed: motion.animationSpeed,
  });
  await wait(Math.min(70, motion.strikeFocusMs));

  if (app !== activeApp || battleWorld !== activeWorld || !enemySprite) {
    return;
  }

  // 接触の瞬間: インパクトフレームを保持したまま全体をフリーズ
  const target = { x: enemySprite.x, y: enemySprite.y - 22 };
  spawnImpactFrame(target.x, target.y, color, motion.hitStopMs);
  await playHitStop(motion.hitStopMs);

  if (app !== activeApp || battleWorld !== activeWorld || !enemySprite) {
    return;
  }

  // 解放: エフェクト一斉放出 + ノックバック滑走
  playImpactEffects({
    targetSprite: enemySprite,
    targetShadow: enemyShadow,
    targetKind: "enemy",
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
  shakeStage(Math.max(5, motion.impactShake * 0.32), motion.stageShakeMs);

  await wait(160);
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
    // LoR風: 帰還もダッシュで素早く戻る
    const dashPlan = buildDashPlan({
      distance: engagement.home.x - playerSprite.x,
    });
    await Promise.all([
      applyCameraTransform(
        activeWorld,
        { x: 0, y: 0, scale: 1 },
        motion.recoveryMs,
      ),
      dashCharacter(
        playerSprite,
        playerShadow,
        { x: engagement.home.x, y: engagement.home.y },
        dashPlan,
        Math.min(dashPlan.durationMs, motion.recoveryMs),
      ),
    ]);
    if (playerSprite && !playerSprite.destroyed) {
      playerSprite.scale.set(engagement.home.scaleX, engagement.home.scaleY);
    }
    if (playerShadow && engagement.shadowHome) {
      playerShadow.x = engagement.shadowHome.x;
      playerShadow.y = engagement.shadowHome.y;
    }
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

// LoR風の爆発的ダッシュ: 前傾＋伸長スメア、濃い残像、スピード線を伴う
async function dashCharacter(
  sprite: PIXI.AnimatedSprite,
  shadow: PIXI.Graphics | null,
  to: { x: number; y: number },
  plan: DashPlan,
  durationMs: number,
): Promise<void> {
  const direction = Math.sign(to.x - sprite.x) || 1;
  const baseScaleX = sprite.scale.x;
  const baseScaleY = sprite.scale.y;
  const baseRotation = sprite.rotation;
  const isPlayer = sprite === playerSprite;

  spawnSpeedLines(
    { x: sprite.x, y: sprite.y - sprite.height * 0.45 },
    { x: to.x, y: to.y - sprite.height * 0.45 },
  );
  playCharacterAfterimages(sprite, {
    count: plan.afterimageCount,
    durationMs: 240,
    spacingMs: plan.afterimageSpacingMs,
  });

  sprite.rotation = direction * plan.leanRotation;
  sprite.scale.set(baseScaleX * plan.stretchX, baseScaleY * plan.squashY);

  const target = {
    x: sprite.x,
    y: sprite.y,
    shadowX: shadow?.x ?? to.x,
    shadowY: shadow?.y ?? to.y + 6,
  };

  await tweenNumberProps(
    target,
    {
      x: to.x,
      y: to.y,
      shadowX: to.x,
      shadowY: to.y + 6,
    },
    {
      duration: durationMs,
      ease: "outExpo",
      onRender: () => {
        sprite.x = target.x;
        sprite.y = target.y;
        if (isPlayer) {
          playerIdleBaseY = target.y;
        }
        if (shadow) {
          shadow.x = target.shadowX;
          shadow.y = target.shadowY;
        }
      },
    },
  );

  if (!sprite.destroyed) {
    sprite.rotation = baseRotation;
    sprite.scale.set(baseScaleX, baseScaleY);
  }
}

// ダッシュの軌跡に流れるスピード線
function spawnSpeedLines(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (!battleWorld) return;

  const plan = buildSpeedLinePlan({ distance: to.x - from.x });
  const direction = Math.sign(to.x - from.x) || 1;

  for (let index = 0; index < plan.count; index += 1) {
    const progress = (index + 0.5) / plan.count;
    const line = new PIXI.Graphics();
    line.rect(-plan.length / 2, -plan.thickness / 2, plan.length, plan.thickness);
    line.fill({ color: 0xffffff, alpha: plan.alpha });
    line.x = from.x + (to.x - from.x) * progress;
    line.y =
      from.y +
      (to.y - from.y) * progress +
      (index - (plan.count - 1) / 2) * (plan.spreadY / Math.max(1, plan.count - 1));
    battleWorld.addChild(line);

    const target = { x: line.x, alpha: plan.alpha, scaleX: 1 };
    void tweenNumberProps(
      target,
      {
        x: line.x - direction * plan.length * 0.6,
        alpha: 0,
        scaleX: 0.35,
      },
      {
        duration: plan.durationMs,
        ease: "outQuad",
        onRender: () => {
          line.x = target.x;
          line.alpha = target.alpha;
          line.scale.set(target.scaleX, 1);
        },
      },
    ).then(() => removeDisplayObject(line));
  }
}

// 全体フリーズのヒットストップ: アイドル・スプライト再生を完全静止させる
async function playHitStop(durationMs: number): Promise<void> {
  const sprites = [playerSprite, enemySprite].filter(
    (sprite): sprite is PIXI.AnimatedSprite =>
      Boolean(sprite) && !sprite!.destroyed,
  );
  const states = sprites.map((sprite) => ({
    sprite,
    wasPlaying: sprite.playing,
  }));

  isStageFrozen = true;
  for (const state of states) {
    state.sprite.stop();
  }

  await wait(durationMs);

  isStageFrozen = false;
  for (const state of states) {
    if (!state.sprite.destroyed && state.wasPlaying) {
      state.sprite.play();
    }
  }
}

// 接触の瞬間の白いインパクトフレーム。ヒットストップ中は静止保持し、解放後に弾けて消える
function spawnImpactFrame(x: number, y: number, color: number, holdMs: number) {
  if (!battleWorld) return;

  const frame = new PIXI.Container();
  frame.x = x;
  frame.y = y;

  for (const rotation of [-0.7, 0.7]) {
    const spike = new PIXI.Graphics();
    spike.rect(-72, -2.5, 144, 5);
    spike.fill({ color: 0xffffff, alpha: 0.92 });
    spike.rotation = rotation;
    frame.addChild(spike);
  }

  const core = new PIXI.Graphics();
  core.circle(0, 0, 26);
  core.fill({ color: 0xffffff, alpha: 0.95 });
  frame.addChild(core);

  const ring = new PIXI.Graphics();
  ring.circle(0, 0, 42);
  ring.stroke({ color, width: 4, alpha: 0.85 });
  frame.addChild(ring);

  battleWorld.addChild(frame);

  window.setTimeout(() => {
    const target = { alpha: 1, scale: 1 };
    void tweenNumberProps(
      target,
      { alpha: 0, scale: 1.5 },
      {
        duration: 140,
        ease: "outQuad",
        onRender: () => {
          frame.alpha = target.alpha;
          frame.scale.set(target.scale);
        },
      },
    ).then(() => removeDisplayObject(frame));
  }, holdMs);
}

// 足元から舞い上がる土埃
function spawnGroundDust(
  x: number,
  y: number,
  direction: number,
  force: number,
) {
  if (!battleWorld) return;

  const plan = buildDustPlan({ force });

  for (let index = 0; index < plan.count; index += 1) {
    const puff = new PIXI.Graphics();
    puff.circle(0, 0, 3 + (index % 3));
    puff.fill({ color: 0x9a8f78, alpha: 0.5 });
    puff.x = x;
    puff.y = y;
    battleWorld.addChild(puff);

    const spread = (index + 1) / plan.count;
    const target = { x: puff.x, y: puff.y, alpha: 0.5, scale: 0.7 };
    void tweenNumberProps(
      target,
      {
        x: x + direction * plan.radius * spread,
        y: y - plan.riseY * (0.4 + spread * 0.6),
        alpha: 0,
        scale: 1.6,
      },
      {
        duration: plan.durationMs,
        ease: "outQuad",
        onRender: () => {
          puff.x = target.x;
          puff.y = target.y;
          puff.alpha = target.alpha;
          puff.scale.set(target.scale);
        },
      },
    ).then(() => removeDisplayObject(puff));
  }
}

// クラッシュ相殺の弾かれ: 押し出されてから素早く戻る
async function pushbackCharacter(
  sprite: PIXI.AnimatedSprite,
  shadow: PIXI.Graphics | null,
  deltaX: number,
  durationMs: number,
  lock: "player" | "enemy",
): Promise<void> {
  if (lock === "player") {
    playerMotionLock = true;
  } else {
    enemyMotionLock = true;
  }

  const startX = sprite.x;
  const shadowStartX = shadow?.x ?? startX;

  try {
    const out = { x: startX, shadowX: shadowStartX };
    await tweenNumberProps(
      out,
      { x: startX + deltaX, shadowX: shadowStartX + deltaX },
      {
        duration: Math.round(durationMs * 0.35),
        ease: "outQuart",
        onRender: () => {
          sprite.x = out.x;
          if (shadow) shadow.x = out.shadowX;
        },
      },
    );
    await tweenNumberProps(
      out,
      { x: startX, shadowX: shadowStartX },
      {
        duration: Math.round(durationMs * 0.65),
        ease: "outCubic",
        onRender: () => {
          sprite.x = out.x;
          if (shadow) shadow.x = out.shadowX;
        },
      },
    );
  } finally {
    if (lock === "player") {
      playerMotionLock = false;
    } else {
      enemyMotionLock = false;
    }
  }
}

// 剣戟スパーク: X字の閃光＋放射状の火花
function playClashSparkVisual(x: number, y: number, plan: ClashSparkPlan) {
  if (!battleWorld) return;

  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  for (const rotation of [-0.66, 0.66]) {
    const slash = new PIXI.Graphics();
    slash.rect(
      -plan.crossSlashes.length / 2,
      -plan.crossSlashes.width / 2,
      plan.crossSlashes.length,
      plan.crossSlashes.width,
    );
    slash.fill({ color: 0xffffff, alpha: 0.92 });
    slash.rotation = rotation;
    container.addChild(slash);
  }

  const flash = new PIXI.Graphics();
  flash.circle(0, 0, plan.flash.radius);
  flash.fill({ color: 0xdcecff, alpha: plan.flash.alpha });
  container.addChild(flash);

  battleWorld.addChild(container);

  // フリーズ中は静止保持し、解放後に火花が飛び散る
  window.setTimeout(() => {
    const fade = { alpha: 1, scale: 1 };
    void tweenNumberProps(
      fade,
      { alpha: 0, scale: 1.35 },
      {
        duration: plan.flash.durationMs,
        ease: "outQuad",
        onRender: () => {
          container.alpha = fade.alpha;
          container.scale.set(fade.scale);
        },
      },
    ).then(() => removeDisplayObject(container));

    for (const point of buildRadialBurstPoints(plan.sparks.count, 1)) {
      const spark = new PIXI.Graphics();
      spark.rect(0, -1.5, 11, 3);
      spark.fill({ color: 0xfff3c4, alpha: 0.9 });
      spark.x = x;
      spark.y = y;
      spark.rotation = Math.atan2(point.y, point.x);
      battleWorld?.addChild(spark);

      const target = { x, y, alpha: 0.9 };
      void tweenNumberProps(
        target,
        {
          x: x + point.x * plan.sparks.radius,
          y: y + point.y * plan.sparks.radius,
          alpha: 0,
        },
        {
          duration: plan.sparks.durationMs,
          ease: "outExpo",
          onRender: () => {
            spark.x = target.x;
            spark.y = target.y;
            spark.alpha = target.alpha;
          },
        },
      ).then(() => removeDisplayObject(spark));
    }
  }, plan.freezeMs);
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
  targetShadow,
  targetKind,
  x,
  y,
  color,
  plan,
}: {
  targetSprite: PIXI.AnimatedSprite;
  targetShadow: PIXI.Graphics | null;
  targetKind: "player" | "enemy";
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
  void playKnockbackSlide(targetSprite, targetShadow, targetKind, plan);
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

  // LoR風: 被弾方向へ斜めに弾けて回転しながら消える
  const target = { x: label.x, y: label.y, rotation: 0, scale: 0.7, alpha: 1 };
  void tweenNumberProps(
    target,
    {
      x: label.x + plan.damageFlight.x,
      y: label.y + plan.damageFlight.y,
      rotation: plan.damageFlight.rotation,
      scale: 1.25,
      alpha: 0,
    },
    {
      duration: plan.damageFlight.durationMs,
      ease: "outCubic",
      onRender: () => {
        label.x = target.x;
        label.y = target.y;
        label.rotation = target.rotation;
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

// LoR風ノックバック: 大きく弾き飛ばし、土埃を上げながら滑って戻る
async function playKnockbackSlide(
  sprite: PIXI.AnimatedSprite,
  shadow: PIXI.Graphics | null,
  targetKind: "player" | "enemy",
  plan: ImpactEffectPlan,
): Promise<void> {
  if (targetKind === "player") {
    playerMotionLock = true;
  } else {
    enemyMotionLock = true;
  }

  const direction = Math.sign(plan.knockback.x) || 1;
  const start = { x: sprite.x, y: sprite.y };
  const shadowStart = { x: shadow?.x ?? start.x, y: shadow?.y ?? start.y + 6 };

  spawnGroundDust(
    start.x,
    shadowStart.y,
    direction,
    Math.abs(plan.knockback.x) / 2.4,
  );

  const impact = {
    x: start.x,
    y: start.y,
    shadowX: shadowStart.x,
  };

  // 撃破演出が始まったら吹き飛ばしに任せ、位置の書き戻しをやめる
  const shouldSkip = () =>
    sprite.destroyed || (targetKind === "enemy" && isEnemyDefeated);

  try {
    await tweenNumberProps(
      impact,
      {
        x: start.x + plan.knockback.x,
        y: start.y + plan.knockback.y,
        shadowX: shadowStart.x + plan.knockback.x,
      },
      {
        duration: plan.knockback.impactMs,
        ease: "outQuart",
        onRender: () => {
          if (shouldSkip()) return;
          sprite.x = impact.x;
          sprite.y = impact.y;
          if (shadow) shadow.x = impact.shadowX;
        },
      },
    );
    // 滑走しながら定位置へ戻る
    await tweenNumberProps(
      impact,
      { x: start.x, y: start.y, shadowX: shadowStart.x },
      {
        duration: plan.knockback.recoverMs,
        ease: "outCubic",
        onRender: () => {
          if (shouldSkip()) return;
          sprite.x = impact.x;
          sprite.y = impact.y;
          if (shadow) shadow.x = impact.shadowX;
        },
      },
    );
  } finally {
    if (targetKind === "player") {
      playerMotionLock = false;
    } else {
      enemyMotionLock = false;
    }
  }
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
      image.alpha = 0.36;
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

async function playCasterAnticipation(
  sprite: PIXI.AnimatedSprite,
  motion: CombatMotionProfile,
): Promise<void> {
  const originalX = sprite.x;
  const originalY = sprite.y;
  const originalScaleX = sprite.scale.x;
  const originalScaleY = sprite.scale.y;

  // LoR風: 突進前に深くしゃがみ込んで力を溜める
  await animateFor(motion.startupMs, (progress) => {
    const pull = Math.sin(progress * Math.PI);
    sprite.x = originalX + motion.anticipationX * pull;
    sprite.y = originalY + motion.anticipationY * pull;
    sprite.scale.set(
      originalScaleX * (1 + pull * 0.06),
      originalScaleY * (1 - pull * 0.1),
    );
  });

  sprite.x = originalX;
  sprite.y = originalY;
  sprite.scale.set(originalScaleX, originalScaleY);
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

// 敵を倒したときのアニメーション: LoR風にスローモーション + 大きな吹き飛ばし
export function playDefeatAnimation(): Promise<void> {
  return playDefeat();
}

async function playDefeat(): Promise<void> {
  if (!enemySprite || !app || !battleWorld) {
    return;
  }

  const activeApp = app;
  const sprite = enemySprite;
  const shadow = enemyShadow;
  const motion = getPlayerAttackMotion("normal");
  const direction = playerSprite && sprite.x < playerSprite.x ? -1 : 1;

  isEnemyDefeated = true;
  enemyMotionLock = true;

  // 致命打の余韻: 一瞬のスローモーション
  playImpactFlash(0xffffff, 0.26);
  await playSlowMotionBeat([playerSprite, sprite], motion);

  if (app !== activeApp || sprite.destroyed) {
    return;
  }

  spawnGroundDust(sprite.x, sprite.y + 4, direction, 26);
  shakeStage(8, 300);

  const startX = sprite.x;
  const startY = sprite.y;

  await animateFor(680, (progress, eased) => {
    if (app !== activeApp || sprite.destroyed) return;

    sprite.x = startX + direction * 130 * eased;
    sprite.y = startY - Math.sin(Math.min(progress, 1) * Math.PI) * 46;
    sprite.rotation = direction * 0.55 * eased;
    sprite.alpha = 1 - Math.pow(progress, 1.6);

    if (shadow && !shadow.destroyed) {
      shadow.alpha = 0.3 * (1 - progress);
    }
  });

  try {
    battleWorld?.removeChild(sprite);
    sprite.destroy();
  } catch {
    // 無視
  }
  enemySprite = null;
  enemyMotionLock = false;
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
  if (!app || !battleWorld || !playerSprite || !enemySprite || !enemyHome) {
    return;
  }

  const activeApp = app;
  const activeWorld = battleWorld;
  const motion = getEnemyAttackMotion(attackType, isBlocked);
  const colors: Record<typeof attackType, number> = {
    normal: 0xff6b6b,
    heavy: 0xff0000,
    multi: 0x8b5cf6,
  };
  const color = colors[attackType];
  const home = enemyHome;
  const baseTint = enemySprite.tint;

  isEnemyAttackAnimating = true;
  try {
    // テレグラフ: 大技は赤く光りながら深く溜める
    if (attackType === "heavy") {
      enemySprite.tint = 0xff8377;
    }
    await playCasterAnticipation(enemySprite, motion);
    if (app !== activeApp || !playerSprite || !enemySprite) return;
    enemySprite.tint = baseTint;

    // 突進: プレイヤーの目の前まで一気に詰める
    const dirToPlayer = playerSprite.x >= enemySprite.x ? 1 : -1;
    const approach = {
      x:
        playerSprite.x -
        dirToPlayer * Math.max(88, activeApp.screen.width * 0.12),
      y: home.y,
    };
    const dashPlan = buildDashPlan({ distance: approach.x - enemySprite.x });
    const dashMs = Math.min(dashPlan.durationMs, motion.travelMs);
    const strikeCamera = buildCameraTransform({
      focus: { x: playerSprite.x + dirToPlayer * 30, y: playerSprite.y - 40 },
      scale: 1.14,
      screenAnchor: {
        x: activeApp.screen.width * 0.5,
        y: activeApp.screen.height * 0.62,
      },
    });
    await Promise.all([
      applyCameraTransform(activeWorld, strikeCamera, dashMs),
      dashCharacter(enemySprite, enemyShadow, approach, dashPlan, dashMs),
    ]);
    if (app !== activeApp || !playerSprite || !enemySprite) return;

    // ダイスごとに1ストライクを刻む連撃リズム
    const strikeOffsets = buildVolleyOffsets(
      motion.volleyCount,
      motion.volleySpread,
    );

    for (let index = 0; index < strikeOffsets.length; index += 1) {
      setCharacterAnimation(enemySprite, enemyAnimations, "attack", {
        loop: false,
        speed: motion.animationSpeed,
      });
      await wait(Math.round(motion.strikeFocusMs * 0.8));
      if (app !== activeApp || !playerSprite || !enemySprite) return;

      if (isBlocked) {
        // 防御成功 = クラッシュ相殺: 中間点で剣戟スパーク、攻撃側が弾かれる
        const spark = buildClashSparkPlan({ force: motion.impactShake });
        const sparkPoint = {
          x: playerSprite.x - dirToPlayer * 44,
          y: playerSprite.y - 34 + strikeOffsets[index] * 0.6,
        };
        playClashSparkVisual(sparkPoint.x, sparkPoint.y, spark);
        await playHitStop(spark.freezeMs);
        if (app !== activeApp || !playerSprite || !enemySprite) return;

        void pushbackCharacter(
          enemySprite,
          enemyShadow,
          -dirToPlayer * spark.pushback.distance,
          spark.pushback.durationMs,
          "enemy",
        );
        void pushbackCharacter(
          playerSprite,
          playerShadow,
          dirToPlayer * spark.pushback.distance * 0.3,
          spark.pushback.durationMs,
          "player",
        );
        playImpactFlash(0x9fd8ff, motion.impactFlashAlpha);
        shakeStage(
          Math.max(3, motion.impactShake * 0.18),
          Math.round(motion.stageShakeMs * 0.7),
        );
      } else {
        const contact = {
          x: playerSprite.x - dirToPlayer * 16,
          y: playerSprite.y - 30 + strikeOffsets[index] * 0.6,
        };
        spawnImpactFrame(contact.x, contact.y, color, motion.hitStopMs);
        await playHitStop(motion.hitStopMs);
        if (app !== activeApp || !playerSprite || !enemySprite) return;

        const impactPlan = buildImpactEffectPlan({
          motion,
          direction: dirToPlayer,
        });
        playImpactEffects({
          targetSprite: playerSprite,
          targetShadow: playerShadow,
          targetKind: "player",
          x: contact.x,
          y: contact.y,
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
        playImpactFlash(color, motion.impactFlashAlpha);
        shakeStage(Math.max(4, motion.impactShake * 0.3), motion.stageShakeMs);
      }

      if (index < strikeOffsets.length - 1) {
        await wait(motion.volleyDelayMs);
      }
    }

    // 一拍置いて素早く定位置へ帰還
    await wait(150);
    if (app !== activeApp || !enemySprite) return;
    restoreIdleAnimation(enemySprite, enemyAnimations);

    const returnPlan = buildDashPlan({ distance: home.x - enemySprite.x });
    await Promise.all([
      applyCameraTransform(
        activeWorld,
        { x: 0, y: 0, scale: 1 },
        motion.recoveryMs,
      ),
      dashCharacter(
        enemySprite,
        enemyShadow,
        home,
        returnPlan,
        Math.min(returnPlan.durationMs, motion.recoveryMs),
      ),
    ]);
    if (enemyShadow && enemyShadowHome) {
      enemyShadow.x = enemyShadowHome.x;
      enemyShadow.y = enemyShadowHome.y;
    }
  } finally {
    isEnemyAttackAnimating = false;
    if (enemySprite && !enemySprite.destroyed) {
      enemySprite.tint = baseTint;
    }
  }
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
  isEnemyAttackAnimating = false;
  isEnemyDefeated = false;
  isStageFrozen = false;
  playerMotionLock = false;
  enemyMotionLock = false;
  playerIdleBaseY = 0;
  playerEngagement = null;
  enemyHome = null;
  enemyShadowHome = null;
}
