import type { LevelingMaster } from "@/types/master";
import { loadCsv, toNum } from "./loadCsv";

export async function loadLevelingMaster(): Promise<LevelingMaster[]> {
  const rows = await loadCsv("/data/leveling_master.csv");

  return rows
    .map((row) => ({
      level: toNum(row.level),
      cumulativeExp: toNum(row.cumulative_exp),
      stage: row.stage as LevelingMaster["stage"],
      event: row.event || undefined
    }))
    .sort((a, b) => a.level - b.level);
}
