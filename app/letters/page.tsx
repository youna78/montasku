"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getLetterItemImage, getMonsterImage } from "@/lib/game/assets";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function LettersPage() {
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
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">てがみ</div>
      <section className="card decorated-card">
        {gameState.acquiredLetters.length === 0 ? (
          <div className="empty-quests-wrap">
            <div>まだ てがみは ありません。</div>
          </div>
        ) : (
          <div className="letter-list">
            {gameState.acquiredLetters
              .slice()
              .reverse()
              .map((letter) => (
                <article key={letter.letterId} className="letter-card">
                  <div className="letter-card-head">
                    <img src={getLetterItemImage(letter.imagePath)} alt={letter.title} className="letter-list-icon" />
                    <div>
                      <strong>{letter.title}</strong>
                      <div className="letter-meta">{letter.obtainedDate}</div>
                      <div className="letter-meta row-tight">
                        <img src={getMonsterImage(letter.fromMonsterId)} alt={letter.fromMonsterName} className="quest-icon" />
                        <span>{letter.fromMonsterName}</span>
                      </div>
                    </div>
                  </div>
                  <p className="letter-body">{letter.body}</p>
                </article>
              ))}
          </div>
        )}
      </section>
      <section className="card decorated-card">
        <div className="settings-links centered-actions">
          <Link href="/settings" className="ui-link-button quest-btn quest-btn-secondary">
            設定へ戻る
          </Link>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
