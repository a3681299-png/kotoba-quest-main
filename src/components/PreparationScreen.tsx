import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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
  icon: string;
  description: string;
};

type CardLayout = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  rotationZ: number;
  zIndex: number;
};

type CardMeshEntry = {
  cardId: string;
  mesh: THREE.Mesh;
  baseY: number;
  baseZ: number;
  baseRotationY: number;
};

const SPELL_CARDS: SpellCard[] = [
  {
    id: "guard",
    title: "守りの構え",
    kind: "防御",
    command: "防御()",
    cost: 0,
    power: 1,
    icon: "🛡️",
    description: "次の攻撃に備えて、受けるダメージを軽くする。",
  },
  {
    id: "fire",
    title: "火のことば",
    kind: "攻撃",
    command: "攻撃(\"ファイア\")",
    cost: 1,
    power: 3,
    icon: "🔥",
    description: "正面の敵に、まっすぐ火の魔法を放つ。",
  },
  {
    id: "loop",
    title: "くり返しの印",
    kind: "連続",
    command: "繰り返す(3)",
    cost: 2,
    power: 2,
    icon: "🔁",
    description: "同じ行動をまとめて実行する準備カード。",
  },
  {
    id: "heal",
    title: "回復の光",
    kind: "回復",
    command: "回復()",
    cost: 1,
    power: 2,
    icon: "✨",
    description: "傷ついたときに、少しだけ体力を戻す。",
  },
];

const CARD_LAYOUTS: Record<string, CardLayout> = {
  guard: {
    x: -1.02,
    y: 0.91,
    z: 1.08,
    rotationY: -13,
    rotationZ: 9,
    zIndex: 1,
  },
  fire: {
    x: -0.34,
    y: 0.98,
    z: 1.2,
    rotationY: -5,
    rotationZ: 2,
    zIndex: 4,
  },
  loop: {
    x: 0.29,
    y: 0.94,
    z: 1.12,
    rotationY: 6,
    rotationZ: -5,
    zIndex: 3,
  },
  heal: {
    x: 0.91,
    y: 0.88,
    z: 1,
    rotationY: 14,
    rotationZ: -12,
    zIndex: 2,
  },
};

const TABLE_SLOT_LABELS = ["準備 1", "準備 2", "準備 3"];
const CARD_WIDTH = 0.92;
const CARD_HEIGHT = 1.34;

export function PreparationScreen({ onStartBattle }: PreparationScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState(SPELL_CARDS[1].id);
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

    const tableTexture = createWoodTexture();
    textures.push(tableTexture);
    const tableGeometry = new THREE.PlaneGeometry(8.5, 6.4, 16, 16);
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

    addTableCards(scene, textures, materials, geometries);
    addStandingCards(
      scene,
      textures,
      materials,
      geometries,
      cardMeshes,
      cardEntries,
      selectedCardId,
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
        const isSelected = entry.cardId === selectedCardId;
        const selectedLift = isSelected ? 0.17 : 0;
        const selectedForward = isSelected ? 0.08 : 0;
        const breath = Math.sin(time * 1.2 + index * 0.8) * 0.008;
        const scale = isSelected ? 1.065 : 1;

        entry.mesh.position.y = entry.baseY + selectedLift + breath;
        entry.mesh.position.z = entry.baseZ + selectedForward;
        entry.mesh.rotation.y = entry.baseRotationY + Math.sin(time * 0.8 + index) * 0.012;
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
  }, [onCardSelect, selectedCardId]);

  return <canvas ref={canvasRef} className="preparation-three-canvas" />;
}

function addStandingCards(
  scene: THREE.Scene,
  textures: THREE.Texture[],
  materials: THREE.Material[],
  geometries: THREE.BufferGeometry[],
  cardMeshes: THREE.Object3D[],
  cardEntries: CardMeshEntry[],
  selectedCardId: string,
) {
  const cardGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 4, 4);
  geometries.push(cardGeometry);

  SPELL_CARDS.forEach((card) => {
    const layout = CARD_LAYOUTS[card.id];
    const isSelected = card.id === selectedCardId;
    const texture = createCardTexture(card, isSelected);
    textures.push(texture);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.78,
      metalness: 0,
      side: THREE.DoubleSide,
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
    });
    scene.add(mesh);
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

function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = getContext2d(canvas);

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#5b341f");
  gradient.addColorStop(0.42, "#3a2013");
  gradient.addColorStop(1, "#1b0e09");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 56; index += 1) {
    const y = index * 19 + Math.sin(index * 2.1) * 8;
    context.beginPath();
    context.moveTo(0, y);

    for (let x = 0; x <= canvas.width; x += 34) {
      const wave = Math.sin(x * 0.018 + index * 0.8) * 8;
      context.lineTo(x, y + wave);
    }

    context.strokeStyle = index % 3 === 0 ? "rgba(255, 205, 132, 0.1)" : "rgba(27, 10, 4, 0.24)";
    context.lineWidth = index % 3 === 0 ? 2 : 1;
    context.stroke();
  }

  for (let index = 0; index < 7; index += 1) {
    const x = 90 + index * 142;
    context.fillStyle = "rgba(10, 3, 1, 0.12)";
    context.fillRect(x, 0, 2, canvas.height);
    context.fillStyle = "rgba(255, 214, 143, 0.05)";
    context.fillRect(x + 4, 0, 2, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 2.2);
  texture.needsUpdate = true;
  return texture;
}

function createCardTexture(card: SpellCard, isSelected: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 744;
  const context = getContext2d(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawRoundedRect(context, 20, 20, 472, 704, 28);
  const cardGradient = context.createLinearGradient(0, 20, 0, 724);
  cardGradient.addColorStop(0, isSelected ? "#f3d894" : "#d7bd7d");
  cardGradient.addColorStop(0.58, isSelected ? "#dfbd77" : "#c79b58");
  cardGradient.addColorStop(1, isSelected ? "#a96331" : "#8f5229");
  context.fillStyle = cardGradient;
  context.fill();

  context.lineWidth = 14;
  context.strokeStyle = isSelected ? "#2a1208" : "#241006";
  context.stroke();

  drawRoundedRect(context, 46, 48, 420, 648, 18);
  context.lineWidth = 5;
  context.strokeStyle = "rgba(44, 20, 9, 0.62)";
  context.stroke();

  context.fillStyle = "rgba(43, 20, 9, 0.9)";
  context.font = "900 56px 'Noto Sans JP', sans-serif";
  context.textAlign = "left";
  context.fillText(String(card.cost), 62, 112);
  context.textAlign = "right";
  context.fillText(String(card.power), 448, 666);

  context.textAlign = "center";
  context.font = "900 30px 'Noto Sans JP', sans-serif";
  context.fillText(card.kind, 256, 92);

  drawRoundedRect(context, 112, 132, 288, 248, 120);
  context.fillStyle = "rgba(255, 235, 181, 0.24)";
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "rgba(43, 20, 9, 0.58)";
  context.stroke();

  context.font = "116px serif";
  context.fillText(card.icon, 256, 298);

  context.font = "900 37px 'Noto Sans JP', sans-serif";
  context.fillStyle = "#2d160d";
  wrapText(context, card.title, 256, 438, 346, 42, "center");

  context.strokeStyle = "rgba(45, 19, 8, 0.35)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(86, 512);
  context.lineTo(426, 512);
  context.stroke();

  context.font = "700 27px Consolas, 'Courier New', monospace";
  context.fillStyle = "#37190c";
  wrapText(context, card.command, 256, 560, 360, 34, "center");

  context.font = "500 22px 'Noto Sans JP', sans-serif";
  context.fillStyle = "rgba(49, 22, 9, 0.78)";
  wrapText(context, card.description, 256, 626, 346, 28, "center");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
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

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign,
) {
  const previousAlign = context.textAlign;
  context.textAlign = align;

  const lines: string[] = [];
  let line = "";

  for (const character of text) {
    const nextLine = line + character;
    if (context.measureText(nextLine).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = character;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  lines.forEach((currentLine, index) => {
    context.fillText(currentLine, x, y + index * lineHeight);
  });

  context.textAlign = previousAlign;
}

function getContext2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }
  return context;
}
