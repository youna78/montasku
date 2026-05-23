"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { isEventMonster } from "@/lib/game/events";
import { getFrameThemeClass } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function DexDetailPage() {
  const router = useRouter();
  const params = useParams<{ monsterId: string }>();
  const { monsters, gameState, isLoading } = useGame();

  const monsterIdParam = Array.isArray(params?.monsterId) ? params.monsterId[0] : params?.monsterId;
  const monsterId = Number(monsterIdParam);

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

  if (!Number.isFinite(monsterId)) {
    return (
      <main className={`page-shell page-rpg page-dex ${getFrameThemeClass(gameState.selectedFrameId)}`}>
        <div className="title-panel">図鑑詳細</div>
        <section className="card decorated-card dex-detail-card">
          <h2 className="screen-section-title">図鑑詳細</h2>
          <p>不正なモンスターIDです。</p>
          <div className="settings-links rpg-link-grid section-bottom-action">
            <Link href="/dex" className="ui-link-button quest-btn quest-btn-secondary">
              図鑑へ戻る
            </Link>
          </div>
        </section>
        <DevDebugPanel gameState={gameState} monsters={monsters} />
        <BottomNav />
      </main>
    );
  }

  if (!gameState.discoveredMonsterIds.includes(monsterId)) {
    return (
      <main className={`page-shell page-rpg page-dex ${getFrameThemeClass(gameState.selectedFrameId)}`}>
        <div className="title-panel">図鑑詳細</div>
        <section className="card decorated-card dex-detail-card">
          <h2 className="screen-section-title">図鑑詳細</h2>
          <p>未取得のモンスターです。</p>
          <div className="settings-links rpg-link-grid section-bottom-action">
            <Link href="/dex" className="ui-link-button quest-btn quest-btn-secondary">
              図鑑へ戻る
            </Link>
          </div>
        </section>
        <DevDebugPanel gameState={gameState} monsters={monsters} />
        <BottomNav />
      </main>
    );
  }

  const monster = monsters.find((m) => m.monsterId === monsterId);
  return (
    <main className={`page-shell page-rpg page-dex ${getFrameThemeClass(gameState.selectedFrameId)}`}>
      <div className="title-panel">図鑑詳細</div>
      <section className="card decorated-card dex-detail-card">
        <h2 className="screen-section-title">モンスター詳細</h2>
        <div className="home-stage-layout dex-detail-stage-layout">
          <div className="monster-stage dex-detail-stage">
            <div className="monster-wrap dex-detail-monster-wrap">
              <img src={getMonsterImage(monster?.monsterId)} alt={monster?.name ?? "monster"} className="monster-img dex-detail-monster-image" />
            </div>
          </div>
        </div>
        {monster && isEventMonster(monster.monsterId) && <p className="event-monster-note">春イベント限定モンスター</p>}
        <div className="status-panel compact-status-panel dex-detail-status">
          <div className="status-row">
            <span>名前</span>
            <strong>{monster?.name}</strong>
          </div>
          <div className="status-row">
            <span>No.</span>
            <strong>#{monster?.monsterId}</strong>
          </div>
          <div className="status-row">
            <span>成長段階</span>
            <strong>{monster?.stage}</strong>
          </div>
          <div className="status-row">
            <span>レア度</span>
            <strong>{monster?.rarity}</strong>
          </div>
          <div className="status-row">
            <span>属性</span>
            <strong>{monster?.attribute}</strong>
          </div>
          <div className="status-row dex-detail-description-row">
            <span>説明</span>
            <strong>{monster?.description}</strong>
          </div>
        </div>
        <div className="settings-links rpg-link-grid section-bottom-action dex-detail-actions">
          <Link href="/dex" className="ui-link-button quest-btn quest-btn-secondary">
            図鑑へ戻る
          </Link>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
