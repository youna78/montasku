"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadCloudPurchaseHistory } from "@/lib/game/cloudCommerce";
import {
  getAttributeCharmItem,
  getBackgroundShopItem,
  getBoosterShopItem,
  getDecorationShopItem,
  getFrameShopItem,
  getPaidBackgroundShopItem,
  getPaidBundleShopItem,
  getPaidCoinShopItem,
  getPaidFrameShopItem,
  getBackgroundImagePath,
  getFrameThemeClass
} from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";
import type { PurchaseHistoryRecord } from "@/types/commerce";

function formatHistoryDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "日時不明";
  return parsed.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatusLabel(status: PurchaseHistoryRecord["status"]): string {
  switch (status) {
    case "pending":
      return "処理待ち";
    case "paid":
      return "決済完了";
    case "fulfilled":
      return "反映済み";
    case "refunded":
      return "返金対応";
    case "failed":
      return "失敗";
    default:
      return status;
  }
}

function resolveProductTitle(productId: string): string {
  return (
    getPaidCoinShopItem(productId)?.title
    ?? getPaidBundleShopItem(productId)?.title
    ?? getPaidBackgroundShopItem(productId)?.title
    ?? getPaidFrameShopItem(productId)?.title
    ?? getBackgroundShopItem(productId)?.title
    ?? getFrameShopItem(productId)?.title
    ?? getDecorationShopItem(productId)?.title
    ?? getBoosterShopItem(productId)?.title
    ?? getAttributeCharmItem(productId)?.title
    ?? productId
  );
}

function resolveGrantedItemTitles(record: PurchaseHistoryRecord): string[] {
  const paidCoinTitle = record.grantedPaidCoins > 0 ? [`モンタコイン ${record.grantedPaidCoins}`] : [];
  const itemTitles = record.grantedItemIds
    .map((itemId) => resolveProductTitle(itemId))
    .filter(Boolean);
  return [...paidCoinTitle, ...itemTitles];
}

export default function PurchaseHistoryPage() {
  const { user } = useAuth();
  const { gameState, monsters, isLoading } = useGame();
  const [history, setHistory] = useState<PurchaseHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError("");

    loadCloudPurchaseHistory(user.uid)
      .then((records) => {
        if (!cancelled) {
          setHistory(records);
        }
      })
      .catch((error) => {
        console.error("[purchase-history] failed to load", error);
        if (!cancelled) {
          setHistoryError("購入履歴を読み込めませんでした。少し時間をおいてもう一度お試しください。");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const unresolvedHistory = useMemo(
    () => history.filter((record) => record.status !== "fulfilled"),
    [history]
  );

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">購入履歴</div>

      <section className="card decorated-card legal-page-card">
        <div className="legal-section">
          <h2>ご案内</h2>
          <p>モンタコインやセット商品の購入状況を確認できます。反映に時間がかかる時は、購入IDと購入日時を添えてお問い合わせください。</p>
          <div className="shop-support-links">
            <Link href="/contact" className="ui-link-button ui-link-secondary">
              お問い合わせ
            </Link>
            <Link href="/shop" className="ui-link-button ui-link-secondary">
              ショップへ戻る
            </Link>
          </div>
        </div>
        <div className="legal-section">
          <h2>未反映・返金について</h2>
          <p>決済完了後、通常はすぐに反映されます。数分待っても反映されない場合は、このページの購入IDと購入日時を添えてご連絡ください。</p>
          <p>デジタル商品の性質上、お客様都合での返金は原則お受けしていません。法令上必要な場合や決済事業者の定めがある場合は、その定めに沿って対応します。</p>
          {unresolvedHistory.length > 0 ? (
            <p>現在、確認が必要な購入が {unresolvedHistory.length} 件あります。ステータスをご確認ください。</p>
          ) : null}
        </div>
      </section>

      {!user ? (
        <section className="card decorated-card legal-page-card">
          <div className="legal-section">
            <h2>ログインが必要です</h2>
            <p>購入履歴の確認にはログインが必要です。設定画面からログインすると、購入履歴も確認できます。</p>
            <div className="notification-card-actions">
              <Link href="/settings" className="ui-link-button settings-menu-button settings-menu-button-primary">
                設定でログインする
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="card decorated-card legal-page-card">
          <div className="legal-section">
            <h2>履歴一覧</h2>
            {historyLoading ? <p>読み込み中です...</p> : null}
            {historyError ? <p className="auth-card-error">{historyError}</p> : null}
            {!historyLoading && !historyError && history.length === 0 ? (
              <p>まだ購入履歴はありません。</p>
            ) : null}
            <div className="purchase-history-list">
              {history.map((record) => {
                const grantedItems = resolveGrantedItemTitles(record);
                return (
                  <article key={record.purchaseId} className="purchase-history-card">
                    <div className="purchase-history-head">
                      <strong>{resolveProductTitle(record.productId)}</strong>
                      <span className={`purchase-history-status purchase-history-status-${record.status}`}>{getStatusLabel(record.status)}</span>
                    </div>
                    <p className="purchase-history-meta">購入日時: {formatHistoryDate(record.purchasedAt)}</p>
                    <p className="purchase-history-meta">購入ID: {record.purchaseId}</p>
                    <p className="purchase-history-meta">支払い額: {record.currencyType === "jpy" ? `${record.amountTotalMinor}円` : `${record.amountTotalMinor}`}</p>
                    {grantedItems.length > 0 ? (
                      <p className="purchase-history-meta">付与内容: {grantedItems.join(" / ")}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
