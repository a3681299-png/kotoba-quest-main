import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ユーザーの進行状況と保存されたコード履歴を取得するエンドポイント
app.get("/api/progress/:uid", async (req, res) => {
  const { uid } = req.params;

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
app.post("/api/progress", async (req, res) => {
  const { uid, stageIndex } = req.body;

  if (!uid || typeof stageIndex !== "number") {
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
app.post("/api/stage-code", async (req, res) => {
  const { uid, stageId, code, rules } = req.body;

  if (!uid || typeof stageId !== "number" || typeof code !== "string") {
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
