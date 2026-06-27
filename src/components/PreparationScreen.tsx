import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import attackCardTextureUrl from "../assets/UI/card/attack.png";
import branchCardTextureUrl from "../assets/UI/card/branch.png";
import healCardTextureUrl from "../assets/UI/card/heal.png";
import observationCardTextureUrl from "../assets/UI/card/observation.png";
import recordCardTextureUrl from "../assets/UI/card/record.png";
import tableTextureUrl from "../assets/UI/table/table.png";
import booksDecorTextureUrl from "../assets/UI/table/decor/books.png";
import candleDecorTextureUrl from "../assets/UI/table/decor/candle.png";
import {
  PREPARATION_CARD_HEIGHT,
  PREPARATION_CARD_LAYOUTS,
  PREPARATION_CARD_WIDTH,
} from "./PreparationCardLayout";
import { getPreparationSceneSetupKey } from "./PreparationScreenLifecycle";
import {
  PREPARATION_TABLE_DECOR_ITEMS,
  type PreparationTableDecorItem,
} from "./PreparationTableDecor";
import "../styles/preparation.css";

type PreparationScreenProps = {
  onStartBattle: () => void;
};

type PreparationThreeSceneProps = {
  selectedCardId: string;
  onCardSelect: (cardId: string) => void;
};

type ActionPreviewProps = {
  previewCards: SpellCard[];
  isDraftPreview: boolean;
};

type SyntaxBuilderProps = {
  preparedCards: SpellCard[];
  selectedCard: SpellCard;
  onUndo: () => void;
  onClear: () => void;
};

type SpellCard = {
  id: string;
  title: string;
  kind: string;
  command: string;
  cost: number;
  power: number;
  description: string;
  glyph: string;
  textureUrl: string;
};

type CardMeshEntry = {
  cardId: string;
  mesh: THREE.Mesh;
  baseY: number;
  baseZ: number;
  baseRotationY: number;
  baseRenderOrder: number;
};

const PREPARATION_SEQUENCE_SIZE = 4;

const SPELL_CARDS: SpellCard[] = [
  {
    id: "record",
    title: "言葉を記録",
    kind: "記録",
    command: "敵の言葉を 記録する",
    cost: 1,
    power: 1,
    description: "あとで使う情報を残す。",
    glyph: "▧",
    textureUrl: recordCardTextureUrl,
  },
  {
    id: "branch",
    title: "弱っているなら攻撃",
    kind: "分岐",
    command: "もし 敵HP が 少ない なら 攻撃する",
    cost: 2,
    power: 2,
    description: "状態を見て行動を選ぶ。",
    glyph: "Y",
    textureUrl: branchCardTextureUrl,
  },
  {
    id: "attack",
    title: "攻撃",
    kind: "攻撃",
    command: "攻撃する",
    cost: 1,
    power: 3,
    description: "正面から意味を通す。",
    glyph: "╱",
    textureUrl: attackCardTextureUrl,
  },
  {
    id: "observe",
    title: "観察",
    kind: "観察",
    command: "観察する",
    cost: 0,
    power: 1,
    description: "文脈を読む。",
    glyph: "◎",
    textureUrl: observationCardTextureUrl,
  },
  {
    id: "heal",
    title: "回復",
    kind: "回復",
    command: "回復する",
    cost: 0,
    power: 2,
    description: "順番の中に立て直しを入れる。",
    glyph: "✚",
    textureUrl: healCardTextureUrl,
  },
];
const TABLE_SLOT_LABELS = ["Ⅰ", "Ⅱ", "Ⅲ"];
const TABLE_DECOR_TEXTURE_URLS: Record<PreparationTableDecorItem["id"], string> = {
  books: booksDecorTextureUrl,
  candle: candleDecorTextureUrl,
};

export function PreparationScreen({ onStartBattle }: PreparationScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState("attack");
  const [preparedCardIds, setPreparedCardIds] = useState<string[]>([]);
  const selectedCard = getSpellCardById(selectedCardId);
  const preparedCards = preparedCardIds.map(getSpellCardById);
  const previewCards = preparedCards.length > 0 ? preparedCards : [selectedCard];
  const isDraftPreview = preparedCards.length === 0;

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setPreparedCardIds((currentCardIds) => {
      const nextCardIds = [...currentCardIds, cardId];
      return nextCardIds.slice(-PREPARATION_SEQUENCE_SIZE);
    });
  }, []);

  const handleUndoSequence = () => {
    setPreparedCardIds((currentCardIds) => currentCardIds.slice(0, -1));
  };

  const handleClearSequence = () => {
    setPreparedCardIds([]);
  };

  return (
    <main className="preparation-screen">
      <section className="preparation-stage" aria-label="準備フェーズの3Dテーブル">
        <PreparationThreeScene
          selectedCardId={selectedCardId}
          onCardSelect={handleCardSelect}
        />

        <header className="preparation-overlay preparation-header">
          <div>
            <p className="phase-label">PREPARATION PHASE</p>
            <h1>カードを選んで準備する</h1>
          </div>
          <button
            className="start-battle-button"
            type="button"
            onClick={onStartBattle}
          >
            バトルへ進む
          </button>
        </header>

        <ActionPreview previewCards={previewCards} isDraftPreview={isDraftPreview} />

        <SyntaxBuilder
          preparedCards={preparedCards}
          selectedCard={selectedCard}
          onUndo={handleUndoSequence}
          onClear={handleClearSequence}
        />

        <aside className="preparation-overlay selected-card-panel" aria-live="polite">
          <span className="selected-card-label">選択中</span>
          <div className="selected-card-title-row">
            <span
              className={`selected-card-glyph is-${selectedCard.id}`}
              aria-hidden="true"
            >
              {selectedCard.glyph}
            </span>
            <strong>{selectedCard.title}</strong>
          </div>
          <code>{selectedCard.command}</code>
          <p>{selectedCard.description}</p>
        </aside>
      </section>
    </main>
  );
}

function ActionPreview({ previewCards, isDraftPreview }: ActionPreviewProps) {
  const hasCard = (cardId: string) => previewCards.some((card) => card.id === cardId);
  const hasRecord = hasCard("record");
  const hasBranch = hasCard("branch");
  const hasAttack = hasCard("attack");
  const hasObserve = hasCard("observe");
  const hasHeal = hasCard("heal");
  const previewGlyph = previewCards[0]?.glyph ?? "•";
  const previewClassName = [
    "preparation-overlay",
    "action-preview",
    isDraftPreview ? "is-draft-preview" : "",
    hasRecord ? "has-record" : "",
    hasBranch ? "has-branch" : "",
    hasAttack ? "has-attack" : "",
    hasObserve ? "has-observe" : "",
    hasHeal ? "has-heal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={previewClassName} aria-label="行動プレビュー">
      <div className="preview-board" aria-hidden="true">
        <svg className="preview-lines" viewBox="0 0 600 180" preserveAspectRatio="none">
          <defs>
            <marker
              id="preview-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M1 1 L9 5 L1 9 Z" />
            </marker>
            <marker
              id="preview-arrow-soft"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M1 1 L9 5 L1 9 Z" />
            </marker>
          </defs>

          {hasObserve && <circle className="preview-scan-ring" cx="432" cy="82" r="44" />}
          {hasRecord && (
            <path
              className="preview-path preview-record-path"
              d="M435 86 C355 36 270 38 198 82"
              markerEnd="url(#preview-arrow-soft)"
            />
          )}
          {hasBranch && (
            <>
              <path
                className="preview-path preview-branch-path"
                d="M300 90 C338 58 367 56 402 62"
              />
              <path
                className="preview-path preview-branch-path is-lower"
                d="M300 90 C340 116 374 122 412 112"
              />
            </>
          )}
          {hasAttack && (
            <path
              className="preview-path preview-attack-path"
              d="M302 88 C348 54 404 42 480 61"
              markerEnd="url(#preview-arrow)"
            />
          )}
          {hasHeal && (
            <path
              className="preview-path preview-heal-path"
              d="M298 96 C246 126 188 128 118 106"
              markerEnd="url(#preview-arrow-soft)"
            />
          )}
        </svg>

        <div className={`preview-note ${hasRecord ? "is-visible" : ""}`}>▧</div>
        <div className={`preview-hub ${hasBranch ? "is-split" : ""}`}>
          <span>{hasBranch ? "Y" : previewGlyph}</span>
        </div>

        <div className={`preview-unit ally-unit ally-one ${hasHeal ? "is-targeted" : ""}`} />
        <div className="preview-unit ally-unit ally-two" />
        <div className="preview-unit ally-unit ally-three" />
        <div className={`preview-unit enemy-unit enemy-one ${hasAttack ? "is-targeted" : ""}`} />
        <div className={`preview-unit enemy-unit enemy-two ${hasObserve ? "is-scanned" : ""}`} />
        <div className="preview-unit enemy-unit enemy-three" />
      </div>
    </div>
  );
}

function SyntaxBuilder({
  preparedCards,
  selectedCard,
  onUndo,
  onClear,
}: SyntaxBuilderProps) {
  const slots = Array.from(
    { length: PREPARATION_SEQUENCE_SIZE },
    (_, index) => preparedCards[index] ?? null,
  );
  const nextSlotIndex = Math.min(preparedCards.length, PREPARATION_SEQUENCE_SIZE - 1);
  const hasPreparedCards = preparedCards.length > 0;

  return (
    <nav className="preparation-overlay syntax-builder" aria-label="構文スロット">
      <ol className="syntax-track">
        {slots.map((card, index) => {
          const slotClassName = [
            "syntax-slot",
            card ? "is-filled" : "is-empty",
            card ? `is-${card.id}` : "",
            !card && index === nextSlotIndex ? "is-next" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const connectorClassName = [
            "syntax-connector",
            card?.id === "branch" ? "is-branch" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li className="syntax-step" key={`syntax-slot-${index}`}>
              <div
                className={slotClassName}
                aria-label={card ? `${index + 1}: ${card.title}` : `${index + 1}: 空き`}
              >
                <span className={card ? "syntax-glyph" : "syntax-ghost-glyph"}>
                  {card?.glyph ?? (index === nextSlotIndex ? selectedCard.glyph : "·")}
                </span>
              </div>
              {index < slots.length - 1 && (
                <span className={connectorClassName} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="syntax-controls">
        <button
          className="syntax-control-button"
          type="button"
          onClick={onUndo}
          disabled={!hasPreparedCards}
          aria-label="最後のカードを戻す"
        >
          <span aria-hidden="true">↶</span>
        </button>
        <button
          className="syntax-control-button"
          type="button"
          onClick={onClear}
          disabled={!hasPreparedCards}
          aria-label="構文を消す"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </nav>
  );
}

function PreparationThreeScene({
  selectedCardId,
  onCardSelect,
}: PreparationThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedCardIdRef = useRef(selectedCardId);
  const sceneSetupKey = getPreparationSceneSetupKey({
    selectedCardId,
    onCardSelect,
  });

  useEffect(() => {
    selectedCardIdRef.current = selectedCardId;
  }, [selectedCardId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090604);
    scene.fog = new THREE.Fog(0x090604, 4.2, 9);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.45, 4.45);
    camera.lookAt(0, 0.72, 0.22);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x090604, 1);

    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const cardMeshes: THREE.Object3D[] = [];
    const cardEntries: CardMeshEntry[] = [];

    const ambientLight = new THREE.HemisphereLight(0xffd9a6, 0x120705, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.SpotLight(0xffb36a, 12, 8, Math.PI / 4.6, 0.55, 1.05);
    keyLight.position.set(-1.5, 3.2, 3.1);
    keyLight.target.position.set(0, 0.55, 0.35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight, keyLight.target);

    const rimLight = new THREE.PointLight(0xf1a257, 3.6, 5);
    rimLight.position.set(2.2, 1.8, 1.8);
    scene.add(rimLight);

    const textureLoader = new THREE.TextureLoader();

    const tableTexture = loadSceneTexture(textureLoader, tableTextureUrl, textures);
    const tableGeometry = new THREE.PlaneGeometry(8.8, 5.85, 1, 1);
    geometries.push(tableGeometry);
    const tableMaterial = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.96,
      metalness: 0,
    });
    materials.push(tableMaterial);
    const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.set(0, 0, -0.1);
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    addTableDecor(scene, textureLoader, textures, materials, geometries);
    addTableCards(scene, textures, materials, geometries);
    addStandingCards(
      scene,
      textureLoader,
      textures,
      materials,
      geometries,
      cardMeshes,
      cardEntries,
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const getPointedCardId = (event: PointerEvent) => {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cardMeshes, false);
      const cardId = hits[0]?.object.userData.cardId;
      return typeof cardId === "string" ? cardId : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      canvas.style.cursor = getPointedCardId(event) ? "pointer" : "default";
    };

    const handlePointerDown = (event: PointerEvent) => {
      const cardId = getPointedCardId(event);
      if (cardId) {
        onCardSelect(cardId);
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const width = Math.max(parent?.clientWidth ?? canvas.clientWidth, 320);
      const height = Math.max(parent?.clientHeight ?? canvas.clientHeight, 240);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
    };

    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const time = clock.getElapsedTime();

      cardEntries.forEach((entry, index) => {
        const isSelected = entry.cardId === selectedCardIdRef.current;
        const selectedLift = isSelected ? 0.17 : 0;
        const selectedForward = isSelected ? 0.08 : 0;
        const breath = Math.sin(time * 1.2 + index * 0.8) * 0.008;
        const scale = isSelected ? 1.065 : 1;

        entry.mesh.position.y = entry.baseY + selectedLift + breath;
        entry.mesh.position.z = entry.baseZ + selectedForward;
        entry.mesh.rotation.y = entry.baseRotationY + Math.sin(time * 0.8 + index) * 0.012;
        entry.mesh.renderOrder = isSelected ? 20 : entry.baseRenderOrder;
        entry.mesh.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    };
  }, [onCardSelect, sceneSetupKey]);

  return <canvas ref={canvasRef} className="preparation-three-canvas" />;
}

function addStandingCards(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
  textures: THREE.Texture[],
  materials: THREE.Material[],
  geometries: THREE.BufferGeometry[],
  cardMeshes: THREE.Object3D[],
  cardEntries: CardMeshEntry[],
) {
  const cardGeometry = new THREE.PlaneGeometry(
    PREPARATION_CARD_WIDTH,
    PREPARATION_CARD_HEIGHT,
    4,
    4,
  );
  geometries.push(cardGeometry);

  SPELL_CARDS.forEach((card) => {
    const layout = PREPARATION_CARD_LAYOUTS[card.id];
    const texture = loadSceneTexture(textureLoader, card.textureUrl, textures);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.78,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.03,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(cardGeometry, material);
    mesh.position.set(layout.x, layout.y, layout.z);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(-4),
      THREE.MathUtils.degToRad(layout.rotationY),
      THREE.MathUtils.degToRad(layout.rotationZ),
    );
    mesh.castShadow = true;
    mesh.renderOrder = layout.zIndex;
    mesh.userData.cardId = card.id;

    cardMeshes.push(mesh);
    cardEntries.push({
      cardId: card.id,
      mesh,
      baseY: layout.y,
      baseZ: layout.z,
      baseRotationY: mesh.rotation.y,
      baseRenderOrder: layout.zIndex,
    });
    scene.add(mesh);
  });
}

function addTableDecor(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
  textures: THREE.Texture[],
  materials: THREE.Material[],
  geometries: THREE.BufferGeometry[],
) {
  PREPARATION_TABLE_DECOR_ITEMS.forEach((decorItem) => {
    const texture = loadSceneTexture(
      textureLoader,
      TABLE_DECOR_TEXTURE_URLS[decorItem.id],
      textures,
    );
    const geometry = new THREE.PlaneGeometry(
      decorItem.width,
      decorItem.height,
      1,
      1,
    );
    geometries.push(geometry);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.86,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.04,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(decorItem.x, decorItem.y, decorItem.z);
    mesh.rotation.set(
      -Math.PI / 2,
      0,
      THREE.MathUtils.degToRad(decorItem.rotationZ),
    );
    mesh.renderOrder = decorItem.renderOrder;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    if (decorItem.glow) {
      const candleGlow = new THREE.PointLight(
        0xffb56d,
        decorItem.glow.intensity,
        decorItem.glow.distance,
        1.7,
      );
      candleGlow.position.set(decorItem.x, 0.36, decorItem.z + 0.04);
      scene.add(candleGlow);
    }
  });
}
function addTableCards(
  scene: THREE.Scene,
  textures: THREE.Texture[],
  materials: THREE.Material[],
  geometries: THREE.BufferGeometry[],
) {
  const tableCardGeometry = new THREE.PlaneGeometry(0.76, 1.08, 2, 2);
  geometries.push(tableCardGeometry);

  const deckTexture = createTableCardTexture("山札", true);
  textures.push(deckTexture);

  for (let index = 0; index < 3; index += 1) {
    const deckMaterial = new THREE.MeshStandardMaterial({
      map: deckTexture,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.03,
    });
    materials.push(deckMaterial);

    const deckMesh = new THREE.Mesh(tableCardGeometry, deckMaterial);
    deckMesh.position.set(-2.5 + index * 0.025, 0.028 + index * 0.006, -0.96 - index * 0.018);
    deckMesh.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.degToRad(-7 + index * 2));
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;
    scene.add(deckMesh);
  }

  TABLE_SLOT_LABELS.forEach((label, index) => {
    const texture = createTableCardTexture(label, false);
    textures.push(texture);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(tableCardGeometry, material);
    mesh.position.set(-0.82 + index * 0.82, 0.032, -0.85);
    mesh.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.degToRad(3 - index * 2));
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

function loadSceneTexture(
  textureLoader: THREE.TextureLoader,
  textureUrl: string,
  textures: THREE.Texture[],
) {
  const texture = textureLoader.load(textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textures.push(texture);
  return texture;
}
function createTableCardTexture(label: string, isDeck: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 512;
  const context = getContext2d(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawRoundedRect(context, 14, 14, 332, 484, 22);
  context.fillStyle = isDeck ? "#6b3b22" : "rgba(201, 137, 68, 0.16)";
  context.fill();
  context.lineWidth = isDeck ? 12 : 8;
  context.strokeStyle = isDeck ? "#241006" : "rgba(232, 176, 94, 0.48)";
  context.stroke();

  if (isDeck) {
    context.strokeStyle = "rgba(255, 219, 154, 0.2)";
    context.lineWidth = 5;
    for (let index = 0; index < 12; index += 1) {
      context.beginPath();
      context.moveTo(40 + index * 30, 46);
      context.lineTo(-80 + index * 30, 466);
      context.stroke();
    }
  }

  context.font = "900 42px 'Noto Sans JP', sans-serif";
  context.textAlign = "center";
  context.fillStyle = isDeck ? "#f0d49a" : "rgba(240, 196, 130, 0.58)";
  context.fillText(label, 180, 270);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.quadraticCurveTo(right, y, right, y + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(x + radius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function getContext2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }
  return context;
}

function getSpellCardById(cardId: string) {
  return SPELL_CARDS.find((card) => card.id === cardId) ?? SPELL_CARDS[0];
}
