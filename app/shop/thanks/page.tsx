"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { trackEvent } from "@/lib/analytics/gtag";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

type CheckoutSummary = {
  title: string;
  lines: string[];
  transactionId: string;
  productId: string;
  productType: string;
  value: number;
  currency: string;
  totalPaidCoins: number;
  paymentProvider: "stripe";
  paymentStatus: string;
} | null;

type AppStoreSummary = {
  coins: number;
} | null;

export default function ShopThanksPage() {
  const { gameState, monsters, isLoading } = useGame();
  const [summary, setSummary] = useState<CheckoutSummary>(null);
  const [appStoreSummary, setAppStoreSummary] = useState<AppStoreSummary>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider");
    if (provider === "app_store") {
      const coins = Number(params.get("coins") ?? "0");
      setAppStoreSummary({ coins: Number.isFinite(coins) ? coins : 0 });
      return;
    }

    const sessionId = params.get("session_id");
    if (!sessionId) return;

    let cancelled = false;

    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/stripe/checkout-summary?session_id=${encodeURIComponent(sessionId)}`);
        if (!response.ok) return;
        const payload = (await response.json()) as CheckoutSummary;
        if (!cancelled) {
          setSummary(payload);
          if (payload?.paymentStatus === "paid") {
            const trackedKey = `ga4_purchase:${payload.transactionId}`;
            if (window.sessionStorage.getItem(trackedKey) !== "1") {
              trackEvent("purchase", {
                transaction_id: payload.transactionId,
                value: payload.value,
                currency: payload.currency,
                payment_provider: payload.paymentProvider,
                monta_coins_granted: payload.totalPaidCoins,
                items: [
                  {
                    item_id: payload.productId,
                    item_name: payload.title,
                    item_category: payload.productType,
                    price: payload.value,
                    quantity: 1
                  }
                ]
              });
              window.sessionStorage.setItem(trackedKey, "1");
            }
          }
        }
      } catch (error) {
        console.error("[shop-thanks] failed to load checkout summary", error);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">購入完了</div>

      <section className="card decorated-card legal-page-card">
        <div className="legal-section">
          <h2>ご購入ありがとうございます</h2>
          {appStoreSummary ? (
            <>
              <p>Appleのアプリ内課金が完了しました。</p>
              {appStoreSummary.coins > 0 ? (
                <p>
                  今回の購入内容:
                  {" "}
                  <strong>モンタコイン {appStoreSummary.coins}枚</strong>
                </p>
              ) : (
                <p>購入済みの内容を確認しました。</p>
              )}
            </>
          ) : (
            <p>
              Stripe の決済ページから戻ってきた方向けのページです。決済が完了していれば、モンタコインは自動で反映されます。
            </p>
          )}
          {summary ? (
            <p>
              今回の購入内容:
              {" "}
              <strong>{summary.title}</strong>
              {" "}
              {summary.lines.length > 0 ? `（${summary.lines.join(" / ")}）` : ""}
            </p>
          ) : null}
          <p>
            反映まで少し時間がかかる場合があります。しばらく待ってからショップやホームの所持モンタコインをご確認ください。
          </p>
          <p>
            反映に時間がかかる場合は、購入履歴ページで購入IDと状態をご確認のうえ、お問い合わせください。
          </p>
        </div>

        <div className="shop-support-links">
          <Link href="/purchase-history" className="ui-link-button ui-link-secondary">
            購入履歴を見る
          </Link>
          <Link href="/shop" className="ui-link-button ui-link-secondary">
            ショップへ戻る
          </Link>
          <Link href="/contact" className="ui-link-button ui-link-secondary">
            お問い合わせ
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
