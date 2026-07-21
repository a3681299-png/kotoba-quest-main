import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";

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

/**
 * ユーザーのゲーム進行度（stageIndex）を保存する
 */
export async function saveUserProgress(uid: string, stageIndex: number): Promise<void> {
  try {
    // ローカルサーバーへ進行状況を保存
    await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, stageIndex }),
    });
  } catch (error) {
    console.error("Failed to save user progress to local server:", error);
  }
}

/**
 * 各ステージの攻撃コードおよびルール設定履歴を保存する
 */
export async function saveStageCode(uid: string, stageId: number, code: string, rules?: any): Promise<void> {
  try {
    // ローカルサーバーへコード履歴およびルール設定を保存
    await fetch(`${API_URL}/stage-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, stageId, code, rules }),
    });
  } catch (error) {
    console.error(`Failed to save code history for stage ${stageId} to local server:`, error);
  }
}

/**
 * ユーザーの進行度、攻撃コード、およびルール設定履歴をロードする
 */
export async function getUserProgress(uid: string): Promise<UserProgressData | null> {
  try {
    // ローカルサーバーからデータを取得
    const res = await fetch(`${API_URL}/progress/${uid}`);
    if (!res.ok) {
      throw new Error("HTTP error loading progress");
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to load progress from local server:", error);
    return null;
  }
}
