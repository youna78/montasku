"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNativeMobileApp } from "@/lib/platform/capacitor";
import { useAuth } from "./AuthProvider";

const PUBLIC_NATIVE_PATHS = ["/settings", "/privacy", "/terms", "/contact", "/commerce"];

function isPublicNativePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_NATIVE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function NativeAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isConfigured } = useAuth();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [hasCheckedPlatform, setHasCheckedPlatform] = useState(false);

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    setHasCheckedPlatform(true);
  }, []);

  useEffect(() => {
    if (!hasCheckedPlatform || !isNativeApp || isLoading || user) return;
    if (isPublicNativePath(pathname)) return;

    router.replace("/settings?account_required=1");
  }, [hasCheckedPlatform, isNativeApp, isLoading, pathname, router, user]);

  if (!hasCheckedPlatform || (isNativeApp && isConfigured && isLoading)) {
    return <main className="page-shell"><div className="card decorated-card auth-card-message auth-card-message-centered">ログイン状態を確認しています...</div></main>;
  }

  if (isNativeApp && !user && !isPublicNativePath(pathname)) {
    return <main className="page-shell"><div className="card decorated-card auth-card-message auth-card-message-centered">Androidアプリ版はログインが必要です。</div></main>;
  }

  return <>{children}</>;
}
