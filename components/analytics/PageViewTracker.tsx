"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalyticsPlatform } from "@/lib/platform/capacitor";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type PageViewTrackerProps = {
  measurementId: string;
};

export function PageViewTracker({ measurementId }: PageViewTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !window.gtag) return;

    const query = searchParams?.toString() ?? "";
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", measurementId, {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      app_platform: getAnalyticsPlatform()
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}
