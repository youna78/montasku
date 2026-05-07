"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import { isNativeMobileApp } from "@/lib/platform/capacitor";

export default function SettingsPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading } = useGame();
  const [isNativeApp, setIsNativeApp] = useState<boolean | null>(null);

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
  }, []);

  useEffect(() => {
    if (!gameState) return;
    if (isNativeApp === null) return;
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
  }, [gameState, isNativeApp, router]);

  if (isLoading || !gameState || isNativeApp === null) {
    return <main>Loading...</main>;
  }

  return (
    <main
      className={`page-shell page-rpg page-settings ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">設定</div>
      <AuthCard />
      <section className="card decorated-card">
        <div className="screen-summary-card settings-summary-card">
          <img src="/img/icon/generated_sfc/icon_sfc_settings_01.png" alt="" className="screen-summary-monster" />
          <div className="screen-summary-copy">
            <strong>遊びの設定</strong>
            <span>タスク設定、ショップ、持ち物などここから確認できます。</span>
          </div>
        </div>
        <div className="settings-menu-grid centered-actions">
          <Link href="/task-settings" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            タスク設定へ
          </Link>
          <Link href="/shop" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            ショップ
          </Link>
          <Link href="/inventory" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            持ち物
          </Link>
          <Link href="/letters" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            てがみ
          </Link>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSflbsd5RHq5IBKaTU7k6aIFPJjhk1GINQ0VqSjwSYRFBtUvJA/viewform?usp=publish-editor"
            target="_blank"
            rel="noreferrer"
            className="ui-link-button settings-menu-button settings-menu-button-neutral"
          >
            タスク追加リクエスト
          </a>
        </div>
      </section>
      <section className="card decorated-card">
        <h2 className="screen-section-title">問い合わせ・規約</h2>
        <div className="settings-menu-grid centered-actions">
          <Link href="/privacy" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            利用規約
          </Link>
          <Link href="/contact" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            お問い合わせ
          </Link>
          <Link href="/purchase-history" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            購入履歴
          </Link>
          <Link href="/commerce" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            特定商取引法に基づく表記
          </Link>
        </div>
      </section>
      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
