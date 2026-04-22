import type { HomeAnnouncement } from "./announcements";
import type { GameEventConfig } from "@/types/event";

const NOTIFICATION_READ_STORAGE_KEY = "habit-monster-read-notification-ids";

export function getNotificationReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function markNotificationIdsRead(notificationIds: string[]) {
  if (typeof window === "undefined") return;
  const merged = Array.from(new Set([...getNotificationReadIds(), ...notificationIds]));
  window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(merged));
}

export function getGeneralNotificationIds(announcements: HomeAnnouncement[], events: GameEventConfig[]): string[] {
  return [
    ...announcements.map((announcement) => `announcement:${announcement.announcementId}`),
    ...events.map((eventConfig) => `event:${eventConfig.eventId}`)
  ];
}
