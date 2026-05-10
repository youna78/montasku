const VIRTUAL_GAME_NOW_KEY = "taskgame.virtualGameNow";

export function getVirtualGameNow(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(VIRTUAL_GAME_NOW_KEY);
  if (!value) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

export function getGameNow(): Date {
  const virtualNow = getVirtualGameNow();
  if (virtualNow) return new Date(virtualNow);
  return new Date();
}

export function setVirtualGameNow(value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIRTUAL_GAME_NOW_KEY, value);
  window.dispatchEvent(new CustomEvent("taskgame:virtual-time-changed"));
}

export function clearVirtualGameNow(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VIRTUAL_GAME_NOW_KEY);
  window.dispatchEvent(new CustomEvent("taskgame:virtual-time-changed"));
}

