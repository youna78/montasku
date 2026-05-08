import type { GameEventConfig } from "@/types/event";
import { GAME_EVENTS, SPRING_EASTER_EVENT, createInitialUserEventState, normalizeUserEventState } from "./config";

export { GAME_EVENTS, SPRING_EASTER_EVENT, createInitialUserEventState, normalizeUserEventState };

export function getEventById(eventId: string): GameEventConfig | null {
  return GAME_EVENTS.find((event) => event.eventId === eventId) ?? null;
}

export function getEventBySlug(slug: string): GameEventConfig | null {
  return GAME_EVENTS.find((event) => event.slug === slug) ?? null;
}

export function isEventActive(event: GameEventConfig, now: Date = new Date()): boolean {
  const current = now.getTime();
  return current >= new Date(event.startsAt).getTime() && current <= new Date(event.endsAt).getTime();
}

export function isEventAnnouncementVisible(event: GameEventConfig, now: Date = new Date()): boolean {
  const current = now.getTime();
  return current >= new Date(event.announcementStartsAt).getTime() && current <= new Date(event.endsAt).getTime();
}

export function getVisibleHomeEvents(now: Date = new Date()): GameEventConfig[] {
  return GAME_EVENTS.filter((event) => isEventAnnouncementVisible(event, now));
}

export function getActiveEvents(now: Date = new Date()): GameEventConfig[] {
  return GAME_EVENTS.filter((event) => isEventActive(event, now));
}

export function getRemainingDaysLabel(event: GameEventConfig, now: Date = new Date()): string {
  const end = new Date(event.endsAt).getTime();
  const diff = end - now.getTime();
  if (diff <= 0) return "終了しました";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `あと${days}日`;
}

export function getEventStatusLabel(event: GameEventConfig, now: Date = new Date()): string {
  if (isEventActive(event, now)) return "開催中";
  if (now.getTime() < new Date(event.startsAt).getTime()) return "まもなく開催";
  return "終了";
}

export function isEventMonster(monsterId: number): boolean {
  return SPRING_EASTER_EVENT.rewardPreviewMonsterIds.includes(monsterId);
}
