import { Capacitor } from "@capacitor/core";

export function isNativeMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): string {
  return Capacitor.getPlatform();
}
