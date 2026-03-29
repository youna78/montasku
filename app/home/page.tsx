"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { ATTRIBUTE_ICON_BY_KEY, getMonsterImage, getStageBadge } from "@/lib/game/assets";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { playSfx } from "@/lib/game/sfx";
import { progressToNextLevel, shouldRouteToDailyReview } from "@/lib/game/state";
import { resolveLevelFromExp } from "@/lib/game/leveling";
import { useGame } from "@/lib/game/useGame";

type EvolutionScene = {
  previousMonsterName: string;
  nextMonsterName: string;
  previousMonsterId: number;
  nextMonsterId: number;
};

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function HomePage() {
  const router = useRouter();
  const { tasks, monsters, levelingRows, gameState, isLoading, completeTask } = useGame();
  const [feedback, setFeedback] = useState("");
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
    if (!gameState.hasSeenTutorial) {
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

  const progress = progressToNextLevel(gameState.currentMonsterLevel, gameState.currentMonsterExp, levelingRows);
  const growthStage = resolveLevelFromExp(gameState.currentMonsterExp, levelingRows).stage;
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

  const stageBadge = getStageBadge(growthStage);
  const monsterMotionClass = growthStage === "egg" ? "monster-img-alive" : "monster-img-walk-hop";

  const onCompleteFromHome = (taskId: number) => {
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
    <main
      className={`page-shell page-home ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">ホーム</div>
      {feedback && <div className="toast">{feedback}</div>}

      <section className="card decorated-card">
        <div className="monster-stage" style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}>
          <div className="monster-stage-overlay" />
          <div className="monster-wrap">
            <img src={getMonsterImage(currentMonster?.monsterId)} alt={currentMonster?.name ?? "monster"} className={`monster-img ${monsterMotionClass}`} />
          </div>
        </div>
        {stageBadge && (
          <div className="badge-wrap">
            <img src={stageBadge} alt="stage" className="badge-img" />
          </div>
        )}
        <div className="status-panel">
          <div className="status-row">
            <span>現在のモンスター</span>
            <strong>{currentMonster?.name ?? "-"}</strong>
          </div>
          <div className="status-row">
            <span>Lv</span>
            <strong>{gameState.currentMonsterLevel}</strong>
          </div>
          <div className="status-row">
            <span>EXP</span>
            <strong>
              {progress.required > 0 ? `${progress.current} / ${progress.required}` : "MAX"}
            </strong>
          </div>
          <div className="status-row">
            <span>無料コイン</span>
            <strong>{gameState.freeCoins}</strong>
          </div>
          <div className="status-row">
            <span>モンタコイン</span>
            <strong>{gameState.paidCoinBalance}</strong>
          </div>
          {gameState.lastLoginBonusDate === gameState.lastPlayedDate && gameState.lastLoginBonusCoins > 0 && (
            <div className="status-row">
              <span>ログインボーナス</span>
              <strong>+{gameState.lastLoginBonusCoins}</strong>
            </div>
          )}
          <div className="status-row">
            <span>今日のEXP</span>
            <strong>{gameState.todayExp}</strong>
          </div>
          <div className="status-row">
            <span>連続ログイン</span>
            <strong>{gameState.streakDays}日</strong>
          </div>
        </div>
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
            <img src="/img/illustration/illust_empty_tasks_01.png" alt="all done" className="empty-quests-img" />
            <div>今日の有効タスクはすべて達成済みです。</div>
          </div>
        ) : (
          <ul className="quest-list">
            {remainingTasks.slice(0, 3).map((task) => (
              <li key={task.taskId} className="quest-item row">
                <span className="row-tight">
                  <img src="/img/icon/icon_quest_task_01.png" alt="quest" className="quest-icon" />
                  <span>{task.name}</span>
                </span>
                <button className="quest-btn quest-btn-primary quest-btn-check" onClick={() => onCompleteFromHome(task.taskId)}>
                  達成
                </button>
              </li>
            ))}
          </ul>
        )}
        {remainingTasks.length > 0 && (
          <div className="task-section-cta">
            <Link href="/tasks" className="quest-btn quest-btn-primary">
              タスク画面でチェックする
            </Link>
          </div>
        )}
      </section>

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
