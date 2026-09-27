import { getGameNow } from "./virtualTime";

// Keep September behavior until midnight in Japan; this UI continues after October.
export function isOctoberUiEnabled(now: Date = getGameNow()): boolean {
  return now.getTime() >= Date.parse("2026-10-01T00:00:00+09:00");
}

export function tasksUntilBirth(completed: number): number {
  return Math.max(0, 3 - completed);
}
