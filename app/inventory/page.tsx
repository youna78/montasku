"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass, SHOP_BACKGROUNDS, SHOP_FRAMES } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

type InventoryTab = "background" | "frame";

export default function InventoryPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, equipBackground, equipFrame } = useGame();
  const [tab, setTab] = useState<InventoryTab>("background");
  const [message, setMessage] = useState("");

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

  const ownedBackgrounds = useMemo(
    () => SHOP_BACKGROUNDS.filter((item) => gameState?.ownedBackgroundIds.includes(item.itemId)),
    [gameState]
  );
  const ownedFrames = useMemo(
    () => SHOP_FRAMES.filter((item) => gameState?.ownedFrameIds.includes(item.itemId)),
    [gameState]
  );

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const onEquipBackground = (itemId: string) => {
    const result = equipBackground(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "使用中です" : "まだ所持していません");
      return;
    }
    setMessage("背景をそうびしました");
  };

  const onEquipFrame = (itemId: string) => {
    const result = equipFrame(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "使用中です" : "まだ所持していません");
      return;
    }
    setMessage("フレームをそうびしました");
  };

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">持ち物</div>

      <section className="card decorated-card quest-heading-card">
        <p>購入した背景やフレームを、ここで切り替えできます。</p>
      </section>

      <section className="card decorated-card">
        <div className="task-global-menu">
          <button
            className={`quest-btn task-global-menu-button ${tab === "background" ? "task-global-menu-button-primary task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
            onClick={() => setTab("background")}
          >
            背景
          </button>
          <button
            className={`quest-btn task-global-menu-button ${tab === "frame" ? "task-global-menu-button-accent task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
            onClick={() => setTab("frame")}
          >
            フレーム
          </button>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      {tab === "background" ? (
        ownedBackgrounds.map((item) => {
          const equipped = gameState.selectedBackgroundId === item.itemId;
          return (
            <section className="card decorated-card" key={item.itemId}>
              <div className="shop-item-card">
                <div className="shop-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                  {equipped && <span className="equipped-badge">使用中</span>}
                </div>
                <div className="shop-item-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </div>
              <div className="task-global-menu">
                <button
                  className={`quest-btn task-global-menu-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-primary"}`}
                  onClick={() => onEquipBackground(item.itemId)}
                >
                  {equipped ? "使用中" : "この背景を使う"}
                </button>
              </div>
            </section>
          );
        })
      ) : (
        ownedFrames.map((item) => {
          const equipped = gameState.selectedFrameId === item.itemId;
          return (
            <section className="card decorated-card" key={item.itemId}>
              <div className="shop-item-card">
                <div className={`shop-preview shop-frame-preview ${item.previewClassName}`}>
                  {equipped && <span className="equipped-badge">使用中</span>}
                </div>
                <div className="shop-item-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </div>
              <div className="task-global-menu">
                <button
                  className={`quest-btn task-global-menu-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                  onClick={() => onEquipFrame(item.itemId)}
                >
                  {equipped ? "使用中" : "このフレームを使う"}
                </button>
              </div>
            </section>
          );
        })
      )}

      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href="/shop" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            ショップへ
          </Link>
          <Link href="/settings" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            設定へ戻る
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
