import type { NavigationFlow } from "@/types/master";
import { loadCsv, toNum } from "./loadCsv";

export async function loadNavigationFlow(): Promise<NavigationFlow[]> {
  const rows = await loadCsv("/docs/navigation_flow.csv");

  return rows.map((row) => ({
    ruleId: toNum(row["判定ID"]),
    ruleType: row["判定種別"],
    targetStage: row["対象進化段階"],
    targetAttribute: row["対象属性"],
    nextMonsterId: toNum(row["進化先モンスターID"]),
    requiredLv: toNum(row["必要LV"]),
    requiredStreakDays: toNum(row["必要連続日数"]),
    extraCondition: row["追加条件"] || undefined,
    priority: toNum(row["優先度"]),
    notes: row["備考"] || undefined
  }));
}
