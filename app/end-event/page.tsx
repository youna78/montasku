"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getLetterItemImage, getMonsterImage, LETTER_ITEM_IMAGES } from "@/lib/game/assets";
import { useGame } from "@/lib/game/useGame";

export default function EndEventPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, finishEndEvent } = useGame();
  const [phase, setPhase] = useState<"farewell" | "letter">("farewell");
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!gameState) return;
    if (isFinishing) return;
    if (!gameState.endEventPending) {
      router.replace("/home");
    }
  }, [gameState, isFinishing, router]);

  useEffect(() => {
    if (!gameState?.endEventPending) return;
    setPhase("farewell");
  }, [gameState?.endEventPending]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const currentMonster = monsters.find((monster) => monster.monsterId === gameState.currentMonsterId);
  const dialogue =
    phase === "farewell"
      ? `${currentMonster?.name ?? "モンスター"} はここを去ったようだ。\nあれ、何かあるみたい。`
      : `てがみを てにいれた。\n${currentMonster?.name ?? "モンスター"} は タマゴを おいていったようだ。`;

  const finishAndNavigate = async (destination: "/home" | "/letters") => {
    if (isFinishing) return;
    setIsFinishing(true);
    await finishEndEvent();
    router.replace(destination);
  };

  const onContinue = async () => {
    if (phase === "farewell") {
      setPhase("letter");
      return;
    }
    await finishAndNavigate("/home");
  };

  return (
    <main className="page-shell page-home">
      <div className="title-panel">お別れイベント</div>
      <section className="card decorated-card">
        <div className={`end-scene phase-${phase}`}>
          <img src="/img/effect/fx_smoke_01.png" alt="smoke" className="end-smoke" />
          <img src={getLetterItemImage(LETTER_ITEM_IMAGES[0])} alt="letter" className="end-letter" />
          <img src={getMonsterImage(1)} alt="new egg" className="end-egg" />
        </div>
        <div className="rpg-dialogue-box">
          <p className="rpg-dialogue-text">{dialogue}</p>
        </div>
        <div className="centered-button-wrap end-event-actions">
          <button className="primary ui-image-button" onClick={onContinue} disabled={isFinishing}>
            {isFinishing ? "保存中..." : phase === "farewell" ? "ネクスト" : "新しいタマゴへ"}
          </button>
          {phase === "letter" && (
            <button className="quest-btn quest-btn-secondary end-event-letter-button" onClick={() => finishAndNavigate("/letters")} disabled={isFinishing}>
              手紙を見る
            </button>
          )}
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
