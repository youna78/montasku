"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { useGame } from "@/lib/game/useGame";

export default function TutorialEggPage() {
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
    if (!gameState.isInTutorialFlow && !gameState.hasSeenTutorial) {
      router.replace("/tutorial");
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
      <div className="title-panel">タマゴ</div>
      <section className="card decorated-card">
        <div className="monster-wrap">
          <img src={getMonsterImage(1)} alt="egg" className="monster-img" />
        </div>
        <p>このタマゴは、あなたの行動で育ちます。</p>
        <p>タスクを3つ達成して誕生イベントを見ましょう。</p>
        <div className="centered-button-wrap">
          <button className="primary ui-image-button" onClick={() => router.push("/tasks")}>
            タスクへ
          </button>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
