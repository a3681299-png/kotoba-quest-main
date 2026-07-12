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
}

export async function saveUserProgress(uid: string, stageIndex: number): Promise<void> {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { stageIndex, updatedAt: new Date() }, { merge: true });
  } catch (error) {
    console.error("Failed to save user progress to Firestore:", error);
  }
}

export async function saveStageCode(uid: string, stageId: number, code: string): Promise<void> {
  try {
    const codeDocRef = doc(db, "users", uid, "stages", stageId.toString());
    await setDoc(codeDocRef, { code, updatedAt: new Date() }, { merge: true });
  } catch (error) {
    console.error(`Failed to save code history for stage ${stageId}:`, error);
  }
}

export async function getUserProgress(uid: string): Promise<UserProgressData | null> {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    let stageIndex = 0;
    if (userDoc.exists()) {
      stageIndex = userDoc.data().stageIndex ?? 0;
    }

    const codes: Record<number, string> = {};
    const stagesColRef = collection(db, "users", uid, "stages");
    const stagesSnapshot = await getDocs(stagesColRef);

    stagesSnapshot.forEach((docSnap) => {
      const stageId = parseInt(docSnap.id, 10);
      if (!isNaN(stageId)) {
        codes[stageId] = docSnap.data().code ?? "";
      }
    });

    return { stageIndex, codes };
  } catch (error) {
    console.error("Failed to load progress from Firestore:", error);
    return null;
  }
}
