"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage, getRarityBadge, getStageBadge } from "@/lib/game/assets";
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
    if (!gameState.hasSeenTutorial) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  if (!Number.isFinite(monsterId)) {
    return (
      <main>
        <h1>図鑑詳細</h1>
        <section className="card">
          <p>不正なモンスターIDです。</p>
          <Link href="/dex">図鑑へ戻る</Link>
        </section>
        <DevDebugPanel gameState={gameState} monsters={monsters} />
        <BottomNav />
      </main>
    );
  }

  if (!gameState.discoveredMonsterIds.includes(monsterId)) {
    return (
      <main>
        <h1>図鑑詳細</h1>
        <section className="card">
          <p>未取得のモンスターです。</p>
          <Link href="/dex">図鑑へ戻る</Link>
        </section>
        <DevDebugPanel gameState={gameState} monsters={monsters} />
        <BottomNav />
      </main>
    );
  }

  const monster = monsters.find((m) => m.monsterId === monsterId);
  const rarityBadge = getRarityBadge(monster?.rarity);
  const stageBadge = getStageBadge(monster?.stage);

  return (
    <main className="page-shell page-dex">
      <div className="title-panel">図鑑詳細</div>
      <section className="card decorated-card">
        <div className="monster-wrap">
          <img src={getMonsterImage(monster?.monsterId)} alt={monster?.name ?? "monster"} className="monster-img" />
        </div>
        <div className="badge-wrap">
          {stageBadge && <img src={stageBadge} alt="stage" className="badge-img" />}
          {rarityBadge && <img src={rarityBadge} alt="rarity" className="badge-img wide" />}
        </div>
        <h2>{monster?.name}</h2>
        <p>属性: {monster?.attribute}</p>
        <p>{monster?.description}</p>
        <Link href="/dex">図鑑へ戻る</Link>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
