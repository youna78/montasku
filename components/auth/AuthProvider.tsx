"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, reload, type User } from "firebase/auth";
import {
  consumeGoogleRedirectResult,
  sendResetPasswordEmail,
  sendVerificationEmail,
  signInWithEmail,
  signInWithGoogle as signInWithGoogleFirebase,
  signOutFirebase,
  signUpWithEmail,
  getCurrentUserIdToken,
  getFirebaseAuth
} from "@/lib/firebase/auth";
import { ensureUserDocument } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type { AuthUserProfile } from "@/types/auth";

const DAILY_LOGIN_PROMPT_KEY = "habit-monster-google-login-prompt-last-shown";

type AuthContextValue = {
  user: AuthUserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  errorMessage: string;
  infoMessage: string;
  showDailyPrompt: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  sendVerificationEmail: () => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  dismissDailyPrompt: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User): AuthUserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((provider) => provider.providerId).filter(Boolean)
  };
}

function toAuthErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/missing-password":
      return "パスワードを入力してください。";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください。";
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています。";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/popup-closed-by-user":
      return "ログインがキャンセルされました。";
    case "auth/popup-blocked":
    case "auth/cancelled-popup-request":
      return "ポップアップでログインできませんでした。もう一度お試しください。";
    case "auth/unauthorized-domain":
      return "このドメインは Firebase の承認済みドメインに登録されていません。";
    case "auth/native-google-credential-missing":
      return "Android の Google ログイン情報を取得できませんでした。もう一度お試しください。";
    default:
      return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showDailyPrompt, setShowDailyPrompt] = useState(false);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!configured || isLoading || user) {
      setShowDailyPrompt(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const lastShown = window.localStorage.getItem(DAILY_LOGIN_PROMPT_KEY);
    if (lastShown === today) return;

    window.localStorage.setItem(DAILY_LOGIN_PROMPT_KEY, today);
    setShowDailyPrompt(true);
  }, [configured, isLoading, user]);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        await consumeGoogleRedirectResult();
      } catch (error) {
        console.error("[auth] consume redirect result failed", error);
        setErrorMessage(toAuthErrorMessage(error, "Googleログインに失敗しました。"));
      }
    })();

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setIsLoading(true);

      void (async () => {
        try {
          if (!nextUser) {
            setUser(null);
            return;
          }

          // Reflect the latest email verification state after users return from their inbox.
          await reload(nextUser);
          await ensureUserDocument(nextUser);
          setUser(toAuthUser(nextUser));
          setErrorMessage("");
          setInfoMessage("");
        } catch (error) {
          console.error("[auth] failed to sync user document", error);
          setErrorMessage("ユーザー情報の保存に失敗しました。");
          setUser(nextUser ? toAuthUser(nextUser) : null);
        } finally {
          setIsLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isConfigured: configured,
      errorMessage,
      infoMessage,
      showDailyPrompt,
      signInWithGoogle: async () => {
        if (!configured) {
          setErrorMessage("Firebase の環境変数が未設定です。");
          return false;
        }

        try {
          setShowDailyPrompt(false);
          setErrorMessage("");
          setInfoMessage("");
          await signInWithGoogleFirebase();
          return true;
        } catch (error) {
          console.error("[auth] sign-in failed", error);
          setErrorMessage(toAuthErrorMessage(error, "Googleログインに失敗しました。"));
          return false;
        }
      },
      signInWithEmail: async (email: string, password: string) => {
        if (!configured) {
          setErrorMessage("Firebase の環境変数が未設定です。");
          return false;
        }

        try {
          setShowDailyPrompt(false);
          setErrorMessage("");
          setInfoMessage("");
          await signInWithEmail(email, password);
          return true;
        } catch (error) {
          console.error("[auth] email sign-in failed", error);
          setErrorMessage(toAuthErrorMessage(error, "メールログインに失敗しました。"));
          return false;
        }
      },
      signUpWithEmail: async (email: string, password: string) => {
        if (!configured) {
          setErrorMessage("Firebase の環境変数が未設定です。");
          return false;
        }

        try {
          setShowDailyPrompt(false);
          setErrorMessage("");
          setInfoMessage("");
          await signUpWithEmail(email, password);
          await sendVerificationEmail();
          setInfoMessage("確認メールを送信しました。メールをご確認ください。");
          return true;
        } catch (error) {
          console.error("[auth] email sign-up failed", error);
          setErrorMessage(toAuthErrorMessage(error, "メール登録に失敗しました。"));
          return false;
        }
      },
      sendVerificationEmail: async () => {
        try {
          setErrorMessage("");
          setInfoMessage("");
          await sendVerificationEmail();
          setInfoMessage("確認メールを送信しました。メールをご確認ください。");
          return true;
        } catch (error) {
          console.error("[auth] send verification email failed", error);
          setErrorMessage("確認メールの送信に失敗しました。");
          return false;
        }
      },
      sendPasswordResetEmail: async (email: string) => {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
          setErrorMessage("メールアドレスを入力してください。");
          return false;
        }

        try {
          setErrorMessage("");
          setInfoMessage("");
          await sendResetPasswordEmail(normalizedEmail);
          setInfoMessage("パスワード再設定メールを送信しました。");
          return true;
        } catch (error) {
          console.error("[auth] send password reset email failed", error);
          setErrorMessage(toAuthErrorMessage(error, "パスワード再設定メールの送信に失敗しました。"));
          return false;
        }
      },
      signOut: async () => {
        if (!configured) return false;

        try {
          setErrorMessage("");
          setInfoMessage("");
          await signOutFirebase();
          return true;
        } catch (error) {
          console.error("[auth] sign-out failed", error);
          setErrorMessage("ログアウトに失敗しました。");
          return false;
        }
      },
      deleteAccount: async () => {
        if (!configured) return false;

        try {
          setErrorMessage("");
          setInfoMessage("");
          const token = await getCurrentUserIdToken(true);
          const response = await fetch("/api/account/delete", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? "アカウント削除に失敗しました。");
          }

          await signOutFirebase();
          setUser(null);
          setInfoMessage("アカウントを削除しました。");
          return true;
        } catch (error) {
          console.error("[auth] delete account failed", error);
          setErrorMessage(error instanceof Error ? error.message : "アカウント削除に失敗しました。");
          return false;
        }
      },
      dismissDailyPrompt: () => {
        setShowDailyPrompt(false);
      },
      clearError: () => {
        setErrorMessage("");
        setInfoMessage("");
      }
    }),
    [configured, errorMessage, infoMessage, isLoading, showDailyPrompt, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
