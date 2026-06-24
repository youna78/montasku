import { getGameNow } from "@/lib/game/virtualTime";

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
  36: "/img/monster/event_spring_final_04.png",
  37: "/img/monster/event_june_egg_01.png",
  38: "/img/monster/event_june_mameshiba_modoki_01.png",
  39: "/img/monster/event_june_black_mameshiba_modoki_01.png",
  40: "/img/monster/event_june_okage_inu_modoki_01.png",
  41: "/img/monster/event_june_otsukai_inu_modoki_01.png",
  42: "/img/monster/event_june_kitsune_miko_01.png",
  43: "/img/monster/event_june_komainu_modoki_01.png",
  44: "/img/monster/event_june_keroberos_modoki_01.png",
  45: "/img/monster/event_june_shinshi_01.png",
  46: "/img/monster/event_june_kitsune_kannushi_01.png",
  47: "/img/monster/event_june_shrine_guardian_01.png",
  48: "/img/monster/event_june_shrine_keroberos_01.png",
  49: "/img/monster/event_june_female_kitsune_kannushi_01.png",
  50: "/img/monster/event_june_kitsune_raijin_01.png",
  51: "/img/monster/monster_renewal_51_summer_sunshine_egg_01.png",
  52: "/img/monster/monster_renewal_52_yellow_duck_01.png",
  53: "/img/monster/monster_renewal_53_blue_duck_01.png",
  54: "/img/monster/monster_renewal_54_pink_swan_01.png",
  55: "/img/monster/monster_renewal_55_swimmer_duck_01.png",
  56: "/img/monster/monster_renewal_56_bad_duck_01.png",
  57: "/img/monster/monster_renewal_57_pink_finless_porpoise_01.png",
  58: "/img/monster/monster_renewal_58_summer_dolphin_01.png",
  59: "/img/monster/monster_renewal_59_shark_jaw_01.png",
  60: "/img/monster/monster_renewal_60_marine_cat_01.png",
  61: "/img/monster/monster_renewal_61_summer_mermaid_01.png",
  62: "/img/monster/monster_renewal_62_dreaming_whale_01.png",
  63: "/img/monster/monster_renewal_63_poseidon_01.png",
  64: "/img/monster/monster_renewal_64_surfing_cat_01.png"
};

const MONSTER_RENEWAL_STARTS_AT = "2026-06-01T00:00:00+09:00";

const MONSTER_RENEWAL_IMAGE_BY_ID: Record<number, string> = {
  2: "/img/monster/monster_renewal_02_pink_slime_01.png",
  3: "/img/monster/monster_renewal_03_blue_slime_01.png",
  4: "/img/monster/monster_renewal_04_green_slime_01.png",
  5: "/img/monster/monster_renewal_05_purple_slime_01.png",
  6: "/img/monster/monster_renewal_06_mini_fairy_01.png",
  7: "/img/monster/monster_renewal_07_petit_dragon_01.png",
  8: "/img/monster/monster_renewal_08_petit_beast_01.png",
  9: "/img/monster/monster_renewal_09_mini_spirit_01.png",
  10: "/img/monster/monster_renewal_10_arc_fairy_01.png",
  11: "/img/monster/monster_renewal_11_dragon_01.png",
  12: "/img/monster/monster_renewal_12_wizard_beast_01.png",
  13: "/img/monster/monster_renewal_13_art_golem_01.png",
  14: "/img/monster/monster_renewal_14_seraphim_01.png",
  15: "/img/monster/monster_renewal_15_arc_dragon_01.png",
  16: "/img/monster/monster_renewal_16_arc_mage_01.png",
  17: "/img/monster/monster_renewal_17_creator_01.png",
  18: "/img/monster/monster_renewal_18_golden_slime_01.png",
  19: "/img/monster/monster_renewal_19_golden_petit_dragon_01.png",
  20: "/img/monster/monster_renewal_20_gold_dragon_01.png",
  21: "/img/monster/monster_renewal_21_shadow_spirit_01.png",
  22: "/img/monster/monster_renewal_22_spring_egg_01.png",
  23: "/img/monster/monster_renewal_23_bud_slime_01.png",
  24: "/img/monster/monster_renewal_24_droplet_slime_01.png",
  25: "/img/monster/monster_renewal_25_flower_guardian_fairy_01.png",
  26: "/img/monster/monster_renewal_26_mini_spring_hedgehog_01.png",
  27: "/img/monster/monster_renewal_27_petit_ryu_01.png",
  28: "/img/monster/monster_renewal_28_mini_rabbit_01.png",
  29: "/img/monster/monster_renewal_29_spring_fairy_01.png",
  30: "/img/monster/monster_renewal_30_spring_hedgehog_01.png",
  31: "/img/monster/monster_renewal_31_spring_dragon_01.png",
  32: "/img/monster/monster_renewal_32_easter_rabbit_01.png",
  33: "/img/monster/monster_renewal_33_spring_seraphim_01.png",
  34: "/img/monster/monster_renewal_34_flower_mouse_01.png",
  35: "/img/monster/monster_renewal_35_spring_messenger_dragon_01.png",
  36: "/img/monster/monster_renewal_36_space_time_traveler_01.png"
};

export type MonsterMotionKind = "walk" | "happy" | "sway";

export type MonsterMotionAsset = {
  imagePath: string;
  frameCount: 4;
  columns: 2;
  rows: 2;
  durationMs: number;
  displaySize?: number;
};

const FOUR_FRAME_MOTION = {
  frameCount: 4,
  columns: 2,
  rows: 2,
  durationMs: 1600
} as const;

const createRenewalMotion = (
  slug: string,
  kind: Extract<MonsterMotionKind, "walk" | "happy">,
  displaySize?: number
): MonsterMotionAsset => ({
  ...FOUR_FRAME_MOTION,
  imagePath: `/img/monster/${slug}_${kind}_4f.png`,
  displaySize
});

const MONSTER_RENEWAL_MOTION_BY_ID: Record<number, Partial<Record<MonsterMotionKind, MonsterMotionAsset>>> = {
  2: { walk: createRenewalMotion("monster_renewal_02_pink_slime", "walk"), happy: createRenewalMotion("monster_renewal_02_pink_slime", "happy") },
  3: { walk: createRenewalMotion("monster_renewal_03_blue_slime", "walk"), happy: createRenewalMotion("monster_renewal_03_blue_slime", "happy") },
  4: { walk: createRenewalMotion("monster_renewal_04_green_slime", "walk"), happy: createRenewalMotion("monster_renewal_04_green_slime", "happy") },
  5: { walk: createRenewalMotion("monster_renewal_05_purple_slime", "walk"), happy: createRenewalMotion("monster_renewal_05_purple_slime", "happy") },
  6: { walk: createRenewalMotion("monster_renewal_06_mini_fairy", "walk"), happy: createRenewalMotion("monster_renewal_06_mini_fairy", "happy") },
  7: { walk: createRenewalMotion("monster_renewal_07_petit_dragon", "walk"), happy: createRenewalMotion("monster_renewal_07_petit_dragon", "happy") },
  8: { walk: createRenewalMotion("monster_renewal_08_petit_beast", "walk"), happy: createRenewalMotion("monster_renewal_08_petit_beast", "happy") },
  9: { walk: createRenewalMotion("monster_renewal_09_mini_spirit", "walk"), happy: createRenewalMotion("monster_renewal_09_mini_spirit", "happy") },
  10: { walk: createRenewalMotion("monster_renewal_10_arc_fairy", "walk"), happy: createRenewalMotion("monster_renewal_10_arc_fairy", "happy") },
  11: { walk: createRenewalMotion("monster_renewal_11_dragon", "walk"), happy: createRenewalMotion("monster_renewal_11_dragon", "happy") },
  12: { walk: createRenewalMotion("monster_renewal_12_wizard_beast", "walk"), happy: createRenewalMotion("monster_renewal_12_wizard_beast", "happy") },
  13: { walk: createRenewalMotion("monster_renewal_13_art_golem", "walk"), happy: createRenewalMotion("monster_renewal_13_art_golem", "happy") },
  14: { walk: createRenewalMotion("monster_renewal_14_seraphim", "walk"), happy: createRenewalMotion("monster_renewal_14_seraphim", "happy") },
  15: { walk: createRenewalMotion("monster_renewal_15_arc_dragon", "walk"), happy: createRenewalMotion("monster_renewal_15_arc_dragon", "happy") },
  16: { walk: createRenewalMotion("monster_renewal_16_arc_mage", "walk"), happy: createRenewalMotion("monster_renewal_16_arc_mage", "happy") },
  17: { walk: createRenewalMotion("monster_renewal_17_creator", "walk"), happy: createRenewalMotion("monster_renewal_17_creator", "happy") },
  18: { walk: createRenewalMotion("monster_renewal_18_golden_slime", "walk"), happy: createRenewalMotion("monster_renewal_18_golden_slime", "happy") },
  19: { walk: createRenewalMotion("monster_renewal_19_golden_petit_dragon", "walk"), happy: createRenewalMotion("monster_renewal_19_golden_petit_dragon", "happy") },
  20: { walk: createRenewalMotion("monster_renewal_20_gold_dragon", "walk"), happy: createRenewalMotion("monster_renewal_20_gold_dragon", "happy") },
  21: { walk: createRenewalMotion("monster_renewal_21_shadow_spirit", "walk"), happy: createRenewalMotion("monster_renewal_21_shadow_spirit", "happy") },
  22: {
    sway: { ...FOUR_FRAME_MOTION, imagePath: "/img/monster/monster_renewal_22_spring_egg_sway_4f.png" },
    happy: createRenewalMotion("monster_renewal_22_spring_egg", "happy")
  },
  23: { walk: createRenewalMotion("monster_renewal_23_bud_slime", "walk"), happy: createRenewalMotion("monster_renewal_23_bud_slime", "happy") },
  24: { walk: createRenewalMotion("monster_renewal_24_droplet_slime", "walk"), happy: createRenewalMotion("monster_renewal_24_droplet_slime", "happy") },
  25: { walk: createRenewalMotion("monster_renewal_25_flower_guardian_fairy", "walk"), happy: createRenewalMotion("monster_renewal_25_flower_guardian_fairy", "happy") },
  26: { walk: createRenewalMotion("monster_renewal_26_mini_spring_hedgehog", "walk"), happy: createRenewalMotion("monster_renewal_26_mini_spring_hedgehog", "happy") },
  27: { walk: createRenewalMotion("monster_renewal_27_petit_ryu", "walk"), happy: createRenewalMotion("monster_renewal_27_petit_ryu", "happy") },
  28: { walk: createRenewalMotion("monster_renewal_28_mini_rabbit", "walk"), happy: createRenewalMotion("monster_renewal_28_mini_rabbit", "happy") },
  29: { walk: createRenewalMotion("monster_renewal_29_spring_fairy", "walk"), happy: createRenewalMotion("monster_renewal_29_spring_fairy", "happy") },
  30: { walk: createRenewalMotion("monster_renewal_30_spring_hedgehog", "walk"), happy: createRenewalMotion("monster_renewal_30_spring_hedgehog", "happy") },
  31: { walk: createRenewalMotion("monster_renewal_31_spring_dragon", "walk"), happy: createRenewalMotion("monster_renewal_31_spring_dragon", "happy") },
  32: { walk: createRenewalMotion("monster_renewal_32_easter_rabbit", "walk"), happy: createRenewalMotion("monster_renewal_32_easter_rabbit", "happy") },
  33: { walk: createRenewalMotion("monster_renewal_33_spring_seraphim", "walk"), happy: createRenewalMotion("monster_renewal_33_spring_seraphim", "happy") },
  34: { walk: createRenewalMotion("monster_renewal_34_flower_mouse", "walk"), happy: createRenewalMotion("monster_renewal_34_flower_mouse", "happy") },
  35: { walk: createRenewalMotion("monster_renewal_35_spring_messenger_dragon", "walk"), happy: createRenewalMotion("monster_renewal_35_spring_messenger_dragon", "happy") },
  36: { walk: createRenewalMotion("monster_renewal_36_space_time_traveler", "walk"), happy: createRenewalMotion("monster_renewal_36_space_time_traveler", "happy") },
  37: {
    sway: { ...FOUR_FRAME_MOTION, imagePath: "/img/monster/event_june_egg_sway_4f.png" },
    happy: { ...FOUR_FRAME_MOTION, imagePath: "/img/monster/event_june_egg_happy_4f.png" }
  },
  38: { walk: createRenewalMotion("event_june_mameshiba_modoki", "walk"), happy: createRenewalMotion("event_june_mameshiba_modoki", "happy") },
  39: { walk: createRenewalMotion("event_june_black_mameshiba_modoki", "walk"), happy: createRenewalMotion("event_june_black_mameshiba_modoki", "happy") },
  40: { walk: createRenewalMotion("event_june_okage_inu_modoki", "walk"), happy: createRenewalMotion("event_june_okage_inu_modoki", "happy") },
  41: { walk: createRenewalMotion("event_june_otsukai_inu_modoki", "walk"), happy: createRenewalMotion("event_june_otsukai_inu_modoki", "happy") },
  42: { walk: createRenewalMotion("event_june_kitsune_miko", "walk"), happy: createRenewalMotion("event_june_kitsune_miko", "happy") },
  43: { walk: createRenewalMotion("event_june_komainu_modoki", "walk"), happy: createRenewalMotion("event_june_komainu_modoki", "happy") },
  44: { walk: createRenewalMotion("event_june_keroberos_modoki", "walk"), happy: createRenewalMotion("event_june_keroberos_modoki", "happy") },
  45: { walk: createRenewalMotion("event_june_shinshi", "walk"), happy: createRenewalMotion("event_june_shinshi", "happy") },
  46: { walk: createRenewalMotion("event_june_kitsune_kannushi", "walk"), happy: createRenewalMotion("event_june_kitsune_kannushi", "happy") },
  47: { walk: createRenewalMotion("event_june_shrine_guardian", "walk"), happy: createRenewalMotion("event_june_shrine_guardian", "happy") },
  48: { walk: createRenewalMotion("event_june_shrine_keroberos", "walk"), happy: createRenewalMotion("event_june_shrine_keroberos", "happy") },
  49: { walk: createRenewalMotion("event_june_female_kitsune_kannushi", "walk"), happy: createRenewalMotion("event_june_female_kitsune_kannushi", "happy") },
  50: { walk: createRenewalMotion("event_june_kitsune_raijin", "walk"), happy: createRenewalMotion("event_june_kitsune_raijin", "happy") },
  51: {
    sway: { ...FOUR_FRAME_MOTION, imagePath: "/img/monster/monster_renewal_51_summer_sunshine_egg_sway_4f.png", displaySize: 190 },
    happy: createRenewalMotion("monster_renewal_51_summer_sunshine_egg", "happy", 190)
  },
  52: { walk: createRenewalMotion("monster_renewal_52_yellow_duck", "walk", 182), happy: createRenewalMotion("monster_renewal_52_yellow_duck", "happy", 182) },
  53: { walk: createRenewalMotion("monster_renewal_53_blue_duck", "walk"), happy: createRenewalMotion("monster_renewal_53_blue_duck", "happy") },
  54: { walk: createRenewalMotion("monster_renewal_54_pink_swan", "walk", 190), happy: createRenewalMotion("monster_renewal_54_pink_swan", "happy", 190) },
  55: { walk: createRenewalMotion("monster_renewal_55_swimmer_duck", "walk", 154), happy: createRenewalMotion("monster_renewal_55_swimmer_duck", "happy", 154) },
  56: { walk: createRenewalMotion("monster_renewal_56_bad_duck", "walk", 171), happy: createRenewalMotion("monster_renewal_56_bad_duck", "happy", 171) },
  57: { walk: createRenewalMotion("monster_renewal_57_pink_finless_porpoise", "walk"), happy: createRenewalMotion("monster_renewal_57_pink_finless_porpoise", "happy") },
  58: { walk: createRenewalMotion("monster_renewal_58_summer_dolphin", "walk", 180), happy: createRenewalMotion("monster_renewal_58_summer_dolphin", "happy", 180) },
  59: { walk: createRenewalMotion("monster_renewal_59_shark_jaw", "walk", 186), happy: createRenewalMotion("monster_renewal_59_shark_jaw", "happy", 186) },
  60: { walk: createRenewalMotion("monster_renewal_60_marine_cat", "walk", 165), happy: createRenewalMotion("monster_renewal_60_marine_cat", "happy", 165) },
  61: { walk: createRenewalMotion("monster_renewal_61_summer_mermaid", "walk", 182), happy: createRenewalMotion("monster_renewal_61_summer_mermaid", "happy", 182) },
  62: { walk: createRenewalMotion("monster_renewal_62_dreaming_whale", "walk"), happy: createRenewalMotion("monster_renewal_62_dreaming_whale", "happy") },
  63: { walk: createRenewalMotion("monster_renewal_63_poseidon", "walk", 175), happy: createRenewalMotion("monster_renewal_63_poseidon", "happy", 175) },
  64: { walk: createRenewalMotion("monster_renewal_64_surfing_cat", "walk", 190), happy: createRenewalMotion("monster_renewal_64_surfing_cat", "happy", 190) }
};

function isMonsterRenewalActive(now: Date = getGameNow()): boolean {
  return now.getTime() >= new Date(MONSTER_RENEWAL_STARTS_AT).getTime();
}

export const ATTRIBUTE_ICON_BY_KEY = {
  power: "/img/icon/icon_attr_power_01.png",
  heal: "/img/icon/icon_attr_heal_01.png",
  knowledge: "/img/icon/icon_attr_knowledge_01.png",
  create: "/img/icon/icon_attr_create_01.png"
} as const;

export const TAB_ICON_BY_KEY = {
  home: "/img/icon/sfc/sfc_home_01.png",
  tasks: "/img/icon/sfc/sfc_task_01.png",
  dex: "/img/icon/sfc/sfc_dex_01.png",
  settings: "/img/icon/sfc/sfc_settings_01.png"
} as const;

export const END_EVENT_ASSET_BY_KEY = {
  letterItem: "/img/icon/sfc/sfc_letter_01.png"
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
  if (isMonsterRenewalActive()) {
    return MONSTER_RENEWAL_IMAGE_BY_ID[monsterId] ?? MONSTER_IMAGE_BY_ID[monsterId] ?? "/img/ui/ui_shadow_fallback_01.png";
  }
  return MONSTER_IMAGE_BY_ID[monsterId] ?? "/img/ui/ui_shadow_fallback_01.png";
}

export function getMonsterMotionAsset(monsterId: number | undefined, kind: MonsterMotionKind): MonsterMotionAsset | null {
  if (!monsterId || !isMonsterRenewalActive()) return null;
  return MONSTER_RENEWAL_MOTION_BY_ID[monsterId]?.[kind] ?? null;
}

export function getLetterItemImage(imagePath?: string): string {
  return imagePath ?? END_EVENT_ASSET_BY_KEY.letterItem;
}
