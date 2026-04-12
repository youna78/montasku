"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

type CheckoutSummary = {
  title: string;
  lines: string[];
} | null;

export default function ShopThanksPage() {
  const { gameState, monsters, isLoading } = useGame();
  const [summary, setSummary] = useState<CheckoutSummary>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
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
          <p>
            Stripe の決済ページから戻ってきた方向けのページです。決済が完了していれば、モンタコインは自動で反映されます。
          </p>
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
        </div>

        <div className="shop-support-links">
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
