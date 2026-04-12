import type { GameEventConfig, UserEventState } from "@/types/event";

export const SPRING_EASTER_EVENT_ID = "spring_easter_2026";

export const SPRING_EASTER_EVENT: GameEventConfig = {
  eventId: SPRING_EASTER_EVENT_ID,
  slug: "spring-easter",
  name: "スプリングイースター",
  startsAt: "2026-04-11T00:00:00+09:00",
  endsAt: "2026-05-30T23:59:59+09:00",
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
      imagePath: "/img/deco_frame/frame_clover_01.png",
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

export const GAME_EVENTS: GameEventConfig[] = [SPRING_EASTER_EVENT];

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
