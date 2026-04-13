"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { HOME_ANNOUNCEMENTS } from "@/lib/game/announcements";
import { ATTRIBUTE_ICON_BY_KEY, getMonsterImage, getStageBadge } from "@/lib/game/assets";
import { getEventStatusLabel, getRemainingDaysLabel, getVisibleHomeEvents, isEventActive } from "@/lib/game/events";
import { getBackgroundImagePath, getDecorationShopItem, getFramePreviewImagePath, getFrameThemeClass } from "@/lib/game/shop";
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
  const { tasks, monsters, levelingRows, gameState, isLoading, completeTask, markEventIntroPopupSeen } = useGame();
  const [feedback, setFeedback] = useState("");
  const [evolutionScene, setEvolutionScene] = useState<EvolutionScene | null>(null);
  const [showEventIntro, setShowEventIntro] = useState(false);
  const [dismissedEventIntroId, setDismissedEventIntroId] = useState<string | null>(null);

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

  const visibleEvents = getVisibleHomeEvents();
  const activeEvent = visibleEvents[0] ?? null;
  const activeEventState = activeEvent && gameState ? gameState.eventStates[activeEvent.eventId] : null;

  useEffect(() => {
    if (!gameState) return;
    if (!activeEvent) return;
    if (!isEventActive(activeEvent)) return;
    if (activeEventState?.hasSeenIntroPopup) return;
    if (dismissedEventIntroId === activeEvent.eventId) return;
    setShowEventIntro(true);
  }, [activeEvent, activeEventState?.hasSeenIntroPopup, dismissedEventIntroId, gameState]);

  const dismissEventIntro = (openEventPage: boolean) => {
    if (!activeEvent) return;
    setDismissedEventIntroId(activeEvent.eventId);
    setShowEventIntro(false);
    window.setTimeout(() => {
      markEventIntroPopupSeen(activeEvent.eventId);
      if (openEventPage) {
        router.push(`/event/${activeEvent.slug}`);
      }
    }, 0);
  };

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const activeAnnouncements = HOME_ANNOUNCEMENTS.filter((announcement) => announcement.active);
  const notificationCount = activeAnnouncements.length + visibleEvents.length + (gameState.pendingDailyReview ? 1 : 0);
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
  const activeDecorations = gameState.selectedDecorationIds
    .map((itemId) => getDecorationShopItem(itemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const activeFrameImagePath = getFramePreviewImagePath(gameState.selectedFrameId);

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

      {activeEvent && (
        <Link href={`/event/${activeEvent.slug}`} className="card decorated-card event-banner-card">
          <div className="event-banner-image-wrap">
            <img src={activeEvent.heroImagePath} alt={activeEvent.name} className="event-banner-image" />
          </div>
          <div className="event-banner-meta">
            <div className="event-banner-head">
              <span className="notification-badge notification-badge-event">{getEventStatusLabel(activeEvent)}</span>
              <span className="event-banner-remaining">{getRemainingDaysLabel(activeEvent)}</span>
            </div>
            <strong>{activeEvent.name}</strong>
            <p>{activeEvent.description}</p>
          </div>
        </Link>
      )}

      <section className="card decorated-card">
        <div className="home-stage-layout">
          <div className="monster-stage" style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}>
            <div className="monster-stage-overlay" />
            {activeFrameImagePath ? (
              <div className="monster-stage-frame">
                <img src={activeFrameImagePath} alt="" className="monster-stage-frame-image" />
              </div>
            ) : null}
            {activeDecorations.map((decoration) => (
              <div
                key={decoration.itemId}
                className={`home-decoration home-decoration-${decoration.itemId}`}
              >
                <img src={decoration.imagePath} alt={decoration.title} className="home-decoration-image" />
              </div>
            ))}
            <div className="monster-wrap">
              <img src={getMonsterImage(currentMonster?.monsterId)} alt={currentMonster?.name ?? "monster"} className={`monster-img ${monsterMotionClass}`} />
            </div>
          </div>
          <div className="home-stage-actions">
            <Link href="/notifications" className="home-notification-button">
              <span className="home-notification-icon">
                <img src="/img/icon/icon_notification_01.png" alt="" className="home-notification-icon-image" />
              </span>
              <span className="home-notification-label">おしらせ</span>
              {notificationCount > 0 && <span className="home-notification-badge">{notificationCount}</span>}
            </Link>
            <Link href="/shop" className="home-notification-button home-shop-shortcut">
              <span className="home-notification-icon">
                <img src="/img/icon/icon_shop_01.png" alt="" className="home-notification-icon-image" />
              </span>
              <span className="home-notification-label">ショップ</span>
            </Link>
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
          {gameState.activeAttributeCharm && (
            <div className="status-row">
              <span>発動中</span>
              <strong>{gameState.activeAttributeCharm.name} (あと{gameState.activeAttributeCharm.remainingUses}回)</strong>
            </div>
          )}
          {gameState.activeExpBooster && (
            <div className="status-row">
              <span>ブースト</span>
              <strong>
                {gameState.activeExpBooster.name} (EXP+{Math.round(gameState.activeExpBooster.boostRate * 100)}% /{" "}
                {new Date(gameState.activeExpBooster.expiresAt).toLocaleString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                まで)
              </strong>
            </div>
          )}
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

      {showEventIntro && activeEvent && (
        <div className="auth-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="event-intro-title">
          <div className="card decorated-card auth-prompt-card">
            <div className="event-modal-image-wrap">
              <img src={activeEvent.heroImagePath} alt={activeEvent.name} className="event-modal-image" />
            </div>
            <h2 id="event-intro-title" className="auth-card-title">
              {activeEvent.name}
            </h2>
            <p className="auth-card-copy">
              {activeEvent.description}
              <br />
              無料で春の芽吹きたまごを1個受け取れます。
            </p>
            <div className="settings-menu-grid centered-actions">
              <button
                className="quest-btn settings-menu-button settings-menu-button-primary"
                onClick={() => dismissEventIntro(true)}
              >
                イベントを見る
              </button>
              <button
                className="quest-btn settings-menu-button settings-menu-button-neutral"
                onClick={() => dismissEventIntro(false)}
              >
                あとで
              </button>
            </div>
          </div>
        </div>
      )}
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
