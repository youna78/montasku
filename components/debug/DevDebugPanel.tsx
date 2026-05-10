"use client";

import Link from "next/link";
import type { GameState } from "@/types/game";
import type { MonsterMaster } from "@/types/master";
import { getVirtualGameNow } from "@/lib/game/virtualTime";

type Props = {
  gameState: GameState;
  monsters: MonsterMaster[];
};

export function DevDebugPanel({ gameState, monsters }: Props) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const virtualNow = getVirtualGameNow();

  return (
    <section className="debug-panel">
      <strong>DEBUG</strong>
      <div>
        virtualNow: {virtualNow ?? "-"} / <Link href="/dev/calendar">検証カレンダー</Link>
      </div>
      <div>currentMonsterId: {gameState.currentMonsterId}</div>
      <div>currentMonsterName: {currentMonster?.name ?? "-"}</div>
      <div>currentMonsterLevel: {gameState.currentMonsterLevel}</div>
      <div>currentMonsterExp: {gameState.currentMonsterExp}</div>
      <div>freeCoins: {gameState.freeCoins}</div>
      <div>paidCoinBalance: {gameState.paidCoinBalance}</div>
      <div>selectedBackgroundId: {gameState.selectedBackgroundId}</div>
      <div>selectedFrameId: {gameState.selectedFrameId}</div>
      <div>todayExp: {gameState.todayExp}</div>
      <div>
        attributes: p={gameState.attributeTotals.power} h={gameState.attributeTotals.heal} k={gameState.attributeTotals.knowledge} c=
        {gameState.attributeTotals.create}
      </div>
      <div>completedTaskIdsToday: [{gameState.completedTaskIdsToday.join(", ")}]</div>
      <div>isInTutorialFlow: {String(gameState.isInTutorialFlow)}</div>
      <div>birthEventPending: {String(gameState.birthEventPending)}</div>
      <div>hasCompletedInitialBirth: {String(gameState.hasCompletedInitialBirth)}</div>
    </section>
  );
}
