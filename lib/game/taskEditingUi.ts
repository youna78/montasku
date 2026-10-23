import { getGameNow } from "./virtualTime";

export function isHandleTaskReorderEnabled(now: Date = getGameNow()): boolean {
  return now.getTime() >= Date.parse("2026-11-01T00:00:00+09:00");
}
