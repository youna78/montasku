"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { loadCloudPurchaseHistory } from "@/lib/game/cloudCommerce";
import type { NativeStorePlatform } from "@/lib/iap/appStorePurchases";
import {
  createAppAccountToken,
  finishNativeStoreTransaction,
  inspectNativeStorePurchases,
  summarizeNativeStoreTransaction
} from "@/lib/iap/appStorePurchases";
import { writeNativeStoreDiagnostic } from "@/lib/iap/nativePurchaseDiagnostics";
import { getNativePlatform, isNativeMobileApp } from "@/lib/platform/capacitor";
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
  getFrameThemeClass,
  SHOP_PAID_COIN_ITEMS
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

function appendDiagnosticId(message: string, diagnosticId: string | null): string {
  return diagnosticId ? `${message} 診断ID: ${diagnosticId}` : message;
}

export default function PurchaseHistoryPage() {
  const { user } = useAuth();
  const { gameState, monsters, isLoading } = useGame();
  const [history, setHistory] = useState<PurchaseHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [copiedPurchaseId, setCopiedPurchaseId] = useState<string | null>(null);
  const [nativeStorePlatform, setNativeStorePlatform] = useState<NativeStorePlatform | null>(null);
  const [isRestoringNativeStorePurchases, setIsRestoringNativeStorePurchases] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    const platform = getNativePlatform();
    setNativeStorePlatform(isNativeMobileApp() && (platform === "ios" || platform === "android") ? platform : null);
  }, []);

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

  const copyInquiryText = async (record: PurchaseHistoryRecord) => {
    const inquiryText = [
      "モンタスクの購入内容について確認したいです。",
      `購入ID: ${record.purchaseId}`,
      `商品名: ${resolveProductTitle(record.productId)}`,
      `購入日時: ${formatHistoryDate(record.purchasedAt)}`,
      `状態: ${getStatusLabel(record.status)}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(inquiryText);
      setCopiedPurchaseId(record.purchaseId);
      window.setTimeout(() => {
        setCopiedPurchaseId((current) => (current === record.purchaseId ? null : current));
      }, 1800);
    } catch (error) {
      console.error("[purchase-history] failed to copy inquiry text", error);
    }
  };

  const copyPurchaseId = async (purchaseId: string) => {
    try {
      await navigator.clipboard.writeText(purchaseId);
      setCopiedPurchaseId(purchaseId);
      window.setTimeout(() => {
        setCopiedPurchaseId((current) => (current === purchaseId ? null : current));
      }, 1800);
    } catch (error) {
      console.error("[purchase-history] failed to copy purchase id", error);
    }
  };

  const reloadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const records = await loadCloudPurchaseHistory(user.uid);
      setHistory(records);
    } catch (error) {
      console.error("[purchase-history] failed to reload", error);
      setHistoryError("購入履歴を読み込めませんでした。少し時間をおいてもう一度お試しください。");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fulfillNativeStoreTransaction = async (
    transaction: Awaited<ReturnType<typeof inspectNativeStorePurchases>>["restorablePurchases"][number],
    platform: NativeStorePlatform,
    appAccountToken: string,
    idToken: string
  ) => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error("ログインが必要です。");
    }

    if (!transaction.productIdentifier) {
      throw new Error("購入商品の情報を取得できませんでした。");
    }

    const transactionSnapshot = await summarizeNativeStoreTransaction(transaction);
    const response = await fetch(platform === "android" ? "/api/google-play/fulfill" : "/api/app-store/fulfill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(
        platform === "android"
          ? {
              googlePlayProductId: transaction.productIdentifier,
              purchaseToken: transaction.purchaseToken,
              transactionId: transaction.transactionId,
              orderId: transaction.orderId ?? null,
              purchaseState: transaction.purchaseState ?? null,
              appAccountToken
            }
          : {
              appStoreProductId: transaction.productIdentifier,
              transactionId: transaction.transactionId,
              appAccountToken,
              signedTransactionInfo: transaction.jwsRepresentation ?? null
            }
      )
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; grantedPaidCoins?: number } | null;

    if (!response.ok) {
      const diagnosticId = await writeNativeStoreDiagnostic(idToken, {
        eventName: "restore_fulfill_failed",
        platform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: transaction.productIdentifier,
        transaction: transactionSnapshot,
        responseStatus: response.status,
        errorMessage: payload?.error ?? "restore fulfill failed"
      });
      throw new Error(appendDiagnosticId(`${payload?.error ?? "購入の反映に失敗しました。"} (${response.status})`, diagnosticId));
    }

    try {
      await finishNativeStoreTransaction(transaction, platform);
    } catch (finishError) {
      await writeNativeStoreDiagnostic(idToken, {
        eventName: "restore_finish_failed",
        platform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: transaction.productIdentifier,
        transaction: transactionSnapshot,
        errorMessage: finishError instanceof Error ? finishError.message : "finish native transaction failed"
      });
      console.warn("[purchase-history] native store transaction was fulfilled but finish failed", finishError);
    }

    await writeNativeStoreDiagnostic(idToken, {
      eventName: "restore_fulfill_success",
      platform,
      appAccountTokenPresent: Boolean(appAccountToken),
      targetProductId: transaction.productIdentifier,
      transaction: transactionSnapshot,
      responseStatus: response.status,
      grantedPaidCoins: payload?.grantedPaidCoins ?? 0
    });
    return payload?.grantedPaidCoins ?? 0;
  };

  const onRestoreNativeStorePurchases = async () => {
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        setRestoreMessage("ログインすると未反映の購入を確認できます。");
        return;
      }

      if (!nativeStorePlatform) {
        setRestoreMessage("アプリ版で未反映の購入を確認できます。");
        return;
      }

      setIsRestoringNativeStorePurchases(true);
      setRestoreMessage("");
      const paidCoinPacks = SHOP_PAID_COIN_ITEMS.filter((item) => item.status === "confirmed" && item.productType === "coin_pack");
      const appAccountToken = await createAppAccountToken(currentUser.uid);
      const idToken = await currentUser.getIdToken();
      await writeNativeStoreDiagnostic(idToken, {
        eventName: "restore_start",
        platform: nativeStorePlatform,
        appAccountTokenPresent: Boolean(appAccountToken),
        productIds: paidCoinPacks
          .map((item) => (nativeStorePlatform === "android" ? item.googlePlayProductId : item.appStoreProductId))
          .filter((productId): productId is string => Boolean(productId))
      });
      const inspection = await inspectNativeStorePurchases(paidCoinPacks, nativeStorePlatform, appAccountToken);
      const inspectionDiagnosticId = await writeNativeStoreDiagnostic(idToken, {
        eventName: "restore_inspection",
        platform: nativeStorePlatform,
        appAccountTokenPresent: Boolean(appAccountToken),
        productIds: inspection.productIds,
        rawPurchaseCount: inspection.rawPurchases.length,
        restorablePurchaseCount: inspection.restorablePurchases.length,
        rejectedPurchaseCount: inspection.rejectedPurchaseSnapshots.length,
        restoreSyncAttempted: inspection.restoreSyncAttempted,
        restoreSyncError: inspection.restoreSyncError,
        rawPurchaseSnapshots: inspection.rawPurchaseSnapshots,
        restorablePurchaseSnapshots: inspection.restorablePurchaseSnapshots,
        rejectedPurchaseSnapshots: inspection.rejectedPurchaseSnapshots
      });
      const purchases = inspection.restorablePurchases;

      if (purchases.length === 0) {
        setRestoreMessage(appendDiagnosticId("未反映の購入は見つかりませんでした。", inspectionDiagnosticId));
        return;
      }

      let grantedTotal = 0;
      for (const purchase of purchases) {
        grantedTotal += await fulfillNativeStoreTransaction(purchase, nativeStorePlatform, appAccountToken, idToken);
      }

      setRestoreMessage(
        appendDiagnosticId(
          grantedTotal > 0
            ? `${grantedTotal} モンタコインを反映しました。`
            : "購入はすでに反映済みです。",
          inspectionDiagnosticId
        )
      );
      await reloadHistory();
    } catch (error) {
      console.error(
        "[purchase-history] failed to restore native store purchases",
        error instanceof Error ? { message: error.message, stack: error.stack } : error
      );
      setRestoreMessage(error instanceof Error ? error.message : "購入の確認に失敗しました。");
    } finally {
      setIsRestoringNativeStorePurchases(false);
    }
  };

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main
      className={`page-shell page-purchase-history ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">購入履歴</div>

      <section className="card decorated-card legal-page-card">
        <div className="legal-section">
          <h2>ご案内</h2>
          <p>モンタコインやセット商品の購入状況を確認できます。反映に時間がかかる時は、購入IDと購入日時を添えてお問い合わせください。</p>
          {nativeStorePlatform && user ? (
            <>
              <p>{nativeStorePlatform === "android" ? "Google Play" : "App Store"}で購入したモンタコインが反映されない場合は、下のボタンから未反映の購入を確認できます。</p>
              <div className="notification-card-actions">
                <button
                  type="button"
                  className="quest-btn settings-menu-button settings-menu-button-secondary"
                  onClick={() => void onRestoreNativeStorePurchases()}
                  disabled={isRestoringNativeStorePurchases}
                >
                  {isRestoringNativeStorePurchases ? "購入を確認中..." : "未反映の購入を確認"}
                </button>
              </div>
              {restoreMessage ? <p className="shop-note shop-note-strong">{restoreMessage}</p> : null}
            </>
          ) : null}
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
                    <div className="purchase-history-actions">
                      <button
                        type="button"
                        className="quest-btn task-global-menu-button-secondary"
                        onClick={() => void copyPurchaseId(record.purchaseId)}
                      >
                        購入IDをコピー
                      </button>
                      <button
                        type="button"
                        className="quest-btn task-global-menu-button-secondary"
                        onClick={() => void copyInquiryText(record)}
                      >
                        問い合わせ用テキストをコピー
                      </button>
                      <Link
                        href={`/contact?purchase_id=${encodeURIComponent(record.purchaseId)}`}
                        className="ui-link-button settings-menu-button settings-menu-button-neutral purchase-history-contact-link"
                      >
                        この購入について問い合わせ
                      </Link>
                      {copiedPurchaseId === record.purchaseId ? (
                        <span className="purchase-history-copy-note">コピーしました</span>
                      ) : null}
                    </div>
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
