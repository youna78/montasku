"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/gtag";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { getBackgroundImagePath, getFrameThemeClass, SHOP_BACKGROUNDS, SHOP_FRAMES, SHOP_PAID_COIN_ITEMS } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

export default function ShopPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, purchaseBackground, equipBackground, purchaseFrame, equipFrame } = useGame();
  const [message, setMessage] = useState("");
  const [recentPurchase, setRecentPurchase] = useState<{ itemId: string; itemType: "background" | "frame"; title: string } | null>(null);
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<"free" | "paid">("free");
  const [activeFreeCategoryTab, setActiveFreeCategoryTab] = useState<"background" | "frame">("background");

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
    const item = SHOP_BACKGROUNDS.find((background) => background.itemId === itemId);
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
    const item = SHOP_FRAMES.find((frame) => frame.itemId === itemId);
    setRecentPurchase({ itemId, itemType: "frame", title: item?.title ?? "フレーム" });
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
            </div>
          </section>

          <section className="shop-grid">
            {activeFreeCategoryTab === "background"
              ? SHOP_BACKGROUNDS.map((item) => {
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
                          className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
                          onClick={() => onEquip(item.itemId)}
                        >
                          {equipped ? "そうび中" : "使う"}
                        </button>
                      )}
                    </section>
                  );
                })
              : SHOP_FRAMES.map((item) => {
                  const owned = gameState.ownedFrameIds.includes(item.itemId);
                  const equipped = gameState.selectedFrameId === item.itemId;

                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className={`shop-grid-preview shop-frame-preview ${item.previewClassName}`}>
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
                          className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
                          onClick={() => onEquipFrame(item.itemId)}
                        >
                          {equipped ? "そうび中" : "使う"}
                        </button>
                      )}
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
                モンタコインは、Stripe で購入する有料コインです。今後、有料ショップの限定アイテムや特別な販売に使える予定です。
              </p>
              <div className="shop-test-callout">
                <span className="shop-test-callout-badge">テスト中</span>
                <p>
                  いまは購入導線のテスト段階です。決済後の自動付与はまだ入っていないため、テスト完了後は
                  <Link href="/shop/thanks" className="inline-text-link">
                    購入ありがとうございました
                  </Link>
                  のページに戻る想定です。
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
                <a
                  className="quest-btn shop-grid-button task-global-menu-button-accent"
                  href={item.paymentLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("begin_checkout", {
                      item_id: item.itemId,
                      item_type: item.productType,
                      value: item.priceJpy,
                      currency: "JPY"
                    })
                  }
                >
                  Stripe で購入
                </a>
              </section>
            ))}
          </section>

          <section className="card decorated-card">
            <div className="shop-support-links">
              <Link href="/shop/thanks" className="ui-link-button ui-link-secondary">
                購入ありがとうございました
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
