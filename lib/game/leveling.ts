import type { LevelingMaster, MonsterStage } from "@/types/master";

const FALLBACK_LEVELING: LevelingMaster[] = [
  { level: 1, cumulativeExp: 0, stage: "egg", event: "開始" },
  { level: 2, cumulativeExp: 5, stage: "baby" },
  { level: 3, cumulativeExp: 11, stage: "baby" },
  { level: 4, cumulativeExp: 18, stage: "baby", event: "Baby安定" },
  { level: 5, cumulativeExp: 26, stage: "baby" },
  { level: 6, cumulativeExp: 35, stage: "baby" },
  { level: 7, cumulativeExp: 45, stage: "baby" },
  { level: 8, cumulativeExp: 56, stage: "child", event: "Child進化" },
  { level: 9, cumulativeExp: 64, stage: "child" },
  { level: 10, cumulativeExp: 72, stage: "child" },
  { level: 11, cumulativeExp: 80, stage: "child" },
  { level: 12, cumulativeExp: 88, stage: "child" },
  { level: 13, cumulativeExp: 96, stage: "child" },
  { level: 14, cumulativeExp: 104, stage: "child" },
  { level: 15, cumulativeExp: 112, stage: "child" },
  { level: 16, cumulativeExp: 121, stage: "adult", event: "Adult進化" },
  { level: 17, cumulativeExp: 130, stage: "adult" },
  { level: 18, cumulativeExp: 139, stage: "adult" },
  { level: 19, cumulativeExp: 148, stage: "adult" },
  { level: 20, cumulativeExp: 157, stage: "adult" },
  { level: 21, cumulativeExp: 166, stage: "adult" },
  { level: 22, cumulativeExp: 175, stage: "adult" },
  { level: 23, cumulativeExp: 184, stage: "adult" },
  { level: 24, cumulativeExp: 193, stage: "adult" },
  { level: 25, cumulativeExp: 202, stage: "adult" },
  { level: 26, cumulativeExp: 212, stage: "adult" },
  { level: 27, cumulativeExp: 222, stage: "adult" },
  { level: 28, cumulativeExp: 232, stage: "adult" },
  { level: 29, cumulativeExp: 242, stage: "adult" },
  { level: 30, cumulativeExp: 252, stage: "final", event: "final" },
  { level: 31, cumulativeExp: 263, stage: "final" },
  { level: 32, cumulativeExp: 274, stage: "final" },
  { level: 33, cumulativeExp: 285, stage: "final" },
  { level: 34, cumulativeExp: 296, stage: "final" },
  { level: 35, cumulativeExp: 308, stage: "final" },
  { level: 36, cumulativeExp: 320, stage: "final" },
  { level: 37, cumulativeExp: 332, stage: "final" },
  { level: 38, cumulativeExp: 344, stage: "final" },
  { level: 39, cumulativeExp: 357, stage: "final" },
  { level: 40, cumulativeExp: 370, stage: "end", event: "end" }
];

export function getFallbackLevelingMaster(): LevelingMaster[] {
  return FALLBACK_LEVELING;
}

export function normalizeLevelingMaster(rows: LevelingMaster[]): LevelingMaster[] {
  if (!rows.length) return FALLBACK_LEVELING;
  return [...rows].sort((a, b) => a.level - b.level);
}

export function resolveLevelFromExp(totalExp: number, rows: LevelingMaster[]): LevelingMaster {
  const table = normalizeLevelingMaster(rows);
  let current = table[0];

  for (const row of table) {
    if (totalExp >= row.cumulativeExp) {
      current = row;
      continue;
    }
    break;
  }

  return current;
}

export function getLevelProgress(
  level: number,
  totalExp: number,
  rows: LevelingMaster[]
): { current: number; required: number; currentTotal: number; nextTotal: number | null } {
  const table = normalizeLevelingMaster(rows);
  const currentIndex = Math.max(0, table.findIndex((row) => row.level === level));
  const currentRow = table[currentIndex] ?? table[0];
  const nextRow = table[currentIndex + 1] ?? null;

  if (!nextRow) {
    return {
      current: totalExp - currentRow.cumulativeExp,
      required: 0,
      currentTotal: currentRow.cumulativeExp,
      nextTotal: null
    };
  }

  return {
    current: Math.max(0, totalExp - currentRow.cumulativeExp),
    required: Math.max(0, nextRow.cumulativeExp - currentRow.cumulativeExp),
    currentTotal: currentRow.cumulativeExp,
    nextTotal: nextRow.cumulativeExp
  };
}

export function getStageFromLevel(level: number, rows: LevelingMaster[]): MonsterStage {
  return resolveLevelFromExp(getCumulativeExpForLevel(level, rows), rows).stage;
}

export function getCumulativeExpForLevel(level: number, rows: LevelingMaster[]): number {
  const table = normalizeLevelingMaster(rows);
  return table.find((row) => row.level === level)?.cumulativeExp ?? table[0]?.cumulativeExp ?? 0;
}

export function isEndLevel(level: number, rows: LevelingMaster[]): boolean {
  const table = normalizeLevelingMaster(rows);
  return (table.find((row) => row.level === level)?.stage ?? "") === "end";
}
