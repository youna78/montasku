export type AttributeTotals = {
  power: number;
  heal: number;
  knowledge: number;
  create: number;
};

export type ActiveTask = {
  taskId: number;
  sortOrder: number;
  enabled: boolean;
};

export type LetterRecord = {
  letterId: string;
  title: string;
  body: string;
  imagePath: string;
  fromMonsterId: number;
  fromMonsterName: string;
  obtainedDate: string;
};

export type PendingDailyReview = {
  targetDate: string;
  taskIds: number[];
  resolvedTaskIds: number[];
  rewardedTaskIds: number[];
  skippedAt?: string;
};

export type CharmAttribute = "power" | "heal" | "knowledge" | "create";

export type OwnedCharmItemCounts = Partial<Record<CharmAttribute, number>>;
export type OwnedPaidCharmItemCounts = Partial<Record<CharmAttribute, number>>;
export type OwnedBoosterItemCounts = Partial<Record<string, number>>;
export type OwnedDecorationIds = string[];
export type SelectedDecorationIds = string[];

export type ActiveAttributeCharm = {
  itemId: string;
  name: string;
  attribute: CharmAttribute;
  remainingUses: number;
  variant?: "free" | "paid";
};

export type ActiveExpBooster = {
  itemId: string;
  name: string;
  boostRate: number;
  durationMinutes: number;
  expiresAt: string;
};

export type SavedUserEventState = {
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

export type GameState = {
  currentMonsterId: number;
  currentMonsterLevel: number;
  currentMonsterExp: number;
  freeCoins: number;
  paidCoinBalance: number;
  ownedBackgroundIds: string[];
  selectedBackgroundId: string;
  ownedFrameIds: string[];
  selectedFrameId: string;
  ownedDecorationIds: OwnedDecorationIds;
  selectedDecorationIds: SelectedDecorationIds;
  ownedCharmItemCounts: OwnedCharmItemCounts;
  ownedPaidCharmItemCounts: OwnedPaidCharmItemCounts;
  ownedBoosterItemCounts: OwnedBoosterItemCounts;
  activeAttributeCharm: ActiveAttributeCharm | null;
  activeExpBooster: ActiveExpBooster | null;
  queuedEggMonsterId: number | null;
  eventStates: Record<string, SavedUserEventState>;
  lastLoginBonusDate: string | null;
  lastLoginBonusCoins: number;
  todayExp: number;
  streakDays: number;
  attributeTotals: AttributeTotals;
  completedTaskIdsToday: number[];
  activeTasks: ActiveTask[];
  discoveredMonsterIds: number[];
  acquiredLetters: LetterRecord[];
  lastPlayedDate: string;
  hasSeenTutorial: boolean;
  isInTutorialFlow: boolean;
  onboardingCompletedTaskCount: number;
  birthEventPending: boolean;
  hasCompletedInitialBirth: boolean;
  hasCompletedCurrentBirth: boolean;
  endEventPending: boolean;
  pendingDailyReview: PendingDailyReview | null;
};
