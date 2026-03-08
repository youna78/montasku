export type TaskCategory = "健康" | "生活" | "成長" | "メンタル";

export type MonsterAttribute =
  | "power"
  | "heal"
  | "knowledge"
  | "create"
  | "none"
  | "special";

export type MonsterStage = "egg" | "baby" | "child" | "adult" | "final";

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
