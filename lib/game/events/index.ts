import type { GameEventConfig } from "@/types/event";
import { getGameNow } from "@/lib/game/virtualTime";
import { GAME_EVENTS, JUNE_SHRINE_EVENT, SPRING_EASTER_EVENT, createInitialUserEventState, normalizeUserEventState } from "./config";

export { GAME_EVENTS, JUNE_SHRINE_EVENT, SPRING_EASTER_EVENT, createInitialUserEventState, normalizeUserEventState };

export function getEventById(eventId: string): GameEventConfig | null {
  return GAME_EVENTS.find((event) => event.eventId === eventId) ?? null;
}

export function getEventBySlug(slug: string): GameEventConfig | null {
  return GAME_EVENTS.find((event) => event.slug === slug) ?? null;
}

export function isEventActive(event: GameEventConfig, now: Date = getGameNow()): boolean {
  const current = now.getTime();
  return current >= new Date(event.startsAt).getTime() && current <= new Date(event.endsAt).getTime();
}

export function isEventAnnouncementVisible(event: GameEventConfig, now: Date = getGameNow()): boolean {
  const current = now.getTime();
  return current >= new Date(event.announcementStartsAt).getTime() && current <= new Date(event.endsAt).getTime();
}

export function getVisibleHomeEvents(now: Date = getGameNow()): GameEventConfig[] {
  return GAME_EVENTS.filter((event) => isEventAnnouncementVisible(event, now));
}

export function getActiveEvents(now: Date = getGameNow()): GameEventConfig[] {
  return GAME_EVENTS.filter((event) => isEventActive(event, now));
}

export function getRemainingDaysLabel(event: GameEventConfig, now: Date = getGameNow()): string {
  const end = new Date(event.endsAt).getTime();
  const diff = end - now.getTime();
  if (diff <= 0) return "終了しました";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `あと${days}日`;
}

export function getEventStatusLabel(event: GameEventConfig, now: Date = getGameNow()): string {
  if (isEventActive(event, now)) return "開催中";
  if (now.getTime() < new Date(event.startsAt).getTime()) return "まもなく開催";
  return "終了";
}

export function isEventMonster(monsterId: number): boolean {
  return GAME_EVENTS.some((event) => event.rewardPreviewMonsterIds.includes(monsterId));
}

export function getEventForMonster(monsterId: number): GameEventConfig | null {
  return GAME_EVENTS.find((event) => event.rewardPreviewMonsterIds.includes(monsterId)) ?? null;
}
