"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { useGame } from "@/lib/game/useGame";

export default function BirthEventPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, finishBirthEvent } = useGame();

  useEffect(() => {
    if (!gameState) return;
    if (!gameState.birthEventPending || gameState.hasCompletedInitialBirth) {
      router.replace("/home");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const bornMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);

  const onContinue = () => {
    finishBirthEvent();
    router.push("/home");
  };

  return (
    <main className="page-shell page-birth">
      <div className="title-panel">誕生イベント</div>
      <section className="card decorated-card">
        <div className="birth-wrap">
          <img src="/img/ui/ui_egg_symbol_01.png" alt="egg" className="birth-img small" />
          <img src="/img/effect/effect_smoke_01.png" alt="smoke" className="birth-img small" />
          <img src="/img/ui/fx_levelup_01.png" alt="light" className="birth-img small" />
        </div>
        <p>タマゴが光りはじめた...</p>
        <div className="monster-wrap">
          <img src={getMonsterImage(bornMonster?.monsterId)} alt={bornMonster?.name ?? "monster"} className="monster-img" />
        </div>
        <p style={{ textAlign: "center" }}>{bornMonster?.name ?? "スライム"} が誕生した！</p>
        <button className="primary ui-image-button" onClick={onContinue}>
          ホームへ
        </button>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
