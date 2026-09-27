"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isOctoberUiEnabled } from "@/lib/game/octoberUi";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getEventBySlug, getEventStatusLabel, getRemainingDaysLabel, isEventActive, isEventAnnouncementVisible } from "@/lib/game/events";
import { getFramePreviewImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

function getConsecutiveLoginDays(loginDates: string[]): number {
  const dates = [...new Set(loginDates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  if (dates.length < 2) return 0;

  let streak = 1;
  for (let index = dates.length - 1; index > 0; index -= 1) {
    const current = Date.parse(`${dates[index]}T00:00:00Z`);
    const previous = Date.parse(`${dates[index - 1]}T00:00:00Z`);
    if (current - previous !== 24 * 60 * 60 * 1000) break;
    streak += 1;
  }
  return streak >= 2 ? streak : 0;
}

const OCTOBER_EVOLUTION_REVEAL_IDS = [99, 100, 102, 101, 103, 104, 105, 106] as const;

export default function EventDetailPage() {
  const router = useRouter();
  const octoberUi = isOctoberUiEnabled();
  const params = useParams<{ eventSlug: string }>();
  const eventSlug = Array.isArray(params?.eventSlug) ? params.eventSlug[0] : params?.eventSlug;
  const eventConfig = eventSlug ? getEventBySlug(eventSlug) : null;
  const {
    monsters,
    gameState,
    isLoading,
    claimEventFreeEgg,
    queueEventEgg,
    forceStartEventEgg
  } = useGame();
  const [message, setMessage] = useState("");
  const [showStartNowConfirm, setShowStartNowConfirm] = useState(false);
  const [showEvolutionChart, setShowEvolutionChart] = useState(false);

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
  const consecutiveLoginDays = getConsecutiveLoginDays(eventState?.loginDates ?? []);
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
  const featuredMonsterNames = eventMonsters.map((monster) => monster.name);
  const eventMonsterLabel = featuredMonsterNames.length > 0 ? featuredMonsterNames.join(" と ") : "イベントモンスター";
  const revealedEvolutionMonsterIds = OCTOBER_EVOLUTION_REVEAL_IDS.filter((monsterId) =>
    gameState.discoveredMonsterIds.includes(monsterId)
  );

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
    setMessage(`いまのモンスターとお別れして、${eventEggName}に切り替えました。タスクを達成して育てよう`);
    router.push("/tasks");
  };

  return (
    <main className={`page-shell page-rpg page-event ${getFrameThemeClass(gameState.selectedFrameId)}`}>
      <div className="title-panel">イベント</div>
      {message && <div className="toast">{message}</div>}

      <section className={`card decorated-card event-hero-card ${octoberUi ? "event-hero-card-guided" : ""}`}>
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
        {octoberUi && <>
          <div className="event-guided-next" role="status">
            {loginRewardImagePath && <img src={loginRewardImagePath} alt="" className="event-guided-reward-image" />}
            <div className="event-guided-next-copy">
              <p>{eventState?.hasCompletedLoginMission
                ? `${eventConfig.mission.loginRewardTitle}を獲得しました！ 持ち物で装着しよう。`
                : isActive ? `あと${Math.max(0, eventConfig.mission.loginDaysRequired - (eventState?.loginDates.length ?? 0))}日ログインで${eventConfig.mission.loginRewardTitle}！ また明日遊びに来よう。`
                : "開催期間中にログインすると、報酬に近づきます。"}</p>
              <button
                type="button"
                className="event-guided-detail-link"
                onClick={() => document.getElementById("event-mission-reward")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                詳しく見る
              </button>
            </div>
          </div>
          {eventState?.hasCompletedLoginMission && <Link href="/inventory?tab=frame" className="quest-btn task-global-menu-button-primary">報酬を持ち物で見る</Link>}
          <div className="event-guided-egg">
            <img src={getMonsterImage(eventConfig.freeEggMonsterId)} alt="" />
            <div><h3>無料のたまごで参加しよう</h3><p>ログイン報酬とは別に、開催中は条件なしで1個受け取れます。卵は今すぐ育てるか、現在のモンスターが去った後に育てるか選べます。</p></div>
          </div>
          <div className="event-guided-action" role="status">
            {!eventState?.hasClaimedFreeEgg && isActive ? <><p>まずは{eventEggName}を受け取ろう。</p><button className="quest-btn task-global-menu-button-primary" onClick={onClaimFreeEgg}>無料でたまごを受け取る</button></>
              : isEventEggQueued ? <><p>予約完了！ 今のモンスターとお別れしたあと、{eventEggName}の育成が始まります。</p><Link href="/tasks" className="quest-btn task-global-menu-button-primary">今のモンスターを育てる</Link></>
              : isEventEggActive ? <><p>{eventEggName}を育成中です。タスクを達成しよう！</p><Link href="/tasks" className="quest-btn task-global-menu-button-primary">タスクを見る</Link></>
              : ownedEventEggCount > 0 ? <><p>次の育成に予約しよう。今のモンスターはそのまま育てられます。</p><button className="quest-btn task-global-menu-button-primary" onClick={onQueueEgg}>次のたまごに予約する</button></>
              : <p>{eventState?.hasClaimedFreeEgg ? "無料たまごは受け取り済みです。" : "無料たまごは開催期間中に受け取れます。"}</p>}
            {ownedEventEggCount > 0 && !isEventEggActive && (
              <button className="quest-btn task-global-menu-button-secondary event-start-now-button" onClick={() => setShowStartNowConfirm(true)}>
                今すぐ{eventEggName}を育てる
              </button>
            )}
          </div>
          <p className="event-expiry-note">※イベント期間が終了すると、イベントモンスターは去ってしまいますのでご注意ください。</p>
        </>}
      </section>

      {eventConfig.eventId === "october_halloween_2026" ? (
        <Link href={`/shop/events/${eventConfig.slug}`} className="event-shop-banner-link" aria-label="ハロウィンイベントショップへ">
          <img src="/img/illustration/banner_october_hallowinshop_01.png" alt="開催中 ハロウィンショップ イベントショップへ" />
        </Link>
      ) : (
        <Link href={`/shop/events/${eventConfig.slug}`} className="card decorated-card event-shop-link-card">
          <img src={eventConfig.shopIconImagePath ?? eventConfig.shopBannerImagePath?.replace("_shop_01.png", "_shop_icon_01.png") ?? "/img/icon/icon_shop_01.png"} alt="" className="event-shop-link-card-icon" />
          <div className="event-shop-link-card-copy">
            <span className="notification-badge notification-badge-event">イベントショップ</span>
            <strong>限定アイテムを交換する</strong>
            <p>背景、フレーム、イベントたまごはこちら</p>
          </div>
          <span className="event-shop-link-arrow" aria-hidden="true">▶</span>
        </Link>
      )}

      <section id="event-mission-reward" className="card decorated-card event-mission-reward-card">
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
              {consecutiveLoginDays > 0 ? ` ${consecutiveLoginDays}日連続ログイン中です。` : ""}
            </p>
            {eventState?.hasCompletedLoginMission && (
              <Link href="/inventory?tab=frame" className="quest-btn task-global-menu-button-primary event-reward-inventory-link">
                持ち物を見る
              </Link>
            )}
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
            ? `${eventConfig.mission.loginDaysRequired}日ログイン達成済みです。${eventConfig.mission.loginRewardTitle ?? "ログイン報酬"} を受け取りました。`
            : `期間中に${eventConfig.mission.loginDaysRequired}日ログインすると、イベントの完走条件を達成できます。`}
        </div>
      </section>

      {!octoberUi && <section className="card decorated-card">
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
      </section>}

      <section className="card decorated-card">
        <div className="event-monster-section-head">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-info">報酬一覧</span>
            <h2>登場モンスター</h2>
          </div>
          {eventConfig.eventId === "october_halloween_2026" && (
            <button type="button" className="quest-btn event-evolution-chart-button" onClick={() => setShowEvolutionChart(true)}>
              進化表を見る
            </button>
          )}
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
              いまのモンスターからは手紙を受け取り、タスクを達成すると{eventEggName}の誕生イベントへ進みます。
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

      {showEvolutionChart ? (
        <div className="auth-email-modal-overlay event-evolution-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="event-evolution-chart-title">
          <div className="auth-email-modal-card event-confirm-modal-card event-evolution-modal-card">
            <button
              type="button"
              className="event-evolution-modal-close"
              aria-label="進化表を閉じる"
              title="閉じる"
              onClick={() => setShowEvolutionChart(false)}
            >
              ×
            </button>
            <h2 id="event-evolution-chart-title" className="auth-email-modal-title">モンタスクハロウィン進化表</h2>
            <p className="event-evolution-chart-note">
              childまでは公開中です。adult以降は、出会ったモンスターだけ姿が明らかになります。
            </p>
            <div className="event-evolution-chart-image" aria-label={`adult以降 ${revealedEvolutionMonsterIds.length}体発見済み`}>
              <img src="/img/monster_frame/october_evolution_chart_secret_v2.png" alt="adult以降がシークレットのハロウィン進化表" />
              {revealedEvolutionMonsterIds.map((monsterId) => (
                <img
                  key={monsterId}
                  src="/img/monster_frame/october_evolution_chart_full_v2.png"
                  alt=""
                  className={`event-evolution-reveal event-evolution-reveal-${monsterId}`}
                />
              ))}
            </div>
            <p className="event-evolution-discovery-count">adult以降：{revealedEvolutionMonsterIds.length} / {OCTOBER_EVOLUTION_REVEAL_IDS.length}体 発見</p>
            <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setShowEvolutionChart(false)}>
              とじる
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
