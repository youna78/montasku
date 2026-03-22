"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function SettingsPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading } = useGame();

  useEffect(() => {
    if (!gameState) return;
    if (gameState.endEventPending) {
      router.replace("/end-event");
      return;
    }
    if (gameState.birthEventPending) {
      router.replace("/birth-event");
      return;
    }
    if (shouldRouteToDailyReview(gameState)) {
      router.replace("/daily-review");
      return;
    }
    if (!gameState.hasSeenTutorial) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main className="page-shell">
      <div className="title-panel">設定</div>
      <AuthCard />
      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href="/task-settings" className="ui-link-button settings-menu-button settings-menu-button-primary">
            タスク設定へ
          </Link>
          <Link href="/letters" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            てがみ
          </Link>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSflbsd5RHq5IBKaTU7k6aIFPJjhk1GINQ0VqSjwSYRFBtUvJA/viewform?usp=publish-editor"
            target="_blank"
            rel="noreferrer"
            className="ui-link-button settings-menu-button settings-menu-button-accent"
          >
            タスク追加リクエスト
          </a>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
