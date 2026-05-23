"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getEventBySlug, getEventStatusLabel, getRemainingDaysLabel, isEventActive, isEventAnnouncementVisible } from "@/lib/game/events";
import { getFramePreviewImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ eventSlug: string }>();
  const eventSlug = Array.isArray(params?.eventSlug) ? params.eventSlug[0] : params?.eventSlug;
  const eventConfig = eventSlug ? getEventBySlug(eventSlug) : null;
  const {
    monsters,
    gameState,
    isLoading,
    claimEventFreeEgg,
    queueEventEgg,
    forceStartEventEgg,
    markEventIntroPopupSeen
  } = useGame();
  const [message, setMessage] = useState("");
  const [showStartNowConfirm, setShowStartNowConfirm] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1600);
    return () => window.clearTimeout(timer);
  }, [message]);

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

  useEffect(() => {
    if (!eventConfig || !gameState) return;
    const eventState = gameState.eventStates[eventConfig.eventId];
    if (!eventState?.hasSeenIntroPopup) {
      markEventIntroPopupSeen(eventConfig.eventId);
    }
  }, [eventConfig, gameState, markEventIntroPopupSeen]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  if (!eventConfig) {
    return (
      <main className="page-shell page-rpg page-event">
        <section className="card decorated-card">
          <p>イベントが見つかりませんでした。</p>
          <Link href="/home">ホームへ戻る</Link>
        </section>
      </main>
    );
  }

  const eventState = gameState.eventStates[eventConfig.eventId];
  const isVisible = isEventAnnouncementVisible(eventConfig);
  const isActive = isEventActive(eventConfig);
  const ownedEventEggCount = eventState?.ownedEggCount ?? 0;
  const isEventEggQueued = gameState.queuedEggMonsterId === eventConfig.freeEggMonsterId;
  const isEventEggActive = gameState.currentMonsterId === eventConfig.freeEggMonsterId;
  const hasResidualAccess = Boolean(
    ownedEventEggCount ||
      isEventEggQueued ||
      isEventEggActive
  );

  if (!isVisible && !hasResidualAccess) {
    return (
      <main className={`page-shell page-rpg page-event ${getFrameThemeClass(gameState.selectedFrameId)}`}>
        <div className="title-panel">イベント</div>
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-info">案内</span>
            <h2>現在は開催期間外です</h2>
          </div>
          <p>イベントの導線は開催期間中のみ表示されます。復刻時にまた遊べるようにする予定です。</p>
          <div className="notification-card-actions">
            <Link href="/home" className="quest-btn task-global-menu-button task-global-menu-button-primary">
              ホームへ戻る
            </Link>
          </div>
        </section>
        <BottomNav />
      </main>
    );
  }

  const eventMonsters = (eventConfig.featuredMonsterIds ?? eventConfig.rewardPreviewMonsterIds)
    .map((monsterId) => monsters.find((monster) => monster.monsterId === monsterId))
    .filter((monster): monster is NonNullable<typeof monster> => Boolean(monster));
  const loginRewardPreviewClassName =
    eventConfig.mission.loginRewardFrameId === "spring_sakura"
      ? "frame-preview-sakura"
      : eventConfig.mission.loginRewardFrameId === "spring_clover"
        ? "frame-preview-clover"
        : "frame-preview-gold";
  const loginRewardImagePath = eventConfig.mission.loginRewardFrameId
    ? getFramePreviewImagePath(eventConfig.mission.loginRewardFrameId)
    : null;

  const ownedBackgroundTitles = [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems]
    .filter((item) => item.rewardType === "background" && gameState.ownedBackgroundIds.includes(item.grantValue))
    .map((item) => item.title);
  const ownedFrameTitles = [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems]
    .filter((item) => item.rewardType === "frame" && gameState.ownedFrameIds.includes(item.grantValue))
    .map((item) => item.title);
  const rewardSummary = [...ownedBackgroundTitles, ...ownedFrameTitles];
  const eventEggName = monsters.find((monster) => monster.monsterId === eventConfig.freeEggMonsterId)?.name ?? "イベントたまご";
  const featuredMonsterNames = eventMonsters.map((monster) => monster.name).slice(0, 2);
  const eventMonsterLabel = featuredMonsterNames.length > 0 ? featuredMonsterNames.join(" と ") : "イベントモンスター";

  const onClaimFreeEgg = () => {
    const result = claimEventFreeEgg(eventConfig.eventId);
    if (!result) return;
    if (!result.claimed) {
      setMessage(result.reason === "already_claimed" ? "無料たまごは受け取り済みです" : "いまは受け取れません");
      return;
    }
    setMessage(`${eventEggName}を受け取りました`);
  };

  const onQueueEgg = () => {
    const result = queueEventEgg(eventConfig.eventId);
    if (!result) return;
    if (!result.used) {
      if (result.reason === "no_egg") setMessage("イベントたまごを持っていません");
      else if (result.reason === "already_queued") setMessage("次のたまごに予約済みです");
      else setMessage("イベントたまごをセットできませんでした");
      return;
    }

    setMessage(`次のたまごを${eventEggName}に予約しました`);
  };

  const onForceStartEgg = () => {
    const result = forceStartEventEgg(eventConfig.eventId);
    setShowStartNowConfirm(false);
    if (!result) return;
    if (!result.started) {
      if (result.reason === "no_egg") setMessage(`${eventEggName}を持っていません`);
      else if (result.reason === "already_active") setMessage(`すでに${eventEggName}を育成中です`);
      else setMessage(`${eventEggName}に切り替えできませんでした`);
      return;
    }
    setMessage(`いまのモンスターとお別れして、${eventEggName}に切り替えました`);
    router.push("/birth-event");
  };

  return (
    <main className={`page-shell page-rpg page-event ${getFrameThemeClass(gameState.selectedFrameId)}`}>
      <div className="title-panel">イベント</div>
      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card event-hero-card">
        <div className="event-hero-image-wrap">
          <img src={eventConfig.heroImagePath} alt={eventConfig.name} className="event-hero-image" />
        </div>
        <div className="event-hero-meta">
          <div className="event-banner-head">
            <span className="notification-badge notification-badge-event">{getEventStatusLabel(eventConfig)}</span>
            <span className="event-banner-remaining">{getRemainingDaysLabel(eventConfig)}</span>
          </div>
          <h2>{eventConfig.name}</h2>
          <p>{eventConfig.description}</p>
          <p className="shop-note">{eventConfig.notice}</p>
        </div>
      </section>

      <section className="card decorated-card event-mission-reward-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">完走報酬</span>
          <h2>{eventConfig.mission.loginRewardTitle ?? "イベント限定報酬"}</h2>
        </div>
        <div className="event-mission-reward-row">
          <div className={`event-mission-reward-preview ${loginRewardImagePath ? "event-mission-reward-preview-image-only" : `shop-frame-preview ${loginRewardPreviewClassName}`}`}>
            {loginRewardImagePath ? <img src={loginRewardImagePath} alt={eventConfig.mission.loginRewardTitle ?? "イベント報酬"} className="event-frame-preview-image" /> : null}
          </div>
          <div className="event-mission-reward-meta">
            <p>
              期間中に <strong>{eventConfig.mission.loginDaysRequired}日ログイン</strong> すると、
              限定の <strong>{eventConfig.mission.loginRewardTitle ?? "イベント報酬"}</strong> を受け取れます。
            </p>
            <p className="shop-note">
              {eventState?.hasCompletedLoginMission ? "すでに達成して受け取り済みです。" : "ログイン日数はイベント期間中に自動でカウントされます。"}
            </p>
          </div>
        </div>
      </section>

      <section className="card decorated-card event-progress-card">
        <div className="event-progress-grid">
          <div className="event-progress-item">
            <span>ログイン進行</span>
            <strong>
              {eventState?.loginDates.length ?? 0} / {eventConfig.mission.loginDaysRequired}日
            </strong>
          </div>
          <div className="event-progress-item">
            <span>イベント進行</span>
            <strong>{eventState?.completedTaskCount ?? 0}タスク</strong>
          </div>
          <div className="event-progress-item">
            <span>所持たまご</span>
            <strong>{eventState?.ownedEggCount ?? 0}個</strong>
          </div>
          <div className="event-progress-item">
            <span>ログインボーナス</span>
            <strong>+{eventConfig.mission.dailyLoginBonusFreeCoins} フリーコイン</strong>
          </div>
          <div className="event-progress-item">
            <span>完走報酬</span>
            <strong>{eventConfig.mission.loginRewardTitle ?? "イベント報酬"}</strong>
          </div>
        </div>
        <div className="event-progress-note">
          {eventState?.hasCompletedLoginMission
            ? `7日ログイン達成済みです。${eventConfig.mission.loginRewardTitle ?? "ログイン報酬"} を受け取りました。`
            : `期間中に${eventConfig.mission.loginDaysRequired}日ログインすると、イベントの完走条件を達成できます。`}
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">無料参加</span>
          <h2>{eventEggName}</h2>
        </div>
        <div className="event-egg-row">
          <img src={getMonsterImage(eventConfig.freeEggMonsterId)} alt={eventEggName} className="event-egg-thumb" />
          <div className="event-egg-meta">
            <p>無料で1個受け取れます。イベントモンスターを育てるには、受け取ったあとに「次のたまごに予約する」を押してください。予約すると、いまのモンスターとお別れした次のサイクルで{eventEggName}から育成が始まります。</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onClaimFreeEgg} disabled={!isActive || Boolean(eventState?.hasClaimedFreeEgg)}>
                {eventState?.hasClaimedFreeEgg ? "受け取り済み" : "無料で受け取る"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={onQueueEgg} disabled={isEventEggQueued || ownedEventEggCount <= 0}>
                {isEventEggQueued ? "予約済み" : "次のたまごに予約する"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={() => setShowStartNowConfirm(true)} disabled={ownedEventEggCount <= 0}>
                いますぐ卵を育てる
              </button>
            </div>
            {isEventEggQueued && <p className="shop-note shop-note-strong">予約済みです。今のモンスターとお別れした次のサイクルで、{eventEggName}から育成が始まります。</p>}
            {isEventEggActive && <p className="shop-note shop-note-strong">{eventEggName}を育成中です。タスクを達成するとイベントモンスターへ進化します。</p>}
          </div>
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-info">報酬一覧</span>
          <h2>登場モンスター</h2>
        </div>
        <p className="event-progress-note">{eventMonsterLabel} が出現中！タスクを達成してイベントモンスターを育てよう！</p>
        <div className="event-monster-grid">
          {eventMonsters.map((monster) => (
            <div key={monster.monsterId} className="event-monster-card">
              <img src={getMonsterImage(monster.monsterId)} alt={monster.name} className="event-monster-thumb" />
              <strong>{monster.name}</strong>
              <span>{monster.stage}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card decorated-card notification-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">イベントショップ</span>
          <h2>限定アイテムを交換する</h2>
        </div>
        <p>イベント限定の背景やフレーム、イベントたまごは専用ショップにまとめています。</p>
        <div className="notification-card-actions">
          <Link href={`/shop/events/${eventConfig.slug}`} className="quest-btn task-global-menu-button task-global-menu-button-primary">
            イベントショップへ
          </Link>
        </div>
      </section>

      {rewardSummary.length > 0 && (
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-info">獲得済み</span>
            <h2>イベントでもらったもの</h2>
          </div>
          <p>{rewardSummary.join(" / ")}</p>
          <div className="notification-card-actions">
            <Link href="/inventory" className="quest-btn task-global-menu-button task-global-menu-button-secondary">
              持ち物で見る
            </Link>
          </div>
        </section>
      )}

      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href="/shop" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            通常ショップへ
          </Link>
          <Link href={`/shop/events/${eventConfig.slug}`} className="ui-link-button settings-menu-button settings-menu-button-primary">
            イベントショップへ
          </Link>
          <Link href="/notifications" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            おしらせへ
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />

      {showStartNowConfirm ? (
        <div className="auth-email-modal-overlay">
          <div className="auth-email-modal-card event-confirm-modal-card">
            <h2 className="auth-email-modal-title">{eventEggName}に切り替える？</h2>
            <div className="event-confirm-egg-preview">
              <img src={getMonsterImage(eventConfig.freeEggMonsterId)} alt={eventEggName} />
            </div>
            <p className="shop-note">
              いま育てているモンスターとはお別れして、{eventEggName}から育成を始めます。
            </p>
            <p className="shop-note shop-note-strong">
              いまのモンスターからは手紙を受け取り、{eventEggName}の誕生イベントへ進みます。
            </p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={onForceStartEgg}>
                はじめる
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setShowStartNowConfirm(false)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
