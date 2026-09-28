"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { useGame } from "@/lib/game/useGame";

export default function TutorialPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, startTutorialFlow, skipTutorial } = useGame();

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
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <div className="auth-email-modal-overlay tutorial-choice-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-choice-title">
        <div className="card decorated-card auth-email-modal-card tutorial-choice-card">
          <h2 id="tutorial-choice-title" className="auth-email-modal-title">
            チュートリアルを始めますか？
          </h2>
          <img className="tutorial-choice-egg" src={getMonsterImage(1)} alt="タマゴ" />
          <p className="tutorial-choice-copy">
            はじめて遊ぶ方には、タマゴの育て方をご案内します。
            Web版などで遊んだことがある方は、スキップしてすぐに始められます。
          </p>
          <div className="tutorial-choice-actions">
            <button
              className="quest-btn quest-btn-primary"
              onClick={() => {
                startTutorialFlow();
                router.push("/tutorial-egg");
              }}
            >
              チュートリアルを始める
            </button>
            <button
              className="quest-btn quest-btn-secondary"
              onClick={() => {
                skipTutorial();
                router.push("/home");
              }}
            >
              スキップしてホームへ
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
