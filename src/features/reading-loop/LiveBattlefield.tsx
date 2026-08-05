import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as PIXI from "pixi.js";
import stageBackdropUrl from "../../assets/backgrounds/チュートリアル/background.png";
import {
  ENEMY_SHEETS,
  PLAYER_SHEETS,
  type SpriteSheetDefinition,
} from "../../game/characterAssets";

export interface BattlefieldHomeLayout {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  playerScale: number;
  enemyX: number;
  enemyY: number;
  enemyScale: number;
}

export interface BattlefieldMotionTargets {
  app: PIXI.Application;
  world: PIXI.Container;
  player: PIXI.Sprite;
  playerAfterimage: PIXI.Sprite;
  playerShadow: PIXI.Graphics;
  enemy: PIXI.AnimatedSprite;
  enemyShadow: PIXI.Graphics;
  enemyOmen: PIXI.Container;
  shield: PIXI.Graphics;
  slash: PIXI.Graphics;
  impact: PIXI.Graphics;
  dust: PIXI.Container;
  home: BattlefieldHomeLayout;
}

export interface LiveBattlefieldHandle {
  getTargets: () => BattlefieldMotionTargets | null;
  reset: () => void;
}

interface LiveBattlefieldProps {
  label: string;
  debugStatic?: boolean;
  immersive?: boolean;
  commandStage?: boolean;
  onReady?: (targets: BattlefieldMotionTargets | null) => void;
}

function createFrames(
  texture: PIXI.Texture,
  definition: SpriteSheetDefinition,
): PIXI.Texture[] {
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

function createShadow(width: number): PIXI.Graphics {
  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 0, width, Math.max(8, width * 0.19));
  shadow.fill({ color: 0x050305, alpha: 0.48 });
  return shadow;
}

function createEnemyOmen(): PIXI.Container {
  const omen = new PIXI.Container();
  const ring = new PIXI.Graphics();
  ring.circle(0, 0, 42);
  ring.stroke({ color: 0xf34b3f, width: 3, alpha: 0.82 });
  omen.addChild(ring);

  for (const offset of [-14, 0, 14]) {
    const seam = new PIXI.Graphics();
    seam.moveTo(-30, offset + 8);
    seam.bezierCurveTo(-12, offset - 5, 12, offset + 5, 30, offset - 8);
    seam.stroke({ color: 0xff6757, width: 3, alpha: 0.9 });
    omen.addChild(seam);
  }

  omen.alpha = 0;
  return omen;
}

function createShield(): PIXI.Graphics {
  const shield = new PIXI.Graphics();
  shield.ellipse(0, 0, 54, 72);
  shield.fill({ color: 0x95d9ef, alpha: 0.13 });
  shield.stroke({ color: 0xc4efff, width: 4, alpha: 0.88 });
  shield.alpha = 0;
  return shield;
}

function createSlash(): PIXI.Graphics {
  const slash = new PIXI.Graphics();
  slash.moveTo(-58, 34);
  slash.bezierCurveTo(-18, -34, 20, -46, 64, -22);
  slash.stroke({ color: 0xffe6a2, width: 6, alpha: 0.94 });
  slash.alpha = 0;
  return slash;
}

function createImpact(): PIXI.Graphics {
  const impact = new PIXI.Graphics();
  impact.circle(0, 0, 18);
  impact.fill({ color: 0xfff2bc, alpha: 0.82 });
  impact.circle(0, 0, 42);
  impact.stroke({ color: 0xe35645, width: 4, alpha: 0.75 });
  impact.alpha = 0;
  return impact;
}

function createDust(): PIXI.Container {
  const dust = new PIXI.Container();
  [-34, -12, 13, 36].forEach((x, index) => {
    const mote = new PIXI.Graphics();
    mote.circle(x, index % 2 === 0 ? 0 : -8, 7 + index * 1.5);
    mote.fill({ color: 0xc7a875, alpha: 0.34 });
    dust.addChild(mote);
  });
  dust.alpha = 0;
  return dust;
}

// The bright stone surface crosses y=820 in the 1920x1080 stage artwork.
const COMMAND_STAGE_FLOOR_SOURCE_Y_RATIO = 820 / 1080;
const COMMAND_STAGE_FLOOR_BOTTOM_INSET = 10;
// Use the visible soles, not each PNG's transparent bottom edge, as its origin.
const PLAYER_COMMAND_STAGE_FOOT_ANCHOR_Y = 1335 / 1536;
const ENEMY_COMMAND_STAGE_FOOT_ANCHOR_Y = 1479 / 1536;

function getCommandStageFloorPlacement(
  texture: PIXI.Texture,
  width: number,
  height: number,
) {
  const scale = Math.max(width / texture.width, height / texture.height);
  const scaledHeight = texture.height * scale;
  const overflowY = Math.max(0, scaledHeight - height);
  const uncroppedFloorY =
    texture.height * COMMAND_STAGE_FLOOR_SOURCE_Y_RATIO * scale;
  const preferredFloorY = height - COMMAND_STAGE_FLOOR_BOTTOM_INSET;
  const verticalAnchor =
    overflowY > 0
      ? Math.min(
          1,
          Math.max(0, (uncroppedFloorY - preferredFloorY) / overflowY),
        )
      : 0.5;

  return {
    floorY: uncroppedFloorY - overflowY * verticalAnchor,
    verticalAnchor,
  };
}

function fitCover(
  sprite: PIXI.Sprite,
  width: number,
  height: number,
  verticalAnchor = 0.5,
) {
  const scale = Math.max(
    width / sprite.texture.width,
    height / sprite.texture.height,
  );
  const scaledHeight = sprite.texture.height * scale;
  const overflowY = Math.max(0, scaledHeight - height);
  sprite.anchor.set(0.5);
  sprite.position.set(
    width / 2,
    scaledHeight / 2 - overflowY * verticalAnchor,
  );
  sprite.scale.set(scale);
}

// Motion setup and component cleanup must share the same reset contract.
// eslint-disable-next-line react-refresh/only-export-components
export function resetBattlefieldTargets(targets: BattlefieldMotionTargets) {
  if (
    targets.world.destroyed ||
    targets.player.destroyed ||
    targets.enemy.destroyed
  ) {
    return;
  }

  const { home } = targets;

  targets.world.position.set(0, 0);
  targets.world.rotation = 0;
  targets.player.position.set(home.playerX, home.playerY);
  targets.player.scale.set(home.playerScale);
  targets.player.rotation = 0;
  targets.player.alpha = 1;
  targets.player.tint = 0xffffff;
  targets.playerAfterimage.position.set(home.playerX, home.playerY);
  targets.playerAfterimage.scale.set(home.playerScale);
  targets.playerAfterimage.rotation = 0;
  targets.playerAfterimage.alpha = 0;
  targets.playerShadow.position.set(home.playerX, home.playerY + 7);
  targets.playerShadow.scale.set(1);
  targets.playerShadow.alpha = 0.48;
  targets.enemy.position.set(home.enemyX, home.enemyY);
  targets.enemy.scale.set(home.enemyScale);
  targets.enemy.rotation = 0;
  targets.enemy.alpha = 1;
  targets.enemy.tint = 0xffffff;
  targets.enemyShadow.position.set(home.enemyX, home.enemyY + 6);
  targets.enemyShadow.scale.set(1);
  targets.enemyShadow.alpha = 0.52;
  targets.enemyOmen.position.set(home.enemyX - 7, home.enemyY - 122);
  targets.enemyOmen.scale.set(1);
  targets.enemyOmen.alpha = 0;
  targets.shield.position.set(home.playerX + 48, home.playerY - 102);
  targets.shield.scale.set(1);
  targets.shield.alpha = 0;
  targets.slash.position.set(home.playerX + 78, home.playerY - 112);
  targets.slash.scale.set(1);
  targets.slash.rotation = 0;
  targets.slash.alpha = 0;
  targets.impact.position.set((home.playerX + home.enemyX) / 2, home.playerY - 88);
  targets.impact.scale.set(0.5);
  targets.impact.alpha = 0;
  targets.dust.position.set(home.enemyX - 30, home.enemyY - 8);
  targets.dust.scale.set(1);
  targets.dust.alpha = 0;
}

export const LiveBattlefield = forwardRef<
  LiveBattlefieldHandle,
  LiveBattlefieldProps
>(function LiveBattlefield(
  {
    label,
    debugStatic = false,
    immersive = false,
    commandStage = false,
    onReady,
  },
  forwardedRef,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<BattlefieldMotionTargets | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      getTargets: () => targetsRef.current,
      reset: () => {
        if (targetsRef.current) resetBattlefieldTargets(targetsRef.current);
      },
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app: PIXI.Application | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initialize = async () => {
      const nextApp = new PIXI.Application();
      app = nextApp;
      await nextApp.init({
        background: 0x171315,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        resizeTo: host,
      });

      if (disposed) {
        nextApp.destroy(true, { children: true });
        return;
      }

      nextApp.canvas.className = "reading-live-battlefield__canvas";
      nextApp.canvas.setAttribute("aria-hidden", "true");
      host.appendChild(nextApp.canvas);

      const [stageTexture, playerTexture, enemyTexture] = await Promise.all([
        PIXI.Assets.load<PIXI.Texture>(stageBackdropUrl),
        PIXI.Assets.load<PIXI.Texture>(PLAYER_SHEETS.idle.src),
        PIXI.Assets.load<PIXI.Texture>(ENEMY_SHEETS.idle.src),
      ]);

      if (disposed) return;

      const world = new PIXI.Container();
      nextApp.stage.addChild(world);

      const stageBackdrop = new PIXI.Sprite(stageTexture);
      world.addChild(stageBackdrop);

      const playerShadow = createShadow(64);
      const enemyShadow = createShadow(78);
      const playerAfterimage = new PIXI.Sprite(playerTexture);
      playerAfterimage.anchor.set(
        0.5,
        commandStage ? PLAYER_COMMAND_STAGE_FOOT_ANCHOR_Y : 1,
      );
      playerAfterimage.tint = 0xf5d58c;
      const player = new PIXI.Sprite(playerTexture);
      player.anchor.set(
        0.5,
        commandStage ? PLAYER_COMMAND_STAGE_FOOT_ANCHOR_Y : 1,
      );

      const enemyFrames = createFrames(enemyTexture, ENEMY_SHEETS.idle);
      const enemy = new PIXI.AnimatedSprite(enemyFrames);
      enemy.anchor.set(
        0.5,
        commandStage ? ENEMY_COMMAND_STAGE_FOOT_ANCHOR_Y : 1,
      );
      enemy.loop = true;
      enemy.animationSpeed = debugStatic ? 0 : 0.16;
      if (debugStatic) enemy.gotoAndStop(0);
      else enemy.play();

      const enemyOmen = createEnemyOmen();
      const shield = createShield();
      const slash = createSlash();
      const impact = createImpact();
      const dust = createDust();
      world.addChild(
        playerShadow,
        enemyShadow,
        playerAfterimage,
        player,
        enemy,
        enemyOmen,
        shield,
        slash,
        impact,
        dust,
      );

      const targets: BattlefieldMotionTargets = {
        app: nextApp,
        world,
        player,
        playerAfterimage,
        playerShadow,
        enemy,
        enemyShadow,
        enemyOmen,
        shield,
        slash,
        impact,
        dust,
        home: {
          width: 0,
          height: 0,
          playerX: 0,
          playerY: 0,
          playerScale: 1,
          enemyX: 0,
          enemyY: 0,
          enemyScale: 1,
        },
      };

      const layout = () => {
        const width = nextApp.screen.width;
        const height = nextApp.screen.height;
        const commandStageFloor = commandStage
          ? getCommandStageFloorPlacement(stageTexture, width, height)
          : null;
        fitCover(
          stageBackdrop,
          width,
          height,
          commandStageFloor?.verticalAnchor ?? 0.5,
        );

        const playerHeightRatio = immersive ? 0.27 : commandStage ? 0.48 : 0.42;
        const enemyHeightRatio = immersive ? 0.32 : commandStage ? 0.74 : 0.49;
        const playerTargetScale = commandStage ? 1.3 : 1;
        const enemyTargetScale = commandStage ? 2.4 : 1;
        const isNarrowImmersive = immersive && width < 1180;
        const isMobileImmersive = immersive && width <= 760;
        const characterFloor = isMobileImmersive
          ? height * 0.8
          : immersive
            ? height * 0.56
            : commandStageFloor?.floorY ?? height * 0.82;
        const playerScale = Math.min(
          height * playerHeightRatio,
          PLAYER_SHEETS.targetHeight * playerTargetScale,
        ) /
          Math.max(1, playerTexture.height);
        const enemyFrameHeight = enemyFrames[0]?.height ?? enemyTexture.height;
        const enemyScale = Math.min(
          height * enemyHeightRatio,
          ENEMY_SHEETS.targetHeight * enemyTargetScale,
        ) /
          Math.max(1, enemyFrameHeight);
        targets.home = {
          width,
          height,
          playerX: width * (isNarrowImmersive ? 0.3 : commandStage ? 0.34 : 0.24),
          playerY: characterFloor,
          playerScale,
          enemyX: width * (isNarrowImmersive ? 0.7 : commandStage ? 0.78 : 0.76),
          enemyY: characterFloor,
          enemyScale,
        };
        resetBattlefieldTargets(targets);
      };

      layout();
      resizeObserver = new ResizeObserver(layout);
      resizeObserver.observe(host);
      targetsRef.current = targets;
      onReady?.(targets);
    };

    void initialize().catch((error) => {
      console.error("読解戦場の初期化に失敗:", error);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      onReady?.(null);
      targetsRef.current = null;
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // 破棄済みなら何もしない。
        }
      }
    };
  }, [commandStage, debugStatic, immersive, onReady]);

  return (
    <figure
      className="reading-live-battlefield"
      data-motion-id="battlefield"
      aria-label={label}
    >
      <div ref={hostRef} className="reading-live-battlefield__host" />
      <span
        className="reading-loop__sr-only"
        data-motion-id="enemy-sprite"
        aria-hidden="true"
      />
      <span
        className="reading-loop__sr-only"
        data-motion-id="enemy-omen"
        aria-hidden="true"
      />
      <span
        className="reading-loop__sr-only"
        data-motion-id="player-sprite"
        aria-hidden="true"
      />
      <span
        className="reading-loop__sr-only"
        data-motion-id="player-afterimage"
        aria-hidden="true"
      />
      <span
        className="reading-loop__sr-only"
        data-motion-id="impact-flash"
        aria-hidden="true"
      />
      <figcaption className="reading-loop__sr-only">{label}</figcaption>
    </figure>
  );
});
