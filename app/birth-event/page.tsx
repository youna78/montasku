"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BirthTransition } from "@/components/common/BirthTransition";
import { BirthEventFrame } from "@/components/common/BirthEventFrame";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getBirthEggMonster } from "@/lib/game/birthEgg";
import { resolveEggEvolutionMonsterId } from "@/lib/game/evolution";
import { isOctoberUiEnabled } from "@/lib/game/octoberUi";
import { useGame } from "@/lib/game/useGame";

export default function BirthEventPage() {
  const router = useRouter();
  const octoberUi = isOctoberUiEnabled();
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
    return <BirthTransition currentMonsterId={gameState?.currentMonsterId} monsters={monsters} />;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const birthEgg = getBirthEggMonster(gameState.currentMonsterId, monsters);
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
    if (octoberUi && (hatchPhase !== "born" || !gameState.birthEventPending)) return;
    finishBirthEvent();
    router.push("/home");
  };

  return (
    <BirthEventFrame footer={<>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      {!octoberUi && <BottomNav />}
    </>}>
        <div className={`hatch-scene phase-${hatchPhase}`}>
          {birthEgg && <img src={getMonsterImage(birthEgg.monsterId)} alt={birthEgg.name} className="hatch-egg" />}
          <img src="/img/effect/fx_smoke_01.png" alt="smoke" className="hatch-smoke" />
          <img src={getMonsterImage(bornMonster?.monsterId)} alt={bornMonster?.name ?? "monster"} className="hatch-monster" />
        </div>
        <p role="status" className="birth-event-status">{eventText}</p>
        <p className="birth-event-guide" aria-hidden={!octoberUi || hatchPhase !== "born"} style={{ visibility: octoberUi && hatchPhase === "born" ? "visible" : "hidden" }}>タスクを達成すると、この子が育つよ。</p>
        <div className="centered-button-wrap">
          <button className="primary ui-image-button" onClick={onContinue} disabled={octoberUi && hatchPhase !== "born"}>
            {octoberUi ? hatchPhase === "born" ? "一緒に育てる" : "もうすぐ生まれるよ…" : "ホームへ"}
          </button>
        </div>
    </BirthEventFrame>
  );
}
