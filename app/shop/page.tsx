"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/gtag";
import { useAuth } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { getVisibleHomeEvents, isEventActive } from "@/lib/game/events";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import {
  getBackgroundImagePath,
  getBoosterShopItem,
  getFramePreviewImagePath,
  getFrameThemeClass,
  SHOP_ATTRIBUTE_CHARMS,
  SHOP_BOOSTER_ITEMS,
  SHOP_EVERGREEN_BACKGROUNDS,
  SHOP_EVERGREEN_BUNDLES,
  SHOP_EVERGREEN_DECORATIONS,
  SHOP_EVERGREEN_FRAMES,
  SHOP_PAID_ATTRIBUTE_CHARMS,
  SHOP_PAID_BACKGROUNDS,
  SHOP_PAID_COIN_ITEMS,
  SHOP_PAID_FRAMES
} from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

const CHARM_BUTTON_CLASS: Record<(typeof SHOP_ATTRIBUTE_CHARMS)[number]["attribute"], string> = {
  power: "task-global-menu-button-danger",
  heal: "task-global-menu-button-heal",
  knowledge: "task-global-menu-button-knowledge",
  create: "task-global-menu-button-create"
};

export default function ShopPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    monsters,
    gameState,
    isLoading,
    purchaseBackground,
    equipBackground,
    purchaseFrame,
    equipFrame,
    purchaseAttributeCharm,
    purchasePaidAttributeCharm,
    purchaseBooster,
    purchaseDecoration,
    purchasePaidBackground,
    purchasePaidFrame,
    purchasePaidBundle
  } = useGame();
  const [message, setMessage] = useState("");
  const [recentPurchase, setRecentPurchase] = useState<{ itemId: string; itemType: "background" | "frame"; title: string } | null>(null);
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<"free" | "paid">("free");
  const [activeFreeCategoryTab, setActiveFreeCategoryTab] = useState<"background" | "frame" | "item">("background");
  const [checkoutItemId, setCheckoutItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1400);
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

  const activeEvent = getVisibleHomeEvents().find((event) => isEventActive(event)) ?? null;

  const onBuy = (itemId: string, price: number) => {
    const result = purchaseBackground(itemId, price);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "insufficient_coins" ? "コインがたりません" : "すでに所持しています");
      return;
    }

    trackEvent("shop_purchase", {
      item_id: itemId,
      item_type: "background",
      currency_type: "free_coin",
      price
    });
    const item = SHOP_EVERGREEN_BACKGROUNDS.find((background) => background.itemId === itemId);
    setRecentPurchase({ itemId, itemType: "background", title: item?.title ?? "背景" });
    setMessage("こうにゅうしました");
  };

  const onEquip = (itemId: string) => {
    const result = equipBackground(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "そうび中です" : "まだこうにゅうしていません");
      return;
    }

    setMessage("背景をへんこうしました");
    setRecentPurchase(null);
  };

  const onBuyFrame = (itemId: string, price: number) => {
    const result = purchaseFrame(itemId, price);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "insufficient_coins" ? "コインがたりません" : "すでに所持しています");
      return;
    }

    trackEvent("shop_purchase", {
      item_id: itemId,
      item_type: "frame",
      currency_type: "free_coin",
      price
    });
    const item = SHOP_EVERGREEN_FRAMES.find((frame) => frame.itemId === itemId);
    setRecentPurchase({ itemId, itemType: "frame", title: item?.title ?? "フレーム" });
    setMessage("こうにゅうしました");
  };

  const onBuyCharm = (attribute: (typeof SHOP_ATTRIBUTE_CHARMS)[number]["attribute"]) => {
    const result = purchaseAttributeCharm(attribute);
    const item = SHOP_ATTRIBUTE_CHARMS.find((charm) => charm.attribute === attribute);
    if (!result) return;
    if (!result.purchased) {
      setMessage(item ? `${item.title} を買うフリーコインがたりません` : "コインがたりません");
      return;
    }

    trackEvent("shop_purchase", {
      item_id: item?.itemId ?? `${attribute}_charm`,
      item_type: "attribute_charm",
      currency_type: "free_coin",
      price: item?.price ?? 300
    });
    setMessage(item ? `${item.title} をこうにゅうしました` : "こうにゅうしました");
  };

  const onBuyPaidCharm = (attribute: (typeof SHOP_PAID_ATTRIBUTE_CHARMS)[number]["attribute"]) => {
    const result = purchasePaidAttributeCharm(attribute);
    const item = SHOP_PAID_ATTRIBUTE_CHARMS.find((charm) => charm.attribute === attribute);
    if (!result) return;
    if (!result.purchased) {
      setMessage(item ? `${item.title} を買うモンタコインがたりません` : "モンタコインがたりません");
      return;
    }

      trackEvent("shop_purchase", {
        item_id: item?.itemId ?? `paid_charm_${attribute}_01`,
        item_type: "premium_attribute_charm",
        currency_type: "paid_coin",
        price: item?.price ?? 300
      });
    setMessage(item ? `${item.title} をこうにゅうしました` : "こうにゅうしました");
  };

  const onBuyBooster = (itemId: string) => {
    const result = purchaseBooster(itemId);
    const item = getBoosterShopItem(itemId);
    if (!result) return;
    if (!result.purchased) {
      if (item?.currencyType === "free_coin") {
        setMessage(item ? `${item.title} を買うフリーコインがたりません` : "フリーコインがたりません");
      } else {
        setMessage(item ? `${item.title} を買うモンタコインがたりません` : "モンタコインがたりません");
      }
      return;
    }

    trackEvent("shop_purchase", {
      item_id: item?.itemId ?? itemId,
      item_type: "booster",
      currency_type: item?.currencyType ?? "paid_coin",
      price: item?.price ?? 0
    });
    setMessage(item ? `${item.title} をこうにゅうしました` : "こうにゅうしました");
  };

  const onBuyPaidBackground = (itemId: string) => {
    const result = purchasePaidBackground(itemId);
    const item = SHOP_PAID_BACKGROUNDS.find((background) => background.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", {
        item_id: item.itemId,
        item_type: "background",
        currency_type: "paid_coin",
        price: item.price
      });
      setRecentPurchase({ itemId, itemType: "background", title: item.title });
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidFrame = (itemId: string) => {
    const result = purchasePaidFrame(itemId);
    const item = SHOP_PAID_FRAMES.find((frame) => frame.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", {
        item_id: item.itemId,
        item_type: "frame",
        currency_type: "paid_coin",
        price: item.price
      });
      setRecentPurchase({ itemId, itemType: "frame", title: item.title });
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidBundle = (itemId: string) => {
    const result = purchasePaidBundle(itemId);
    const item = SHOP_EVERGREEN_BUNDLES.find((bundle) => bundle.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage("モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", {
        item_id: item.itemId,
        item_type: "bundle",
        currency_type: "paid_coin",
        price: item.price
      });
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onBuyDecoration = (itemId: string) => {
    const result = purchaseDecoration(itemId);
    const item = SHOP_EVERGREEN_DECORATIONS.find((decoration) => decoration.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", {
        item_id: item.itemId,
        item_type: "decoration",
        currency_type: "paid_coin",
        price: item.price
      });
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onEquipFrame = (itemId: string) => {
    const result = equipFrame(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "そうび中です" : "まだこうにゅうしていません");
      return;
    }

    setMessage("フレームをへんこうしました");
    setRecentPurchase(null);
  };

  const onEquipRecent = () => {
    if (!recentPurchase) return;
    if (recentPurchase.itemType === "background") {
      onEquip(recentPurchase.itemId);
      return;
    }
    onEquipFrame(recentPurchase.itemId);
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
      console.error("[shop] failed to start paid checkout", error);
      setMessage("決済ページを開けませんでした");
    } finally {
      setCheckoutItemId(null);
    }
  };

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">ショップ</div>
      <section className="card decorated-card quest-heading-card">
        <p>フリーコインやモンタコインで、見た目やアイテムをそろえられます。</p>
      </section>

      {message && <div className="toast">{message}</div>}

      {recentPurchase && (
        <section className="card decorated-card">
          <div className="shop-recent-purchase">
            <p>
              <strong>{recentPurchase.title}</strong> を購入しました。
            </p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onEquipRecent}>
                いますぐ装備
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => router.push("/inventory")}>
                持ち物で確認
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="card decorated-card">
        <div className="status-panel compact-status-panel">
          <div className="status-row">
            <span>所持無料コイン</span>
            <strong>{gameState.freeCoins}</strong>
          </div>
          <div className="status-row">
            <span>所持モンタコイン</span>
            <strong>{gameState.paidCoinBalance}</strong>
          </div>
        </div>
      </section>

      {activeEvent && (
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-event">イベント</span>
            <h2>{activeEvent.name} ショップ</h2>
          </div>
          <p>春イベント限定の背景やイベントたまごは、専用ショップにまとめています。</p>
          <div className="notification-card-actions">
            <Link href={`/shop/events/${activeEvent.slug}`} className="ui-link-button settings-menu-button settings-menu-button-primary">
              イベントショップへ
            </Link>
          </div>
        </section>
      )}

      <section className="card decorated-card">
        <div className="shop-tab-row">
          <button
            className={`quest-btn shop-tab-button ${activeCurrencyTab === "free" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-primary"}`}
            onClick={() => setActiveCurrencyTab("free")}
          >
            フリーコイン
          </button>
          <button
            className={`quest-btn shop-tab-button ${activeCurrencyTab === "paid" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
            onClick={() => setActiveCurrencyTab("paid")}
          >
            モンタコイン
          </button>
        </div>
      </section>

      {activeCurrencyTab === "free" ? (
        <>
          <section className="card decorated-card">
            <div className="shop-tab-row shop-subtab-row">
              <button
                className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "background" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                onClick={() => setActiveFreeCategoryTab("background")}
              >
                背景
              </button>
              <button
                className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "frame" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                onClick={() => setActiveFreeCategoryTab("frame")}
              >
                フレーム
              </button>
              <button
                className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "item" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                onClick={() => setActiveFreeCategoryTab("item")}
              >
                アイテム
              </button>
            </div>
          </section>

          <section className="shop-grid">
            {activeFreeCategoryTab === "background"
              ? SHOP_EVERGREEN_BACKGROUNDS.map((item) => {
                  const owned = gameState.ownedBackgroundIds.includes(item.itemId);
                  const equipped = gameState.selectedBackgroundId === item.itemId;

                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                        {equipped && <span className="equipped-badge">使用中</span>}
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price === 0 ? "初期所持" : `${item.price} フリーコイン`}</div>
                      </div>
                      {!owned ? (
                        <button className="quest-btn shop-grid-button task-global-menu-button-primary" onClick={() => onBuy(item.itemId, item.price)}>
                          購入する
                        </button>
                      ) : (
                        <button
                          className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                          onClick={() => onEquip(item.itemId)}
                        >
                          {equipped ? "そうび中" : "使う"}
                        </button>
                      )}
                    </section>
                  );
                })
              : activeFreeCategoryTab === "frame"
                ? SHOP_EVERGREEN_FRAMES.map((item) => {
                  const owned = gameState.ownedFrameIds.includes(item.itemId);
                  const equipped = gameState.selectedFrameId === item.itemId;
                  const framePreviewImagePath = getFramePreviewImagePath(item.itemId);

                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className={`shop-grid-preview shop-frame-preview ${item.previewClassName}`}>
                        {framePreviewImagePath ? <img src={framePreviewImagePath} alt={item.title} className="shop-frame-image" /> : null}
                        {equipped && <span className="equipped-badge">使用中</span>}
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price === 0 ? "初期所持" : `${item.price} フリーコイン`}</div>
                      </div>
                      {!owned ? (
                        <button className="quest-btn shop-grid-button task-global-menu-button-primary" onClick={() => onBuyFrame(item.itemId, item.price)}>
                          購入する
                        </button>
                      ) : (
                        <button
                          className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                          onClick={() => onEquipFrame(item.itemId)}
                        >
                          {equipped ? "そうび中" : "使う"}
                        </button>
                      )}
                    </section>
                  );
                })
                : SHOP_ATTRIBUTE_CHARMS.map((item) => {
                    const ownedCount = gameState.ownedCharmItemCounts[item.attribute] ?? 0;
                    const equipped = gameState.activeAttributeCharm?.attribute === item.attribute;

                    return (
                      <section className={`card decorated-card shop-grid-card charm-card-${item.attribute}`} key={item.itemId}>
                        <div className={`shop-grid-preview shop-charm-preview charm-preview-${item.attribute}`}>
                          <img src={item.iconPath} alt={item.title} className="shop-charm-icon" />
                          {equipped && <span className="equipped-badge">発動中</span>}
                        </div>
                        <div className="shop-grid-meta">
                          <h2 className={`charm-title charm-title-${item.attribute}`}>{item.title}</h2>
                          <p>{item.description}</p>
                        <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>
                          {item.price} フリーコイン / 所持 {ownedCount}
                        </div>
                      </div>
                      <button className={`quest-btn shop-grid-button ${CHARM_BUTTON_CLASS[item.attribute]}`} onClick={() => onBuyCharm(item.attribute)}>
                        購入する
                        </button>
                      </section>
                    );
                  })}
          </section>
        </>
      ) : (
        <>
          <section className="card decorated-card">
            <div className="shop-paid-intro">
              <p className="shop-note shop-note-strong">
                モンタコインは、Stripe で購入できる有料コインです。コインをチャージしたあと、下の限定アイテムにも使えます。
              </p>
              {!user && (
                <>
                  <p className="shop-note">
                    モンタコインを購入するにはログインが必要です。設定画面からログインすると、そのまま購入できます。
                  </p>
                  <div className="notification-card-actions">
                    <Link href="/settings" className="ui-link-button settings-menu-button settings-menu-button-primary">
                      設定でログインする
                    </Link>
                  </div>
                </>
              )}
              <div className="shop-test-callout">
                <span className="shop-test-callout-badge">テスト中</span>
                <p>
                  いまは Stripe のテスト決済です。実際の請求は発生しません。決済完了後、モンタコインは自動反映されます。
                  <Link href="/shop/thanks" className="inline-text-link">
                    購入完了
                  </Link>
                  ページに戻ったあと、少し待ってから表示をご確認ください。
                </p>
              </div>
            </div>
          </section>

          <section className="shop-grid">
            {SHOP_PAID_COIN_ITEMS.filter((item) => item.status === "confirmed").map((item) => (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className="shop-grid-preview shop-grid-preview-paid">
                  <div className="shop-badge-stack">
                    <span className="shop-paid-badge">有料</span>
                    <span className="shop-test-badge">テスト中</span>
                  </div>
                  <img src={item.imagePath} alt="" className="shop-paid-pack-icon" />
                  <div className="shop-paid-amount">{item.totalPaidCoins}</div>
                  <div className="shop-paid-label">モンタコイン</div>
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="shop-grid-price">
                    {item.priceJpy} 円
                    {item.bonusPaidCoins > 0 ? ` / +${item.bonusPaidCoins} おまけ` : ""}
                  </div>
                </div>
                <button
                  className="quest-btn shop-grid-button task-global-menu-button-accent"
                  onClick={() => onStartPaidCheckout(item)}
                  disabled={checkoutItemId === item.itemId || !user}
                >
                  {!user ? "ログインで購入可能" : checkoutItemId === item.itemId ? "移動中..." : "Stripe で購入"}
                </button>
              </section>
            ))}
          </section>

          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="shop-paid-badge">限定</span>
              <h2>モンタコイン限定アイテム</h2>
            </div>
            <p>有料版アイテムは長く使えるぶん、進化先の調整がしやすくなります。</p>
          </section>

          <section className="shop-grid">
            {SHOP_PAID_ATTRIBUTE_CHARMS.map((item) => {
              const ownedCount = gameState.ownedPaidCharmItemCounts[item.attribute] ?? 0;
              return (
                <section className={`card decorated-card shop-grid-card charm-card-${item.attribute}`} key={item.itemId}>
                  <div className={`shop-grid-preview shop-charm-preview charm-preview-${item.attribute}`}>
                    <div className="shop-badge-stack">
                      <span className="shop-paid-badge">モンタ</span>
                    </div>
                    <img src={item.iconPath} alt={item.title} className="shop-charm-icon" />
                  </div>
                  <div className="shop-grid-meta">
                    <h2 className={`charm-title charm-title-${item.attribute}`}>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>
                      {item.price} モンタコイン / 所持 {ownedCount}
                    </div>
                  </div>
                  <button className={`quest-btn shop-grid-button ${CHARM_BUTTON_CLASS[item.attribute]}`} onClick={() => onBuyPaidCharm(item.attribute)}>
                    購入する
                  </button>
                </section>
              );
            })}
          </section>

          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="shop-paid-badge">ブースト</span>
              <h2>ブーストアイテム</h2>
            </div>
            <p>使うと一定時間、タスク達成時の獲得EXPがアップします。無料コイン版とモンタコイン版があります。</p>
          </section>

          <section className="shop-grid">
            {SHOP_BOOSTER_ITEMS.map((item) => {
              const ownedCount = gameState.ownedBoosterItemCounts[item.itemId] ?? 0;
              const isActive = gameState.activeExpBooster?.itemId === item.itemId;
              return (
                <section className="card decorated-card shop-grid-card" key={item.itemId}>
                  <div className={`shop-grid-preview shop-charm-preview ${item.currencyType === "paid_coin" ? "shop-grid-preview-paid" : "shop-grid-preview-coming-soon"}`}>
                    <div className="shop-badge-stack">
                      <span className={item.currencyType === "paid_coin" ? "shop-paid-badge" : "notification-badge notification-badge-info"}>
                        {item.currencyType === "paid_coin" ? "モンタ" : "FREE"}
                      </span>
                    </div>
                    {item.iconPath ? <img src={item.iconPath} alt={item.title} className="shop-charm-icon" /> : <span className="shop-coming-soon-label">BOOST</span>}
                    {isActive && <span className="equipped-badge">発動中</span>}
                  </div>
                  <div className="shop-grid-meta">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className="shop-grid-price">
                      {item.price} {item.currencyType === "paid_coin" ? "モンタコイン" : "フリーコイン"} / 所持 {ownedCount}
                    </div>
                  </div>
                  <button
                    className={`quest-btn shop-grid-button ${item.currencyType === "paid_coin" ? "task-global-menu-button-accent" : "task-global-menu-button-primary"}`}
                    onClick={() => onBuyBooster(item.itemId)}
                  >
                    購入する
                  </button>
                </section>
              );
            })}
          </section>

          {SHOP_PAID_BACKGROUNDS.length > 0 ? (
            <>
              <section className="card decorated-card">
                <div className="notification-card-head">
                  <span className="shop-paid-badge">背景</span>
                  <h2>モンタコインで買える背景</h2>
                </div>
                <p>常設の有料背景です。購入後は持ち物から切り替えできます。</p>
              </section>

              <section className="shop-grid">
                {SHOP_PAID_BACKGROUNDS.map((item) => {
                  const owned = gameState.ownedBackgroundIds.includes(item.itemId);
                  const equipped = gameState.selectedBackgroundId === item.itemId;
                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                        <div className="shop-badge-stack">
                          <span className="shop-paid-badge">モンタ</span>
                        </div>
                        {equipped && <span className="equipped-badge">使用中</span>}
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price} モンタコイン</div>
                      </div>
                      {!owned ? (
                        <button className="quest-btn shop-grid-button task-global-menu-button-accent" onClick={() => onBuyPaidBackground(item.itemId)}>
                          購入する
                        </button>
                      ) : (
                        <button
                          className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                          onClick={() => onEquip(item.itemId)}
                        >
                          {equipped ? "そうび中" : "使う"}
                        </button>
                      )}
                    </section>
                  );
                })}
              </section>
            </>
          ) : null}

          <section className="card decorated-card">
            <div className="notification-card-head">
              <span className="shop-paid-badge">フレーム</span>
              <h2>モンタコインで買えるフレーム</h2>
            </div>
            <p>常設の有料フレームです。購入後は持ち物から切り替えできます。</p>
          </section>

          {SHOP_EVERGREEN_DECORATIONS.length > 0 ? (
            <>
              <section className="card decorated-card">
                <div className="notification-card-head">
                  <span className="shop-paid-badge">デコ</span>
                  <h2>モンタコインで買えるデコ</h2>
                </div>
                <p>ホームのモンスターまわりに飾れるデコです。持ち物のデコタブから表示を切り替えできます。</p>
              </section>

              <section className="shop-grid">
                {SHOP_EVERGREEN_DECORATIONS.map((item) => {
                  const owned = gameState.ownedDecorationIds.includes(item.itemId);
                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className="shop-grid-preview shop-decoration-preview">
                        <div className="shop-badge-stack">
                          <span className="shop-paid-badge">モンタ</span>
                        </div>
                        <img src={item.imagePath} alt={item.title} className="shop-decoration-image" />
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price} モンタコイン</div>
                      </div>
                      <button
                        className={`quest-btn shop-grid-button ${owned ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                        onClick={() => onBuyDecoration(item.itemId)}
                      >
                        {owned ? "所持中" : "購入する"}
                      </button>
                    </section>
                  );
                })}
              </section>
            </>
          ) : null}

          <section className="shop-grid">
            {SHOP_PAID_FRAMES.map((item) => {
              const owned = gameState.ownedFrameIds.includes(item.itemId);
              const equipped = gameState.selectedFrameId === item.itemId;
              const framePreviewImagePath = getFramePreviewImagePath(item.itemId);
              return (
                <section className="card decorated-card shop-grid-card" key={item.itemId}>
                  <div className={`shop-grid-preview shop-frame-preview ${item.previewClassName}`}>
                    <div className="shop-badge-stack">
                      <span className="shop-paid-badge">モンタ</span>
                    </div>
                    {framePreviewImagePath ? <img src={framePreviewImagePath} alt={item.title} className="shop-frame-image" /> : null}
                    {equipped && <span className="equipped-badge">使用中</span>}
                  </div>
                  <div className="shop-grid-meta">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className="shop-grid-price">{item.price} モンタコイン</div>
                  </div>
                  {!owned ? (
                    <button className="quest-btn shop-grid-button task-global-menu-button-accent" onClick={() => onBuyPaidFrame(item.itemId)}>
                      購入する
                    </button>
                  ) : (
                    <button
                      className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`}
                      onClick={() => onEquipFrame(item.itemId)}
                    >
                      {equipped ? "そうび中" : "使う"}
                    </button>
                  )}
                </section>
              );
            })}
          </section>

          {SHOP_EVERGREEN_BUNDLES.length > 0 ? (
            <>
              <section className="card decorated-card">
                <div className="notification-card-head">
                  <span className="shop-paid-badge">バンドル</span>
                  <h2>モンタコインで買えるセット</h2>
                </div>
                <p>すぐ遊びやすいセット商品です。</p>
              </section>

              <section className="shop-grid">
                {SHOP_EVERGREEN_BUNDLES.map((item) => (
                  <section className="card decorated-card shop-grid-card" key={item.itemId}>
                    <div className="shop-grid-preview shop-grid-preview-paid">
                      <div className="shop-badge-stack">
                        <span className="shop-paid-badge">モンタ</span>
                      </div>
                      <img src={item.imagePath} alt={item.title} className="shop-paid-pack-icon" />
                    </div>
                    <div className="shop-grid-meta">
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <div className="shop-grid-price">{item.price} モンタコイン</div>
                    </div>
                    <button className="quest-btn shop-grid-button task-global-menu-button-accent" onClick={() => onBuyPaidBundle(item.itemId)}>
                      購入する
                    </button>
                  </section>
                ))}
              </section>
            </>
          ) : null}

          <section className="card decorated-card">
            <div className="shop-support-links">
              <Link href="/shop/thanks" className="ui-link-button ui-link-secondary">
                購入完了
              </Link>
              <Link href="/commerce" className="ui-link-button ui-link-secondary">
                特定商取引法に基づく表記
              </Link>
              <Link href="/contact" className="ui-link-button ui-link-secondary">
                お問い合わせ
              </Link>
            </div>
          </section>
        </>
      )}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
