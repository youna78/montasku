import type { MonsterMaster } from "@/types/master";
import type { AttributeTotals, GameState } from "@/types/game";

export type EvolutionContext = {
  gameState: GameState;
  monsters: MonsterMaster[];
};

type MainAttribute = "heal" | "power" | "knowledge" | "create";

function dominantAttribute(totals: AttributeTotals): MainAttribute {
  const entries = Object.entries(totals) as Array<[MainAttribute, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "heal";
}

function splitCandidates(value?: string): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findMonsterByName(monsters: MonsterMaster[], name: string): MonsterMaster | undefined {
  return monsters.find((monster) => monster.name === name);
}

function resolveCandidateMonsterId(
  candidateNames: string[],
  dominantAttr: MainAttribute,
  monsters: MonsterMaster[]
): number | null {
  if (candidateNames.length === 0) return null;

  const candidateMonsters = candidateNames
    .map((name) => findMonsterByName(monsters, name))
    .filter((monster): monster is MonsterMaster => Boolean(monster));

  if (candidateMonsters.length === 0) return null;

  if (candidateMonsters.length === 1) {
    return candidateMonsters[0].monsterId;
  }

  const matched = candidateMonsters.find((monster) => splitCandidates(monster.unlockCondition).includes(dominantAttr));
  if (matched) {
    return matched.monsterId;
  }

  return candidateMonsters[0].monsterId;
}

export function resolveBirthMonsterId(totals: AttributeTotals, monsters: MonsterMaster[]): number | null {
  const egg = monsters.find((monster) => monster.monsterId === 1 || monster.name === "タマゴ");
  if (!egg) return null;
  return resolveCandidateMonsterId(splitCandidates(egg.evolutionTo), dominantAttribute(totals), monsters);
}

function requiredLevelForEvolution(stage: MonsterMaster["stage"]): number | null {
  switch (stage) {
    case "baby":
      return 8;
    case "child":
      return 16;
    case "adult":
      return 30;
    default:
      return null;
  }
}

export function resolveEggEvolutionMonsterId(currentMonster: MonsterMaster, totals: AttributeTotals, monsters: MonsterMaster[]): number | null {
  if (currentMonster.stage !== "egg") return null;
  return resolveCandidateMonsterId(splitCandidates(currentMonster.evolutionTo), dominantAttribute(totals), monsters);
}

// CSV-driven evolution for normal and special branches.
export function evaluateEvolution({ gameState, monsters }: EvolutionContext): number | null {
  const current = monsters.find((monster) => monster.monsterId === gameState.currentMonsterId);
  if (!current) return null;

  const requiredLevel = requiredLevelForEvolution(current.stage);
  if (!requiredLevel || gameState.currentMonsterLevel < requiredLevel) {
    return null;
  }

  return resolveCandidateMonsterId(splitCandidates(current.evolutionTo), dominantAttribute(gameState.attributeTotals), monsters);
}
