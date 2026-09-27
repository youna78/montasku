import { getGameNow } from "./virtualTime";

export type HomeAnnouncement = {
  announcementId: string;
  title: string;
  body: string;
  details?: string[];
  level: "info" | "event" | "alert";
  href?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  startsAt?: string;
  showPopup?: boolean;
  active: boolean;
};

export const HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [
  {
    announcementId: "october_update_2026_10_01",
    title: "10月のアップデートのお知らせ",
    body: "モンタスクを少しアップデートしました。これまでの頑張りを振り返りながら、毎日のタスクをもっと自由に楽しめます。",
    details: [
      "「冒険の記録」が追加されました",
      "画面や遊びやすさを少しアップデートしました",
      "自由記述のタスクを3つまで登録できるようになりました"
    ],
    level: "info",
    href: "/records",
    ctaLabel: "冒険の記録を見る",
    secondaryHref: "/tasks#task-add-custom",
    secondaryCtaLabel: "自由記述タスクを確認する",
    startsAt: "2026-10-01T00:00:00+09:00",
    showPopup: true,
    active: true
  }
];

export function getActiveHomeAnnouncements(now: Date = getGameNow()): HomeAnnouncement[] {
  const current = now.getTime();
  return HOME_ANNOUNCEMENTS.filter((announcement) => (
    announcement.active && (!announcement.startsAt || current >= new Date(announcement.startsAt).getTime())
  ));
}
