"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { EvolutionOverlay } from "@/components/common/EvolutionOverlay";
import { GameLoadingScreen } from "@/components/common/GameLoadingScreen";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { HOME_ANNOUNCEMENTS } from "@/lib/game/announcements";
import { ATTRIBUTE_ICON_BY_KEY, getMonsterImage, getMonsterMotionAsset } from "@/lib/game/assets";
import { getEventStatusLabel, getRemainingDaysLabel, getVisibleHomeEvents, isEventActive } from "@/lib/game/events";
import { getBackgroundImagePath, getDecorationShopItem, getFramePreviewImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { getGeneralNotificationIds, getNotificationReadIds } from "@/lib/game/notificationReads";
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

type MonsterCelebrationState = {
  id: number;
  loops: number;
};

type MonsterSpriteStyle = CSSProperties & {
  "--monster-sprite-size"?: string;
};

const MONSTER_HAPPY_LOOP_MS = 1600;

const GROWTH_STAGE_LABELS: Record<string, string> = {
  egg: "Egg",
  baby: "Baby",
  child: "Child",
  adult: "Adult",
  final: "Final",
  end: "End"
};

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function HomePage() {
  const router = useRouter();
  const { tasks, monsters, levelingRows, gameState, isLoading, completeTask, markEventIntroPopupSeen } = useGame();
  const [feedback, setFeedback] = useState("");
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [monsterCelebration, setMonsterCelebration] = useState<MonsterCelebrationState | null>(null);
  const [evolutionScene, setEvolutionScene] = useState<EvolutionScene | null>(null);
  const [showEventIntro, setShowEventIntro] = useState(false);
  const [dismissedEventIntroId, setDismissedEventIntroId] = useState<string | null>(null);
  const shownEventIntroIdsRef = useRef<Set<string>>(new Set());
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback, feedbackKey]);

  useEffect(() => {
    if (!monsterCelebration) return;
    const timer = window.setTimeout(() => setMonsterCelebration(null), monsterCelebration.loops * MONSTER_HAPPY_LOOP_MS + 80);
    return () => window.clearTimeout(timer);
  }, [monsterCelebration]);

  useEffect(() => {
    const refreshReadNotificationIds = () => setReadNotificationIds(getNotificationReadIds());
    refreshReadNotificationIds();
    window.addEventListener("focus", refreshReadNotificationIds);
    window.addEventListener("pageshow", refreshReadNotificationIds);
    document.addEventListener("visibilitychange", refreshReadNotificationIds);
    return () => {
      window.removeEventListener("focus", refreshReadNotificationIds);
      window.removeEventListener("pageshow", refreshReadNotificationIds);
      document.removeEventListener("visibilitychange", refreshReadNotificationIds);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !gameState) return;
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
  }, [gameState, isLoading, router]);

  const visibleEvents = getVisibleHomeEvents();
  const activeEvent = visibleEvents[0] ?? null;
  const activeEventState = activeEvent && gameState ? gameState.eventStates[activeEvent.eventId] : null;
  const activeEventHomeBannerImagePath = activeEvent?.homeBannerImagePath ?? activeEvent?.heroImagePath;
  const activeEventEggName = activeEvent
    ? monsters.find((monster) => monster.monsterId === activeEvent.freeEggMonsterId)?.name ?? "イベントたまご"
    : "イベントたまご";

  useEffect(() => {
    if (!gameState) return;
    if (
      gameState.endEventPending ||
      gameState.birthEventPending ||
      shouldRouteToDailyReview(gameState) ||
      !gameState.hasSeenTutorial
    ) {
      setShowEventIntro(false);
      return;
    }
    if (!activeEvent) return;
    if (!isEventActive(activeEvent)) return;
    if (activeEventState?.hasSeenIntroPopup) return;
    if (dismissedEventIntroId === activeEvent.eventId) return;
    if (shownEventIntroIdsRef.current.has(activeEvent.eventId)) return;
    shownEventIntroIdsRef.current.add(activeEvent.eventId);
    markEventIntroPopupSeen(activeEvent.eventId);
    setShowEventIntro(true);
  }, [activeEvent, activeEventState?.hasSeenIntroPopup, dismissedEventIntroId, gameState, markEventIntroPopupSeen]);

  const dismissEventIntro = (openEventPage: boolean) => {
    if (!activeEvent) return;
    setDismissedEventIntroId(activeEvent.eventId);
    setShowEventIntro(false);
    window.setTimeout(() => {
      if (openEventPage) {
        router.push(`/event/${activeEvent.slug}`);
      }
    }, 0);
  };

  if (isLoading || !gameState) {
    const loadingMonster = gameState
      ? monsters.find((monster) => monster.monsterId === gameState.currentMonsterId)
      : null;
    return <GameLoadingScreen monsterImagePath={loadingMonster ? getMonsterImage(loadingMonster.monsterId) : null} />;
  }

  const currentMonster = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  const activeAnnouncements = HOME_ANNOUNCEMENTS.filter((announcement) => announcement.active);
  const generalNotificationIds = getGeneralNotificationIds(activeAnnouncements, visibleEvents);
  const unreadGeneralNotificationCount = generalNotificationIds.filter((notificationId) => !readNotificationIds.includes(notificationId)).length;
  const notificationCount = unreadGeneralNotificationCount + (gameState.pendingDailyReview ? 1 : 0);
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

  const growthStageLabel = GROWTH_STAGE_LABELS[growthStage] ?? growthStage;
  const isMonsterCelebrating = Boolean(monsterCelebration);
  const celebrationLoops = monsterCelebration?.loops ?? 1;
  const monsterMotionKind = growthStage === "egg" ? (isMonsterCelebrating ? "happy" : "sway") : isMonsterCelebrating ? "happy" : "walk";
  const monsterMotionAsset =
    getMonsterMotionAsset(currentMonster?.monsterId, monsterMotionKind) ??
    (growthStage === "egg" && monsterMotionKind === "happy" ? getMonsterMotionAsset(currentMonster?.monsterId, "sway") : null);
  const monsterSpriteStyle: MonsterSpriteStyle | undefined = monsterMotionAsset
    ? {
        backgroundImage: `url("${monsterMotionAsset.imagePath}")`,
        animationDuration: `${monsterMotionAsset.durationMs}ms`,
        animationIterationCount: monsterMotionKind === "happy" ? celebrationLoops : "infinite",
        "--monster-sprite-size": `${monsterMotionAsset.displaySize ?? 142}px`
      }
    : undefined;
  const monsterMotionClass = growthStage === "egg" ? "monster-img-alive" : "monster-img-walk-hop";
  const monsterMovementType = currentMonster?.movementType ?? "ground";
  const hasEventHappyHop =
    monsterMotionKind === "happy" &&
    typeof currentMonster?.monsterId === "number" &&
    currentMonster.monsterId >= 65 &&
    currentMonster.monsterId <= 92;
  const activeDecorations = gameState.selectedDecorationIds
    .map((itemId) => getDecorationShopItem(itemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const activeFrameImagePath = getFramePreviewImagePath(gameState.selectedFrameId);
  const monsterStageBackgroundClass = `monster-stage-bg-${gameState.selectedBackgroundId}`;

  const showFeedback = (message: string) => {
    setFeedback(message);
    setFeedbackKey((current) => current + 1);
  };

  const triggerMonsterCelebration = (loops: number) => {
    setMonsterCelebration((current) => ({
      id: (current?.id ?? 0) + 1,
      loops
    }));
  };

  const onPetMonster = () => {
    playSfx("s_Check");
    triggerMonsterCelebration(2);
  };

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
    showFeedback(fragments.join(" / "));
    if (result.levelUp) {
      triggerMonsterCelebration(3);
    }

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
    <main className={`page-shell page-home ${getFrameThemeClass(gameState.selectedFrameId)}`}>
      <div className="title-panel">ホーム</div>
      {feedback && <div key={feedbackKey} className="reward-popup reward-popup-top home-reward-popup">{feedback}</div>}

      {activeEvent && activeEventHomeBannerImagePath && (
        <Link href={`/event/${activeEvent.slug}`} className="card decorated-card event-banner-card">
          <div className="event-banner-image-wrap">
            <img src={activeEventHomeBannerImagePath} alt={activeEvent.name} className="event-banner-image" />
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
          <div
            className={`monster-stage ${monsterStageBackgroundClass}`}
            style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
          >
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
                {decoration.itemId === "September_galaxyrailway_deco" ? (
                  <div className="home-decoration-galaxyrailway-runner">
                    <div
                      role="img"
                      aria-label={decoration.title}
                      className="home-decoration-galaxyrailway-sprite"
                    />
                  </div>
                ) : (
                  <img src={decoration.imagePath} alt={decoration.title} className="home-decoration-image" />
                )}
              </div>
            ))}
            <div className="monster-wrap">
              {monsterMotionAsset ? (
                <div
                  role="img"
                  aria-label={currentMonster?.name ?? "monster"}
                  className={`monster-motion-frame monster-motion-frame-${monsterMovementType} ${monsterMotionKind === "walk" ? "monster-motion-frame-walk" : ""} ${hasEventHappyHop ? "monster-motion-frame-happy-hop" : ""}`}
                >
                  <div
                    key={`${monsterMotionKind}-${monsterCelebration?.id ?? "idle"}`}
                    className="monster-img monster-sprite"
                    style={monsterSpriteStyle}
                  />
                </div>
              ) : (
                <img src={getMonsterImage(currentMonster?.monsterId)} alt={currentMonster?.name ?? "monster"} className={`monster-img monster-img-${monsterMovementType} ${monsterMotionClass}`} />
              )}
            </div>
          </div>
          <div className="home-pet-action">
            <button type="button" className="quest-btn home-pet-button" onClick={onPetMonster}>
              撫でる
            </button>
          </div>
          <div className="home-stage-actions">
            <Link href="/notifications" className="home-notification-button">
              <span className="home-notification-icon">
                <img src="/img/icon/sfc/sfc_notification_01.png" alt="" className="home-notification-icon-image" />
              </span>
              <span className="home-notification-label">おしらせ</span>
              {notificationCount > 0 && <span className="home-notification-badge">{notificationCount}</span>}
            </Link>
            <Link href="/shop" className="home-notification-button home-shop-shortcut">
              <span className="home-notification-icon">
                <img src="/img/icon/sfc/sfc_shop_01.png" alt="" className="home-notification-icon-image" />
              </span>
              <span className="home-notification-label">ショップ</span>
            </Link>
            <Link href="/inventory" className="home-notification-button home-inventory-shortcut">
              <span className="home-notification-icon">
                <img src="/img/icon/sfc/sfc_inventory_01.png" alt="" className="home-notification-icon-image" />
              </span>
              <span className="home-notification-label">持ち物</span>
            </Link>
          </div>
        </div>
        <div className="status-panel home-status-panel">
          <div className="home-panel-heading">ステータス</div>
          <div className="status-row">
            <span>現在のモンスター</span>
            <strong>{currentMonster?.name ?? "-"}</strong>
          </div>
          <div className="status-row">
            <span>成長段階</span>
            <strong>{growthStageLabel}</strong>
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
                  <img src="/img/icon/sfc/sfc_task_01.png" alt="quest" className="quest-icon" />
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
              無料で{activeEventEggName}を1個受け取れます。
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
