import { useEffect, useRef, useState } from "react";
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

type SpellCard = {
  id: string;
  title: string;
  kind: string;
  command: string;
  cost: number;
  power: number;
  description: string;
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

const SPELL_CARDS: SpellCard[] = [
  {
    id: "record",
    title: "言葉を記録",
    kind: "記録",
    command: "敵の言葉を 記録する",
    cost: 1,
    power: 1,
    description: "あとで使う情報を残す。",
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
    textureUrl: healCardTextureUrl,
  },
];
const TABLE_SLOT_LABELS = ["準備 1", "準備 2", "準備 3"];
const TABLE_DECOR_TEXTURE_URLS: Record<PreparationTableDecorItem["id"], string> = {
  books: booksDecorTextureUrl,
  candle: candleDecorTextureUrl,
};

export function PreparationScreen({ onStartBattle }: PreparationScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState("attack");
  const selectedCard =
    SPELL_CARDS.find((card) => card.id === selectedCardId) ?? SPELL_CARDS[0];

  return (
    <main className="preparation-screen">
      <section className="preparation-stage" aria-label="準備フェーズの3Dテーブル">
        <PreparationThreeScene
          selectedCardId={selectedCardId}
          onCardSelect={setSelectedCardId}
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

        <aside className="preparation-overlay selected-card-panel" aria-live="polite">
          <span className="selected-card-label">選択中</span>
          <strong>{selectedCard.title}</strong>
          <code>{selectedCard.command}</code>
          <p>{selectedCard.description}</p>
        </aside>
      </section>
    </main>
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
