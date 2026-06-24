"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { ATTRIBUTE_ICON_BY_KEY, getMonsterImage } from "@/lib/game/assets";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
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

const TASK_FREE_COINS = 2;

export default function TasksPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, completeTask } = useGame();
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [pendingRewardRedirect, setPendingRewardRedirect] = useState(false);
  const [evolutionScene, setEvolutionScene] = useState<EvolutionScene | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback, feedbackKey]);

  useEffect(() => {
    if (!gameState) return;
    if (pendingRewardRedirect) return;
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
  }, [gameState, pendingRewardRedirect, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const activeTasks = gameState.activeTasks
    .filter((t) => t.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((active) => tasks.find((task) => task.taskId === active.taskId))
    .filter((task): task is TaskMaster => Boolean(task));
  const isTutorialMode = !gameState.hasSeenTutorial || gameState.isInTutorialFlow;
  const currentMonster = monsters.find((monster) => monster.monsterId === gameState.currentMonsterId);
  const completedToday = activeTasks.filter((task) => gameState.completedTaskIdsToday.includes(task.taskId)).length;

  const onComplete = (taskId: number) => {
    const result = completeTask(taskId);
    if (!result || result.alreadyCompleted) return;
    playSfx("s_Check");

    const fragments = [`EXP +${result.gainedExp}`, `コイン +${result.gainedFreeCoins}`];
    trackEvent("coin_earned", {
      source: "task_complete",
      amount: result.gainedFreeCoins,
      task_id: taskId
    });
    if (result.levelUp) fragments.push("LV UP");
    if (result.evolved) fragments.push("進化");
    if (result.nextState.endEventPending) fragments.push("お別れ");
    setFeedback(fragments.join(" / "));
    setFeedbackKey((current) => current + 1);

    if (result.nextState.endEventPending) {
      setPendingRewardRedirect(true);
      window.setTimeout(() => {
        router.push("/end-event");
      }, 950);
      return;
    }

    if (result.nextState.birthEventPending) {
      setPendingRewardRedirect(true);
      window.setTimeout(() => {
        router.push("/birth-event");
      }, 950);
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
    <main
      className={`page-shell page-rpg page-tasks ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク</div>
      <section className="card decorated-card screen-summary-card">
        <img src={getMonsterImage(currentMonster?.monsterId)} alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>今日のクエスト</strong>
          <span>各タスクは1日1回だけ達成できます。</span>
          <div className="task-progress-strip">
            <span>達成 {completedToday}/{activeTasks.length}</span>
            <span>無料コイン {gameState.freeCoins}</span>
            <Link href="/shop" className="task-summary-shop-button">
              ショップ
            </Link>
          </div>
        </div>
      </section>
      {!isTutorialMode && (
        <section className="card decorated-card">
          <div className="task-global-menu">
            <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
              追加
            </Link>
            <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
              削除
            </Link>
            <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
              並び替え
            </Link>
          </div>
        </section>
      )}

      {feedback && <div key={feedbackKey} className="reward-popup reward-popup-top home-reward-popup">{feedback}</div>}

      <section className="card decorated-card task-board-card">
        <h2 className="screen-section-title">クエスト一覧</h2>
        <ul className="quest-list">
          {activeTasks.map((task) => {
            const completed = gameState.completedTaskIdsToday.includes(task.taskId);

            return (
              <li className={`quest-item task-row-rpg ${completed ? "task-row-completed" : ""}`} key={task.taskId}>
                <div className="task-row-main">
                  <img src="/img/icon/sfc/sfc_task_01.png" alt="" className="quest-icon quest-icon-large" />
                  <div>
                    <div className="task-row-title">{task.name}</div>
                    <small className="task-meta">
                      <span className="task-reward-line">
                        <span className="task-reward-chip">EXP +{task.baseExp}</span>
                        <span className="task-reward-chip">
                          <img src="/img/icon/sfc/sfc_free_coin_01.png" alt="" className="task-reward-icon" />
                          コイン +{TASK_FREE_COINS}
                        </span>
                      </span>
                      <span className="task-stat-line">
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
                      </span>
                    </small>
                  </div>
                </div>
                <button className={`quest-btn ${completed ? "quest-btn-secondary" : "quest-btn-primary"}`} disabled={completed} onClick={() => onComplete(task.taskId)}>
                  {completed ? "達成済み" : "達成"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      {!isTutorialMode && <BottomNav />}
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
