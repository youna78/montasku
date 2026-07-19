import type { GameEventConfig, UserEventState } from "@/types/event";

export const SPRING_EASTER_EVENT_ID = "spring_easter_2026";
export const JUNE_SHRINE_EVENT_ID = "june_shrine_2026";
export const JULY_SUMMERTIME_EVENT_ID = "july_summertime_2026";
export const AUGUST_NATSUMATSURI_EVENT_ID = "august_natsumatsuri_2026";

export const SPRING_EASTER_EVENT: GameEventConfig = {
  eventId: SPRING_EASTER_EVENT_ID,
  slug: "spring-easter",
  name: "スプリングイースター",
  startsAt: "2026-04-11T00:00:00+09:00",
  endsAt: "2026-05-31T23:59:59+09:00",
  announcementStartsAt: "2026-04-08T00:00:00+09:00",
  targetUsers: "all",
  heroImagePath: "/img/illustration/icatch_spring_easter_02.png",
  bannerLabel: "イベント開催中",
  description: "春限定のモンスター登場！タスクを達成して育ててみよう",
  notice: "期間限定です。イベントショップは開催中のみ利用できます。",
  freeEggMonsterId: 22,
  freeEggClaimCount: 1,
  rewardPreviewMonsterIds: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  featuredMonsterIds: [23, 24],
  freeCoinShopItems: [
    {
      itemId: "spring_meadow_bg_free",
      title: "春風の花畑",
      description: "花がゆれる春イベント限定の背景です。",
      rewardType: "background",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/background/bg_spring_meadow_01.png",
      grantValue: "spring_meadow",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "spring_clover_frame_free",
      title: "クローバーフレーム",
      description: "やさしい若草色のイベントフレームです。",
      rewardType: "frame",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/deco_frame/frame_clover_01_aligned_01.png",
      grantValue: "spring_clover",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  paidCoinShopItems: [
    {
      itemId: "spring_event_egg_paid",
      title: "春の芽吹きたまご",
      description: "春イベントの進化ラインで育てられる特別なたまごです。",
      rewardType: "event_egg",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/monster/event_spring_egg_01.png",
      grantValue: "22",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "spring_stream_bg_paid",
      title: "せせらぎの春小道",
      description: "小川と花びらが流れる春イベント限定背景です。",
      rewardType: "background",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/background/bg_spring_stream_01.png",
      grantValue: "spring_stream",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  mission: {
    loginDaysRequired: 7,
    dailyLoginBonusFreeCoins: 2,
    loginRewardFrameId: "spring_sakura",
    loginRewardTitle: "さくらフレーム"
  }
};

export const JUNE_SHRINE_EVENT: GameEventConfig = {
  eventId: JUNE_SHRINE_EVENT_ID,
  slug: "june-shrine",
  name: "梅雨の神社訪問",
  startsAt: "2026-06-01T00:00:00+09:00",
  endsAt: "2026-06-30T23:59:59+09:00",
  announcementStartsAt: "2026-05-28T00:00:00+09:00",
  targetUsers: "all",
  heroImagePath: "/img/illustration/icatch_june_shrine_01.png",
  homeBannerImagePath: "/img/illustration/icatch_june_shrine_home_01.png",
  shopBannerImagePath: "/img/illustration/icatch_june_shop_01.png",
  bannerLabel: "イベント開催中",
  description: "梅雨限定のモンスター登場！タスクを達成して育ててみよう",
  notice: "期間限定です。イベントショップは開催中のみ利用できます。",
  freeEggMonsterId: 37,
  freeEggClaimCount: 1,
  rewardPreviewMonsterIds: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  featuredMonsterIds: [38, 39],
  freeCoinShopItems: [
    {
      itemId: "june_shrine_bg_free",
      title: "雨宿り神社",
      description: "梅雨の時期の神社イベント限定の背景です。",
      rewardType: "background",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/background/bg_june_shrine_01.png",
      grantValue: "june_shrine_meadow",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "june_shrine_frame_free",
      title: "梅雨フレーム",
      description: "梅雨の神社イベント限定の傘などが入ったフレームです。",
      rewardType: "frame",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/deco_frame/frame_june_rain_01_aligned_01.png",
      grantValue: "spring_rain",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  paidCoinShopItems: [
    {
      itemId: "june_shrine_egg_paid",
      title: "梅雨の雨宿りたまご",
      description: "梅雨の神社イベントの進化ラインで育てられる特別なたまごです。",
      rewardType: "event_egg",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/monster/event_june_egg_01.png",
      grantValue: "37",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "june_shrine_bg_night_paid",
      title: "夜の雨宿り神社",
      description: "梅雨の神社イベント限定背景です。",
      rewardType: "background",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/background/bg_june_shrine_night_01.png",
      grantValue: "june_shrine_night",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  mission: {
    loginDaysRequired: 7,
    dailyLoginBonusFreeCoins: 2,
    loginRewardFrameId: "june_shrine_azisai",
    loginRewardTitle: "あじさいフレーム"
  }
};

export const JULY_SUMMERTIME_EVENT: GameEventConfig = {
  eventId: JULY_SUMMERTIME_EVENT_ID,
  slug: "july_summertime",
  name: "ハッピーサマータイム",
  startsAt: "2026-07-01T00:00:00+09:00",
  endsAt: "2026-07-31T23:59:59+09:00",
  announcementStartsAt: "2026-06-29T00:00:00+09:00",
  targetUsers: "all",
  heroImagePath: "/img/illustration/icatch_july_summertime_01.png",
  homeBannerImagePath: "/img/illustration/icatch_july_summertime_home_01.png",
  shopBannerImagePath: "/img/illustration/icatch_july_shop_01.png",
  bannerLabel: "イベント開催中",
  description: "7月限定のモンスター登場！タスクを達成して育ててみよう",
  notice: "期間限定です。イベントショップは開催中のみ利用できます。",
  freeEggMonsterId: 51,
  freeEggClaimCount: 1,
  rewardPreviewMonsterIds: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
  featuredMonsterIds: [52, 53],
  freeCoinShopItems: [
    {
      itemId: "july_summertime_bg_free",
      title: "真夏のモンタスク海岸",
      description: "海開きの空気を感じる7月イベント限定の背景です。",
      rewardType: "background",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/background/bg_july_summertime_beach_01.png",
      grantValue: "july_summertime_beach",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "july_summertime_frame_free",
      title: "貝殻フレーム",
      description: "貝殻と海辺のきらめきをあしらった7月イベントフレームです。",
      rewardType: "frame",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/deco_frame/frame_july_shell_01_aligned_01.png",
      grantValue: "july_shell",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  paidCoinShopItems: [
    {
      itemId: "july_summertime_egg_paid",
      title: "夏の日差し卵",
      description: "7月イベントの進化ラインで育てられる特別なたまごです。",
      rewardType: "event_egg",
      currencyType: "paid_coin",
      price: 300,
      imagePath: "/img/monster/monster_renewal_51_summer_sunshine_egg_01.png",
      grantValue: "51",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "july_summertime_bg_night_paid",
      title: "夜のモンタスク海岸",
      description: "夏の夜風と月明かりを感じる7月イベント限定背景です。",
      rewardType: "background",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/background/bg_july_summertime_beach_night_01.png",
      grantValue: "july_summertime_beach_night",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  mission: {
    loginDaysRequired: 7,
    dailyLoginBonusFreeCoins: 2,
    loginRewardFrameId: "july_hibiscus",
    loginRewardTitle: "ハイビスカスフレーム"
  }
};

export const AUGUST_NATSUMATSURI_EVENT: GameEventConfig = {
  eventId: AUGUST_NATSUMATSURI_EVENT_ID,
  slug: "august_natsumatsuri",
  name: "モンタスク夏祭り",
  startsAt: "2026-08-01T00:00:00+09:00",
  endsAt: "2026-08-31T23:59:59+09:00",
  announcementStartsAt: "2026-07-29T00:00:00+09:00",
  targetUsers: "all",
  heroImagePath: "/img/illustration/icatch_august_natsumatsuri_01.png",
  homeBannerImagePath: "/img/illustration/icatch_august_natsumatsuri_home_01.png",
  shopBannerImagePath: "/img/illustration/icatch_august_shop_01.png",
  bannerLabel: "イベント開催中",
  description: "8月限定の夏祭りモンスター登場！タスクを達成して育ててみよう",
  notice: "期間限定です。イベントショップは開催中のみ利用できます。",
  freeEggMonsterId: 65,
  freeEggClaimCount: 1,
  rewardPreviewMonsterIds: [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78],
  featuredMonsterIds: [66, 67],
  freeCoinShopItems: [
    {
      itemId: "august_natsumatsuri_bg_free",
      title: "盆踊り会場",
      description: "お昼の明るい盆踊りステージでお祭りを楽しめる背景です。",
      rewardType: "background",
      currencyType: "free_coin",
      price: 500,
      imagePath: "/img/background/bg_august_bonodori_01.png",
      grantValue: "august_natsumatsuri_bonodori",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  paidCoinShopItems: [
    {
      itemId: "august_natsumatsuri_egg_paid",
      title: "夏まつり卵",
      description: "夏祭りモンスターに出会える8月イベント卵です。",
      rewardType: "event_egg",
      currencyType: "paid_coin",
      price: 300,
      imagePath: "/img/monster/monster_renewal_65_august_natsumatsuri_egg_01.png",
      grantValue: "65",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "august_natsumatsuri_bg_night_paid",
      title: "夜の夏まつり屋台",
      description: "夜の夏祭りの屋台風景で素敵な時間を過ごせる背景です。",
      rewardType: "background",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/background/bg_august_natsumatsuri_night_01.png",
      grantValue: "august_natsumatsuri_bg_night",
      rarity: "rare",
      availability: "active_only"
    },
    {
      itemId: "august_natsumatsuri_frame_paid",
      title: "屋台フレーム",
      description: "金魚すくいやヨーヨー、かき氷が入った夏まつりフレームです。",
      rewardType: "frame",
      currencyType: "paid_coin",
      price: 500,
      imagePath: "/img/deco_frame/frame_august_yatai_01_aligned_01.png",
      grantValue: "august_yatai_frame",
      rarity: "rare",
      availability: "active_only"
    }
  ],
  mission: {
    loginDaysRequired: 7,
    dailyLoginBonusFreeCoins: 2,
    loginRewardFrameId: "august_morningglory",
    loginRewardTitle: "あさがおフレーム"
  }
};

export const GAME_EVENTS: GameEventConfig[] = [
  SPRING_EASTER_EVENT,
  JUNE_SHRINE_EVENT,
  JULY_SUMMERTIME_EVENT,
  AUGUST_NATSUMATSURI_EVENT
];

export function createInitialUserEventState(eventId: string): UserEventState {
  return {
    eventId,
    hasSeenIntroPopup: false,
    hasClaimedFreeEgg: false,
    ownedEggCount: 0,
    purchasedEggCount: 0,
    completedTaskCount: 0,
    loginDates: [],
    hasCompletedLoginMission: false,
    claimedRewardIds: []
  };
}

export function normalizeUserEventState(eventId: string, raw: Partial<UserEventState> | null | undefined): UserEventState {
  const initial = createInitialUserEventState(eventId);
  return {
    ...initial,
    ...raw,
    eventId,
    hasSeenIntroPopup: Boolean(raw?.hasSeenIntroPopup),
    hasClaimedFreeEgg: Boolean(raw?.hasClaimedFreeEgg),
    ownedEggCount: typeof raw?.ownedEggCount === "number" && raw.ownedEggCount > 0 ? Math.floor(raw.ownedEggCount) : 0,
    purchasedEggCount: typeof raw?.purchasedEggCount === "number" && raw.purchasedEggCount > 0 ? Math.floor(raw.purchasedEggCount) : 0,
    completedTaskCount: typeof raw?.completedTaskCount === "number" && raw.completedTaskCount > 0 ? Math.floor(raw.completedTaskCount) : 0,
    loginDates: Array.isArray(raw?.loginDates) ? [...new Set(raw.loginDates.filter((value) => typeof value === "string" && value.length > 0))] : [],
    hasCompletedLoginMission: Boolean(raw?.hasCompletedLoginMission),
    claimedRewardIds: Array.isArray(raw?.claimedRewardIds)
      ? [...new Set(raw.claimedRewardIds.filter((value) => typeof value === "string" && value.length > 0))]
      : [],
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined
  };
}
