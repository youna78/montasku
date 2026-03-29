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
      <div className="title-panel">購入ありがとうございました</div>

      <section className="card decorated-card legal-page-card">
        <div className="legal-section">
          <h2>ご購入ありがとうございます</h2>
          <p>
            Stripe の決済ページから戻ってきた方向けのページです。いまはテスト段階のため、モンタコインの自動付与はまだ行っていません。
          </p>
          <p>
            本番導入時は、このページで購入結果の確認やコイン反映を案内できるようにしていきます。
          </p>
        </div>

        <div className="shop-support-links">
          <Link href="/shop" className="ui-link-button">
            ショップへ戻る
          </Link>
          <Link href="/contact" className="ui-link-button">
            お問い合わせ
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
