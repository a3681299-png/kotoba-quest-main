import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProgressData {
  stageIndex: number;
  codes: Record<number, string>;
  rules: Record<number, any>; // ルール設定の保存用を追加
}

// バックエンドのAPIベースURL
const API_URL = "http://localhost:3000/api";

// 認証済みユーザーのIDトークンを付与したヘッダーを組み立てる
async function buildAuthHeaders(): Promise<HeadersInit | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user; refusing to call backend API");
    return null;
  }

  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * ユーザーのゲーム進行度（stageIndex）を保存する
 */
export async function saveUserProgress(_uid: string, stageIndex: number): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    if (!headers) return;

    // ローカルサーバーへ進行状況を保存（uidはサーバー側でIDトークンから決定される）
    const res = await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers,
      body: JSON.stringify({ stageIndex }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while saving progress`);
    }
  } catch (error) {
    console.error("Failed to save user progress to local server:", error);
  }
}

/**
 * 各ステージの攻撃コードおよびルール設定履歴を保存する
 */
export async function saveStageCode(_uid: string, stageId: number, code: string, rules?: any): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    if (!headers) return;

    // ローカルサーバーへコード履歴およびルール設定を保存（uidはサーバー側でIDトークンから決定される）
    const res = await fetch(`${API_URL}/stage-code`, {
      method: "POST",
      headers,
      body: JSON.stringify({ stageId, code, rules }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while saving stage code`);
    }
  } catch (error) {
    console.error(`Failed to save code history for stage ${stageId} to local server:`, error);
  }
}

/**
 * ユーザーの進行度、攻撃コード、およびルール設定履歴をロードする
 */
export async function getUserProgress(uid: string): Promise<UserProgressData | null> {
  try {
    const headers = await buildAuthHeaders();
    if (!headers) return null;

    // ローカルサーバーからデータを取得
    const res = await fetch(`${API_URL}/progress/${uid}`, { headers });
    if (!res.ok) {
      throw new Error("HTTP error loading progress");
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to load progress from local server:", error);
    return null;
  }
}
