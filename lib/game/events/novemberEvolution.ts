import type { AttributeTotals } from "@/types/game";
import type { EvolutionBranch } from "./octoberEvolution";

const HK = ["heal", "knowledge"] as const satisfies readonly (keyof AttributeTotals)[];
const PC = ["power", "create"] as const satisfies readonly (keyof AttributeTotals)[];

export const NOVEMBER_EVOLUTION_BRANCHES: Record<number, readonly EvolutionBranch[]> = {
  107: [{ monsterId: 109, attributes: HK }, { monsterId: 108, attributes: PC }],
  108: [{ monsterId: 112, attributes: HK }, { monsterId: 110, attributes: PC }],
  109: [{ monsterId: 111, attributes: HK }, { monsterId: 112, attributes: PC }],
  110: [{ monsterId: 115, attributes: HK }, { monsterId: 116, attributes: PC }],
  111: [{ monsterId: 114, attributes: HK }, { monsterId: 113, attributes: PC }],
  112: [{ monsterId: 113, attributes: HK }, { monsterId: 115, attributes: PC }],
  113: [{ monsterId: 117, attributes: HK }, { monsterId: 119, attributes: PC }],
  114: [{ monsterId: 118, attributes: HK }, { monsterId: 117, attributes: PC }],
  115: [{ monsterId: 117, attributes: HK }, { monsterId: 119, attributes: PC }],
  116: [{ monsterId: 119, attributes: HK }, { monsterId: 120, attributes: PC }]
};
