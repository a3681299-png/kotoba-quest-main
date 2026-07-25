import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// Authorizationヘッダーの Firebase IDトークンを検証し、req.uid にセットするミドルウェア
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.slice("Bearer ".length);

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    (req as Request & { uid: string }).uid = decoded.uid;
    next();
  } catch (error) {
    console.error("Failed to verify ID token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.use(cors());
app.use(express.json());

// ユーザーの進行状況と保存されたコード履歴を取得するエンドポイント
app.get("/api/progress/:uid", requireAuth, async (req, res) => {
  const uid = (req as Request & { uid: string }).uid;

  // トークンの持ち主本人以外のデータへのアクセスを拒否
  if (req.params.uid !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { id: uid },
      include: { stages: true },
    });

    // ユーザーが存在しない場合は初期データで新規作成
    if (!user) {
      user = await prisma.user.create({
        data: { id: uid, stageIndex: 0 },
        include: { stages: true },
      });
    }

    const codes: Record<number, string> = {};
    const rules: Record<number, any> = {};

    user.stages.forEach((stage) => {
      codes[stage.stageId] = stage.code;
      if (stage.rulesJson) {
        try {
          rules[stage.stageId] = JSON.parse(stage.rulesJson);
        } catch (e) {
          console.error("Failed to parse rules JSON", e);
        }
      }
    });

    res.json({
      stageIndex: user.stageIndex,
      codes,
      rules,
    });
  } catch (error) {
    console.error("Failed to load user progress:", error);
    res.status(500).json({ error: "Failed to load progress" });
  }
});

// ユーザーのステージ進行度 (stageIndex) を保存するエンドポイント
app.post("/api/progress", requireAuth, async (req, res) => {
  const uid = (req as Request & { uid: string }).uid;
  const { stageIndex } = req.body;

  if (!Number.isInteger(stageIndex) || stageIndex < 0) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: { stageIndex },
      create: { id: uid, stageIndex },
    });
    res.json({ success: true, stageIndex: user.stageIndex });
  } catch (error) {
    console.error("Failed to save progress:", error);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

// ステージの攻撃コードおよび作成したルール設定を保存するエンドポイント
app.post("/api/stage-code", requireAuth, async (req, res) => {
  const uid = (req as Request & { uid: string }).uid;
  const { stageId, code, rules } = req.body;

  if (!Number.isInteger(stageId) || stageId < 0 || typeof code !== "string") {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    // ユーザーの存在を確認・無ければ作成する
    await prisma.user.upsert({
      where: { id: uid },
      update: {},
      create: { id: uid, stageIndex: 0 },
    });

    const rulesJson = rules ? JSON.stringify(rules) : null;

    const stageCode = await prisma.stageCode.upsert({
      where: {
        userId_stageId: {
          userId: uid,
          stageId,
        },
      },
      update: { code, rulesJson },
      create: { userId: uid, stageId, code, rulesJson },
    });

    res.json({ success: true, stageCode });
  } catch (error) {
    console.error("Failed to save stage code:", error);
    res.status(500).json({ error: "Failed to save stage code" });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`[Kotoba Quest Backend] Running on http://localhost:${PORT}`);
});
