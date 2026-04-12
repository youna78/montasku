"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getEventBySlug, getEventStatusLabel, getRemainingDaysLabel, isEventActive, isEventAnnouncementVisible } from "@/lib/game/events";
import { getBackgroundImagePath, getFrameThemeClass, SHOP_EVENT_BUNDLES, SHOP_EVENT_DECORATIONS } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function EventShopDetailPage() {
  const router = useRouter();
  const params = useParams<{ eventSlug: string }>();
  const eventSlug = Array.isArray(params?.eventSlug) ? params.eventSlug[0] : params?.eventSlug;
  const eventConfig = eventSlug ? getEventBySlug(eventSlug) : null;
  const {
    monsters,
    gameState,
    isLoading,
    purchaseEventReward,
    purchaseDecoration,
    purchasePaidBundle,
    claimEventFreeEgg,
    queueEventEgg,
    forceStartEventEgg,
    markEventIntroPopupSeen
  } = useGame();
  const [message, setMessage] = useState("");
  const [showStartNowConfirm, setShowStartNowConfirm] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ title: string; lines: string[] } | null>(null);

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
      <main>
        <section className="card decorated-card">
          <p>イベントショップが見つかりませんでした。</p>
          <Link href="/shop">ショップへ戻る</Link>
        </section>
      </main>
    );
  }

  const eventState = gameState.eventStates[eventConfig.eventId];
  const isVisible = isEventAnnouncementVisible(eventConfig);
  const isActive = isEventActive(eventConfig);
  const hasResidualAccess = Boolean(
    eventState?.ownedEggCount ||
      gameState.queuedEggMonsterId === eventConfig.freeEggMonsterId ||
      gameState.currentMonsterId === eventConfig.freeEggMonsterId
  );

  if (!isVisible && !hasResidualAccess) {
    return (
      <main
        className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
        style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
      >
        <div className="title-panel">イベントショップ</div>
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-info">案内</span>
            <h2>現在は開催期間外です</h2>
          </div>
          <p>イベントショップは開催期間中のみ利用できます。復刻時にまた開放されます。</p>
          <div className="notification-card-actions">
            <Link href="/shop" className="quest-btn task-global-menu-button task-global-menu-button-primary">
              通常ショップへ戻る
            </Link>
          </div>
        </section>
        <BottomNav />
      </main>
    );
  }

  const onClaimFreeEgg = () => {
    const result = claimEventFreeEgg(eventConfig.eventId);
    if (!result) return;
    if (!result.claimed) {
      setMessage(result.reason === "already_claimed" ? "無料たまごは受け取り済みです" : "いまは受け取れません");
      return;
    }
    setMessage("春の芽吹きたまごを受け取りました");
  };

  const onQueueEgg = () => {
    const result = queueEventEgg(eventConfig.eventId);
    if (!result) return;
    if (!result.used) {
      if (result.reason === "no_egg") setMessage("春の芽吹きたまごを持っていません");
      else if (result.reason === "already_queued") setMessage("次のたまごに予約済みです");
      else setMessage("イベントたまごを予約できませんでした");
      return;
    }
    setMessage("次のたまごを春の芽吹きたまごに予約しました");
  };

  const onForceStartEgg = () => {
    const result = forceStartEventEgg(eventConfig.eventId);
    setShowStartNowConfirm(false);
    if (!result) return;
    if (!result.started) {
      if (result.reason === "no_egg") setMessage("春の芽吹きたまごを持っていません");
      else if (result.reason === "already_active") setMessage("すでに春の芽吹きたまごを育成中です");
      else setMessage("春の芽吹きたまごに切り替えできませんでした");
      return;
    }
    setMessage("いまのモンスターとお別れして、春の芽吹きたまごに切り替えました");
    router.push("/birth-event");
  };

  const onPurchase = (itemId: string) => {
    const item = [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems].find((entry) => entry.itemId === itemId);
    const result = purchaseEventReward(eventConfig.eventId, itemId);
    if (!item || !result) return;
    if (!result.purchased) {
      if (result.reason === "insufficient_free_coins") setMessage("フリーコインがたりません");
      else if (result.reason === "insufficient_paid_coins") setMessage("モンタコインがたりません");
      else if (result.reason === "already_owned") setMessage("すでに所持しています");
      else setMessage("交換できませんでした");
      return;
    }
    setMessage(`${item.title} をこうにゅうしました`);
  };

  const onPurchaseDecoration = (itemId: string) => {
    const result = purchaseDecoration(itemId);
    const item = SHOP_EVENT_DECORATIONS.find((entry) => entry.itemId === itemId);
    if (!item || !result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }
    setPurchaseModal({ title: item.title, lines: [item.title] });
    setMessage(`${item.title} をこうにゅうしました`);
  };

  const onPurchaseBundle = (itemId: string) => {
    const result = purchasePaidBundle(itemId);
    const item = SHOP_EVENT_BUNDLES.find((entry) => entry.itemId === itemId);
    if (!item || !result) return;
    if (!result.purchased) {
      setMessage(result.reason === "event_not_available" ? "イベント開催中のみ交換できます" : "モンタコインがたりません");
      return;
    }
    if (item.itemId === "paid_bundle_spring_deco_01") {
      setPurchaseModal({ title: item.title, lines: ["ピクニックバスケット", "花灯りランタン", "春の芽吹きたまご"] });
    } else {
      setPurchaseModal({ title: item.title, lines: [item.title] });
    }
    setMessage(`${item.title} をこうにゅうしました`);
  };

  const previewMonster = monsters.find((monster) => monster.monsterId === eventConfig.freeEggMonsterId);

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">イベントショップ</div>
      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card event-shop-hero">
        <div className="event-shop-hero-head">
          <span className="notification-badge notification-badge-event">{getEventStatusLabel(eventConfig)}</span>
          <span className="event-banner-remaining">{getRemainingDaysLabel(eventConfig)}</span>
        </div>
        <h2>{eventConfig.name} ショップ</h2>
        <p>{eventConfig.notice}</p>
      </section>

      <section className="card decorated-card quest-heading-card">
        <p>春イベント限定の背景やフレーム、イベントたまごを交換できます。春モンスターを育てるには、受け取ったたまごを「次のたまごに予約する」でセットしてください。</p>
      </section>

      <section className="card decorated-card event-progress-card">
        <div className="event-progress-grid">
          <div className="event-progress-item">
            <span>所持フリーコイン</span>
            <strong>{gameState.freeCoins}</strong>
          </div>
          <div className="event-progress-item">
            <span>所持モンタコイン</span>
            <strong>{gameState.paidCoinBalance}</strong>
          </div>
          <div className="event-progress-item">
            <span>イベントたまご</span>
            <strong>{eventState?.ownedEggCount ?? 0}個</strong>
          </div>
          <div className="event-progress-item">
            <span>状態</span>
            <strong>{getEventStatusLabel(eventConfig)}</strong>
          </div>
        </div>
        <div className="event-progress-note">{getRemainingDaysLabel(eventConfig)} / 開催中のみ交換できます。</div>
      </section>

      {purchaseModal ? (
        <section className="card decorated-card">
          <div className="shop-recent-purchase">
            <p><strong>{purchaseModal.title}</strong> を購入しました。</p>
            <p>{purchaseModal.lines.map((line) => `「${line}」`).join(" と ")} を購入しました。もちものページを確認しよう。</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={() => router.push("/inventory")}>
                持ち物を見る
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setPurchaseModal(null)}>
                とじる
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">イベントたまご</span>
          <h2>春の芽吹きたまご</h2>
        </div>
        <div className="event-egg-row">
          <img src={getMonsterImage(previewMonster?.monsterId ?? eventConfig.freeEggMonsterId)} alt="春の芽吹きたまご" className="event-egg-thumb" />
          <div className="event-egg-meta">
            <p>まずは無料で1個受け取れます。受け取ったあとに「次のたまごに予約する」を押すと、次の育成サイクルで春の芽吹きたまごから春モンスターが出現します。</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onClaimFreeEgg} disabled={!isActive || Boolean(eventState?.hasClaimedFreeEgg)}>
                {eventState?.hasClaimedFreeEgg ? "受け取り済み" : "無料で受け取る"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={onQueueEgg} disabled={(eventState?.ownedEggCount ?? 0) <= 0 || !isActive}>
                次のたまごに予約する
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={() => setShowStartNowConfirm(true)} disabled={(eventState?.ownedEggCount ?? 0) <= 0 || !isActive}>
                いますぐ卵を育てる
              </button>
            </div>
            {gameState.queuedEggMonsterId === eventConfig.freeEggMonsterId && <p className="shop-note shop-note-strong">次のたまごに春の芽吹きたまごを予約しています。</p>}
          </div>
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-info">フリーコイン交換</span>
          <h2>春限定アイテム</h2>
        </div>
        <div className="shop-grid">
          {eventConfig.freeCoinShopItems.map((item) => {
            const alreadyOwned = item.rewardType === "background"
              ? gameState.ownedBackgroundIds.includes(item.grantValue)
              : gameState.ownedFrameIds.includes(item.grantValue);
            return (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                  {alreadyOwned && <span className="equipped-badge">所持中</span>}
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <div className="shop-grid-price">{item.price} フリーコイン</div>
                </div>
                <button
                  className={`quest-btn shop-grid-button ${alreadyOwned ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-primary"}`}
                  onClick={() => onPurchase(item.itemId)}
                  disabled={alreadyOwned || !isActive}
                >
                  {alreadyOwned ? "所持中" : "交換する"}
                </button>
              </section>
            );
          })}
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">モンタコイン交換</span>
          <h2>特別ラインナップ</h2>
        </div>
        <p className="shop-note">
          モンタコインは、Stripe で購入できる有料コインです。必要なときは通常ショップのモンタコインページからチャージできます。
        </p>
        <div className="notification-card-actions">
          <Link href="/shop?currency=paid&category=coin" className="ui-link-button settings-menu-button settings-menu-button-primary">
            モンタコインを買う
          </Link>
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">モンタコイン交換</span>
          <h2>特別ラインナップ</h2>
        </div>
        <div className="shop-grid">
          {eventConfig.paidCoinShopItems.map((item) => {
            const alreadyOwned = item.rewardType === "background"
              ? gameState.ownedBackgroundIds.includes(item.grantValue)
              : item.rewardType === "frame"
                ? gameState.ownedFrameIds.includes(item.grantValue)
                : false;
            return (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                  <div className="shop-badge-stack">
                    <span className="shop-paid-badge">限定</span>
                  </div>
                  {alreadyOwned && <span className="equipped-badge">所持中</span>}
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <div className="shop-grid-price">{item.price} モンタコイン</div>
                </div>
                <button
                  className={`quest-btn shop-grid-button ${alreadyOwned ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                  onClick={() => onPurchase(item.itemId)}
                  disabled={alreadyOwned || !isActive}
                >
                  {alreadyOwned ? "所持中" : "交換する"}
                </button>
              </section>
            );
          })}
        </div>
      </section>

      {SHOP_EVENT_DECORATIONS.length > 0 ? (
        <>
          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="notification-badge notification-badge-event">春のデコ</span>
              <h2>イベント限定デコ</h2>
            </div>
            <p>春イベントだけの飾りです。持ち物のデコタブから表示を切り替えできます。</p>
          </section>

          <section className="shop-grid">
            {SHOP_EVENT_DECORATIONS.map((item) => {
              const owned = gameState.ownedDecorationIds.includes(item.itemId);
              return (
                <section className="card decorated-card shop-grid-card" key={item.itemId}>
                  <div className="shop-grid-preview shop-decoration-preview">
                    <div className="shop-badge-stack">
                      <span className="shop-paid-badge">限定</span>
                    </div>
                    <img src={item.imagePath} alt={item.title} className="shop-decoration-image" />
                    {owned && <span className="equipped-badge">所持中</span>}
                  </div>
                  <div className="shop-grid-meta">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className="shop-grid-price">{item.price} モンタコイン</div>
                  </div>
                  <button
                    className={`quest-btn shop-grid-button ${owned ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                    onClick={() => onPurchaseDecoration(item.itemId)}
                    disabled={owned || !isActive}
                  >
                    {owned ? "所持中" : "交換する"}
                  </button>
                </section>
              );
            })}
          </section>
        </>
      ) : null}

      {SHOP_EVENT_BUNDLES.length > 0 ? (
        <>
          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="notification-badge notification-badge-event">春のセット</span>
              <h2>イベント限定セット</h2>
            </div>
            <p>春イベントをすぐ楽しみたい方向けのセットです。</p>
          </section>

          <section className="shop-grid">
            {SHOP_EVENT_BUNDLES.map((item) => (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className="shop-grid-preview shop-grid-preview-paid">
                  <div className="shop-badge-stack">
                    <span className="shop-paid-badge">限定</span>
                  </div>
                  <img src={item.imagePath} alt={item.title} className="shop-paid-pack-icon" />
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="shop-grid-price">{item.price} モンタコイン</div>
                </div>
                <button
                  className="quest-btn shop-grid-button task-global-menu-button-accent"
                  onClick={() => onPurchaseBundle(item.itemId)}
                  disabled={!isActive}
                >
                  交換する
                </button>
              </section>
            ))}
          </section>
        </>
      ) : null}

      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href={`/event/${eventConfig.slug}`} className="ui-link-button settings-menu-button settings-menu-button-secondary">
            イベント詳細へ
          </Link>
          <Link href="/shop" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            通常ショップへ
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />

      {showStartNowConfirm ? (
        <div className="auth-email-modal-overlay">
          <div className="auth-email-modal-card event-confirm-modal-card">
            <h2 className="auth-email-modal-title">春の芽吹きたまごに切り替える？</h2>
            <div className="event-confirm-egg-preview">
              <img src={getMonsterImage(eventConfig.freeEggMonsterId)} alt="春の芽吹きたまご" />
            </div>
            <p className="shop-note">
              いま育てているモンスターとはお別れして、春の芽吹きたまごから育成を始めます。
            </p>
            <p className="shop-note shop-note-strong">
              いまのモンスターからは手紙を受け取り、春の芽吹きたまごの誕生イベントへ進みます。
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
