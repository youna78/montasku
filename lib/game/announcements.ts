export type HomeAnnouncement = {
  announcementId: string;
  title: string;
  body: string;
  level: "info" | "event" | "alert";
  href?: string;
  ctaLabel?: string;
  active: boolean;
};

export const HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [
  // ここに 1件追加すると「おしらせ」に表示されます。
  // {
  //   announcementId: "spring_notice_2026_04",
  //   title: "春イベントの価格を調整しました",
  //   body: "イベントショップの価格とログイン報酬を更新しました。",
  //   level: "event",
  //   href: "/event/spring-easter",
  //   ctaLabel: "イベントを見る",
  //   active: true
  // }
];
