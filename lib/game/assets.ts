const MONSTER_IMAGE_BY_ID: Record<number, string> = {
  1: "/img/monster/monster_egg_01.png",
  2: "/img/monster/monster_baby_heal_01.png",
  3: "/img/monster/monster_baby_power_01.png",
  4: "/img/monster/monster_baby_knowledge_01.png",
  5: "/img/monster/monster_baby_create_01.png",
  6: "/img/monster/monster_child_set_01.png",
  7: "/img/monster/monster_child_set_02.png",
  8: "/img/monster/monster_child_set_03.png",
  9: "/img/monster/monster_child_set_04.png",
  10: "/img/monster/monster_adult_set_01.png",
  11: "/img/monster/monster_adult_set_02.png",
  12: "/img/monster/monster_adult_set_03.png",
  13: "/img/monster/monster_adult_set_04.png",
  14: "/img/monster/monster_final_set_01.png",
  15: "/img/monster/monster_final_set_02.png",
  16: "/img/monster/monster_final_set_03.png",
  17: "/img/monster/monster_final_set_04.png",
  18: "/img/monster/monster_baby_gold__01.png",
  19: "/img/monster/monster_child_gold__02.png",
  20: "/img/monster/monster_adult_gold__03.png",
  21: "/img/monster/monster_final_night__04.png",
  22: "/img/monster/event_spring_egg_01.png",
  23: "/img/monster/event_spring_baby_01.png",
  24: "/img/monster/event_spring_baby_02.png",
  25: "/img/monster/event_spring_child_01.png",
  26: "/img/monster/event_spring_child_02.png",
  27: "/img/monster/event_spring_child_03.png",
  28: "/img/monster/event_spring_child_04.png",
  29: "/img/monster/event_spring_adult_01.png",
  30: "/img/monster/event_spring_adult_02.png",
  31: "/img/monster/event_spring_adult_03.png",
  32: "/img/monster/event_spring_adult_04.png",
  33: "/img/monster/event_spring_final_01.png",
  34: "/img/monster/event_spring_final_02.png",
  35: "/img/monster/event_spring_final_03.png",
  36: "/img/monster/event_spring_final_04.png"
};

export const ATTRIBUTE_ICON_BY_KEY = {
  power: "/img/icon/icon_attr_power_01.png",
  heal: "/img/icon/icon_attr_heal_01.png",
  knowledge: "/img/icon/icon_attr_knowledge_01.png",
  create: "/img/icon/icon_attr_create_01.png"
} as const;

export const TAB_ICON_BY_KEY = {
  home: "/img/tab/tab_home_01.png",
  tasks: "/img/tab/tab_tasks_01.png",
  dex: "/img/tab/tab_dex_01.png",
  settings: "/img/tab/tab_settings_01.png"
} as const;

export const END_EVENT_ASSET_BY_KEY = {
  letterItem: "/img/letter/letter_item_01.png"
} as const;

export const LETTER_ITEM_IMAGES = [
  "/img/letter/letter_item_01.png",
  "/img/letter/letter_item_02.png",
  "/img/letter/letter_item_03.png",
  "/img/letter/letter_item_04.png",
  "/img/letter/letter_item_05.png",
  "/img/letter/letter_item_06.png",
  "/img/letter/letter_item_07.png"
] as const;

export function getRarityBadge(rarity?: string): string | null {
  if (rarity === "common") return "/img/badge/badge_rarity_set_01.png";
  if (rarity === "normal") return "/img/badge/badge_rarity_set_02.png";
  if (rarity === "rare") return "/img/badge/badge_rarity_set_03.png";
  if (rarity === "ultra_rare") return "/img/badge/badge_rarity_set_04.png";
  return null;
}

export function getStageBadge(stage?: string): string | null {
  if (stage === "egg") return "/img/badge/badge_stage_egg_01.png";
  if (stage === "baby") return "/img/badge/badge_stage_baby_01.png";
  if (stage === "child") return "/img/badge/badge_stage_child_01.png";
  if (stage === "adult") return "/img/badge/badge_stage_adult_01.png";
  if (stage === "final") return "/img/badge/badge_stage_final_01.png";
  return null;
}

export function getMonsterImage(monsterId?: number): string {
  if (!monsterId) return "/img/ui/ui_shadow_fallback_01.png";
  return MONSTER_IMAGE_BY_ID[monsterId] ?? "/img/ui/ui_shadow_fallback_01.png";
}

export function getLetterItemImage(imagePath?: string): string {
  return imagePath ?? END_EVENT_ASSET_BY_KEY.letterItem;
}
