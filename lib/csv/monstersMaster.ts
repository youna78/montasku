import type { MonsterMaster } from "@/types/master";
import { loadCsv, toBool, toNum } from "./loadCsv";

const MONSTER_MOVEMENT_TYPES = new Set<MonsterMaster["movementType"]>(["ground", "flying", "floating"]);

function toMovementType(value: string): MonsterMaster["movementType"] {
  return MONSTER_MOVEMENT_TYPES.has(value as MonsterMaster["movementType"])
    ? (value as MonsterMaster["movementType"])
    : "ground";
}

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
    isSpecial: toBool(row.is_special),
    movementType: toMovementType(row.movement_type)
  }));
}
