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

type ReviewSelections = Record<number, boolean>;

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
  const [reviewSelections, setReviewSelections] = useState<ReviewSelections>({});

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1400);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!gameState) return;
    if (activeEvolutionScene) return;
    if (!gameState.pendingDailyReview) {
      router.replace(getInitialRoute(gameState));
    }
  }, [activeEvolutionScene, gameState, router]);

  useEffect(() => {
    const pendingReview = gameState?.pendingDailyReview;
    if (!pendingReview) {
      setReviewSelections({});
      return;
    }

    setReviewSelections((current) => {
      const next: ReviewSelections = {};
      for (const taskId of pendingReview.taskIds) {
        if (pendingReview.resolvedTaskIds.includes(taskId)) {
          next[taskId] = pendingReview.rewardedTaskIds.includes(taskId);
        } else if (taskId in current) {
          next[taskId] = current[taskId];
        }
      }
      return next;
    });
  }, [gameState?.pendingDailyReview?.targetDate, gameState?.pendingDailyReview?.taskIds, gameState?.pendingDailyReview?.resolvedTaskIds, gameState?.pendingDailyReview?.rewardedTaskIds]);

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
  const selectedTaskIds = reviewTasks
    .map((task) => task.taskId)
    .filter((taskId) => taskId in reviewSelections || pending.resolvedTaskIds.includes(taskId));
  const reviewProgressCount = new Set(selectedTaskIds).size;

  const onAnswer = (taskId: number, didComplete: boolean) => {
    if (pending.resolvedTaskIds.includes(taskId)) return;
    setReviewSelections((current) => ({ ...current, [taskId]: didComplete }));
    setMessage("選び直せます");
  };

  const leavePage = (nextRoute: string) => {
    if (pendingEvolutionScene) {
      setAfterEvolutionRoute(nextRoute);
      setActiveEvolutionScene(pendingEvolutionScene);
      return;
    }
    router.push(nextRoute);
  };

  const onSkip = () => {
    skipDailyReview();
    leavePage("/home");
  };

  const onFinish = () => {
    let nextRoute: string = getInitialRoute({ ...gameState, pendingDailyReview: null });
    let nextEvolutionScene: typeof pendingEvolutionScene = null;

    for (const task of reviewTasks) {
      if (pending.resolvedTaskIds.includes(task.taskId)) continue;
      if (!(task.taskId in reviewSelections)) continue;

      const result = resolveDailyReviewTask(task.taskId, reviewSelections[task.taskId]);
      if (!result || !result.resolved) continue;

      if (result.rewarded) {
        trackEvent("coin_earned", {
          source: "daily_review",
          amount: result.gainedFreeCoins,
          task_id: task.taskId
        });
      }

      if (result.nextState.endEventPending) {
        nextRoute = "/end-event";
      }

      if (result.evolved) {
        const previousMonster = monsters.find((monster) => monster.monsterId === result.previousMonsterId);
        const nextMonster = monsters.find((monster) => monster.monsterId === result.nextMonsterId);
        nextEvolutionScene = {
          previousMonsterName: previousMonster?.name ?? "モンスター",
          nextMonsterName: nextMonster?.name ?? "モンスター",
          previousMonsterId: result.previousMonsterId,
          nextMonsterId: result.nextMonsterId
        };
      }
    }

    finishDailyReview();
    if (nextEvolutionScene) {
      setAfterEvolutionRoute(nextRoute);
      setActiveEvolutionScene(nextEvolutionScene);
      return;
    }
    leavePage(nextRoute);
  };

  return (
    <main
      className={`page-shell page-rpg page-daily-review ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">きのうのふりかえり</div>
      <section className="card decorated-card screen-summary-card">
        <img src="/img/icon/generated_sfc/icon_sfc_letter_01.png" alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>未確認クエスト</strong>
          <span>{pending.targetDate} のタスクを振り返りましょう。</span>
          <div className="task-progress-strip">
            <span>確認 {reviewProgressCount}/{reviewTasks.length}</span>
          </div>
        </div>
        {pending.skippedAt && <p className="review-resume-note">あとでにした確認です。ここから再開できます。</p>}
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card task-board-card">
        <h2 className="screen-section-title">ふりかえりリスト</h2>
        <ul className="quest-list">
          {reviewTasks.map((task) => {
            const resolved = pending.resolvedTaskIds.includes(task.taskId);
            const rewarded = pending.rewardedTaskIds.includes(task.taskId);
            const selected = reviewSelections[task.taskId];

            return (
              <li key={task.taskId} className={`quest-item review-task-item ${selected === true ? "review-task-done" : ""} ${selected === false ? "review-task-missed" : ""}`}>
                <div className="review-task-main">
                  <span className="row-tight">
                    <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="quest-icon quest-icon-large" />
                    <span>{task.name}</span>
                  </span>
                  <small className="task-meta">EXP +{task.baseExp}</small>
                </div>
                <div className="review-task-actions">
                  <button className={`quest-btn quest-btn-primary review-answer-button ${selected === true ? "review-answer-selected" : ""}`} onClick={() => onAnswer(task.taskId, true)} disabled={resolved}>
                    {selected === true ? "できた選択中" : selected === false ? "できたに変更" : "できた"}
                  </button>
                  <button className={`quest-btn quest-btn-secondary review-answer-button ${selected === false ? "review-answer-selected" : ""}`} onClick={() => onAnswer(task.taskId, false)} disabled={resolved}>
                    {selected === false ? "できなかった選択中" : selected === true ? "できなかったに変更" : "できなかった"}
                  </button>
                </div>
                {(resolved || selected !== undefined) && <div className="review-status-text">{resolved ? (rewarded ? "報酬付与ずみ" : "記録ずみ") : "選択中・変更できます"}</div>}
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
