import { Capacitor } from "@capacitor/core";

export function isNativeMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): string {
  return Capacitor.getPlatform();
}

export function getClientPlatform(): string {
  if (isNativeMobileApp()) {
    return getNativePlatform();
  }

  const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
  return userAgent.includes("android") ? "android" : "web";
}
