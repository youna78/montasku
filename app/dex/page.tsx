"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage, getRarityBadge } from "@/lib/game/assets";
import { getEventForMonster } from "@/lib/game/events";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function DexPage() {
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
    <main className="page-shell page-dex">
      <div className="title-panel">図鑑</div>
      <section className="card decorated-card">
        {monsters.map((monster) => {
          const unlocked = gameState.discoveredMonsterIds.includes(monster.monsterId);
          const rarityBadge = getRarityBadge(monster.rarity);
          const eventConfig = getEventForMonster(monster.monsterId);
          return (
            <div key={monster.monsterId} className="dex-row">
              <span>#{monster.monsterId}</span>
              <img
                src={unlocked ? getMonsterImage(monster.monsterId) : "/img/ui/ui_shadow_fallback_01.png"}
                alt={unlocked ? monster.name : "unknown"}
                className="dex-monster-thumb"
              />
              <div className="dex-row-main">
                {unlocked ? <Link href={`/dex/${monster.monsterId}`}>{monster.name}</Link> : <span>???</span>}
                {unlocked && rarityBadge && <img src={rarityBadge} alt={monster.rarity} className="rarity-badge-small" />}
                {unlocked && eventConfig && <span className="event-dex-badge">{eventConfig.name}</span>}
              </div>
            </div>
          );
        })}
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
