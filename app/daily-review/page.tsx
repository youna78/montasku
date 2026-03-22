"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getInitialRoute } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function DailyReviewPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, resolveDailyReviewTask, skipDailyReview, finishDailyReview } = useGame();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1400);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!gameState) return;
    if (!gameState.pendingDailyReview || gameState.pendingDailyReview.skippedAt) {
      router.replace(getInitialRoute(gameState));
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const pending = gameState.pendingDailyReview;
  if (!pending || pending.skippedAt) {
    return <main>Loading...</main>;
  }

  const reviewTasks = pending.taskIds
    .map((taskId) => tasks.find((task) => task.taskId === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  const onAnswer = (taskId: number, didComplete: boolean) => {
    const result = resolveDailyReviewTask(taskId, didComplete);
    if (!result || !result.resolved) return;

    if (!didComplete) {
      setMessage("きろくしました");
      return;
    }

    const fragments = [`EXP +${result.gainedExp}`];
    if (result.levelUp) fragments.push("LV UP");
    if (result.evolved) fragments.push("進化");
    if (result.nextState.endEventPending) fragments.push("お別れ");
    setMessage(fragments.join(" / "));

    if (result.nextState.endEventPending) {
      window.setTimeout(() => router.push("/end-event"), 220);
    }
  };

  const onSkip = () => {
    skipDailyReview();
    router.push("/home");
  };

  const onFinish = () => {
    finishDailyReview();
    router.push(getInitialRoute({ ...gameState, pendingDailyReview: null }));
  };

  return (
    <main className="page-shell">
      <div className="title-panel">きのうのふりかえり</div>
      <section className="card decorated-card quest-heading-card">
        <p>{pending.targetDate} の未確認タスクです。できたかどうかを振り返りましょう。</p>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card">
        <ul className="quest-list">
          {reviewTasks.map((task) => {
            const resolved = pending.resolvedTaskIds.includes(task.taskId);
            const rewarded = pending.rewardedTaskIds.includes(task.taskId);

            return (
              <li key={task.taskId} className="quest-item review-task-item">
                <div className="review-task-main">
                  <span className="row-tight">
                    <img src="/img/icon/icon_quest_task_01.png" alt="quest" className="quest-icon" />
                    <span>{task.name}</span>
                  </span>
                  <small className="task-meta">EXP +{task.baseExp}</small>
                </div>
                <div className="review-task-actions">
                  <button className="quest-btn quest-btn-primary review-answer-button" onClick={() => onAnswer(task.taskId, true)} disabled={resolved}>
                    できた
                  </button>
                  <button className="quest-btn quest-btn-secondary review-answer-button" onClick={() => onAnswer(task.taskId, false)} disabled={resolved}>
                    できなかった
                  </button>
                </div>
                {resolved && <div className="review-status-text">{rewarded ? "報酬付与ずみ" : "記録ずみ"}</div>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card decorated-card">
        <div className="task-global-menu">
          <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={onSkip}>
            あとで
          </button>
          <button className="quest-btn task-global-menu-button task-global-menu-button-primary task-global-menu-button-wide" onClick={onFinish}>
            確認を終える
          </button>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
