"use client";

import { getAnalyticsPlatform } from "@/lib/platform/capacitor";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, unknown>;

export function trackEvent(eventName: string, params: EventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, {
    app_platform: getAnalyticsPlatform(),
    ...params
  });
}
