"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { resolveEggEvolutionMonsterId } from "@/lib/game/evolution";
import { useGame } from "@/lib/game/useGame";

export default function BirthEventPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, finishBirthEvent } = useGame();
  const [hatchPhase, setHatchPhase] = useState<"egg" | "crack" | "born">("egg");

  useEffect(() => {
    if (!gameState) return;
    if (gameState.endEventPending) {
      router.replace("/end-event");
      return;
    }
    if (!gameState.birthEventPending) {
      router.replace("/home");
    }
  }, [gameState, router]);

  useEffect(() => {
    if (!gameState?.birthEventPending) return;
    setHatchPhase("egg");
    const crackTimer = window.setTimeout(() => setHatchPhase("crack"), 700);
    const bornTimer = window.setTimeout(() => setHatchPhase("born"), 1400);
    return () => {
      window.clearTimeout(crackTimer);
      window.clearTimeout(bornTimer);
    };
  }, [gameState?.birthEventPending]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const bornMonster =
    currentMonster?.stage === "egg"
      ? monsters.find(
          (monster) =>
            monster.monsterId ===
            resolveEggEvolutionMonsterId(currentMonster, gameState.attributeTotals, monsters)
        ) ?? currentMonster
      : currentMonster;
  const eventText =
    hatchPhase === "egg"
      ? "タマゴが揺れている..."
      : hatchPhase === "crack"
        ? "ピシッ...タマゴにヒビが入った！"
        : `${bornMonster?.name ?? "スライム"} が誕生した！`;

  const onContinue = () => {
    finishBirthEvent();
    router.push("/home");
  };

  return (
    <main className="page-shell page-birth">
      <div className="title-panel">誕生イベント</div>
      <section className="card decorated-card">
        <div className={`hatch-scene phase-${hatchPhase}`}>
          <img src="/img/ui/ui_hatch_symbol_01.png" alt="egg" className="hatch-egg" />
          <img src="/img/effect/fx_smoke_01.png" alt="smoke" className="hatch-smoke" />
          <img src={getMonsterImage(bornMonster?.monsterId)} alt={bornMonster?.name ?? "monster"} className="hatch-monster" />
        </div>
        <p style={{ textAlign: "center" }}>{eventText}</p>
        <div className="centered-button-wrap">
          <button className="primary ui-image-button" onClick={onContinue}>
            ホームへ
          </button>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
