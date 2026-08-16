import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import authSealUrl from "../assets/UI/title/icon.jpeg";
import "../styles/auth.css";

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("すべての項目を入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Authentication error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/invalid-email":
        return "メールアドレスの形式が正しくありません。";
      case "auth/user-disabled":
        return "このアカウントは無効化されています。";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "メールアドレスまたはパスワードが正しくありません。";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に登録されています。";
      case "auth/weak-password":
        return "パスワードが脆弱です。6文字以上のパスワードを設定してください。";
      case "auth/missing-password":
        return "パスワードを入力してください。";
      case "auth/popup-closed-by-user":
        return "サインインのポップアップウィンドウが閉じられました。再度お試しください。";
      case "auth/cancelled-popup-request":
        return "ポップアップの接続がキャンセルされました。";
      default:
        return "認証エラーが発生しました。時間をおいて再度お試しください。";
    }
  };

  return (
    <div className="auth-screen-container">
      <div className="auth-card">
        <header className="auth-header">
          <span className="auth-logo-seal" aria-hidden="true">
            <img src={authSealUrl} alt="" draggable={false} />
          </span>
          <h1 className="auth-title">ことばクエスト</h1>
          <p className="auth-subtitle">
            コトバ of 力でプログラミングの論理を学ぶ
          </p>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-msg" role="alert">
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="email-input">
              メールアドレス
            </label>
            <input
              id="email-input"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="password-input">
              パスワード
            </label>
            <input
              id="password-input"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : isLogin ? "ギルドに入る" : "新規アカウント作成"}
          </button>
        </form>

        <div className="auth-divider">
          <span>または</span>
        </div>

        <button
          type="button"
          className="auth-google-btn"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Googleでログイン
        </button>

        <p className="auth-toggle-text">
          {isLogin ? "初めてですか？" : "既にアカウントをお持ちですか？"}
          <button
            type="button"
            className="auth-toggle-link"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            disabled={isLoading}
          >
            {isLogin ? "新規登録はこちら" : "ログインはこちら"}
          </button>
        </p>
      </div>
    </div>
  );
}
