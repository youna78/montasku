"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { ATTRIBUTE_ICON_BY_KEY, getMonsterImage, getStageBadge } from "@/lib/game/assets";
import { progressToNextLevel } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function HomePage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading } = useGame();

  useEffect(() => {
    if (!gameState) return;
    if (gameState.birthEventPending && !gameState.hasCompletedInitialBirth) {
      router.replace("/birth-event");
      return;
    }
    if (!gameState.hasCompletedInitialBirth) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const activeTaskIdsInOrder = gameState.activeTasks
    .filter((t) => t.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => t.taskId);

  const remainingTasks = activeTaskIdsInOrder
    .map((taskId) => tasks.find((task) => task.taskId === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task))
    .filter((task) => !gameState.completedTaskIdsToday.includes(task.taskId));

  const progress = progressToNextLevel(gameState.currentMonsterLevel, gameState.currentMonsterExp);
  const totalAttr =
    gameState.attributeTotals.power +
    gameState.attributeTotals.heal +
    gameState.attributeTotals.knowledge +
    gameState.attributeTotals.create;

  const bars: Array<{ key: keyof typeof ATTRIBUTE_ICON_BY_KEY; label: string; value: number; className: string }> = [
    { key: "power", label: "Power", value: gameState.attributeTotals.power, className: "bar-power" },
    { key: "heal", label: "Heal", value: gameState.attributeTotals.heal, className: "bar-heal" },
    { key: "knowledge", label: "Knowledge", value: gameState.attributeTotals.knowledge, className: "bar-knowledge" },
    { key: "create", label: "Create", value: gameState.attributeTotals.create, className: "bar-create" }
  ];

  const stageBadge = getStageBadge(currentMonster?.stage);

  return (
    <main className="page-shell page-home">
      <div className="title-panel">ホーム</div>

      <section className="card decorated-card">
        <div className="monster-wrap">
          <img src={getMonsterImage(currentMonster?.monsterId)} alt={currentMonster?.name ?? "monster"} className="monster-img" />
        </div>
        {stageBadge && (
          <div className="badge-wrap">
            <img src={stageBadge} alt="stage" className="badge-img" />
          </div>
        )}
        <div>現在のモンスター: {currentMonster?.name ?? "-"}</div>
        <div>Lv: {gameState.currentMonsterLevel}</div>
        <div>
          EXP: {progress.current} / {progress.required}
        </div>
        <div>今日のEXP: {gameState.todayExp}</div>
        <div>連続ログイン: {gameState.streakDays}日</div>
      </section>

      <section className="card decorated-card">
        <h2>属性バー</h2>
        {bars.map((bar) => (
          <div className="attr-item" key={bar.key}>
            <div className="row">
              <span className="attr-label">
                <img src={ATTRIBUTE_ICON_BY_KEY[bar.key]} alt={bar.label} className="attr-icon" />
                {bar.label}
              </span>
              <span>{bar.value}</span>
            </div>
            <div className="bar-track">
              <div className={`bar-fill ${bar.className}`} style={{ width: `${toPercent(bar.value, totalAttr)}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="card decorated-card">
        <h2>未達成タスク (最大3件)</h2>
        {remainingTasks.length === 0 ? (
          <div className="empty-quests-wrap">
            <img src="/img/illustration/empty_state_quests_01.png" alt="all done" className="empty-quests-img" />
            <div>今日の有効タスクはすべて達成済みです。</div>
          </div>
        ) : (
          <ul>
            {remainingTasks.slice(0, 3).map((task) => (
              <li key={task.taskId}>{task.name}</li>
            ))}
          </ul>
        )}
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
