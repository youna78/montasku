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
  const appPlatform = getAnalyticsPlatform();
  window.gtag("event", eventName, {
    app_platform: appPlatform,
    ...params
  });

  if (eventName === "shop_purchase") {
    const currencyType = params.currency_type;
    window.gtag("event", "spend_virtual_currency", {
      app_platform: appPlatform,
      item_id: params.item_id,
      item_name: params.item_name ?? params.item_id,
      item_type: params.item_type,
      event_id: params.event_id,
      virtual_currency_name: currencyType === "paid_coin" ? "モンタコイン" : "フリーコイン",
      value: params.price
    });
  }
}
