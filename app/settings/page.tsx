"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { useGame } from "@/lib/game/useGame";

export default function SettingsPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading } = useGame();

  useEffect(() => {
    if (!gameState) return;
    if (gameState.birthEventPending && !gameState.hasCompletedInitialBirth) {
      router.replace("/birth-event");
      return;
    }
    if (!gameState.hasCompletedInitialBirth) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main className="page-shell">
      <div className="title-panel">設定</div>
      <section className="card">
        <Link href="/task-settings" className="ui-link-button ui-link-primary">
          タスク設定へ
        </Link>
      </section>
      <section className="card">
        <a href="https://example.com/task-request" target="_blank" rel="noreferrer" className="ui-link-button ui-link-secondary">
          タスク追加リクエスト
        </a>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
