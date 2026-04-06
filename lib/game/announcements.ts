export type HomeAnnouncement = {
  announcementId: string;
  title: string;
  body: string;
  level: "info" | "event" | "alert";
  href?: string;
  ctaLabel?: string;
  active: boolean;
};

export const HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [];
