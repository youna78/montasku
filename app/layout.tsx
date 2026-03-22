import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { GuestLoginPrompt } from "@/components/auth/GuestLoginPrompt";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={dotGothic16.variable}>
      <body>
        <AuthProvider>
          {children}
          <GuestLoginPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
