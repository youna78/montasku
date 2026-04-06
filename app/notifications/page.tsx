"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { HOME_ANNOUNCEMENTS } from "@/lib/game/announcements";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

export default function NotificationsPage() {
  const router = useRouter();
  const { monsters, gameState, isLoading } = useGame();

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
    if (!gameState.hasSeenTutorial) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const activeAnnouncements = HOME_ANNOUNCEMENTS.filter((announcement) => announcement.active);
  const hasDailyReviewNotification = Boolean(gameState.pendingDailyReview);

  return (
    <main
      className={`page-shell ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">おしらせ</div>

      {hasDailyReviewNotification && gameState.pendingDailyReview && (
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-alert">要確認</span>
            <h2>前日のタスク確認</h2>
          </div>
          <p>
            {gameState.pendingDailyReview.skippedAt
              ? `${gameState.pendingDailyReview.targetDate} の確認をあとでにしています。ここからいつでも再開できます。`
              : `${gameState.pendingDailyReview.targetDate} の未確認タスクがあります。できたかどうかを振り返りましょう。`}
          </p>
          <div className="notification-card-actions">
            <Link href="/daily-review" className="quest-btn task-global-menu-button task-global-menu-button-primary">
              前日のタスク確認へ
            </Link>
          </div>
        </section>
      )}

      {activeAnnouncements.map((announcement) => (
        <section className="card decorated-card notification-card" key={announcement.announcementId}>
          <div className="notification-card-head">
            <span className={`notification-badge notification-badge-${announcement.level}`}>
              {announcement.level === "event" ? "イベント" : announcement.level === "alert" ? "重要" : "お知らせ"}
            </span>
            <h2>{announcement.title}</h2>
          </div>
          <p>{announcement.body}</p>
          {announcement.href && announcement.ctaLabel && (
            <div className="notification-card-actions">
              <Link href={announcement.href} className="quest-btn task-global-menu-button task-global-menu-button-secondary">
                {announcement.ctaLabel}
              </Link>
            </div>
          )}
        </section>
      ))}

      {!hasDailyReviewNotification && activeAnnouncements.length === 0 && (
        <section className="card decorated-card notification-card">
          <div className="notification-card-head">
            <span className="notification-badge notification-badge-info">案内</span>
            <h2>いまは新しいお知らせはありません</h2>
          </div>
          <p>障がいやイベント開始などのお知らせは、ここに表示できるようにしてあります。</p>
        </section>
      )}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
