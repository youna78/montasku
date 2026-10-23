import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdventureRecords } from "@/components/records/AdventureRecords";
import { summarizeRecords, type AchievementRecord } from "@/lib/game/records";
import type { GameState } from "@/types/game";

export default async function DevRecordsPage() {
  const host = (await headers()).get("host") ?? "";
  if (process.env.NODE_ENV !== "development" && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) notFound();
  const records: AchievementRecord[] = [];
  for (const [date, count] of [["2026-09-30", 43], ["2026-10-20", 132], ["2026-11-01", 11]] as const) {
    for (let i = 0; i < count; i++) records.push({ date, taskId: i, name: "見本のタスク", exp: records.length < 165 ? 3 : 2, coins: 2 });
  }
  const data = summarizeRecords({ achievementRecords: records } as GameState, "2026-11-01");
  return <><p className="adventure-preview-note">11月1日からの表示見本です。数字はサンプルで、セーブデータは変更しません。</p><AdventureRecords data={data} streakDays={28} discoveredCount={50} letterCount={46} /></>;
}
