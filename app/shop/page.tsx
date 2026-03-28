"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/gtag";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { getBackgroundImagePath, getFrameThemeClass, SHOP_BACKGROUNDS, SHOP_FRAMES } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

export default function ShopPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, purchaseBackground, equipBackground, purchaseFrame, equipFrame } = useGame();
  const [message, setMessage] = useState("");
  const [recentPurchase, setRecentPurchase] = useState<{ itemId: string; itemType: "background" | "frame"; title: string } | null>(null);

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
        <p>無料コインで背景とフレームを購入できます。</p>
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
        </div>
      </section>

      <section className="card decorated-card">
        <h2>背景ショップ</h2>
      </section>

      {SHOP_BACKGROUNDS.map((item) => {
        const owned = gameState.ownedBackgroundIds.includes(item.itemId);
        const equipped = gameState.selectedBackgroundId === item.itemId;

        return (
          <section className="card decorated-card" key={item.itemId}>
            <div className="shop-item-card">
              <div className="shop-preview" style={{ backgroundImage: `url("${item.imagePath}")` }} />
              <div className="shop-item-meta">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="shop-price-row">
                  <span>価格</span>
                  <strong>{item.price === 0 ? "初期所持" : `${item.price} コイン`}</strong>
                </div>
              </div>
            </div>
            <div className="task-global-menu">
              {!owned ? (
                <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={() => onBuy(item.itemId, item.price)}>
                  購入する
                </button>
              ) : (
                <button
                  className={`quest-btn task-global-menu-button ${equipped ? "task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
                  onClick={() => onEquip(item.itemId)}
                >
                  {equipped ? "そうび中" : "ホームに設定"}
                </button>
              )}
            </div>
          </section>
        );
      })}

      <section className="card decorated-card">
        <h2>フレームショップ</h2>
      </section>

      {SHOP_FRAMES.map((item) => {
        const owned = gameState.ownedFrameIds.includes(item.itemId);
        const equipped = gameState.selectedFrameId === item.itemId;

        return (
          <section className="card decorated-card" key={item.itemId}>
            <div className="shop-item-card">
              <div className={`shop-preview shop-frame-preview ${item.previewClassName}`} />
              <div className="shop-item-meta">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="shop-price-row">
                  <span>価格</span>
                  <strong>{item.price === 0 ? "初期所持" : `${item.price} コイン`}</strong>
                </div>
              </div>
            </div>
            <div className="task-global-menu">
              {!owned ? (
                <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={() => onBuyFrame(item.itemId, item.price)}>
                  購入する
                </button>
              ) : (
                <button
                  className={`quest-btn task-global-menu-button ${equipped ? "task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
                  onClick={() => onEquipFrame(item.itemId)}
                >
                  {equipped ? "そうび中" : "フレームに設定"}
                </button>
              )}
            </div>
          </section>
        );
      })}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
