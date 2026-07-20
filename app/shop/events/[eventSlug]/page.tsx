"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/gtag";
import { useAuth } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { getMonsterImage } from "@/lib/game/assets";
import { getEventBySlug, getEventStatusLabel, getRemainingDaysLabel, isEventActive, isEventAnnouncementVisible } from "@/lib/game/events";
import { getBackgroundImagePath, getFrameThemeClass, SHOP_EVENT_BUNDLES, SHOP_EVENT_DECORATIONS, SHOP_PAID_COIN_ITEMS } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import { getNativePlatform, isNativeMobileApp } from "@/lib/platform/capacitor";

type PurchaseConfirmState = {
  title: string;
  priceLabel: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export default function EventShopDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
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
    waitForPendingSave
  } = useGame();
  const [message, setMessage] = useState("");
  const [showStartNowConfirm, setShowStartNowConfirm] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ title: string; lines: string[] } | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<PurchaseConfirmState | null>(null);
  const [bundleConfirm, setBundleConfirm] = useState<{ itemId: string; title: string; ownedLines: string[]; grantedLines: string[] } | null>(null);
  const [checkoutItemId, setCheckoutItemId] = useState<string | null>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [nativePlatformLabel, setNativePlatformLabel] = useState("アプリ");
  const [isPurchasePending, setIsPurchasePending] = useState(false);

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    const platform = getNativePlatform();
    if (platform === "ios") {
      setNativePlatformLabel("iOSアプリ");
    } else if (platform === "android") {
      setNativePlatformLabel("Androidアプリ");
    } else {
      setNativePlatformLabel("アプリ");
    }
  }, []);

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
      <main className="page-shell page-rpg page-shop page-event-shop">
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
      <main
        className={`page-shell page-rpg page-shop page-event-shop ${getFrameThemeClass(gameState.selectedFrameId)}`}
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
    setMessage(`${eventEggName}を受け取りました`);
  };

  const onQueueEgg = () => {
    const result = queueEventEgg(eventConfig.eventId);
    if (!result) return;
    if (!result.used) {
      if (result.reason === "no_egg") setMessage(`${eventEggName}を持っていません`);
      else if (result.reason === "already_queued") setMessage("次のたまごに予約済みです");
      else setMessage("イベントたまごを予約できませんでした");
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

  const onPurchase = async (itemId: string) => {
    const item = [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems].find((entry) => entry.itemId === itemId);
    const result = await purchaseEventReward(eventConfig.eventId, itemId);
    if (!item || !result) return;
    if (!result.purchased) {
      if (result.reason === "insufficient_free_coins") setMessage("フリーコインがたりません");
      else if (result.reason === "insufficient_paid_coins") setMessage("モンタコインがたりません");
      else if (result.reason === "login_required") setMessage("モンタコインの商品を購入するにはログインしてください");
      else if (result.reason === "wallet_sync_failed") setMessage("残高を確認できませんでした。通信状態を確認して、もう一度お試しください");
      else if (result.reason === "already_owned") setMessage("すでに所持しています");
      else setMessage("交換できませんでした");
      return;
    }
    setPurchaseModal({ title: item.title, lines: [item.title] });
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

  const requestPurchase = (
    confirm: Omit<PurchaseConfirmState, "onConfirm">,
    onConfirm: () => void | Promise<void>
  ) => {
    setPurchaseConfirm({ ...confirm, onConfirm });
  };

  const runPurchaseAction = async (action: () => void | Promise<void>) => {
    if (isPurchasePending) return;
    setIsPurchasePending(true);
    try {
      await action();
      await waitForPendingSave();
    } finally {
      setIsPurchasePending(false);
    }
  };

  const onConfirmPurchase = () => {
    if (!purchaseConfirm) return;
    const action = purchaseConfirm.onConfirm;
    setPurchaseConfirm(null);
    void runPurchaseAction(action);
  };

  const getBundleConfirmState = (itemId: string) => {
    const item = SHOP_EVENT_BUNDLES.find((entry) => entry.itemId === itemId);
    if (!item) return null;

    if (item.itemId === "paid_bundle_spring_deco_01") {
      const ownedLines = [
        gameState.ownedDecorationIds.includes("paid_deco_picnic_basket_01") ? "ピクニックバスケット" : "",
        gameState.ownedDecorationIds.includes("paid_deco_flower_lantern_01") ? "花灯りランタン" : ""
      ].filter(Boolean);

      return {
        itemId,
        title: item.title,
        ownedLines,
        grantedLines: ["ピクニックバスケット", "花灯りランタン", "春の芽吹きたまご"]
      };
    }

    return {
      itemId,
      title: item.title,
      ownedLines: [],
      grantedLines: [item.title]
    };
  };

  const onRequestPurchaseBundle = (itemId: string) => {
    const confirmState = getBundleConfirmState(itemId);
    if (confirmState && confirmState.ownedLines.length > 0) {
      setBundleConfirm(confirmState);
      return;
    }
    const item = SHOP_EVENT_BUNDLES.find((entry) => entry.itemId === itemId);
    requestPurchase(
      {
        title: item?.title ?? "セット",
        priceLabel: `${item?.price ?? 0} モンタコイン`,
        message: "このイベント限定セットを交換しますか？"
      },
      () => onPurchaseBundle(itemId)
    );
  };

  const onConfirmPurchaseBundle = () => {
    if (!bundleConfirm) return;
    const itemId = bundleConfirm.itemId;
    setBundleConfirm(null);
    void runPurchaseAction(() => onPurchaseBundle(itemId));
  };

  const onStartPaidCheckout = async (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) => {
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        setMessage("ログインすると購入できます");
        router.push("/settings");
        return;
      }

      setCheckoutItemId(item.itemId);
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ productId: item.itemId })
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setMessage(payload.error ?? "決済ページを開けませんでした");
        return;
      }

      trackEvent("begin_checkout", {
        item_id: item.itemId,
        item_type: item.productType,
        value: item.priceJpy,
        currency: "JPY"
      });
      window.location.href = payload.url;
    } catch (error) {
      console.error("[event-shop] failed to start paid checkout", error);
      setMessage("決済ページを開けませんでした");
    } finally {
      setCheckoutItemId(null);
    }
  };

  const previewMonster = monsters.find((monster) => monster.monsterId === eventConfig.freeEggMonsterId);
  const eventEggName = previewMonster?.name ?? "イベントたまご";
  const isSpringEvent = eventConfig.eventId === "spring_easter_2026";
  const starterCheckoutItem = isSpringEvent
    ? SHOP_PAID_COIN_ITEMS.find((item) => item.itemId === "starter_bundle_boost_01" && item.status === "confirmed") ?? null
    : null;

  return (
    <main
      className={`page-shell page-rpg page-shop page-event-shop ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">イベントショップ</div>
      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card event-shop-hero">
        <div className="event-shop-hero-head">
          <span className="notification-badge notification-badge-event">{getEventStatusLabel(eventConfig)}</span>
          <span className="event-banner-remaining">{getRemainingDaysLabel(eventConfig)}</span>
        </div>
        {eventConfig.shopBannerImagePath ? (
          <div className="event-shop-banner-image-wrap">
            <img src={eventConfig.shopBannerImagePath} alt={`${eventConfig.name} ショップ`} className="event-shop-banner-image" />
          </div>
        ) : null}
        <h2>{eventConfig.name} ショップ</h2>
        <p>{eventConfig.notice}</p>
      </section>

      <section className="card decorated-card quest-heading-card">
        <p>イベント限定の背景やフレーム、イベントたまごを交換できます。イベントモンスターを育てるには、受け取ったたまごを「次のたまごに予約する」でセットしてください。</p>
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
            <strong>{ownedEventEggCount}個</strong>
          </div>
          <div className="event-progress-item">
            <span>状態</span>
            <strong>{isEventEggQueued ? "予約済み" : isEventEggActive ? "育成中" : getEventStatusLabel(eventConfig)}</strong>
          </div>
        </div>
        <div className="event-progress-note">
          {isEventEggQueued
            ? `${eventEggName}を予約済みです。今のモンスターとお別れした次のサイクルで育成が始まります。`
            : isEventEggActive
              ? `${eventEggName}を育成中です。タスクを達成するとイベントモンスターへ進化します。`
              : `${getRemainingDaysLabel(eventConfig)} / 開催中のみ交換できます。`}
        </div>
      </section>

      {purchaseModal ? (
        <div className="auth-email-modal-overlay event-shop-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="event-shop-purchase-complete-title">
          <div className="auth-email-modal-card event-shop-modal-card shop-recent-purchase">
            <h2 id="event-shop-purchase-complete-title" className="auth-email-modal-title">購入しました</h2>
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
        </div>
      ) : null}

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">イベントたまご</span>
          <h2>{eventEggName}</h2>
        </div>
        <div className="event-egg-row">
          <img src={getMonsterImage(previewMonster?.monsterId ?? eventConfig.freeEggMonsterId)} alt={eventEggName} className="event-egg-thumb" />
          <div className="event-egg-meta">
            <p>まずは無料で1個受け取れます。受け取ったあとに「次のたまごに予約する」を押すと、いまのモンスターとお別れした次の育成サイクルで{eventEggName}からイベントモンスターが出現します。</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onClaimFreeEgg} disabled={!isActive || Boolean(eventState?.hasClaimedFreeEgg)}>
                {eventState?.hasClaimedFreeEgg ? "受け取り済み" : "無料で受け取る"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={onQueueEgg} disabled={isEventEggQueued || ownedEventEggCount <= 0 || !isActive}>
                {isEventEggQueued ? "予約済み" : "次のたまごに予約する"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={() => setShowStartNowConfirm(true)} disabled={ownedEventEggCount <= 0 || !isActive}>
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
          <span className="notification-badge notification-badge-info">フリーコイン交換</span>
          <h2>イベント限定アイテム</h2>
        </div>
        <div className="shop-grid">
          {eventConfig.freeCoinShopItems.map((item) => {
            const alreadyOwned = item.rewardType === "background"
              ? gameState.ownedBackgroundIds.includes(item.grantValue)
              : gameState.ownedFrameIds.includes(item.grantValue);
            const insufficientCoins = gameState.freeCoins < item.price;
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
                  onClick={() =>
                    requestPurchase(
                      {
                        title: item.title,
                        priceLabel: `${item.price} フリーコイン`,
                        message: "このイベントアイテムを交換しますか？"
                      },
                      () => onPurchase(item.itemId)
                    )
                  }
                  disabled={alreadyOwned || !isActive || insufficientCoins}
                >
                  {alreadyOwned ? "所持中" : insufficientCoins ? "コイン不足" : "交換する"}
                </button>
              </section>
            );
          })}
        </div>
      </section>

      {starterCheckoutItem ? (
        <section className="card decorated-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-event">モンタコイン交換</span>
            <h2>特別ラインナップ</h2>
          </div>
          <p className="shop-note">
            {isNativeApp
              ? `${nativePlatformLabel}版のモンタコイン購入は準備中です。Web版で購入済みのモンタコインは、イベント限定アイテムにも使えます。`
              : "モンタコインは、Stripe で購入できる有料コインです。必要なときは通常ショップのモンタコインページからチャージできます。"}
          </p>
          <div className="shop-grid shop-grid-single-centered">
            <section className="card decorated-card shop-grid-card" key={starterCheckoutItem.itemId}>
              <div className="shop-grid-preview shop-grid-preview-paid">
                <div className="shop-badge-stack">
                  <span className="shop-paid-badge">決済</span>
                                  </div>
                <img src={starterCheckoutItem.imagePath} alt={starterCheckoutItem.title} className="shop-paid-pack-icon" />
              </div>
              <div className="shop-grid-meta">
                <h2>{starterCheckoutItem.title}</h2>
                <p>{starterCheckoutItem.description}</p>
                <div className="shop-grid-description">
                  500モンタコイン / 春の芽吹きたまご / EXPブースト 24時間
                </div>
                <div className="shop-grid-price">{starterCheckoutItem.priceJpy} 円</div>
              </div>
              {isNativeApp ? (
                <p className="shop-note shop-note-strong">{nativePlatformLabel}版での購入は準備中です。</p>
              ) : (
                <button
                  className="quest-btn shop-grid-button task-global-menu-button-accent"
                  onClick={() =>
                    requestPurchase(
                      {
                        title: starterCheckoutItem.title,
                        priceLabel: `${starterCheckoutItem.priceJpy} 円`,
                        message: "決済ページへ移動します。購入しますか？",
                        confirmLabel: "決済へ進む"
                      },
                      () => onStartPaidCheckout(starterCheckoutItem)
                    )
                  }
                  disabled={checkoutItemId === starterCheckoutItem.itemId || !user}
                >
                  {!user ? "ログインで購入可能" : checkoutItemId === starterCheckoutItem.itemId ? "移動中..." : "Stripe で購入"}
                </button>
              )}
            </section>
          </div>
        </section>
      ) : null}

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
            const insufficientCoins = gameState.paidCoinBalance < item.price;
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
                  onClick={() =>
                    requestPurchase(
                      {
                        title: item.title,
                        priceLabel: `${item.price} モンタコイン`,
                        message: "このイベントアイテムを交換しますか？"
                      },
                      () => onPurchase(item.itemId)
                    )
                  }
                  disabled={alreadyOwned || !isActive || insufficientCoins}
                >
                  {alreadyOwned ? "所持中" : insufficientCoins ? "コイン不足" : "交換する"}
                </button>
              </section>
            );
          })}
        </div>
      </section>

      {isSpringEvent && SHOP_EVENT_DECORATIONS.length > 0 ? (
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
              const insufficientCoins = gameState.paidCoinBalance < item.price;
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
                    onClick={() =>
                      requestPurchase(
                        {
                          title: item.title,
                          priceLabel: `${item.price} モンタコイン`,
                          message: "このデコを交換しますか？"
                        },
                        () => onPurchaseDecoration(item.itemId)
                      )
                    }
                    disabled={owned || !isActive || insufficientCoins}
                  >
                    {owned ? "所持中" : insufficientCoins ? "コイン不足" : "交換する"}
                  </button>
                </section>
              );
            })}
          </section>
        </>
      ) : null}

      {isSpringEvent && SHOP_EVENT_BUNDLES.length > 0 ? (
        <>
          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="notification-badge notification-badge-event">春のセット</span>
              <h2>イベント限定セット</h2>
            </div>
            <p>春イベントをすぐ楽しみたい方向けのセットです。</p>
          </section>

          <section className="shop-grid">
            {SHOP_EVENT_BUNDLES.map((item) => {
              const insufficientCoins = gameState.paidCoinBalance < item.price;
              return (
                <section className="card decorated-card shop-grid-card" key={item.itemId}>
                  <div className="shop-grid-preview shop-grid-preview-paid">
                    <div className="shop-badge-stack">
                      <span className="shop-paid-badge">限定</span>
                    </div>
                    <img src={item.imagePath} alt={item.title} className="shop-paid-pack-icon" />
                  </div>
                  <div className="shop-grid-meta">
                    <h2>{item.title}</h2>
                    <div className="shop-grid-description">
                      ピクニックバスケット / 花灯りランタン / 春の芽吹きたまご
                    </div>
                    <div className="shop-grid-price">{item.price} モンタコイン</div>
                  </div>
                  <button
                    className="quest-btn shop-grid-button task-global-menu-button-accent"
                    onClick={() => onRequestPurchaseBundle(item.itemId)}
                    disabled={!isActive || insufficientCoins}
                  >
                    {insufficientCoins ? "コイン不足" : "交換する"}
                  </button>
                </section>
              );
            })}
          </section>
        </>
      ) : null}

      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href={`/event/${eventConfig.slug}`} className="ui-link-button settings-menu-button settings-menu-button-secondary">
            イベント詳細へ
          </Link>
          <Link href="/shop" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            通常ショップへ
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />

      {(isPurchasePending || checkoutItemId !== null) && (
        <div className="auth-email-modal-overlay event-shop-modal-overlay purchase-processing-overlay" role="status" aria-live="polite">
          <div className="card decorated-card auth-email-modal-card event-shop-modal-card">
            <p className="auth-email-modal-title">購入処理中...</p>
          </div>
        </div>
      )}

      {showStartNowConfirm ? (
        <div className="auth-email-modal-overlay event-shop-modal-overlay">
          <div className="auth-email-modal-card event-shop-modal-card event-confirm-modal-card">
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

      {bundleConfirm ? (
        <div className="auth-email-modal-overlay event-shop-modal-overlay">
          <div className="auth-email-modal-card event-shop-modal-card">
            <h2 className="auth-email-modal-title">セットを購入しますか？</h2>
            <p className="shop-note">
              <strong>{bundleConfirm.title}</strong>
              {" "}
              には、すでに所持しているアイテムが含まれています。
            </p>
            <p className="shop-note">所持中: {bundleConfirm.ownedLines.map((line) => `「${line}」`).join(" / ")}</p>
            <p className="shop-note">内容: {bundleConfirm.grantedLines.map((line) => `「${line}」`).join(" / ")}</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={onConfirmPurchaseBundle}>
                それでも購入する
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setBundleConfirm(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {purchaseConfirm ? (
        <div className="auth-email-modal-overlay event-shop-modal-overlay">
          <div className="auth-email-modal-card event-shop-modal-card event-shop-purchase-modal-card">
            <h2 className="auth-email-modal-title">購入しますか？</h2>
            <p className="shop-note">
              <strong>{purchaseConfirm.title}</strong>
              {" "}
              を購入します。
            </p>
            {purchaseConfirm.message ? <p className="shop-note">{purchaseConfirm.message}</p> : null}
            <div className="shop-confirm-balance-grid">
              <div><span>所持フリーコイン</span><strong>{gameState.freeCoins}</strong></div>
              <div><span>所持モンタコイン</span><strong>{gameState.paidCoinBalance}</strong></div>
            </div>
            <p className="shop-note shop-note-strong">必要コイン: {purchaseConfirm.priceLabel}</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={onConfirmPurchase}>
                {purchaseConfirm.confirmLabel ?? "購入する"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setPurchaseConfirm(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
