import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "../styles/preparation-logic.css";

type PreparationScreenProps = {
  onStartBattle: () => void;
};

type PreparationThreeSceneProps = {
  selectedCardId: PreparationCardId;
  onCardSelect: (cardId: PreparationCardId) => void;
};

type ActionPreviewProps = {
  previewRules: RuleSlot[];
  traceSteps: TraceStep[];
  isDraftPreview: boolean;
};

type SyntaxBuilderProps = {
  rules: RuleSlot[];
  activeTarget: RuleTarget;
  selectedCard: PreparationCard;
  onTargetSelect: (ruleIndex: number, part: RulePart) => void;
  onUndo: () => void;
  onClear: () => void;
};

type CausalityPanelProps = {
  traceSteps: TraceStep[];
  isDraftPreview: boolean;
};

type CardMeshEntry = {
  cardId: PreparationCardId;
  mesh: THREE.Mesh;
  baseY: number;
  baseZ: number;
  baseRotationY: number;
  baseRenderOrder: number;
};

type RulePart = "condition" | "action";
type ConditionCardId =
  | "condition-always"
  | "condition-enemy-low"
  | "condition-weakness-known";
type ActionCardId = "action-observe" | "action-attack" | "action-heal";
type PreparationCardId = ConditionCardId | ActionCardId;

type SimulationState = {
  enemyHp: number;
  maxEnemyHp: number;
  playerHp: number;
  maxPlayerHp: number;
  weaknessKnown: boolean;
};

type ConditionCheck = {
  passed: boolean;
  detail: string;
};

type ActionEffect = {
  message: string;
};

type BasePreparationCard = {
  id: PreparationCardId;
  type: RulePart;
  title: string;
  kind: string;
  shortLabel: string;
  command: string;
  description: string;
  glyph: string;
  textureUrl: string;
};

type ConditionCard = BasePreparationCard & {
  id: ConditionCardId;
  type: "condition";
  definition: string;
  evaluate: (state: SimulationState) => ConditionCheck;
};

type ActionCard = BasePreparationCard & {
  id: ActionCardId;
  type: "action";
  effectText: string;
  apply: (state: SimulationState) => ActionEffect;
};

type PreparationCard = ConditionCard | ActionCard;

type RuleSlot = {
  conditionId: ConditionCardId | null;
  actionId: ActionCardId | null;
};

type RuleTarget = {
  ruleIndex: number;
  part: RulePart;
};

type CompleteRule = {
  index: number;
  condition: ConditionCard;
  action: ActionCard;
};

type TraceStep = {
  ruleIndex: number;
  conditionTitle: string;
  actionTitle: string;
  conditionGlyph: string;
  actionGlyph: string;
  passed: boolean;
  conditionDetail: string;
  actionDetail: string | null;
  beforeState: string;
  afterState: string;
};

const PREPARATION_RULE_SLOT_COUNT = 3;
const TABLE_SLOT_LABELS = ["Ⅰ", "Ⅱ", "Ⅲ"];
const TABLE_DECOR_TEXTURE_URLS: Record<PreparationTableDecorItem["id"], string> = {
  books: booksDecorTextureUrl,
  candle: candleDecorTextureUrl,
};

const CONDITION_CARDS: ConditionCard[] = [
  {
    id: "condition-always",
    type: "condition",
    title: "いつでも",
    kind: "条件",
    shortLabel: "いつでも",
    command: "もし いつでも なら",
    definition: "常に条件成立。最初の行動や基本行動に使う。",
    description: "行動を必ず発動させるための条件札。",
    glyph: "○",
    textureUrl: recordCardTextureUrl,
    evaluate: () => ({
      passed: true,
      detail: "いつでも = 常に成立",
    }),
  },
  {
    id: "condition-enemy-low",
    type: "condition",
    title: "敵HPが30%以下",
    kind: "条件",
    shortLabel: "敵HP≤30%",
    command: "もし 敵HP が 30%以下 なら",
    definition: "敵HPが最大HPの30%以下になった瞬間から成立。",
    description: "前の行動で敵HPが減ると、後ろの判定結果が変わる。",
    glyph: "Y",
    textureUrl: branchCardTextureUrl,
    evaluate: (state) => {
      const percent = getEnemyHpPercent(state);
      return {
        passed: percent <= 30,
        detail: `敵HP ${percent}% は 30%以下${percent <= 30 ? "" : "ではない"}`,
      };
    },
  },
  {
    id: "condition-weakness-known",
    type: "condition",
    title: "弱点が判明",
    kind: "条件",
    shortLabel: "弱点判明",
    command: "もし 弱点 が 判明している なら",
    definition: "観察する行動のあとに成立。先に置くとまだ成立しない。",
    description: "観察→攻撃の順序を考えるための条件札。",
    glyph: "目",
    textureUrl: observationCardTextureUrl,
    evaluate: (state) => ({
      passed: state.weaknessKnown,
      detail: state.weaknessKnown
        ? "観察済みなので弱点が判明している"
        : "まだ観察していないので弱点は不明",
    }),
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    id: "action-observe",
    type: "action",
    title: "観察する",
    kind: "行動",
    shortLabel: "観察",
    command: "観察する",
    effectText: "弱点判明フラグを立てる。",
    description: "この後ろにある「弱点が判明」条件を成立させる。",
    glyph: "◎",
    textureUrl: observationCardTextureUrl,
    apply: (state) => {
      state.weaknessKnown = true;
      return { message: "弱点が判明。後ろの条件が読めるようになった" };
    },
  },
  {
    id: "action-attack",
    type: "action",
    title: "攻撃する",
    kind: "行動",
    shortLabel: "攻撃",
    command: "攻撃する",
    effectText: "敵HPを20%減らす。弱点判明中なら30%減らす。",
    description: "敵HPを変化させ、後続の条件判定に影響する。",
    glyph: "╱",
    textureUrl: attackCardTextureUrl,
    apply: (state) => {
      const before = state.enemyHp;
      const damage = state.weaknessKnown ? 30 : 20;
      state.enemyHp = Math.max(0, state.enemyHp - damage);
      return {
        message: `敵HP ${before}% → ${state.enemyHp}%（${damage}%ダメージ）`,
      };
    },
  },
  {
    id: "action-heal",
    type: "action",
    title: "回復する",
    kind: "行動",
    shortLabel: "回復",
    command: "回復する",
    effectText: "自分HPを18%回復する。",
    description: "次の敵行動に備えて状態を立て直す。",
    glyph: "✚",
    textureUrl: healCardTextureUrl,
    apply: (state) => {
      const before = state.playerHp;
      state.playerHp = Math.min(state.maxPlayerHp, state.playerHp + 18);
      return { message: `自分HP ${before}% → ${state.playerHp}%` };
    },
  },
];

const PREPARATION_CARDS: PreparationCard[] = [...CONDITION_CARDS, ...ACTION_CARDS];

export function PreparationScreen({ onStartBattle }: PreparationScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState<PreparationCardId>("action-attack");
  const [rules, setRules] = useState<RuleSlot[]>(createEmptyRuleSlots);
  const [activeTarget, setActiveTarget] = useState<RuleTarget>({
    ruleIndex: 0,
    part: "condition",
  });
  const selectedCard = getPreparationCardById(selectedCardId);
  const previewRules = useMemo(
    () => createPreviewRules(rules, selectedCard),
    [rules, selectedCard],
  );
  const traceSteps = useMemo(() => simulateRules(previewRules), [previewRules]);
  const isDraftPreview = getCompleteRules(rules).length === 0;

  const handleCardSelect = useCallback(
    (cardId: PreparationCardId) => {
      const card = getPreparationCardById(cardId);
      setSelectedCardId(card.id);
      setRules((currentRules) => {
        const nextRules = cloneRuleSlots(currentRules);
        const targetRule = nextRules[activeTarget.ruleIndex];

        if (card.type === "condition") {
          targetRule.conditionId = card.id;
          setActiveTarget({ ruleIndex: activeTarget.ruleIndex, part: "action" });
          return nextRules;
        }

        if (!targetRule.conditionId) {
          targetRule.conditionId = "condition-always";
        }
        targetRule.actionId = card.id;
        setActiveTarget(findNextRuleTarget(nextRules, activeTarget.ruleIndex));
        return nextRules;
      });
    },
    [activeTarget],
  );

  const handleUndoSequence = () => {
    setRules((currentRules) => {
      const nextRules = cloneRuleSlots(currentRules);

      for (let index = nextRules.length - 1; index >= 0; index -= 1) {
        const rule = nextRules[index];
        if (rule.actionId) {
          rule.actionId = null;
          setActiveTarget({ ruleIndex: index, part: "action" });
          return nextRules;
        }
        if (rule.conditionId) {
          rule.conditionId = null;
          setActiveTarget({ ruleIndex: index, part: "condition" });
          return nextRules;
        }
      }

      setActiveTarget({ ruleIndex: 0, part: "condition" });
      return nextRules;
    });
  };

  const handleClearSequence = () => {
    setRules(createEmptyRuleSlots());
    setActiveTarget({ ruleIndex: 0, part: "condition" });
  };

  const handleTargetSelect = (ruleIndex: number, part: RulePart) => {
    setActiveTarget({ ruleIndex, part });
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
            <h1>カードで作戦を書く</h1>
          </div>
          <button
            className="start-battle-button"
            type="button"
            onClick={onStartBattle}
          >
            バトルへ進む
          </button>
        </header>

        <ActionPreview
          previewRules={previewRules}
          traceSteps={traceSteps}
          isDraftPreview={isDraftPreview}
        />

        <CausalityPanel traceSteps={traceSteps} isDraftPreview={isDraftPreview} />

        <SyntaxBuilder
          rules={rules}
          activeTarget={activeTarget}
          selectedCard={selectedCard}
          onTargetSelect={handleTargetSelect}
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
            <div>
              <span className={`selected-card-kind is-${selectedCard.type}`}>
                {selectedCard.kind}
              </span>
              <strong>{selectedCard.title}</strong>
            </div>
          </div>
          <code>{selectedCard.command}</code>
          <p>{selectedCard.description}</p>
          <small>
            {selectedCard.type === "condition"
              ? `定義: ${selectedCard.definition}`
              : `効果: ${selectedCard.effectText}`}
          </small>
        </aside>
      </section>
    </main>
  );
}

function ActionPreview({
  previewRules,
  traceSteps,
  isDraftPreview,
}: ActionPreviewProps) {
  const completeRules = getCompleteRules(previewRules);
  const hasConditionBranch = completeRules.some(
    (rule) => rule.condition.id !== "condition-always",
  );
  const hasObserve = completeRules.some((rule) => rule.action.id === "action-observe");
  const hasAttack = completeRules.some((rule) => rule.action.id === "action-attack");
  const hasHeal = completeRules.some((rule) => rule.action.id === "action-heal");
  const previewGlyph = completeRules[0]?.condition.glyph ?? "•";
  const previewClassName = [
    "preparation-overlay",
    "action-preview",
    isDraftPreview ? "is-draft-preview" : "",
    hasConditionBranch ? "has-branch" : "",
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
          {hasConditionBranch && (
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
          {hasObserve && (
            <path
              className="preview-path preview-observe-path"
              d="M240 92 C285 52 348 45 432 82"
              markerEnd="url(#preview-arrow-soft)"
            />
          )}
        </svg>

        <div className="preview-sequence-pills">
          {completeRules.slice(0, PREPARATION_RULE_SLOT_COUNT).map((rule) => {
            const traceStep = traceSteps.find((step) => step.ruleIndex === rule.index);
            return (
              <span
                className={`preview-sequence-pill ${traceStep?.passed ? "is-passed" : "is-skipped"}`}
                key={`preview-pill-${rule.index}`}
              >
                {rule.index + 1}
              </span>
            );
          })}
        </div>

        <div className={`preview-hub ${hasConditionBranch ? "is-split" : ""}`}>
          <span>{hasConditionBranch ? "IF" : previewGlyph}</span>
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

function CausalityPanel({ traceSteps, isDraftPreview }: CausalityPanelProps) {
  return (
    <aside className="preparation-overlay logic-feedback-panel" aria-live="polite">
      <span className="logic-feedback-label">因果ログ</span>
      <p className="logic-feedback-note">
        {isDraftPreview
          ? "選択中カードから仮の if→then を表示中。"
          : "敵HP45%から、左の札順に判定します。"}
      </p>

      {traceSteps.length > 0 ? (
        <ol className="trace-list">
          {traceSteps.map((step) => (
            <li
              className={`trace-step ${step.passed ? "is-passed" : "is-skipped"}`}
              key={`trace-${step.ruleIndex}`}
            >
              <div className="trace-step-header">
                <span className="trace-order">{step.ruleIndex + 1}</span>
                <strong>
                  {step.conditionTitle} → {step.actionTitle}
                </strong>
                <span className="trace-result">{step.passed ? "成立" : "不成立"}</span>
              </div>
              <p>{step.conditionDetail}</p>
              <small>{step.passed ? step.actionDetail : "行動は発動せず、次の札へ進む"}</small>
              <code>
                {step.beforeState} → {step.afterState}
              </code>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-trace">条件札と行動札を1枚ずつ入れると、結果がここに刻まれます。</p>
      )}

      <div className="sequence-tip">
        例: 攻撃→敵HP≤30%なら、攻撃後のHPで次の条件を判定。
      </div>
    </aside>
  );
}

function SyntaxBuilder({
  rules,
  activeTarget,
  selectedCard,
  onTargetSelect,
  onUndo,
  onClear,
}: SyntaxBuilderProps) {
  const hasPreparedRules = rules.some((rule) => rule.conditionId || rule.actionId);

  return (
    <nav className="preparation-overlay syntax-builder" aria-label="作戦レール">
      <div className="syntax-builder-caption">左から順に実行される作戦レール</div>
      <ol className="syntax-track">
        {rules.map((rule, index) => {
          const condition = getConditionCardById(rule.conditionId);
          const action = getActionCardById(rule.actionId);
          const isActiveCondition =
            activeTarget.ruleIndex === index && activeTarget.part === "condition";
          const isActiveAction =
            activeTarget.ruleIndex === index && activeTarget.part === "action";
          const conditionPreview =
            !condition && isActiveCondition && selectedCard.type === "condition"
              ? selectedCard
              : null;
          const actionPreview =
            !action && isActiveAction && selectedCard.type === "action" ? selectedCard : null;
          const conditionCard = condition ?? conditionPreview;
          const actionCard = action ?? actionPreview;

          return (
            <li className="syntax-step" key={`syntax-slot-${index}`}>
              <div className="rule-slot-card">
                <span className="rule-slot-index">{index + 1}</span>
                <button
                  className={getRulePocketClassName(
                    "condition",
                    Boolean(condition),
                    Boolean(conditionPreview),
                    isActiveCondition,
                  )}
                  type="button"
                  onClick={() => onTargetSelect(index, "condition")}
                >
                  <span className="rule-pocket-prefix">もし</span>
                  <span className="rule-pocket-glyph">{conditionCard?.glyph ?? "?"}</span>
                  <strong>{conditionCard?.shortLabel ?? "条件札"}</strong>
                </button>
                <span className="rule-then-label">なら</span>
                <button
                  className={getRulePocketClassName(
                    "action",
                    Boolean(action),
                    Boolean(actionPreview),
                    isActiveAction,
                  )}
                  type="button"
                  onClick={() => onTargetSelect(index, "action")}
                >
                  <span className="rule-pocket-prefix">行動</span>
                  <span className="rule-pocket-glyph">{actionCard?.glyph ?? "·"}</span>
                  <strong>{actionCard?.shortLabel ?? "行動札"}</strong>
                </button>
              </div>
              {index < rules.length - 1 && (
                <span className="syntax-connector" aria-hidden="true" />
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
          disabled={!hasPreparedRules}
          aria-label="最後の札を戻す"
        >
          <span aria-hidden="true">↶</span>
        </button>
        <button
          className="syntax-control-button"
          type="button"
          onClick={onClear}
          disabled={!hasPreparedRules}
          aria-label="作戦を消す"
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
      return isPreparationCardId(cardId) ? cardId : null;
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

  PREPARATION_CARDS.forEach((card) => {
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

function createEmptyRuleSlots() {
  return Array.from({ length: PREPARATION_RULE_SLOT_COUNT }, () => ({
    conditionId: null,
    actionId: null,
  }));
}

function cloneRuleSlots(rules: RuleSlot[]) {
  return rules.map((rule) => ({ ...rule }));
}

function createPreviewRules(rules: RuleSlot[], selectedCard: PreparationCard) {
  if (getCompleteRules(rules).length > 0) {
    return rules;
  }

  const draftRule: RuleSlot =
    selectedCard.type === "condition"
      ? { conditionId: selectedCard.id, actionId: "action-attack" }
      : { conditionId: "condition-always", actionId: selectedCard.id };

  return [draftRule, ...createEmptyRuleSlots().slice(1)];
}

function findNextRuleTarget(rules: RuleSlot[], currentIndex: number): RuleTarget {
  for (let offset = 1; offset <= rules.length; offset += 1) {
    const index = (currentIndex + offset) % rules.length;
    const rule = rules[index];
    if (!rule.conditionId) {
      return { ruleIndex: index, part: "condition" };
    }
    if (!rule.actionId) {
      return { ruleIndex: index, part: "action" };
    }
  }

  return { ruleIndex: currentIndex, part: "condition" };
}

function getCompleteRules(rules: RuleSlot[]): CompleteRule[] {
  return rules.flatMap((rule, index) => {
    const condition = getConditionCardById(rule.conditionId);
    const action = getActionCardById(rule.actionId);
    if (!condition || !action) return [];
    return [{ index, condition, action }];
  });
}

function simulateRules(rules: RuleSlot[]): TraceStep[] {
  const state: SimulationState = {
    enemyHp: 45,
    maxEnemyHp: 100,
    playerHp: 42,
    maxPlayerHp: 100,
    weaknessKnown: false,
  };

  return getCompleteRules(rules).map((rule) => {
    const beforeState = formatSimulationState(state);
    const conditionCheck = rule.condition.evaluate(state);

    if (!conditionCheck.passed) {
      return {
        ruleIndex: rule.index,
        conditionTitle: rule.condition.shortLabel,
        actionTitle: rule.action.shortLabel,
        conditionGlyph: rule.condition.glyph,
        actionGlyph: rule.action.glyph,
        passed: false,
        conditionDetail: conditionCheck.detail,
        actionDetail: null,
        beforeState,
        afterState: beforeState,
      };
    }

    const actionEffect = rule.action.apply(state);
    return {
      ruleIndex: rule.index,
      conditionTitle: rule.condition.shortLabel,
      actionTitle: rule.action.shortLabel,
      conditionGlyph: rule.condition.glyph,
      actionGlyph: rule.action.glyph,
      passed: true,
      conditionDetail: conditionCheck.detail,
      actionDetail: actionEffect.message,
      beforeState,
      afterState: formatSimulationState(state),
    };
  });
}

function formatSimulationState(state: SimulationState) {
  return `敵HP${state.enemyHp}% / 自HP${state.playerHp}%${
    state.weaknessKnown ? " / 弱点判明" : ""
  }`;
}

function getEnemyHpPercent(state: SimulationState) {
  return Math.round((state.enemyHp / state.maxEnemyHp) * 100);
}

function getRulePocketClassName(
  part: RulePart,
  isFilled: boolean,
  isPreview: boolean,
  isActive: boolean,
) {
  return [
    "rule-pocket",
    `is-${part}`,
    isFilled ? "is-filled" : "is-empty",
    isPreview ? "is-preview" : "",
    isActive ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getPreparationCardById(cardId: string): PreparationCard {
  return PREPARATION_CARDS.find((card) => card.id === cardId) ?? PREPARATION_CARDS[0];
}

function getConditionCardById(cardId: ConditionCardId | null): ConditionCard | null {
  if (!cardId) return null;
  return CONDITION_CARDS.find((card) => card.id === cardId) ?? null;
}

function getActionCardById(cardId: ActionCardId | null): ActionCard | null {
  if (!cardId) return null;
  return ACTION_CARDS.find((card) => card.id === cardId) ?? null;
}

function isPreparationCardId(cardId: unknown): cardId is PreparationCardId {
  return typeof cardId === "string" && PREPARATION_CARDS.some((card) => card.id === cardId);
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
