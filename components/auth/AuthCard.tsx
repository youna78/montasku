"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeMobileApp } from "@/lib/platform/capacitor";
import { useAuth } from "./AuthProvider";

const LAST_AUTH_EMAIL_KEY = "habit-monster-last-auth-email";

function maskEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const [localPart, domain = ""] = email.split("@");
  if (!localPart) return "-";
  const visible = localPart.slice(0, 3);
  const localMasked = `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 5))}`;
  return localMasked;
}

export function AuthCard() {
  const {
    user,
    isLoading,
    isConfigured,
    errorMessage,
    infoMessage,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    signOut,
    clearError
  } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const accountName =
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "メールユーザー";

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
  }, []);

  const openEmailModal = (nextMode: "login" | "signup") => {
    clearError();
    setMode(nextMode);
    if (typeof window !== "undefined") {
      const savedEmail = window.localStorage.getItem(LAST_AUTH_EMAIL_KEY);
      setEmail(savedEmail ?? "");
    }
    setPassword("");
    setIsEmailModalOpen(true);
  };

  const onEmailSubmit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return;

    if (mode === "login") {
      const ok = await signInWithEmail(normalizedEmail, password);
      if (!ok) {
        setEmail("");
        setPassword("");
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_AUTH_EMAIL_KEY, normalizedEmail);
      }
      setIsEmailModalOpen(false);
      return;
    }

    const ok = await signUpWithEmail(normalizedEmail, password);
    if (!ok) {
      setEmail("");
      setPassword("");
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_AUTH_EMAIL_KEY, normalizedEmail);
    }
    setIsEmailModalOpen(false);
  };

  return (
    <section className="card decorated-card">
      <h2 className="auth-card-title">アカウント</h2>
      {!isConfigured && (
        <div className="auth-card-message auth-card-message-centered">
          Firebase の環境変数が未設定です。`.env.local` を設定すると Google ログインを利用できます。
        </div>
      )}

      {isConfigured && isLoading && <div className="auth-card-message auth-card-message-centered">ログイン状態を確認しています...</div>}

      {isConfigured && !isLoading && !user && (
        <div className="auth-card-stack">
          <p className="auth-card-message auth-card-message-centered">
            {isNativeApp
              ? "ゲストのまま遊べます。ログインすると別の端末でもデータを引き継げます。"
              : "ゲストのまま遊べますが、ログインすると今後別の端末でも遊べます"}
          </p>
          <div className="auth-privacy-note">
            <p>
              GoogleまたはAppleでログインすると、アカウント識別のために氏名、メールアドレス、ユーザーIDを取得します。
            </p>
            <p>
              取得した情報は、ログイン機能の提供、データ保存、機種変更時の引き継ぎのために利用します。
            </p>
            <p>
              詳しくは
              {" "}
              <Link href="/privacy" className="auth-inline-link">
                プライバシーポリシー
              </Link>
              {" "}
              をご確認ください。
            </p>
          </div>
          <button className="quest-btn quest-btn-primary auth-card-button" onClick={() => void signInWithGoogle()}>
            Googleでログイン
          </button>
          <button className="quest-btn quest-btn-apple auth-card-button" onClick={() => void signInWithApple()}>
            Appleでログイン
          </button>
          <div className="auth-divider">または</div>
          <div className="auth-mode-toggle">
            <button
              className={`quest-btn auth-mode-button ${mode === "login" ? "quest-btn-primary" : "quest-btn-secondary"}`}
              onClick={() => openEmailModal("login")}
            >
              メールでログイン
            </button>
            <button
              className={`quest-btn auth-mode-button ${mode === "signup" ? "quest-btn-primary" : "quest-btn-secondary"}`}
              onClick={() => openEmailModal("signup")}
            >
              新規登録
            </button>
          </div>
        </div>
      )}

      {isConfigured && !isLoading && user && (
        <div className="auth-card-stack">
          <div className="auth-card-user">
            <div className="status-row">
              <span>ログイン中</span>
              <strong>{accountName}</strong>
            </div>
            <div className="status-row">
              <span>メール</span>
              <strong>{maskEmail(user.email)}</strong>
            </div>
          </div>
          <button className="quest-btn quest-btn-secondary auth-card-button" onClick={() => void signOut()}>
            ログアウト
          </button>
        </div>
      )}

      {infoMessage && <div className="auth-card-info">{infoMessage}</div>}
      {errorMessage && !isEmailModalOpen && <div className="auth-card-error">{errorMessage}</div>}

      {isEmailModalOpen && !user && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-email-modal-title">
          <div className="card decorated-card auth-email-modal-card">
            <h3 id="auth-email-modal-title" className="auth-email-modal-title">
              {mode === "login" ? "メールでログイン" : "メールで新規登録"}
            </h3>
            <div className="auth-form-grid">
              <input
                type="email"
                className="auth-input"
                placeholder="メールアドレス"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <input
                type="password"
                className="auth-input"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button className="quest-btn quest-btn-primary auth-card-button" onClick={() => void onEmailSubmit()}>
                {mode === "login" ? "ログイン" : "メールで新規登録"}
              </button>
              {mode === "login" && errorMessage && (
                <button
                  className="quest-btn quest-btn-secondary auth-card-button"
                  onClick={async () => {
                    const ok = await sendPasswordResetEmail(email);
                    if (ok) {
                      setIsEmailModalOpen(false);
                    }
                  }}
                >
                  再設定メールを送る
                </button>
              )}
              {mode === "login" && errorMessage && (
                <p className="auth-card-subnote">
                  確認メール送信は、メールログイン成功後に送れるようにしています。
                </p>
              )}
              <button
                className="quest-btn quest-btn-secondary auth-card-button"
                onClick={() => {
                  clearError();
                  setIsEmailModalOpen(false);
                }}
              >
                閉じる
              </button>
            </div>
            {errorMessage && <div className="auth-card-error">{errorMessage}</div>}
          </div>
        </div>
      )}

    </section>
  );
}
