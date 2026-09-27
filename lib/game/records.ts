import type { GameState } from "@/types/game";

export type AchievementRecord = { date: string; taskId: number; name: string; exp: number | null; coins: number | null };
export function normalizeRecords(value: unknown): AchievementRecord[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, AchievementRecord>();
  for (const row of value) {
    if (!row || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isInteger(row.taskId)) continue;
    unique.set(`${row.date}:${row.taskId}`, { date: row.date, taskId: row.taskId, name: typeof row.name === "string" ? row.name : "タスク", exp: typeof row.exp === "number" && Number.isFinite(row.exp) && row.exp >= 0 ? row.exp : null, coins: typeof row.coins === "number" && Number.isFinite(row.coins) && row.coins >= 0 ? row.coins : null });
  }
  return [...unique.values()];
}
export function summarizeRecords(state: GameState, today: string) {
  const records = state.achievementRecords ?? [];
  const monthly = new Map<string, number>();
  const weekdays = Array(7).fill(0) as number[];
  for (const row of records) {
    const month = row.date.slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + 1);
    weekdays[(new Date(`${row.date}T00:00:00Z`).getUTCDay() + 6) % 7]++;
  }
  const date = new Date(`${today}T00:00:00Z`);
  const monday = new Date(date); monday.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setUTCDate(day.getUTCDate() + i); const key = day.toISOString().slice(0,10); return { label: ["月","火","水","木","金","土","日"][i], value: records.filter(row => row.date === key).length }; });
  const best = [...monthly].sort((a,b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];
  if (monthly.size) {
    const first = [...monthly.keys()].sort()[0];
    const cursor = new Date(`${first}-01T00:00:00Z`);
    while (cursor.toISOString().slice(0,7) <= today.slice(0,7)) {
      const key = cursor.toISOString().slice(0,7);
      if (!monthly.has(key)) monthly.set(key,0);
      cursor.setUTCMonth(cursor.getUTCMonth()+1);
    }
  }
  const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()-1,1)).toISOString().slice(0,7);
  return { records, monthly: [...monthly].sort((a,b) => a[0].localeCompare(b[0])), week, bestMonth: best?.[0], bestWeekday: Math.max(...weekdays) ? ["月","火","水","木","金","土","日"][weekdays.indexOf(Math.max(...weekdays))] : null, difference: (monthly.get(today.slice(0,7)) ?? 0) - (monthly.get(previous) ?? 0), exp: records.reduce((sum,row) => sum + (row.exp ?? 0),0), coins: records.reduce((sum,row) => sum + (row.coins ?? 0),0) };
}
