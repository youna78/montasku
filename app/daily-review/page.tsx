"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { getInitialRoute } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function DailyReviewPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, resolveDailyReviewTask, skipDailyReview, finishDailyReview } = useGame();
  const [message, setMessage] = useState("");
  const [pendingEvolutionScene, setPendingEvolutionScene] = useState<{
    previousMonsterName: string;
    nextMonsterName: string;
    previousMonsterId: number;
    nextMonsterId: number;
  } | null>(null);
  const [activeEvolutionScene, setActiveEvolutionScene] = useState<{
    previousMonsterName: string;
    nextMonsterName: string;
    previousMonsterId: number;
    nextMonsterId: number;
  } | null>(null);
  const [afterEvolutionRoute, setAfterEvolutionRoute] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1400);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!gameState) return;
    if (!gameState.pendingDailyReview && !isLeaving && !pendingEvolutionScene && !activeEvolutionScene) {
      router.replace(getInitialRoute(gameState));
    }
  }, [activeEvolutionScene, gameState, isLeaving, pendingEvolutionScene, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const pending = gameState.pendingDailyReview;
  if (!pending) {
    return <main>Loading...</main>;
  }

  const reviewTasks = pending.taskIds
    .map((taskId) => tasks.find((task) => task.taskId === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  const onAnswer = (taskId: number, didComplete: boolean) => {
    const result = resolveDailyReviewTask(taskId, didComplete);
    if (!result || result.action === "noop") return;

    if (result.action === "cleared") {
      setMessage("");
      return;
    }

    if (!didComplete) {
      setMessage("");
      return;
    }

    const fragments = [`EXP +${result.gainedExp}`, `コイン +${result.gainedFreeCoins}`];
    trackEvent("coin_earned", {
      source: "daily_review",
      amount: result.gainedFreeCoins,
      task_id: taskId
    });
    if (result.levelUp) fragments.push("LV UP");
    if (result.evolved) fragments.push("進化");
    if (result.nextState.endEventPending) fragments.push("お別れ");
    setMessage(fragments.join(" / "));

    if (result.nextState.endEventPending) {
      window.setTimeout(() => router.push("/end-event"), 220);
      return;
    }

    if (result.evolved) {
      const previousMonster = monsters.find((monster) => monster.monsterId === result.previousMonsterId);
      const nextMonster = monsters.find((monster) => monster.monsterId === result.nextMonsterId);
      setPendingEvolutionScene({
        previousMonsterName: previousMonster?.name ?? "モンスター",
        nextMonsterName: nextMonster?.name ?? "モンスター",
        previousMonsterId: result.previousMonsterId,
        nextMonsterId: result.nextMonsterId
      });
    }
  };

  const leavePage = (nextRoute: string) => {
    if (pendingEvolutionScene) {
      setIsLeaving(false);
      setAfterEvolutionRoute(nextRoute);
      setActiveEvolutionScene(pendingEvolutionScene);
      return;
    }
    router.push(nextRoute);
  };

  const onSkip = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    await skipDailyReview();
    leavePage("/home");
  };

  const onFinish = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    await finishDailyReview();
    leavePage(getInitialRoute({ ...gameState, pendingDailyReview: null }));
  };

  return (
    <main
      className={`page-shell page-rpg page-daily-review ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">きのうのふりかえり</div>
      <section className="card decorated-card quest-heading-card">
        <p>{pending.targetDate} の未確認タスクです。できたかどうかを振り返りましょう。</p>
        {pending.skippedAt && <p className="review-resume-note">あとでにした確認です。ここから再開できます。</p>}
      </section>

      {message && <div className="reward-popup reward-popup-top">{message}</div>}

      <section className="card decorated-card">
        <ul className="quest-list">
          {reviewTasks.map((task) => {
            const resolved = pending.resolvedTaskIds.includes(task.taskId);
            const rewarded = pending.rewardedTaskIds.includes(task.taskId);
            const missed = resolved && !rewarded;

            return (
              <li key={task.taskId} className="quest-item review-task-item">
                <div className="review-task-main">
                  <span className="row-tight">
                    <img src="/img/icon/sfc/sfc_task_01.png" alt="quest" className="quest-icon" />
                    <span>{task.name}</span>
                  </span>
                  <small className="task-meta">EXP +{task.baseExp}</small>
                </div>
                <div className="review-task-actions">
                  <button
                    className={`quest-btn quest-btn-primary review-answer-button ${rewarded ? "review-answer-selected" : ""}`}
                    onClick={() => onAnswer(task.taskId, true)}
                  >
                    できた
                  </button>
                  <button
                    className={`quest-btn quest-btn-secondary review-answer-button ${missed ? "review-answer-selected" : ""}`}
                    onClick={() => onAnswer(task.taskId, false)}
                  >
                    できなかった
                  </button>
                </div>
                {resolved && <div className="review-status-text">選択中・もう一度押すと戻せます</div>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card decorated-card review-actions-card">
        <div className="task-global-menu">
          <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={onSkip} disabled={isLeaving}>
            あとで
          </button>
          <button className="quest-btn task-global-menu-button task-global-menu-button-primary task-global-menu-button-wide" onClick={onFinish} disabled={isLeaving}>
            確認を終える
          </button>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
      {isLeaving && (
        <div className="auth-email-modal-overlay" role="status" aria-live="polite">
          <div className="card decorated-card auth-email-modal-card">
            <p className="auth-email-modal-title">保存しています...</p>
          </div>
        </div>
      )}
      {activeEvolutionScene && (
        <EvolutionOverlay
          previousMonsterName={activeEvolutionScene.previousMonsterName}
          nextMonsterName={activeEvolutionScene.nextMonsterName}
          previousMonsterId={activeEvolutionScene.previousMonsterId}
          nextMonsterId={activeEvolutionScene.nextMonsterId}
          onClose={() => {
            setActiveEvolutionScene(null);
            setPendingEvolutionScene(null);
            if (afterEvolutionRoute) {
              const nextRoute = afterEvolutionRoute;
              setAfterEvolutionRoute(null);
              router.push(nextRoute);
            }
          }}
        />
      )}
    </main>
  );
}
