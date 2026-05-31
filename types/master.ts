export type TaskCategory = "健康" | "生活" | "成長" | "メンタル" | "創作";

export type MonsterAttribute =
  | "power"
  | "heal"
  | "knowledge"
  | "create"
  | "none"
  | "special";

export type MonsterStage = "egg" | "baby" | "child" | "adult" | "final" | "end";
export type MonsterMovementType = "ground" | "flying" | "floating";

export type TaskMaster = {
  taskId: number;
  name: string;
  category: TaskCategory;
  baseExp: number;
  power: number;
  heal: number;
  knowledge: number;
  create: number;
  defaultEnabled: boolean;
  recommendedOrder: number;
  isNightTask: boolean;
  notes?: string;
};

export type MonsterMaster = {
  monsterId: number;
  name: string;
  attribute: MonsterAttribute;
  stage: MonsterStage;
  rarity: "common" | "normal" | "rare" | "ultra_rare";
  unlockLv: number;
  unlockCondition: string;
  evolutionFrom?: string;
  evolutionTo?: string;
  description: string;
  isSpecial: boolean;
  movementType: MonsterMovementType;
};

export type NavigationFlow = {
  ruleId: number;
  ruleType: string;
  targetStage: string;
  targetAttribute: string;
  nextMonsterId: number;
  requiredLv: number;
  requiredStreakDays: number;
  extraCondition?: string;
  priority: number;
  notes?: string;
};

export type LevelingMaster = {
  level: number;
  cumulativeExp: number;
  stage: MonsterStage;
  event?: string;
};
