"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { useGame } from "@/lib/game/useGame";

export default function TutorialPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, startTutorialFlow } = useGame();

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
    if (gameState.hasSeenTutorial) {
      router.replace("/home");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main className="page-shell page-tutorial">
      <div className="logo-wrap logo-wrap-tutorial">
        <img src="/img/branding/logo_title_main_01.png" alt="title" className="logo-title" />
      </div>
      <section className="card decorated-card">
        <div className="title-panel small">チュートリアル</div>
        <p>タスクを達成して、モンスターを育てるアプリです。</p>
        <p>まずは3つタスクを達成してタマゴを孵化させましょう。</p>
        <div className="centered-button-wrap">
          <button
            className="primary ui-image-button"
            onClick={() => {
              startTutorialFlow();
              router.push("/tutorial-egg");
            }}
          >
            はじめる
          </button>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
