"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BirthTransition } from "@/components/common/BirthTransition";
import { isNativeMobileApp } from "@/lib/platform/capacitor";
import { GameLoadingScreen } from "@/components/common/GameLoadingScreen";
import { useAuth } from "./AuthProvider";

export function NativeAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isConfigured } = useAuth();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [hasCheckedPlatform, setHasCheckedPlatform] = useState(false);

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    setHasCheckedPlatform(true);
  }, []);

  if (!hasCheckedPlatform || (isNativeApp && isConfigured && isLoading)) {
    if (pathname === "/birth-event") return <BirthTransition />;
    return <GameLoadingScreen message="ログイン状態を確認しています..." />;
  }

  return <>{children}</>;
}
