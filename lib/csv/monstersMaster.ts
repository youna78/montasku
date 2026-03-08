import type { MonsterMaster } from "@/types/master";
import { loadCsv, toBool, toNum } from "./loadCsv";

export async function loadMonstersMaster(): Promise<MonsterMaster[]> {
  const rows = await loadCsv("/data/monsters_master.csv");

  return rows.map((row) => ({
    monsterId: toNum(row.monster_id),
    name: row.name,
    attribute: row.attribute as MonsterMaster["attribute"],
    stage: row.stage as MonsterMaster["stage"],
    rarity: row.rarity as MonsterMaster["rarity"],
    unlockLv: toNum(row.unlock_lv),
    unlockCondition: row.unlock_condition,
    evolutionFrom: row.evolution_from || undefined,
    evolutionTo: row.evolution_to || undefined,
    description: row.description,
    isSpecial: toBool(row.is_special)
  }));
}
