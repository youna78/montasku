"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/platform/capacitor";
import { useAuth } from "./AuthProvider";

export function NativeAuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isConfigured } = useAuth();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [hasCheckedPlatform, setHasCheckedPlatform] = useState(false);

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    setHasCheckedPlatform(true);
  }, []);

  if (!hasCheckedPlatform || (isNativeApp && isConfigured && isLoading)) {
    return <main className="page-shell"><div className="card decorated-card auth-card-message auth-card-message-centered">ログイン状態を確認しています...</div></main>;
  }

  return <>{children}</>;
}
