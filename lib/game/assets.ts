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
  37: "/img/monster/event_june_egg_01_style16bit_pixel_05.png",
  38: "/img/monster/event_june_baby_01_style16bit_pixel_01.png",
  39: "/img/monster/event_june_baby_02_style16bit_pixel_01.png",
  40: "/img/monster/event_june_child_01_style16bit_pixel_03.png",
  41: "/img/monster/event_june_child_02_style16bit_pixel_02.png",
  42: "/img/monster/event_june_child_03_style16bit_pixel_fix_01.png",
  43: "/img/monster/event_june_adult_01_style16bit_pixel_04.png",
  44: "/img/monster/event_june_adult_02_style16bit_pixel_04.png",
  45: "/img/monster/event_june_adult_03_style16bit_pixel_skinfix_02.png",
  46: "/img/monster/event_june_adult_04_style16bit_pixel_01.png",
  47: "/img/monster/event_june_final_01_style16bit_pixel_03.png",
  48: "/img/monster/event_june_final_02_style16bit_pixel_03.png",
  49: "/img/monster/event_june_final_03_style16bit_pixel_01.png",
  50: "/img/monster/event_june_final_04_style16bit_pixel_02.png"
};

export type MonsterMotionKind = "walk" | "happy" | "sway";

export type MonsterMotionAsset = {
  imagePath: string;
  frameCount: 4;
  columns: 2;
  rows: 2;
  durationMs: number;
};

const MONSTER_MOTION_BY_ID: Record<number, Partial<Record<MonsterMotionKind, MonsterMotionAsset>>> = {
  37: {
    sway: {
      imagePath: "/img/monster/event_june_egg_01_sway_4f_style16bit_fix_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  38: {
    walk: {
      imagePath: "/img/monster/event_june_baby_01_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_baby_01_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  39: {
    walk: {
      imagePath: "/img/monster/event_june_baby_02_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_baby_02_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  40: {
    walk: {
      imagePath: "/img/monster/event_june_child_01_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_child_01_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  41: {
    walk: {
      imagePath: "/img/monster/event_june_child_02_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_child_02_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  42: {
    walk: {
      imagePath: "/img/monster/event_june_child_03_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_child_03_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  43: {
    walk: {
      imagePath: "/img/monster/event_june_adult_01_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_adult_01_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  44: {
    walk: {
      imagePath: "/img/monster/event_june_adult_02_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_adult_02_happy_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  45: {
    walk: {
      imagePath: "/img/monster/event_june_adult_03_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_adult_03_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  46: {
    walk: {
      imagePath: "/img/monster/event_june_adult_04_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_adult_04_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  47: {
    walk: {
      imagePath: "/img/monster/event_june_final_01_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_final_01_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  48: {
    walk: {
      imagePath: "/img/monster/event_june_final_02_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_final_02_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  49: {
    walk: {
      imagePath: "/img/monster/event_june_final_03_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_final_03_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  },
  50: {
    walk: {
      imagePath: "/img/monster/event_june_final_04_walk_4f_style16bit_pose_02.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    },
    happy: {
      imagePath: "/img/monster/event_june_final_04_happy_4f_style16bit_pose_01.png",
      frameCount: 4,
      columns: 2,
      rows: 2,
      durationMs: 1120
    }
  }
};

export const ATTRIBUTE_ICON_BY_KEY = {
  power: "/img/icon/icon_attr_power_01.png",
  heal: "/img/icon/icon_attr_heal_01.png",
  knowledge: "/img/icon/icon_attr_knowledge_01.png",
  create: "/img/icon/icon_attr_create_01.png"
} as const;

export const TAB_ICON_BY_KEY = {
  home: "/img/icon/generated_sfc/icon_sfc_home_01.png",
  tasks: "/img/icon/generated_sfc/icon_sfc_tasks_01.png",
  dex: "/img/icon/generated_sfc/icon_sfc_dex_01.png",
  settings: "/img/icon/generated_sfc/icon_sfc_settings_01.png"
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

export function getMonsterMotionAsset(monsterId: number | undefined, kind: MonsterMotionKind): MonsterMotionAsset | null {
  if (!monsterId) return null;
  return MONSTER_MOTION_BY_ID[monsterId]?.[kind] ?? null;
}

export function getLetterItemImage(imagePath?: string): string {
  return imagePath ?? END_EVENT_ASSET_BY_KEY.letterItem;
}
