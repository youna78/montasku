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

export function resolveBirthMonsterId(totals: AttributeTotals, monsters: MonsterMaster[]): number | null {
  const attr = dominantAttribute(totals);
  const map = {
    heal: "ピンクスライム",
    power: "ブルースライム",
    knowledge: "グリーンスライム",
    create: "パープルスライム"
  } as const;
  return monsters.find((m) => m.name === map[attr])?.monsterId ?? null;
}

// Temporary MVP logic. This is intentionally isolated so it can be replaced by evolution_rules.csv later.
export function evaluateEvolution({ gameState, monsters }: EvolutionContext): number | null {
  const current = monsters.find((m) => m.monsterId === gameState.currentMonsterId);
  if (!current) return null;

  const attr = dominantAttribute(gameState.attributeTotals);
  const lv = gameState.currentMonsterLevel;

  if (current.stage === "egg" && lv >= 5) {
    return resolveBirthMonsterId(gameState.attributeTotals, monsters);
  }

  if (current.stage === "baby" && lv >= 20) {
    const map = { heal: "ミニフェアリー", power: "プチドラ", knowledge: "プチビースト", create: "ミニスピリット" };
    return monsters.find((m) => m.name === map[attr])?.monsterId ?? null;
  }

  if (current.stage === "child" && lv >= 40) {
    const map = { heal: "アークフェアリー", power: "ドラゴン", knowledge: "ウィザードビースト", create: "アートゴーレム" };
    return monsters.find((m) => m.name === map[attr])?.monsterId ?? null;
  }

  if (current.stage === "adult" && lv >= 70) {
    const map = { heal: "セラフィム", power: "アークドラゴン", knowledge: "アークメイジ", create: "クリエイター" };
    return monsters.find((m) => m.name === map[attr])?.monsterId ?? null;
  }

  return null;
}
