const MONSTER_IMAGE_BY_ID: Record<number, string> = {
  1: "/img/monster/1_egg.png",
  2: "/img/monster/2_pinkslime.png",
  3: "/img/monster/3_blueslime.png",
  4: "/img/monster/4_greenslime.png",
  5: "/img/monster/5_purpleslime.png",
  6: "/img/monster/6_minifairy.png",
  7: "/img/monster/7_petitdragon.png",
  8: "/img/monster/8_petitbeast.png",
  9: "/img/monster/9_minispirit.png",
  10: "/img/monster/10_arcfairy.png",
  11: "/img/monster/11_dragon.png",
  12: "/img/monster/12_wizardbeast.png",
  13: "/img/monster/13_golem.png",
  14: "/img/monster/14_seraphim.png",
  15: "/img/monster/15_arcdragon.png",
  16: "/img/monster/16_archmage.png",
  17: "/img/monster/17_creator.png",
  21: "/img/monster/21_shadowspirit.png"
};

export const ATTRIBUTE_ICON_BY_KEY = {
  power: "/img/icon/icon_power_01.png",
  heal: "/img/icon/icon_heal_01.png",
  knowledge: "/img/icon/icon_knowledge_01.png",
  create: "/img/icon/icon_create_01.png"
} as const;

export const TAB_ICON_BY_KEY = {
  home: "/img/tab/tab_icon_home_01.png",
  tasks: "/img/tab/tab_icon_tasks_01.png",
  dex: "/img/tab/tab_icon_dex_01.png",
  settings: "/img/tab/tab_icon_settings_01.png"
} as const;

export function getRarityBadge(rarity?: string): string | null {
  if (rarity === "common") return "/img/badge/rarity_badge_common.png";
  if (rarity === "normal") return "/img/badge/rarity_badge_normal.png";
  if (rarity === "rare") return "/img/badge/rarity_badge_rare.png";
  if (rarity === "ultra_rare") return "/img/badge/rarity_badge_ultra.png";
  return null;
}

export function getStageBadge(stage?: string): string | null {
  if (stage === "egg") return "/img/badge/stage_badge_egg.png";
  if (stage === "baby") return "/img/badge/stage_badge_baby.png";
  if (stage === "child") return "/img/badge/stage_badge_child.png";
  if (stage === "adult") return "/img/badge/stage_badge_adult.png";
  if (stage === "final") return "/img/badge/stage_badge_final.png";
  return null;
}

export function getMonsterImage(monsterId?: number): string {
  if (!monsterId) return "/img/ui/ui_shadow_01.png";
  return MONSTER_IMAGE_BY_ID[monsterId] ?? "/img/ui/ui_shadow_01.png";
}
