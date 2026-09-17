import type { AttributeTotals } from "@/types/game";

export type EvolutionBranch = {
  monsterId: number;
  attributes: readonly (keyof AttributeTotals)[];
};

const HK = ["heal", "knowledge"] as const;
const PC = ["power", "create"] as const;

// The September 18 evolution diagram defines attributes per arrow, not per
// destination: shared destinations have different conditions for each parent.
export const OCTOBER_EVOLUTION_BRANCHES: Record<number, readonly EvolutionBranch[]> = {
  93: [{ monsterId: 94, attributes: HK }, { monsterId: 95, attributes: PC }],
  94: [{ monsterId: 96, attributes: HK }, { monsterId: 97, attributes: PC }],
  95: [{ monsterId: 97, attributes: HK }, { monsterId: 98, attributes: PC }],
  96: [{ monsterId: 99, attributes: HK }, { monsterId: 100, attributes: PC }],
  97: [{ monsterId: 100, attributes: HK }, { monsterId: 102, attributes: PC }],
  98: [{ monsterId: 102, attributes: HK }, { monsterId: 101, attributes: PC }],
  99: [{ monsterId: 103, attributes: HK }, { monsterId: 104, attributes: PC }],
  100: [{ monsterId: 104, attributes: HK }, { monsterId: 105, attributes: PC }],
  101: [{ monsterId: 105, attributes: HK }, { monsterId: 106, attributes: PC }],
  102: [{ monsterId: 104, attributes: HK }, { monsterId: 105, attributes: PC }]
};
