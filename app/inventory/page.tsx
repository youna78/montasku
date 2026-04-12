"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFramePreviewImagePath, getFrameThemeClass, SHOP_ATTRIBUTE_CHARMS, SHOP_BACKGROUNDS, SHOP_BOOSTER_ITEMS, SHOP_DECORATIONS, SHOP_FRAMES, SHOP_PAID_ATTRIBUTE_CHARMS, SHOP_PAID_BACKGROUNDS, SHOP_PAID_FRAMES } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

type InventoryTab = "background" | "frame" | "deco" | "item";

const CHARM_BUTTON_CLASS: Record<(typeof SHOP_ATTRIBUTE_CHARMS)[number]["attribute"], string> = {
  power: "task-global-menu-button-danger",
  heal: "task-global-menu-button-heal",
  knowledge: "task-global-menu-button-knowledge",
  create: "task-global-menu-button-create"
};

export default function InventoryPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading, equipBackground, equipFrame, useAttributeCharm, useBooster, toggleDecoration } = useGame();
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
    () => [...SHOP_BACKGROUNDS, ...SHOP_PAID_BACKGROUNDS].filter((item) => gameState?.ownedBackgroundIds.includes(item.itemId)),
    [gameState]
  );
  const ownedFrames = useMemo(
    () => [...SHOP_FRAMES, ...SHOP_PAID_FRAMES].filter((item) => gameState?.ownedFrameIds.includes(item.itemId)),
    [gameState]
  );
  const ownedCharms = useMemo(
    () => SHOP_ATTRIBUTE_CHARMS.filter((item) => (gameState?.ownedCharmItemCounts[item.attribute] ?? 0) > 0 || gameState?.activeAttributeCharm?.attribute === item.attribute),
    [gameState]
  );
  const ownedPaidCharms = useMemo(
    () =>
      SHOP_PAID_ATTRIBUTE_CHARMS.filter(
        (item) => (gameState?.ownedPaidCharmItemCounts[item.attribute] ?? 0) > 0 || (gameState?.activeAttributeCharm?.attribute === item.attribute && gameState?.activeAttributeCharm?.variant === "paid")
      ),
    [gameState]
  );
  const ownedBoosters = useMemo(
    () => SHOP_BOOSTER_ITEMS.filter((item) => (gameState?.ownedBoosterItemCounts[item.itemId] ?? 0) > 0 || gameState?.activeExpBooster?.itemId === item.itemId),
    [gameState]
  );
  const ownedDecorations = useMemo(
    () => SHOP_DECORATIONS.filter((item) => gameState?.ownedDecorationIds.includes(item.itemId)),
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

  const onUseCharm = (attribute: keyof typeof gameState.attributeTotals, variant: "free" | "paid") => {
    const result = useAttributeCharm(attribute, variant);
    const item = [...SHOP_ATTRIBUTE_CHARMS, ...SHOP_PAID_ATTRIBUTE_CHARMS].find(
      (charm) => charm.attribute === attribute && charm.variant === variant
    );
    if (!result) return;
    if (!result.used) {
      setMessage(item ? `${item.title} を持っていません` : "まだ所持していません");
      return;
    }
    setMessage(item ? `${item.title} を使いました` : "アイテムを使いました");
  };

  const onUseBooster = (itemId: string) => {
    const result = useBooster(itemId);
    const item = SHOP_BOOSTER_ITEMS.find((booster) => booster.itemId === itemId);
    if (!result) return;
    if (!result.used) {
      setMessage(item ? `${item.title} を持っていません` : "まだ所持していません");
      return;
    }
    setMessage(item ? `${item.title} を使いました` : "ブーストを使いました");
  };

  const onToggleDecoration = (itemId: string) => {
    const result = toggleDecoration(itemId);
    const item = SHOP_DECORATIONS.find((decoration) => decoration.itemId === itemId);
    if (!result) return;
    if (!result.toggled) {
      setMessage(item ? `${item.title} を持っていません` : "まだ所持していません");
      return;
    }
    setMessage(item ? `${item.title} を${result.active ? "表示" : "非表示"}にしました` : "デコを切り替えました");
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
          <button
            className={`quest-btn task-global-menu-button ${tab === "deco" ? "task-global-menu-button-accent task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
            onClick={() => setTab("deco")}
          >
            デコ
          </button>
          <button
            className={`quest-btn task-global-menu-button ${tab === "item" ? "task-global-menu-button-primary task-global-menu-button-active task-global-menu-button-current" : "task-global-menu-button-secondary"}`}
            onClick={() => setTab("item")}
          >
            アイテム
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
      ) : tab === "frame" ? (
        ownedFrames.map((item) => {
          const equipped = gameState.selectedFrameId === item.itemId;
          const framePreviewImagePath = getFramePreviewImagePath(item.itemId);
          return (
            <section className="card decorated-card" key={item.itemId}>
              <div className="shop-item-card">
                <div className={`shop-preview shop-frame-preview ${framePreviewImagePath ? "shop-frame-preview-image-only" : item.previewClassName}`}>
                  {framePreviewImagePath ? <img src={framePreviewImagePath} alt={item.title} className="shop-frame-image" /> : null}
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
      ) : tab === "deco" ? (
        ownedDecorations.map((item) => {
          const active = gameState.selectedDecorationIds.includes(item.itemId);
          return (
            <section className="card decorated-card" key={item.itemId}>
              <div className="shop-item-card">
                <div className="shop-preview shop-decoration-preview">
                  <img src={item.imagePath} alt={item.title} className="shop-decoration-image" />
                  {active && <span className="equipped-badge">表示中</span>}
                </div>
                <div className="shop-item-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </div>
              <div className="task-global-menu">
                <button
                  className={`quest-btn task-global-menu-button ${active ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                  onClick={() => onToggleDecoration(item.itemId)}
                >
                  {active ? "このデコを外す" : "このデコを使う"}
                </button>
              </div>
            </section>
          );
        })
      ) : (
        [...ownedCharms, ...ownedPaidCharms].map((item) => {
          const equipped =
            gameState.activeAttributeCharm?.attribute === item.attribute &&
            (gameState.activeAttributeCharm?.variant ?? "free") === item.variant;
          const ownedCount =
            item.variant === "paid"
              ? gameState.ownedPaidCharmItemCounts[item.attribute] ?? 0
              : gameState.ownedCharmItemCounts[item.attribute] ?? 0;

          return (
            <section className={`card decorated-card charm-item-card charm-card-${item.attribute}`} key={item.itemId}>
              <div className="shop-item-card">
                <div className={`shop-preview shop-charm-preview charm-preview-${item.attribute}`}>
                  <img src={item.iconPath} alt={item.title} className="shop-charm-icon" />
                  {equipped && <span className="equipped-badge">発動中</span>}
                  {item.variant === "paid" && <span className="shop-paid-badge inventory-paid-item-badge">モンタ</span>}
                </div>
                <div className="shop-item-meta">
                  <h2 className={`charm-title charm-title-${item.attribute}`}>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>所持数: {ownedCount}</div>
                  {equipped && (
                    <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>
                      あと {gameState.activeAttributeCharm?.remainingUses ?? item.uses} タスク
                    </div>
                  )}
                </div>
              </div>
              <div className="task-global-menu">
                <button
                  className={`quest-btn task-global-menu-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : CHARM_BUTTON_CLASS[item.attribute]}`}
                  onClick={() => onUseCharm(item.attribute, item.variant)}
                >
                  {equipped ? "発動中" : "このアイテムを使う"}
                </button>
              </div>
            </section>
          );
        }).concat(
          ownedBoosters.map((item) => {
            const ownedCount = gameState.ownedBoosterItemCounts[item.itemId] ?? 0;
            const isActive = gameState.activeExpBooster?.itemId === item.itemId;
            return (
              <section className="card decorated-card charm-item-card" key={item.itemId}>
                <div className="shop-item-card">
                  <div className="shop-preview shop-charm-preview shop-grid-preview-coming-soon">
                    {item.iconPath ? <img src={item.iconPath} alt={item.title} className="shop-charm-icon" /> : <span className="shop-coming-soon-label">BOOST</span>}
                    {isActive && <span className="equipped-badge">発動中</span>}
                    {item.currencyType === "paid_coin" ? (
                      <span className="shop-paid-badge inventory-paid-item-badge">モンタ</span>
                    ) : (
                      <span className="notification-badge notification-badge-info inventory-paid-item-badge">FREE</span>
                    )}
                  </div>
                  <div className="shop-item-meta">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className="shop-grid-price">所持数: {ownedCount}</div>
                    {isActive && gameState.activeExpBooster ? (
                      <div className="shop-grid-price">期限: {new Date(gameState.activeExpBooster.expiresAt).toLocaleString("ja-JP")}</div>
                    ) : null}
                  </div>
                </div>
                <div className="task-global-menu">
                  <button
                    className={`quest-btn task-global-menu-button ${isActive ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                    onClick={() => onUseBooster(item.itemId)}
                  >
                    {isActive ? "発動中" : "このアイテムを使う"}
                  </button>
                </div>
              </section>
            );
          })
        )
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
