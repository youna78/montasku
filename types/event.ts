export type EventRewardType = "event_egg" | "background" | "frame";
export type EventCurrencyType = "free_coin" | "paid_coin";

export type EventRewardShopItem = {
  itemId: string;
  title: string;
  description: string;
  rewardType: EventRewardType;
  currencyType: EventCurrencyType;
  price: number;
  imagePath: string;
  grantValue: string;
  rarity: "normal" | "rare" | "ultra_rare";
  availability: "active_only" | "always_if_owned";
};

export type EventMissionConfig = {
  loginDaysRequired: number;
  dailyLoginBonusFreeCoins: number;
  loginRewardFrameId?: string;
  loginRewardTitle?: string;
};

export type GameEventConfig = {
  eventId: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  announcementStartsAt: string;
  targetUsers: "all";
  heroImagePath: string;
  homeBannerImagePath?: string;
  shopBannerImagePath?: string;
  bannerLabel: string;
  description: string;
  notice: string;
  freeEggMonsterId: number;
  freeEggClaimCount: number;
  rewardPreviewMonsterIds: number[];
  featuredMonsterIds?: number[];
  freeCoinShopItems: EventRewardShopItem[];
  paidCoinShopItems: EventRewardShopItem[];
  mission: EventMissionConfig;
};

export type UserEventState = {
  eventId: string;
  hasSeenIntroPopup: boolean;
  hasClaimedFreeEgg: boolean;
  ownedEggCount: number;
  purchasedEggCount: number;
  completedTaskCount: number;
  loginDates: string[];
  hasCompletedLoginMission: boolean;
  claimedRewardIds: string[];
  updatedAt?: string;
};
