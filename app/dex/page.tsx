"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage, getRarityBadge } from "@/lib/game/assets";
import { isEventMonster } from "@/lib/game/events";
import { getFrameThemeClass } from "@/lib/game/shop";
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

  const discoveredCount = gameState.discoveredMonsterIds.length;

  return (
    <main className={`page-shell page-rpg page-dex ${getFrameThemeClass(gameState.selectedFrameId)}`}>
      <div className="title-panel">図鑑</div>
      <section className="card decorated-card screen-summary-card">
        <img src="/img/icon/sfc/sfc_dex_01.png" alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>モンスター図鑑</strong>
          <span>出会ったモンスターの記録を見返せます。</span>
          <div className="task-progress-strip">
            <span>発見 {discoveredCount}/{monsters.length}</span>
            <span>イベント限定も記録</span>
          </div>
        </div>
      </section>
      <section className="card decorated-card dex-board-card">
        <h2 className="screen-section-title">発見した仲間</h2>
        {monsters.map((monster) => {
          const unlocked = gameState.discoveredMonsterIds.includes(monster.monsterId);
          const rarityBadge = getRarityBadge(monster.rarity);
          return (
            <div key={monster.monsterId} className={`dex-row dex-row-rpg ${unlocked ? "" : "dex-row-locked"}`}>
              <span className="dex-number">#{monster.monsterId}</span>
              <img
                src={unlocked ? getMonsterImage(monster.monsterId) : "/img/ui/ui_shadow_fallback_01.png"}
                alt={unlocked ? monster.name : "unknown"}
                className="dex-monster-thumb"
              />
              <div className="dex-row-main">
                {unlocked ? <Link href={`/dex/${monster.monsterId}`}>{monster.name}</Link> : <span>???</span>}
                {unlocked ? (
                  <>
                    {rarityBadge && <img src={rarityBadge} alt={monster.rarity} className="rarity-badge-small" />}
                    {isEventMonster(monster.monsterId) && <span className="event-dex-badge">イベント限定</span>}
                  </>
                ) : (
                  <>
                    <span className="dex-unknown-badge">未発見</span>
                    <small className="dex-row-subtext">まだ記録がありません</small>
                  </>
                )}
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
