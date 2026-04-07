"use client";

import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

export default function ShopThanksPage() {
  const { gameState, monsters, isLoading } = useGame();

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
