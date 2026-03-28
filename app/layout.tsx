import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { GuestLoginPrompt } from "@/components/auth/GuestLoginPrompt";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import "./globals.css";

const dotGothic16 = localFont({
  src: "../DotGothic16/DotGothic16-Regular.ttf",
  variable: "--font-dot-gothic16",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Habit Monster MVP",
  description: "Task-based monster growth MVP"
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={dotGothic16.variable}>
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2764076693225531"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {gaMeasurementId ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}
        <AuthProvider>
          {gaMeasurementId ? (
            <Suspense fallback={null}>
              <PageViewTracker measurementId={gaMeasurementId} />
            </Suspense>
          ) : null}
          {children}
          <GuestLoginPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
