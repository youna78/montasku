"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClientPlatform, isNativeMobileApp } from "@/lib/platform/capacitor";
import { useAuth } from "./AuthProvider";

const LAST_AUTH_EMAIL_KEY = "habit-monster-last-auth-email";

export function GuestLoginPrompt() {
  const {
    isConfigured,
    isLoading,
    user,
    showDailyPrompt,
    dismissDailyPrompt,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    errorMessage,
    clearError
  } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFormMessage, setEmailFormMessage] = useState("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [clientPlatform, setClientPlatform] = useState("unknown");
  const shouldShowAppleLogin = clientPlatform !== "unknown" && clientPlatform !== "android";

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    setClientPlatform(getClientPlatform());
  }, []);

  if (isNativeApp || !isConfigured || isLoading || user || !showDailyPrompt) {
    return null;
  }

  const openEmailModal = (nextMode: "login" | "signup") => {
    clearError();
    setEmailFormMessage("");
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
    if (!normalizedEmail || !password) {
      setEmailFormMessage(
        !normalizedEmail && !password
          ? "メールアドレスとパスワードを入力してください。"
          : !normalizedEmail
            ? "メールアドレスを入力してください。"
            : "パスワードを入力してください。"
      );
      return;
    }
    setEmailFormMessage("");

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
      dismissDailyPrompt();
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
    dismissDailyPrompt();
  };

  return (
    <div className="auth-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-login-title">
      <div className="card decorated-card auth-prompt-card">
        <h2 id="guest-login-title">ログイン</h2>
        <p className="auth-prompt-message">ゲストのまま遊べますが、ログインすると今後別の端末でも遊べます</p>
        <div className="auth-privacy-note auth-privacy-note-compact">
          <p>{shouldShowAppleLogin ? "GoogleまたはApple" : "Google"}でログインすると、氏名、メールアドレス、ユーザーIDを取得します。</p>
          <p>ログイン機能、データ保存、機種変更時の引き継ぎに利用します。</p>
          <p>
            詳しくは
            {" "}
            <Link href="/privacy" className="auth-inline-link" onClick={dismissDailyPrompt}>
              プライバシーポリシー
            </Link>
            {" "}
            をご確認ください。
          </p>
        </div>
        <div className="auth-prompt-actions">
          <button className="quest-btn quest-btn-primary auth-card-button" onClick={() => void signInWithGoogle()}>
            Googleでログイン
          </button>
          {shouldShowAppleLogin && (
            <button className="quest-btn quest-btn-apple auth-card-button" onClick={() => void signInWithApple()}>
              Appleでログイン
            </button>
          )}
          <div className="auth-divider">または</div>
          <div className="auth-mode-toggle">
            <button className="quest-btn quest-btn-primary auth-mode-button" onClick={() => openEmailModal("login")}>
              メールでログイン
            </button>
            <button className="quest-btn quest-btn-secondary auth-mode-button" onClick={() => openEmailModal("signup")}>
              新規登録
            </button>
          </div>
          <button className="quest-btn quest-btn-secondary auth-card-button" onClick={dismissDailyPrompt}>
            あとで
          </button>
        </div>
        {errorMessage && !isEmailModalOpen && <div className="auth-card-error">{errorMessage}</div>}
      </div>

      {isEmailModalOpen && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-email-modal-title">
          <div className="card decorated-card auth-email-modal-card">
            <h3 id="guest-email-modal-title" className="auth-email-modal-title">
              {mode === "login" ? "メールでログイン" : "メールで新規登録"}
            </h3>
            <div className="auth-form-grid">
              <input
                type="email"
                className="auth-input"
                placeholder="メールアドレス"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailFormMessage("");
                }}
                autoComplete="email"
              />
              <input
                type="password"
                className="auth-input"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setEmailFormMessage("");
                }}
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
                  setEmailFormMessage("");
                  setIsEmailModalOpen(false);
                }}
              >
                閉じる
              </button>
            </div>
            {emailFormMessage && <div className="auth-card-error">{emailFormMessage}</div>}
            {errorMessage && <div className="auth-card-error">{errorMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
