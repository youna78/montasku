"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { ATTRIBUTE_ICON_BY_KEY } from "@/lib/game/assets";
import { playSfx } from "@/lib/game/sfx";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import type { TaskMaster } from "@/types/master";

type EvolutionScene = {
  previousMonsterName: string;
  nextMonsterName: string;
  previousMonsterId: number;
  nextMonsterId: number;
};

export default function TasksPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, completeTask } = useGame();
  const [feedback, setFeedback] = useState<string>("");
  const [evolutionScene, setEvolutionScene] = useState<EvolutionScene | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
    if (!gameState.hasSeenTutorial && !gameState.isInTutorialFlow) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const activeTasks = gameState.activeTasks
    .filter((t) => t.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((active) => tasks.find((task) => task.taskId === active.taskId))
    .filter((task): task is TaskMaster => Boolean(task));

  const onComplete = (taskId: number) => {
    const result = completeTask(taskId);
    if (!result || result.alreadyCompleted) return;
    playSfx("s_Check");

    const fragments = [`EXP +${result.gainedExp}`];
    if (result.levelUp) fragments.push("LV UP");
    if (result.evolved) fragments.push("進化");
    if (result.nextState.endEventPending) fragments.push("お別れ");
    setFeedback(fragments.join(" / "));

    if (result.nextState.endEventPending) {
      window.setTimeout(() => {
        router.push("/end-event");
      }, 220);
      return;
    }

    if (result.nextState.birthEventPending) {
      window.setTimeout(() => {
        router.push("/birth-event");
      }, 220);
      return;
    }

    if (result.evolved) {
      const previousMonster = monsters.find((monster) => monster.monsterId === result.previousMonsterId);
      const nextMonster = monsters.find((monster) => monster.monsterId === result.nextMonsterId);
      setEvolutionScene({
        previousMonsterName: previousMonster?.name ?? "モンスター",
        nextMonsterName: nextMonster?.name ?? "モンスター",
        previousMonsterId: result.previousMonsterId,
        nextMonsterId: result.nextMonsterId
      });
    }
  };

  return (
    <main className="page-shell">
      <div className="title-panel">タスク</div>
      <section className="card decorated-card quest-heading-card">
        <p>各タスクは1日1回のみ達成できます。</p>
      </section>
      <section className="card decorated-card">
        <div className="task-global-menu">
          <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
            追加
          </Link>
          <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
            削除
          </Link>
          <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
            入れ替え
          </Link>
        </div>
      </section>

      {feedback && <div className="toast">{feedback}</div>}

      {activeTasks.map((task) => {
        const completed = gameState.completedTaskIdsToday.includes(task.taskId);

        return (
          <section className="card decorated-card" key={task.taskId}>
            <div className="row">
              <div>
                <div>{task.name}</div>
                <small className="task-meta">
                  <span>EXP +{task.baseExp}</span>
                  <span className="task-attr-chip">
                    <img src={ATTRIBUTE_ICON_BY_KEY.power} alt="power" className="attr-icon" />
                    {task.power}
                  </span>
                  <span className="task-attr-chip">
                    <img src={ATTRIBUTE_ICON_BY_KEY.heal} alt="heal" className="attr-icon" />
                    {task.heal}
                  </span>
                  <span className="task-attr-chip">
                    <img src={ATTRIBUTE_ICON_BY_KEY.knowledge} alt="knowledge" className="attr-icon" />
                    {task.knowledge}
                  </span>
                  <span className="task-attr-chip">
                    <img src={ATTRIBUTE_ICON_BY_KEY.create} alt="create" className="attr-icon" />
                    {task.create}
                  </span>
                </small>
              </div>
              <button className="primary" disabled={completed} onClick={() => onComplete(task.taskId)}>
                {completed ? "達成済み" : "達成"}
              </button>
            </div>
          </section>
        );
      })}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
      {evolutionScene && (
        <EvolutionOverlay
          previousMonsterName={evolutionScene.previousMonsterName}
          nextMonsterName={evolutionScene.nextMonsterName}
          previousMonsterId={evolutionScene.previousMonsterId}
          nextMonsterId={evolutionScene.nextMonsterId}
          onClose={() => setEvolutionScene(null)}
        />
      )}
    </main>
  );
}
