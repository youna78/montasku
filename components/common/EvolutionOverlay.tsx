"use client";

import { useEffect, useState } from "react";
import { getMonsterImage } from "@/lib/game/assets";

type Props = {
  previousMonsterName: string;
  nextMonsterName: string;
  previousMonsterId: number;
  nextMonsterId: number;
  onClose: () => void;
};

export function EvolutionOverlay({
  previousMonsterName,
  nextMonsterName,
  previousMonsterId,
  nextMonsterId,
  onClose
}: Props) {
  const [phase, setPhase] = useState<"prompt" | "animating" | "revealed">("prompt");

  useEffect(() => {
    if (phase !== "animating") return;

    const revealTimer = window.setTimeout(() => {
      setPhase("revealed");
    }, 1400);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, [phase]);

  const displayMonsterId = phase === "revealed" ? nextMonsterId : previousMonsterId;

  return (
    <div className="evolution-overlay">
      <div className="evolution-panel">
        <div className="title-panel small">しんかイベント</div>
        <div className={`evolution-scene phase-${phase}`}>
          <img
            src={getMonsterImage(displayMonsterId)}
            alt={phase === "revealed" ? nextMonsterName : previousMonsterName}
            className="evolution-monster"
          />
          <img src="/img/effect/fx_smoke_01.png" alt="smoke" className="evolution-smoke" />
          <img src="/img/effect/fx_star_set_01.png" alt="star" className="evolution-star star-a" />
          <img src="/img/effect/fx_star_set_02.png" alt="star" className="evolution-star star-b" />
          <img src="/img/effect/fx_star_set_03.png" alt="star" className="evolution-star star-c" />
          <img src="/img/effect/fx_star_set_04.png" alt="star" className="evolution-star star-d" />
        </div>
        <div className="rpg-dialogue-box evolution-dialogue">
          <p className="rpg-dialogue-text">
            {phase === "prompt"
              ? `おや、${previousMonsterName} のようすが...？`
              : phase === "animating"
                ? `${previousMonsterName} は まぶしいひかりに つつまれている！`
                : `${previousMonsterName} は ${nextMonsterName} に しんかした！`}
          </p>
        </div>
        {(phase === "prompt" || phase === "revealed") && (
          <div className="centered-button-wrap">
            <button
              className="primary ui-image-button"
              onClick={() => {
                if (phase === "prompt") {
                  setPhase("animating");
                  return;
                }
                onClose();
              }}
            >
              NEXT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
