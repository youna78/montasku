import type { MonsterMaster } from "@/types/master";

/** Birth progress already replaces currentMonsterId with the baby before routing.
 * Resolve its ancestry, not the active calendar event or the next queued egg.
 */
export function getBirthEggMonster(currentMonsterId: number | undefined, monsters: MonsterMaster[]): MonsterMaster | undefined {
  const current = monsters.find(monster => monster.monsterId === currentMonsterId);
  if (!current) return undefined;
  const pending = [current];
  const seen = new Set<number>();
  while (pending.length) {
    const monster = pending.shift()!;
    if (seen.has(monster.monsterId)) continue;
    seen.add(monster.monsterId);
    if (monster.stage === "egg") return monster;
    const parents = (monster.evolutionFrom ?? "").split("|").map(name => name.trim()).filter(Boolean);
    for (const name of parents) {
      const parent = monsters.find(candidate => candidate.name === name);
      if (parent) pending.push(parent);
    }
  }
  return undefined;
}
