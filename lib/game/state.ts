import type {
  ActiveExpBooster,
  ActiveAttributeCharm,
  AttributeTotals,
  CharmAttribute,
  GameState,
  LetterRecord,
  OwnedBoosterItemCounts,
  OwnedCharmItemCounts,
  OwnedPaidCharmItemCounts,
  PendingDailyReview,
  SavedUserEventState
} from "@/types/game";
import type { LevelingMaster, MonsterMaster, TaskMaster } from "@/types/master";
import { LETTER_ITEM_IMAGES } from "./assets";
import { GAME_EVENTS, getEventById, isEventActive, normalizeUserEventState } from "./events";
import { getGameNow } from "./virtualTime";
import { evaluateEvolution, resolveBirthMonsterId, resolveEggEvolutionMonsterId } from "./evolution";
import { getAttributeCharmItem, getBoosterShopItem, getDecorationShopItem, getPaidBackgroundShopItem, getPaidBundleShopItem, getPaidFrameShopItem } from "./shop";
import {
  getCumulativeExpForLevel,
  getFallbackLevelingMaster,
  getLevelProgress,
  isEndLevel,
  normalizeLevelingMaster,
  resolveLevelFromExp
} from "./leveling";

const STORAGE_KEY = "habit-monster-mvp-state";
const MIN_ACTIVE_TASKS = 3;
const MAX_ACTIVE_TASKS = 15;
const FREE_COINS_PER_TASK = 2;
const FREE_COINS_PER_DAILY_LOGIN = 3;
const ATTRIBUTE_CHARM_PRICE = 300;
const ATTRIBUTE_CHARM_USES = 3;
const PAID_ATTRIBUTE_CHARM_PRICE = 300;
const PAID_ATTRIBUTE_CHARM_USES = 10;

export type CompleteTaskResult = {
  nextState: GameState;
  gainedExp: number;
  gainedFreeCoins: number;
  gainedAttributes: {
    power: number;
    heal: number;
    knowledge: number;
    create: number;
  };
  alreadyCompleted: boolean;
  evolved: boolean;
  levelUp: boolean;
  previousMonsterId: number;
  nextMonsterId: number;
};

export type AddTaskResult = {
  nextState: GameState;
  added: boolean;
  reason?: "already_active" | "max_reached";
};

export type RemoveTaskResult = {
  nextState: GameState;
  removed: boolean;
  reason?: "not_found" | "min_reached";
};

export type ReorderTaskResult = {
  nextState: GameState;
  moved: boolean;
  reason?: "not_found" | "boundary";
};

export type PurchaseShopItemResult = {
  nextState: GameState;
  purchased: boolean;
  reason?: "already_owned" | "insufficient_coins";
};

export type EquipBackgroundResult = {
  nextState: GameState;
  equipped: boolean;
  reason?: "not_owned" | "already_equipped";
};

export type EquipFrameResult = {
  nextState: GameState;
  equipped: boolean;
  reason?: "not_owned" | "already_equipped";
};

export type ToggleDecorationResult = {
  nextState: GameState;
  toggled: boolean;
  active: boolean;
  reason?: "not_owned";
};

export type PurchaseCharmResult = {
  nextState: GameState;
  purchased: boolean;
  reason?: "insufficient_coins" | "invalid_item";
};

export type UseCharmResult = {
  nextState: GameState;
  used: boolean;
  reason?: "not_owned";
};

export type PurchaseBoosterResult = {
  nextState: GameState;
  purchased: boolean;
  reason?: "insufficient_coins" | "invalid_item";
};

export type PurchasePaidInventoryResult = {
  nextState: GameState;
  purchased: boolean;
  reason?: "already_owned" | "insufficient_coins" | "invalid_item" | "event_not_available";
};

export type UseBoosterResult = {
  nextState: GameState;
  used: boolean;
  reason?: "not_owned" | "invalid_item";
};

export type EventEggClaimResult = {
  nextState: GameState;
  claimed: boolean;
  reason?: "already_claimed" | "event_inactive" | "event_not_found";
};

export type EventEggUseResult = {
  nextState: GameState;
  used: boolean;
  reason?: "event_not_found" | "no_egg" | "already_queued";
};

export type ForceStartEventEggResult = {
  nextState: GameState;
  started: boolean;
  reason?: "event_not_found" | "no_egg" | "already_active";
};

export type PurchaseEventRewardResult = {
  nextState: GameState;
  purchased: boolean;
  reason?: "event_not_found" | "event_inactive" | "item_not_found" | "already_owned" | "insufficient_free_coins" | "insufficient_paid_coins";
};

export type FinishEndEventResult = GameState;

export type DailyReviewResolveResult = {
  nextState: GameState;
  resolved: boolean;
  rewarded: boolean;
  gainedExp: number;
  gainedFreeCoins: number;
  gainedAttributes: {
    power: number;
    heal: number;
    knowledge: number;
    create: number;
  };
  evolved: boolean;
  levelUp: boolean;
  previousMonsterId: number;
  nextMonsterId: number;
};

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.filter((v) => Number.isFinite(v)))];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

function normalizeCharmCounts(rawCounts: OwnedCharmItemCounts | undefined): OwnedCharmItemCounts {
  const normalized: OwnedCharmItemCounts = {};
  for (const attribute of ["power", "heal", "knowledge", "create"] as const) {
    const rawValue = rawCounts?.[attribute];
    if (typeof rawValue === "number" && rawValue > 0) {
      normalized[attribute] = Math.floor(rawValue);
    }
  }
  return normalized;
}

function normalizePaidCharmCounts(rawCounts: OwnedPaidCharmItemCounts | undefined): OwnedPaidCharmItemCounts {
  const normalized: OwnedPaidCharmItemCounts = {};
  for (const attribute of ["power", "heal", "knowledge", "create"] as const) {
    const rawValue = rawCounts?.[attribute];
    if (typeof rawValue === "number" && rawValue > 0) {
      normalized[attribute] = Math.floor(rawValue);
    }
  }
  return normalized;
}

function normalizeBoosterCounts(rawCounts: OwnedBoosterItemCounts | undefined): OwnedBoosterItemCounts {
  return Object.fromEntries(
    Object.entries(rawCounts ?? {}).filter(([, count]) => typeof count === "number" && count > 0)
  );
}

function normalizeActiveAttributeCharm(rawCharm: ActiveAttributeCharm | null | undefined): ActiveAttributeCharm | null {
  if (!rawCharm || typeof rawCharm !== "object") return null;
  if (!rawCharm.itemId || !rawCharm.name) return null;
  if (!["power", "heal", "knowledge", "create"].includes(rawCharm.attribute)) return null;
  if (typeof rawCharm.remainingUses !== "number" || rawCharm.remainingUses <= 0) return null;

  return {
    itemId: rawCharm.itemId,
    name: rawCharm.name,
    attribute: rawCharm.attribute,
    remainingUses: Math.floor(rawCharm.remainingUses),
    variant: rawCharm.variant === "paid" ? "paid" : "free"
  };
}

function normalizeActiveExpBooster(rawBooster: ActiveExpBooster | null | undefined): ActiveExpBooster | null {
  if (!rawBooster || typeof rawBooster !== "object") return null;
  if (!rawBooster.itemId || !rawBooster.name) return null;
  if (typeof rawBooster.boostRate !== "number" || rawBooster.boostRate <= 0) return null;
  if (typeof rawBooster.durationMinutes !== "number" || rawBooster.durationMinutes <= 0) return null;
  if (typeof rawBooster.expiresAt !== "string") return null;
  if (Number.isNaN(new Date(rawBooster.expiresAt).getTime())) return null;
  if (new Date(rawBooster.expiresAt).getTime() <= Date.now()) return null;

  return rawBooster;
}

function normalizeEventStates(rawStates: GameState["eventStates"] | undefined): Record<string, SavedUserEventState> {
  return Object.fromEntries(
    GAME_EVENTS.map((eventConfig) => {
      const rawState = rawStates && typeof rawStates === "object" ? rawStates[eventConfig.eventId] : undefined;
      return [eventConfig.eventId, normalizeUserEventState(eventConfig.eventId, rawState)] as const;
    })
  );
}

function appendUniqueDate(values: string[], nextValue: string): string[] {
  return values.includes(nextValue) ? values : [...values, nextValue];
}

function updateEventState(
  state: GameState,
  eventId: string,
  updater: (current: SavedUserEventState) => SavedUserEventState
): GameState {
  const currentState = normalizeUserEventState(eventId, state.eventStates[eventId]);
  return {
    ...state,
    eventStates: {
      ...state.eventStates,
      [eventId]: updater(currentState)
    }
  };
}

function applyEventTaskCompletionProgress(state: GameState): GameState {
  const activeEvents = GAME_EVENTS.filter((eventConfig) => isEventActive(eventConfig));
  if (activeEvents.length === 0) return state;

  return activeEvents.reduce((nextState, eventConfig) => {
    return updateEventState(nextState, eventConfig.eventId, (current) => ({
      ...current,
      completedTaskCount: current.completedTaskCount + 1,
      updatedAt: new Date().toISOString()
    }));
  }, state);
}

function applyEventLoginBonuses(state: GameState, currentDate: string): GameState {
  const activeEvents = GAME_EVENTS.filter((eventConfig) => isEventActive(eventConfig));
  if (activeEvents.length === 0) return state;

  return activeEvents.reduce((nextState, eventConfig) => {
    const currentEventState = normalizeUserEventState(eventConfig.eventId, nextState.eventStates[eventConfig.eventId]);
    if (currentEventState.loginDates.includes(currentDate)) {
      return nextState;
    }

    const nextLoginDates = appendUniqueDate(currentEventState.loginDates, currentDate);
    const completedLoginMission = nextLoginDates.length >= eventConfig.mission.loginDaysRequired;
    const shouldGrantLoginReward =
      completedLoginMission &&
      Boolean(eventConfig.mission.loginRewardFrameId) &&
      !currentEventState.claimedRewardIds.includes("login_mission_reward");

    const nextOwnedFrameIds = shouldGrantLoginReward && eventConfig.mission.loginRewardFrameId
      ? uniqueStrings([...nextState.ownedFrameIds, eventConfig.mission.loginRewardFrameId])
      : nextState.ownedFrameIds;

    return {
      ...nextState,
      freeCoins: nextState.freeCoins + eventConfig.mission.dailyLoginBonusFreeCoins,
      ownedFrameIds: nextOwnedFrameIds,
      eventStates: {
        ...nextState.eventStates,
        [eventConfig.eventId]: {
          ...currentEventState,
          loginDates: nextLoginDates,
          hasCompletedLoginMission: completedLoginMission,
          claimedRewardIds: shouldGrantLoginReward
            ? [...currentEventState.claimedRewardIds, "login_mission_reward"]
            : currentEventState.claimedRewardIds,
          updatedAt: new Date().toISOString()
        }
      }
    };
  }, state);
}

function getEventItemCurrencyBalance(state: GameState, currencyType: "free_coin" | "paid_coin"): number {
  return currencyType === "paid_coin" ? state.paidCoinBalance : state.freeCoins;
}

function spendEventCurrency(state: GameState, currencyType: "free_coin" | "paid_coin", price: number): GameState {
  return currencyType === "paid_coin"
    ? { ...state, paidCoinBalance: state.paidCoinBalance - price }
    : { ...state, freeCoins: state.freeCoins - price };
}

function countCharmTotalAttributes(task: TaskMaster): number {
  return task.power + task.heal + task.knowledge + task.create;
}

function resolveAttributeGains(task: TaskMaster, activeCharm: ActiveAttributeCharm | null): AttributeTotals {
  if (!activeCharm) {
    return {
      power: task.power,
      heal: task.heal,
      knowledge: task.knowledge,
      create: task.create
    };
  }

  const total = countCharmTotalAttributes(task);
  return {
    power: activeCharm.attribute === "power" ? total : 0,
    heal: activeCharm.attribute === "heal" ? total : 0,
    knowledge: activeCharm.attribute === "knowledge" ? total : 0,
    create: activeCharm.attribute === "create" ? total : 0
  };
}

function normalizePendingDailyReview(rawReview: GameState["pendingDailyReview"] | undefined): GameState["pendingDailyReview"] {
  if (!rawReview || typeof rawReview !== "object") return null;
  if (typeof rawReview.targetDate !== "string") return null;

  const taskIds = uniqueNumbers(Array.isArray(rawReview.taskIds) ? rawReview.taskIds : []);
  if (taskIds.length === 0) return null;

  return {
    targetDate: rawReview.targetDate,
    taskIds,
    resolvedTaskIds: uniqueNumbers(Array.isArray(rawReview.resolvedTaskIds) ? rawReview.resolvedTaskIds : []),
    rewardedTaskIds: uniqueNumbers(Array.isArray(rawReview.rewardedTaskIds) ? rawReview.rewardedTaskIds : []),
    skippedAt: typeof rawReview.skippedAt === "string" ? rawReview.skippedAt : undefined
  };
}

function normalizeLetters(rawLetters: GameState["acquiredLetters"] | undefined): GameState["acquiredLetters"] {
  if (!Array.isArray(rawLetters)) return [];

  return rawLetters.reduce<LetterRecord[]>((acc, letter) => {
    if (
      !letter ||
      typeof letter.letterId !== "string" ||
      typeof letter.title !== "string" ||
      typeof letter.body !== "string" ||
      typeof letter.fromMonsterId !== "number" ||
      typeof letter.fromMonsterName !== "string" ||
      typeof letter.obtainedDate !== "string"
    ) {
      return acc;
    }

    acc.push({
      ...letter,
      imagePath: typeof letter.imagePath === "string" ? letter.imagePath : LETTER_ITEM_IMAGES[0]
    });
    return acc;
  }, []);
}

const LETTER_TEMPLATES: Array<{ title: string; body: string; imagePath: string }> = [
  {
    title: "ありがとうのてがみ",
    body: "いっしょに すごした じかんは たいせつな たからもの。\nこれからも きみの まいにちを そっと おうえんしているよ。",
    imagePath: LETTER_ITEM_IMAGES[0]
  },
  {
    title: "げんきでいてね",
    body: "きょうまで たくさん がんばったね。\nむりしすぎず じぶんの ぺーすで すすんでいってね。",
    imagePath: LETTER_ITEM_IMAGES[1]
  },
  {
    title: "つぎのぼうけんへ",
    body: "ここからさきは あたらしい ぼうけんの はじまり。\nきっと また すてきな であいが まっているよ。",
    imagePath: LETTER_ITEM_IMAGES[2]
  },
  {
    title: "みまもっているよ",
    body: "はなれていても きみの がんばりは ちゃんと みえているよ。\nこまった ときは ひとやすみして だいじょうぶ。",
    imagePath: LETTER_ITEM_IMAGES[3]
  },
  {
    title: "ちいさなきろく",
    body: "きょうの いっぽも あしたの いっぽも ぜんぶ たいせつ。\nすこしずつでも まえに すすめば それで じゅうぶんだよ。",
    imagePath: LETTER_ITEM_IMAGES[4]
  },
  {
    title: "まほうのことば",
    body: "よく がんばったね。 えらい。\nそのことばを いつでも じぶんに かけてあげてね。",
    imagePath: LETTER_ITEM_IMAGES[5]
  },
  {
    title: "またあうひまで",
    body: "しばらく たびに でるけれど きみのことは わすれないよ。\nつぎの タマゴも きっと すてきに そだっていくはず。",
    imagePath: LETTER_ITEM_IMAGES[6]
  }
];

function pickRandomLetterTemplate(): { title: string; body: string; imagePath: string } {
  const index = Math.floor(Math.random() * LETTER_TEMPLATES.length);
  return LETTER_TEMPLATES[index] ?? LETTER_TEMPLATES[0];
}

function buildFarewellLetter(state: GameState, monster: MonsterMaster | undefined): LetterRecord {
  const fromMonsterName = monster?.name ?? "モンスター";
  const template = pickRandomLetterTemplate();
  return {
    letterId: `${fromMonsterName}-${state.lastPlayedDate}-${state.currentMonsterExp}`,
    title: template.title,
    body: template.body,
    imagePath: template.imagePath,
    fromMonsterId: monster?.monsterId ?? state.currentMonsterId,
    fromMonsterName,
    obtainedDate: state.lastPlayedDate
  };
}

function normalizeActiveTasks(
  rawActiveTasks: GameState["activeTasks"] | undefined,
  fallback: GameState["activeTasks"]
): GameState["activeTasks"] {
  const source = Array.isArray(rawActiveTasks) && rawActiveTasks.length > 0 ? rawActiveTasks : fallback;

  const enabledUnique = source
    .filter((task) => task && Number.isFinite(task.taskId) && task.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .reduce<Array<{ taskId: number; sortOrder: number; enabled: boolean }>>((acc, task) => {
      if (acc.some((current) => current.taskId === task.taskId)) {
        return acc;
      }
      acc.push({ taskId: task.taskId, sortOrder: acc.length + 1, enabled: true });
      return acc;
    }, []);

  if (enabledUnique.length === 0) {
    return fallback;
  }

  return enabledUnique;
}

function sortAndReindexActiveTasks(activeTasks: GameState["activeTasks"]): GameState["activeTasks"] {
  return activeTasks
    .filter((task) => task.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task, idx) => ({
      taskId: task.taskId,
      sortOrder: idx + 1,
      enabled: true
    }));
}

function reindexActiveTasksInCurrentOrder(activeTasks: GameState["activeTasks"]): GameState["activeTasks"] {
  return activeTasks.map((task, idx) => ({
    taskId: task.taskId,
    sortOrder: idx + 1,
    enabled: true
  }));
}

function todayLocalDate(): string {
  const now = getGameNow();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(fromDate: string, toDate: string): number | null {
  const from = parseLocalDateString(fromDate);
  const to = parseLocalDateString(toDate);
  if (!from || !to) return null;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / millisecondsPerDay);
}

function legacyExpForNextLevel(level: number): number {
  return 20 + Math.max(0, level - 1) * 5;
}

function legacyTotalExp(level: number, currentExp: number): number {
  let total = Math.max(0, currentExp);
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += legacyExpForNextLevel(currentLevel);
  }
  return total;
}

export function buildInitialState(tasks: TaskMaster[]): GameState {
  const activeTasks = tasks
    .filter((task) => task.defaultEnabled)
    .sort((a, b) => a.recommendedOrder - b.recommendedOrder)
    .map((task, idx) => ({
      taskId: task.taskId,
      sortOrder: idx + 1,
      enabled: true
    }));

  return {
    currentMonsterId: 1,
    currentMonsterLevel: 1,
    currentMonsterExp: 0,
    freeCoins: 0,
    paidCoinBalance: 0,
    ownedBackgroundIds: ["home_morning"],
    selectedBackgroundId: "home_morning",
    ownedFrameIds: ["classic_gold"],
    selectedFrameId: "",
    ownedDecorationIds: [],
    selectedDecorationIds: [],
    ownedCharmItemCounts: {},
    ownedPaidCharmItemCounts: {},
    ownedBoosterItemCounts: {},
    activeAttributeCharm: null,
    activeExpBooster: null,
    queuedEggMonsterId: null,
    eventStates: normalizeEventStates(undefined),
    lastLoginBonusDate: null,
    lastLoginBonusCoins: 0,
    todayExp: 0,
    streakDays: 1,
    attributeTotals: {
      power: 0,
      heal: 0,
      knowledge: 0,
      create: 0
    },
    completedTaskIdsToday: [],
    activeTasks,
    discoveredMonsterIds: [1],
    acquiredLetters: [],
    lastPlayedDate: todayLocalDate(),
    hasSeenTutorial: false,
    isInTutorialFlow: false,
    onboardingCompletedTaskCount: 0,
    birthEventPending: false,
    hasCompletedInitialBirth: false,
    hasCompletedCurrentBirth: false,
    endEventPending: false,
    pendingDailyReview: null
  };
}

function normalizeState(
  parsed: Partial<GameState>,
  tasks: TaskMaster[],
  levelingRows: LevelingMaster[]
): GameState {
  const initial = buildInitialState(tasks);
  const table = normalizeLevelingMaster(levelingRows);

  const parsedLevel = typeof parsed.currentMonsterLevel === "number" ? parsed.currentMonsterLevel : initial.currentMonsterLevel;
  const parsedExp = typeof parsed.currentMonsterExp === "number" ? parsed.currentMonsterExp : initial.currentMonsterExp;
  const totalExp =
    parsedLevel > 1 && parsedExp < legacyExpForNextLevel(parsedLevel)
      ? legacyTotalExp(parsedLevel, parsedExp)
      : parsedExp;
  const resolvedLevel = resolveLevelFromExp(totalExp, table);
  const hasCompletedInitialBirth =
    typeof parsed.hasCompletedInitialBirth === "boolean"
      ? parsed.hasCompletedInitialBirth
      : Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const hasCompletedCurrentBirth =
    typeof parsed.hasCompletedCurrentBirth === "boolean"
      ? parsed.hasCompletedCurrentBirth
      : hasCompletedInitialBirth && Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const shouldQueueEndEvent =
    isEndLevel(resolvedLevel.level, table) &&
    hasCompletedCurrentBirth &&
    Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const rawDiscovered = Array.isArray(parsed.discoveredMonsterIds) ? parsed.discoveredMonsterIds : [];
  const normalizedActiveTasks = normalizeActiveTasks(parsed.activeTasks, initial.activeTasks);
  const normalizedPendingDailyReview = normalizePendingDailyReview(parsed.pendingDailyReview);
  const ownedBackgroundIds = uniqueStrings(
    Array.isArray(parsed.ownedBackgroundIds) ? parsed.ownedBackgroundIds : initial.ownedBackgroundIds
  );
  const selectedBackgroundId =
    typeof parsed.selectedBackgroundId === "string" && ownedBackgroundIds.includes(parsed.selectedBackgroundId)
      ? parsed.selectedBackgroundId
      : ownedBackgroundIds[0] ?? initial.selectedBackgroundId;
  const ownedFrameIds = uniqueStrings(Array.isArray(parsed.ownedFrameIds) ? parsed.ownedFrameIds : initial.ownedFrameIds);
  const selectedFrameId =
    parsed.selectedFrameId === ""
      ? ""
      : typeof parsed.selectedFrameId === "string" && ownedFrameIds.includes(parsed.selectedFrameId)
      ? parsed.selectedFrameId
      : initial.selectedFrameId;
  const ownedDecorationIds = uniqueStrings(Array.isArray(parsed.ownedDecorationIds) ? parsed.ownedDecorationIds : initial.ownedDecorationIds);
  const selectedDecorationIds = uniqueStrings(
    Array.isArray(parsed.selectedDecorationIds)
      ? parsed.selectedDecorationIds.filter((itemId) => ownedDecorationIds.includes(itemId))
      : initial.selectedDecorationIds
  );
  const ownedCharmItemCounts = normalizeCharmCounts(parsed.ownedCharmItemCounts);
  const ownedPaidCharmItemCounts = normalizePaidCharmCounts(parsed.ownedPaidCharmItemCounts);
  const ownedBoosterItemCounts = normalizeBoosterCounts(parsed.ownedBoosterItemCounts);
  const activeAttributeCharm = normalizeActiveAttributeCharm(parsed.activeAttributeCharm);
  const activeExpBooster = normalizeActiveExpBooster(parsed.activeExpBooster);
  const eventStates = normalizeEventStates(parsed.eventStates);

  return {
    ...initial,
    ...parsed,
    currentMonsterLevel: resolvedLevel.level,
    currentMonsterExp: totalExp,
    freeCoins: typeof parsed.freeCoins === "number" ? Math.max(0, parsed.freeCoins) : initial.freeCoins,
    paidCoinBalance: typeof parsed.paidCoinBalance === "number" ? Math.max(0, parsed.paidCoinBalance) : initial.paidCoinBalance,
    ownedBackgroundIds: ownedBackgroundIds.length > 0 ? ownedBackgroundIds : initial.ownedBackgroundIds,
    selectedBackgroundId,
    ownedFrameIds: ownedFrameIds.length > 0 ? ownedFrameIds : initial.ownedFrameIds,
    selectedFrameId,
    ownedDecorationIds,
    selectedDecorationIds,
    ownedCharmItemCounts,
    ownedPaidCharmItemCounts,
    ownedBoosterItemCounts,
    activeAttributeCharm,
    activeExpBooster,
    queuedEggMonsterId:
      typeof parsed.queuedEggMonsterId === "number" && parsed.queuedEggMonsterId > 0 ? Math.floor(parsed.queuedEggMonsterId) : null,
    eventStates,
    lastLoginBonusDate: typeof parsed.lastLoginBonusDate === "string" ? parsed.lastLoginBonusDate : initial.lastLoginBonusDate,
    lastLoginBonusCoins: typeof parsed.lastLoginBonusCoins === "number" ? Math.max(0, parsed.lastLoginBonusCoins) : initial.lastLoginBonusCoins,
    attributeTotals: {
      ...initial.attributeTotals,
      ...(parsed.attributeTotals ?? {})
    },
    completedTaskIdsToday: Array.isArray(parsed.completedTaskIdsToday) ? parsed.completedTaskIdsToday : [],
    activeTasks: normalizedActiveTasks,
    discoveredMonsterIds: uniqueNumbers([
      ...initial.discoveredMonsterIds,
      ...rawDiscovered,
      Number(parsed.currentMonsterId ?? 1)
    ]),
    acquiredLetters: normalizeLetters(parsed.acquiredLetters),
    hasSeenTutorial: typeof parsed.hasSeenTutorial === "boolean" ? parsed.hasSeenTutorial : hasCompletedInitialBirth,
    isInTutorialFlow: typeof parsed.isInTutorialFlow === "boolean" ? parsed.isInTutorialFlow : false,
    onboardingCompletedTaskCount:
      typeof parsed.onboardingCompletedTaskCount === "number"
        ? parsed.onboardingCompletedTaskCount
        : hasCompletedInitialBirth
          ? 3
          : 0,
    birthEventPending: typeof parsed.birthEventPending === "boolean" ? parsed.birthEventPending : false,
    hasCompletedInitialBirth,
    hasCompletedCurrentBirth,
    endEventPending: typeof parsed.endEventPending === "boolean" ? parsed.endEventPending || shouldQueueEndEvent : shouldQueueEndEvent,
    pendingDailyReview: normalizedPendingDailyReview
  };
}

function resolveActiveExpBooster(state: GameState): ActiveExpBooster | null {
  if (!state.activeExpBooster) return null;
  if (new Date(state.activeExpBooster.expiresAt).getTime() <= Date.now()) {
    return null;
  }
  return state.activeExpBooster;
}

function applyExpBoost(baseExp: number, booster: ActiveExpBooster | null): number {
  if (!booster) return baseExp;
  return Math.ceil(baseExp * (1 + booster.boostRate));
}

function buildPendingDailyReview(state: GameState): PendingDailyReview | null {
  if (!state.hasSeenTutorial || state.isInTutorialFlow || !state.hasCompletedCurrentBirth) {
    return null;
  }

  const activeTaskIds = state.activeTasks
    .filter((task) => task.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task) => task.taskId);
  const taskIds = activeTaskIds.filter((taskId) => !state.completedTaskIdsToday.includes(taskId));

  if (taskIds.length === 0) return null;

  return {
    targetDate: state.lastPlayedDate,
    taskIds,
    resolvedTaskIds: [],
    rewardedTaskIds: []
  };
}

function applyDailyReset(state: GameState): GameState {
  const today = todayLocalDate();
  if (state.lastPlayedDate === today) return state;

  const dayDiff = diffDays(state.lastPlayedDate, today);
  const nextStreakDays = dayDiff === 1 ? Math.max(1, state.streakDays) + 1 : 1;
  const pendingDailyReview = buildPendingDailyReview(state);
  const loginBonusCoins = FREE_COINS_PER_DAILY_LOGIN;
  const resetState = {
    ...state,
    freeCoins: state.freeCoins + loginBonusCoins,
    todayExp: 0,
    completedTaskIdsToday: [],
    streakDays: nextStreakDays,
    lastPlayedDate: today,
    lastLoginBonusDate: today,
    lastLoginBonusCoins: loginBonusCoins,
    pendingDailyReview
  };

  return applyEventLoginBonuses(resetState, today);
}

export function refreshGameStateForToday(state: GameState): GameState {
  const today = todayLocalDate();
  if (state.lastPlayedDate !== today) {
    return applyDailyReset(state);
  }

  return applyEventLoginBonuses(state, today);
}

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGameState(
  tasks: TaskMaster[],
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): GameState {
  if (typeof window === "undefined") return buildInitialState(tasks);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const normalized = normalizeState(parsed, tasks, levelingRows);
    const resetApplied = applyDailyReset(normalized);
    saveGameState(resetApplied);
    return resetApplied;
  } catch {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }
}

export function hydrateGameState(
  parsed: Partial<GameState> | null | undefined,
  tasks: TaskMaster[],
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): GameState {
  const normalized = normalizeState(parsed ?? {}, tasks, levelingRows);
  const resetApplied = applyDailyReset(normalized);
  saveGameState(resetApplied);
  return resetApplied;
}

function applyExpAndAttributes(
  state: GameState,
  task: TaskMaster,
  levelingRows: LevelingMaster[],
  options?: {
    includeTodayExp?: boolean;
    markCompletedToday?: boolean;
  }
): GameState {
  const table = normalizeLevelingMaster(levelingRows);
  const activeExpBooster = resolveActiveExpBooster(state);
  const gainedExp = applyExpBoost(task.baseExp, activeExpBooster);
  const totalExp = state.currentMonsterExp + gainedExp;
  const resolvedLevel = resolveLevelFromExp(totalExp, table);
  const includeTodayExp = options?.includeTodayExp ?? true;
  const markCompletedToday = options?.markCompletedToday ?? true;
  const gains = resolveAttributeGains(task, state.activeAttributeCharm);
  const nextActiveCharm =
    state.activeAttributeCharm && state.activeAttributeCharm.remainingUses > 1
      ? { ...state.activeAttributeCharm, remainingUses: state.activeAttributeCharm.remainingUses - 1 }
      : null;

  return {
    ...state,
    currentMonsterLevel: resolvedLevel.level,
    currentMonsterExp: totalExp,
    freeCoins: state.freeCoins + FREE_COINS_PER_TASK,
    todayExp: includeTodayExp ? state.todayExp + gainedExp : state.todayExp,
    attributeTotals: {
      power: state.attributeTotals.power + gains.power,
      heal: state.attributeTotals.heal + gains.heal,
      knowledge: state.attributeTotals.knowledge + gains.knowledge,
      create: state.attributeTotals.create + gains.create
    },
    completedTaskIdsToday: markCompletedToday ? [...state.completedTaskIdsToday, task.taskId] : state.completedTaskIdsToday,
    activeAttributeCharm: nextActiveCharm,
    activeExpBooster
  };
}

function applyInitialBirthProgress(state: GameState, monsters: MonsterMaster[]): GameState {
  if (state.hasCompletedCurrentBirth) return state;

  const onboardingCompletedTaskCount = state.onboardingCompletedTaskCount + 1;
  if (onboardingCompletedTaskCount < 3) {
    return {
      ...state,
      onboardingCompletedTaskCount
    };
  }

  const birthMonsterId = resolveBirthMonsterId(state.attributeTotals, monsters) ?? state.currentMonsterId;
  return {
    ...state,
    onboardingCompletedTaskCount,
    birthEventPending: true,
    currentMonsterId: birthMonsterId,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, birthMonsterId])
  };
}

export function reconcileMonsterProgress(params: {
  state: GameState;
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
}): GameState {
  const { state, monsters, levelingRows } = params;
  let nextState = state;

  if (nextState.hasCompletedCurrentBirth) {
    while (true) {
      const nextMonsterId = evaluateEvolution({ gameState: nextState, monsters });
      if (!nextMonsterId || nextMonsterId === nextState.currentMonsterId) {
        break;
      }

      nextState = {
        ...nextState,
        currentMonsterId: nextMonsterId,
        discoveredMonsterIds: uniqueNumbers([...nextState.discoveredMonsterIds, nextMonsterId])
      };
    }
  }

  if (nextState.hasCompletedCurrentBirth && isEndLevel(nextState.currentMonsterLevel, levelingRows) && nextState.currentMonsterId !== 1) {
    nextState = {
      ...nextState,
      endEventPending: true
    };
  }

  return nextState;
}

function applyEvolutionAndEndChecks(
  state: GameState,
  previousLevel: number,
  previousMonsterId: number,
  monsters: MonsterMaster[],
  levelingRows: LevelingMaster[]
): { nextState: GameState; levelUp: boolean; evolved: boolean } {
  let nextState = state;
  const didLevelUp = nextState.currentMonsterLevel > previousLevel;

  if (nextState.hasCompletedCurrentBirth && didLevelUp) {
    const nextMonsterId = evaluateEvolution({ gameState: nextState, monsters });
    if (nextMonsterId && nextMonsterId !== nextState.currentMonsterId) {
      nextState = {
        ...nextState,
        currentMonsterId: nextMonsterId,
        discoveredMonsterIds: uniqueNumbers([...nextState.discoveredMonsterIds, nextMonsterId])
      };
    }
  }

  if (nextState.hasCompletedCurrentBirth && didLevelUp && isEndLevel(nextState.currentMonsterLevel, levelingRows)) {
    nextState = {
      ...nextState,
      endEventPending: true
    };
  }

  return {
    nextState,
    levelUp: didLevelUp,
    evolved: nextState.currentMonsterId !== previousMonsterId
  };
}

// Complete-task state update is centralized here.
export function completeTask(params: {
  state: GameState;
  task: TaskMaster;
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
}): CompleteTaskResult {
  const { state, task, monsters, levelingRows } = params;

  if (state.completedTaskIdsToday.includes(task.taskId)) {
    return {
      nextState: state,
      gainedExp: 0,
      gainedFreeCoins: 0,
      gainedAttributes: { power: 0, heal: 0, knowledge: 0, create: 0 },
      alreadyCompleted: true,
      evolved: false,
      levelUp: false,
      previousMonsterId: state.currentMonsterId,
      nextMonsterId: state.currentMonsterId
    };
  }

  const previousLevel = state.currentMonsterLevel;
  const previousMonsterId = state.currentMonsterId;

  let nextState = applyExpAndAttributes(state, task, levelingRows);
  nextState = applyEventTaskCompletionProgress(nextState);
  nextState = applyInitialBirthProgress(nextState, monsters);
  const progressResult = applyEvolutionAndEndChecks(nextState, previousLevel, previousMonsterId, monsters, levelingRows);
  nextState = progressResult.nextState;

  return {
    nextState,
    gainedExp: applyExpBoost(task.baseExp, resolveActiveExpBooster(state)),
    gainedFreeCoins: FREE_COINS_PER_TASK,
    gainedAttributes: {
      ...resolveAttributeGains(task, state.activeAttributeCharm)
    },
    alreadyCompleted: false,
    evolved: progressResult.evolved,
    levelUp: progressResult.levelUp,
    previousMonsterId,
    nextMonsterId: nextState.currentMonsterId
  };
}

export function resolveDailyReviewTask(params: {
  state: GameState;
  task: TaskMaster;
  didComplete: boolean;
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
}): DailyReviewResolveResult {
  const { state, task, didComplete, monsters, levelingRows } = params;
  const pending = state.pendingDailyReview;

  if (!pending || !pending.taskIds.includes(task.taskId) || pending.resolvedTaskIds.includes(task.taskId)) {
    return {
      nextState: state,
      resolved: false,
      rewarded: false,
      gainedExp: 0,
      gainedFreeCoins: 0,
      gainedAttributes: { power: 0, heal: 0, knowledge: 0, create: 0 },
      evolved: false,
      levelUp: false,
      previousMonsterId: state.currentMonsterId,
      nextMonsterId: state.currentMonsterId
    };
  }

  const previousLevel = state.currentMonsterLevel;
  const previousMonsterId = state.currentMonsterId;
  let nextState: GameState = {
    ...state,
    pendingDailyReview: {
      ...pending,
      resolvedTaskIds: uniqueNumbers([...pending.resolvedTaskIds, task.taskId])
    }
  };

  if (!didComplete) {
    return {
      nextState,
      resolved: true,
      rewarded: false,
      gainedExp: 0,
      gainedFreeCoins: 0,
      gainedAttributes: { power: 0, heal: 0, knowledge: 0, create: 0 },
      evolved: false,
      levelUp: false,
      previousMonsterId,
      nextMonsterId: nextState.currentMonsterId
    };
  }

  nextState = applyExpAndAttributes(nextState, task, levelingRows, {
    includeTodayExp: false,
    markCompletedToday: false
  });
  nextState = applyEventTaskCompletionProgress(nextState);
  const progressResult = applyEvolutionAndEndChecks(nextState, previousLevel, previousMonsterId, monsters, levelingRows);
  nextState = {
    ...progressResult.nextState,
    pendingDailyReview: progressResult.nextState.pendingDailyReview
      ? {
          ...progressResult.nextState.pendingDailyReview,
          rewardedTaskIds: uniqueNumbers([...progressResult.nextState.pendingDailyReview.rewardedTaskIds, task.taskId])
        }
      : progressResult.nextState.pendingDailyReview
  };

  return {
    nextState,
    resolved: true,
    rewarded: true,
    gainedExp: applyExpBoost(task.baseExp, resolveActiveExpBooster(state)),
    gainedFreeCoins: FREE_COINS_PER_TASK,
    gainedAttributes: {
      ...resolveAttributeGains(task, state.activeAttributeCharm)
    },
    evolved: progressResult.evolved,
    levelUp: progressResult.levelUp,
    previousMonsterId,
    nextMonsterId: nextState.currentMonsterId
  };
}

export function addTaskToActive(state: GameState, taskId: number): AddTaskResult {
  const activeEnabled = state.activeTasks.filter((t) => t.enabled);
  if (activeEnabled.some((t) => t.taskId === taskId)) {
    return { nextState: state, added: false, reason: "already_active" };
  }
  if (activeEnabled.length >= MAX_ACTIVE_TASKS) {
    return { nextState: state, added: false, reason: "max_reached" };
  }

  const nextSortOrder = Math.max(0, ...state.activeTasks.map((t) => t.sortOrder)) + 1;
  return {
    nextState: {
      ...state,
      activeTasks: [...state.activeTasks, { taskId, sortOrder: nextSortOrder, enabled: true }]
    },
    added: true
  };
}

export function removeTaskFromActive(state: GameState, taskId: number): RemoveTaskResult {
  const activeEnabled = sortAndReindexActiveTasks(state.activeTasks);
  const found = activeEnabled.some((task) => task.taskId === taskId);
  if (!found) {
    return { nextState: state, removed: false, reason: "not_found" };
  }
  if (activeEnabled.length <= MIN_ACTIVE_TASKS) {
    return { nextState: state, removed: false, reason: "min_reached" };
  }

  const nextActiveTasks = sortAndReindexActiveTasks(activeEnabled.filter((task) => task.taskId !== taskId));
  return {
    nextState: {
      ...state,
      activeTasks: nextActiveTasks,
      completedTaskIdsToday: state.completedTaskIdsToday.filter((id) => id !== taskId)
    },
    removed: true
  };
}

export function moveTaskInActive(
  state: GameState,
  taskId: number,
  direction: "up" | "down"
): ReorderTaskResult {
  const activeEnabled = sortAndReindexActiveTasks(state.activeTasks);
  const index = activeEnabled.findIndex((task) => task.taskId === taskId);
  if (index < 0) {
    return { nextState: state, moved: false, reason: "not_found" };
  }

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= activeEnabled.length) {
    return { nextState: state, moved: false, reason: "boundary" };
  }

  const before = activeEnabled.map((task) => ({ taskId: task.taskId, sortOrder: task.sortOrder }));
  const next = [...activeEnabled];
  const currentTask = next[index];
  next[index] = next[target];
  next[target] = currentTask;
  const reindexed = reindexActiveTasksInCurrentOrder(next);
  const after = reindexed.map((task) => ({ taskId: task.taskId, sortOrder: task.sortOrder }));

  console.debug("[task-reorder] moveTaskInActive", {
    taskId,
    direction,
    before,
    after
  });

  return {
    nextState: {
      ...state,
      activeTasks: reindexed
    },
    moved: true
  };
}

export function purchaseBackgroundItem(state: GameState, backgroundId: string, price: number): PurchaseShopItemResult {
  if (state.ownedBackgroundIds.includes(backgroundId)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  if (state.freeCoins < price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      freeCoins: state.freeCoins - price,
      ownedBackgroundIds: uniqueStrings([...state.ownedBackgroundIds, backgroundId])
    },
    purchased: true
  };
}

export function purchaseFrameItem(state: GameState, frameId: string, price: number): PurchaseShopItemResult {
  if (state.ownedFrameIds.includes(frameId)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  if (state.freeCoins < price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      freeCoins: state.freeCoins - price,
      ownedFrameIds: uniqueStrings([...state.ownedFrameIds, frameId])
    },
    purchased: true
  };
}

export function purchaseAttributeCharmItem(state: GameState, attribute: CharmAttribute): PurchaseCharmResult {
  if (state.freeCoins < ATTRIBUTE_CHARM_PRICE) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      freeCoins: state.freeCoins - ATTRIBUTE_CHARM_PRICE,
      ownedCharmItemCounts: {
        ...state.ownedCharmItemCounts,
        [attribute]: (state.ownedCharmItemCounts[attribute] ?? 0) + 1
      }
    },
    purchased: true
  };
}

export function purchasePaidAttributeCharmItem(state: GameState, attribute: CharmAttribute): PurchaseCharmResult {
  if (state.paidCoinBalance < PAID_ATTRIBUTE_CHARM_PRICE) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      paidCoinBalance: state.paidCoinBalance - PAID_ATTRIBUTE_CHARM_PRICE,
      ownedPaidCharmItemCounts: {
        ...state.ownedPaidCharmItemCounts,
        [attribute]: (state.ownedPaidCharmItemCounts[attribute] ?? 0) + 1
      }
    },
    purchased: true
  };
}

export function purchaseBoosterItem(state: GameState, itemId: string): PurchaseBoosterResult {
  const boosterItem = getBoosterShopItem(itemId);
  if (!boosterItem) {
    return { nextState: state, purchased: false, reason: "invalid_item" };
  }

  const hasEnoughCoins =
    boosterItem.currencyType === "free_coin"
      ? state.freeCoins >= boosterItem.price
      : state.paidCoinBalance >= boosterItem.price;

  if (!hasEnoughCoins) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      freeCoins: boosterItem.currencyType === "free_coin" ? state.freeCoins - boosterItem.price : state.freeCoins,
      paidCoinBalance: boosterItem.currencyType === "paid_coin" ? state.paidCoinBalance - boosterItem.price : state.paidCoinBalance,
      ownedBoosterItemCounts: {
        ...state.ownedBoosterItemCounts,
        [itemId]: (state.ownedBoosterItemCounts[itemId] ?? 0) + 1
      }
    },
    purchased: true
  };
}

export function purchasePaidBackgroundItem(state: GameState, itemId: string): PurchasePaidInventoryResult {
  const item = getPaidBackgroundShopItem(itemId);
  if (!item) {
    return { nextState: state, purchased: false, reason: "invalid_item" };
  }

  if (state.ownedBackgroundIds.includes(itemId)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  if (state.paidCoinBalance < item.price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      paidCoinBalance: state.paidCoinBalance - item.price,
      ownedBackgroundIds: uniqueStrings([...state.ownedBackgroundIds, itemId])
    },
    purchased: true
  };
}

export function purchasePaidFrameItem(state: GameState, itemId: string): PurchasePaidInventoryResult {
  const item = getPaidFrameShopItem(itemId);
  if (!item) {
    return { nextState: state, purchased: false, reason: "invalid_item" };
  }

  if (state.ownedFrameIds.includes(itemId)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  if (state.paidCoinBalance < item.price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      paidCoinBalance: state.paidCoinBalance - item.price,
      ownedFrameIds: uniqueStrings([...state.ownedFrameIds, itemId])
    },
    purchased: true
  };
}

export function purchaseDecorationItem(state: GameState, itemId: string): PurchasePaidInventoryResult {
  const item = getDecorationShopItem(itemId);
  if (!item) {
    return { nextState: state, purchased: false, reason: "invalid_item" };
  }

  if (state.ownedDecorationIds.includes(itemId)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  if (state.paidCoinBalance < item.price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  return {
    nextState: {
      ...state,
      paidCoinBalance: state.paidCoinBalance - item.price,
      ownedDecorationIds: uniqueStrings([...state.ownedDecorationIds, itemId])
    },
    purchased: true
  };
}

export function purchasePaidBundleItem(state: GameState, itemId: string): PurchasePaidInventoryResult {
  const item = getPaidBundleShopItem(itemId);
  if (!item) {
    return { nextState: state, purchased: false, reason: "invalid_item" };
  }

  if (state.paidCoinBalance < item.price) {
    return { nextState: state, purchased: false, reason: "insufficient_coins" };
  }

  if (item.bundleType === "spring_starter") {
    const eventConfig = getEventById("spring_easter_2026");
    if (!eventConfig || !isEventActive(eventConfig)) {
      return { nextState: state, purchased: false, reason: "event_not_available" };
    }
    const eventState = state.eventStates["spring_easter_2026"];
    const nextOwnedBackgroundIds = uniqueStrings([...state.ownedBackgroundIds, "spring_meadow"]);
    const nextOwnedFrameIds = uniqueStrings([...state.ownedFrameIds, "spring_sakura"]);

    return {
      nextState: {
        ...state,
        paidCoinBalance: state.paidCoinBalance - item.price,
        ownedBackgroundIds: nextOwnedBackgroundIds,
        ownedFrameIds: nextOwnedFrameIds,
        eventStates: {
          ...state.eventStates,
          spring_easter_2026: {
            ...eventState,
            purchasedEggCount: eventState.purchasedEggCount + 1,
            ownedEggCount: eventState.ownedEggCount + 1,
            updatedAt: new Date().toISOString()
          }
        }
      },
      purchased: true
    };
  }

  if (item.bundleType === "spring_deco") {
    const eventConfig = getEventById("spring_easter_2026");
    if (!eventConfig || !isEventActive(eventConfig)) {
      return { nextState: state, purchased: false, reason: "event_not_available" };
    }

    const eventState = state.eventStates["spring_easter_2026"];

    return {
      nextState: {
        ...state,
        paidCoinBalance: state.paidCoinBalance - item.price,
        ownedDecorationIds: uniqueStrings([
          ...state.ownedDecorationIds,
          "paid_deco_picnic_basket_01",
          "paid_deco_flower_lantern_01"
        ]),
        eventStates: {
          ...state.eventStates,
          spring_easter_2026: {
            ...eventState,
            purchasedEggCount: eventState.purchasedEggCount + 1,
            ownedEggCount: eventState.ownedEggCount + 1,
            updatedAt: new Date().toISOString()
          }
        }
      },
      purchased: true
    };
  }

  return { nextState: state, purchased: false, reason: "invalid_item" };
}

export function equipBackground(state: GameState, backgroundId: string): EquipBackgroundResult {
  if (!state.ownedBackgroundIds.includes(backgroundId)) {
    return { nextState: state, equipped: false, reason: "not_owned" };
  }

  if (state.selectedBackgroundId === backgroundId) {
    return { nextState: state, equipped: false, reason: "already_equipped" };
  }

  return {
    nextState: {
      ...state,
      selectedBackgroundId: backgroundId
    },
    equipped: true
  };
}

export function equipFrame(state: GameState, frameId: string): EquipFrameResult {
  if (!state.ownedFrameIds.includes(frameId)) {
    return { nextState: state, equipped: false, reason: "not_owned" };
  }

  if (state.selectedFrameId === frameId) {
    return { nextState: state, equipped: false, reason: "already_equipped" };
  }

  return {
    nextState: {
      ...state,
      selectedFrameId: frameId
    },
    equipped: true
  };
}

export function unequipFrame(state: GameState): EquipFrameResult {
  if (state.selectedFrameId === "") {
    return { nextState: state, equipped: false, reason: "already_equipped" };
  }

  return {
    nextState: {
      ...state,
      selectedFrameId: ""
    },
    equipped: true
  };
}

export function toggleDecoration(state: GameState, itemId: string): ToggleDecorationResult {
  if (!state.ownedDecorationIds.includes(itemId)) {
    return { nextState: state, toggled: false, active: false, reason: "not_owned" };
  }

  const isActive = state.selectedDecorationIds.includes(itemId);
  const nextSelectedDecorationIds = isActive
    ? state.selectedDecorationIds.filter((selectedId) => selectedId !== itemId)
    : uniqueStrings([...state.selectedDecorationIds, itemId]);

  return {
    nextState: {
      ...state,
      selectedDecorationIds: nextSelectedDecorationIds
    },
    toggled: true,
    active: !isActive
  };
}

export function unequipDecoration(state: GameState, itemId: string): ToggleDecorationResult {
  if (!state.ownedDecorationIds.includes(itemId)) {
    return { nextState: state, toggled: false, active: false, reason: "not_owned" };
  }

  if (!state.selectedDecorationIds.includes(itemId)) {
    return { nextState: state, toggled: false, active: false };
  }

  return {
    nextState: {
      ...state,
      selectedDecorationIds: state.selectedDecorationIds.filter((selectedId) => selectedId !== itemId)
    },
    toggled: true,
    active: false
  };
}

export function equipDecoration(state: GameState, itemId: string): ToggleDecorationResult {
  if (!state.ownedDecorationIds.includes(itemId)) {
    return { nextState: state, toggled: false, active: false, reason: "not_owned" };
  }

  if (state.selectedDecorationIds.includes(itemId)) {
    return { nextState: state, toggled: false, active: true };
  }

  return {
    nextState: {
      ...state,
      selectedDecorationIds: uniqueStrings([...state.selectedDecorationIds, itemId])
    },
    toggled: true,
    active: true
  };
}

export function useAttributeCharm(state: GameState, attribute: CharmAttribute, variant: "free" | "paid" = "free"): UseCharmResult {
  const ownedCount =
    variant === "paid"
      ? state.ownedPaidCharmItemCounts[attribute] ?? 0
      : state.ownedCharmItemCounts[attribute] ?? 0;
  const charmItem = getAttributeCharmItem(variant === "paid" ? `paid_charm_${attribute}_01` : `${attribute}_charm`);

  if (ownedCount <= 0 || !charmItem) {
    return { nextState: state, used: false, reason: "not_owned" };
  }

  const nextOwnedCharmItemCounts =
    variant === "paid"
      ? state.ownedCharmItemCounts
      : normalizeCharmCounts({
          ...state.ownedCharmItemCounts,
          [attribute]: ownedCount - 1
        });
  const nextOwnedPaidCharmItemCounts =
    variant === "paid"
      ? normalizePaidCharmCounts({
          ...state.ownedPaidCharmItemCounts,
          [attribute]: ownedCount - 1
        })
      : state.ownedPaidCharmItemCounts;

  return {
    nextState: {
      ...state,
      ownedCharmItemCounts: nextOwnedCharmItemCounts,
      ownedPaidCharmItemCounts: nextOwnedPaidCharmItemCounts,
      activeAttributeCharm: {
        itemId: charmItem.itemId,
        name: charmItem.title,
        attribute,
        remainingUses: variant === "paid" ? PAID_ATTRIBUTE_CHARM_USES : ATTRIBUTE_CHARM_USES,
        variant
      }
    },
    used: true
  };
}

export function useBoosterItem(state: GameState, itemId: string): UseBoosterResult {
  const boosterItem = getBoosterShopItem(itemId);
  if (!boosterItem) {
    return { nextState: state, used: false, reason: "invalid_item" };
  }

  const ownedCount = state.ownedBoosterItemCounts[itemId] ?? 0;
  if (ownedCount <= 0) {
    return { nextState: state, used: false, reason: "not_owned" };
  }

  const now = Date.now();
  const currentBooster = resolveActiveExpBooster(state);
  const baseTime =
    currentBooster && currentBooster.itemId === itemId
      ? Math.max(now, new Date(currentBooster.expiresAt).getTime())
      : now;
  const expiresAt = new Date(baseTime + boosterItem.durationMinutes * 60 * 1000).toISOString();

  return {
    nextState: {
      ...state,
      ownedBoosterItemCounts: normalizeBoosterCounts({
        ...state.ownedBoosterItemCounts,
        [itemId]: ownedCount - 1
      }),
      activeExpBooster: {
        itemId: boosterItem.itemId,
        name: boosterItem.title,
        boostRate: boosterItem.boostRate,
        durationMinutes: boosterItem.durationMinutes,
        expiresAt
      }
    },
    used: true
  };
}

export function getTaskLimitInfo(state: GameState): { min: number; max: number; current: number } {
  return {
    min: MIN_ACTIVE_TASKS,
    max: MAX_ACTIVE_TASKS,
    current: state.activeTasks.filter((t) => t.enabled).length
  };
}

export function finishBirthEvent(
  state: GameState,
  monsters: MonsterMaster[] = [],
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): GameState {
  const babyStartExp = getCumulativeExpForLevel(2, levelingRows);
  const currentMonster = monsters.find((monster) => monster.monsterId === state.currentMonsterId);
  const resolvedMonsterId =
    currentMonster?.stage === "egg"
      ? resolveEggEvolutionMonsterId(currentMonster, state.attributeTotals, monsters) ?? state.currentMonsterId
      : state.currentMonsterId;

  return {
    ...state,
    currentMonsterId: resolvedMonsterId,
    currentMonsterLevel: 2,
    currentMonsterExp: babyStartExp,
    todayExp: 0,
    birthEventPending: false,
    queuedEggMonsterId: null,
    hasCompletedInitialBirth: true,
    hasCompletedCurrentBirth: true,
    hasSeenTutorial: true,
    isInTutorialFlow: false,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, resolvedMonsterId])
  };
}

export function finishEndEvent(state: GameState, monsters: MonsterMaster[]): FinishEndEventResult {
  const currentMonster = monsters.find((monster) => monster.monsterId === state.currentMonsterId);
  const nextLetter = buildFarewellLetter(state, currentMonster);
  const nextEggMonsterId = state.queuedEggMonsterId ?? 1;

  return {
    ...state,
    currentMonsterId: nextEggMonsterId,
    currentMonsterLevel: 1,
    currentMonsterExp: 0,
    attributeTotals: {
      power: 0,
      heal: 0,
      knowledge: 0,
      create: 0
    },
    onboardingCompletedTaskCount: 0,
    birthEventPending: false,
    queuedEggMonsterId: null,
    hasCompletedCurrentBirth: false,
    endEventPending: false,
    isInTutorialFlow: false,
    pendingDailyReview: null,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, nextEggMonsterId]),
    acquiredLetters: [...state.acquiredLetters, nextLetter]
  };
}

export function markEventIntroPopupSeen(state: GameState, eventId: string): GameState {
  if (!getEventById(eventId)) return state;
  return updateEventState(state, eventId, (current) => ({
    ...current,
    hasSeenIntroPopup: true,
    updatedAt: new Date().toISOString()
  }));
}

export function claimEventFreeEgg(state: GameState, eventId: string): EventEggClaimResult {
  const eventConfig = getEventById(eventId);
  if (!eventConfig) {
    return { nextState: state, claimed: false, reason: "event_not_found" };
  }
  if (!isEventActive(eventConfig)) {
    return { nextState: state, claimed: false, reason: "event_inactive" };
  }

  const current = normalizeUserEventState(eventId, state.eventStates[eventId]);
  if (current.hasClaimedFreeEgg) {
    return { nextState: state, claimed: false, reason: "already_claimed" };
  }

  return {
    nextState: updateEventState(state, eventId, (eventState) => ({
      ...eventState,
      hasClaimedFreeEgg: true,
      ownedEggCount: eventState.ownedEggCount + eventConfig.freeEggClaimCount,
      claimedRewardIds: [...eventState.claimedRewardIds, "free_event_egg"],
      updatedAt: new Date().toISOString()
    })),
    claimed: true
  };
}

export function queueEventEgg(state: GameState, eventId: string): EventEggUseResult {
  const eventConfig = getEventById(eventId);
  if (!eventConfig) {
    return { nextState: state, used: false, reason: "event_not_found" };
  }

  const current = normalizeUserEventState(eventId, state.eventStates[eventId]);
  if (current.ownedEggCount <= 0) {
    return { nextState: state, used: false, reason: "no_egg" };
  }
  if (state.queuedEggMonsterId === eventConfig.freeEggMonsterId) {
    return { nextState: state, used: false, reason: "already_queued" };
  }

  let nextState = updateEventState(state, eventId, (eventState) => ({
    ...eventState,
    ownedEggCount: Math.max(0, eventState.ownedEggCount - 1),
    updatedAt: new Date().toISOString()
  }));

  nextState = {
    ...nextState,
    queuedEggMonsterId: eventConfig.freeEggMonsterId
  };

  return {
    nextState,
    used: true
  };
}

export function forceStartEventEgg(state: GameState, eventId: string, monsters: MonsterMaster[]): ForceStartEventEggResult {
  const eventConfig = getEventById(eventId);
  if (!eventConfig) {
    return { nextState: state, started: false, reason: "event_not_found" };
  }

  const current = normalizeUserEventState(eventId, state.eventStates[eventId]);
  if (current.ownedEggCount <= 0) {
    return { nextState: state, started: false, reason: "no_egg" };
  }

  if (state.currentMonsterId === eventConfig.freeEggMonsterId && state.birthEventPending) {
    return { nextState: state, started: false, reason: "already_active" };
  }

  const currentMonster = monsters.find((monster) => monster.monsterId === state.currentMonsterId);
  const nextLetter = buildFarewellLetter(state, currentMonster);

  const nextState = updateEventState(
    {
      ...state,
      currentMonsterId: eventConfig.freeEggMonsterId,
      currentMonsterLevel: 1,
      currentMonsterExp: 0,
      attributeTotals: {
        power: 0,
        heal: 0,
        knowledge: 0,
        create: 0
      },
      todayExp: 0,
      birthEventPending: true,
      queuedEggMonsterId: null,
      hasCompletedCurrentBirth: false,
      endEventPending: false,
      isInTutorialFlow: false,
      onboardingCompletedTaskCount: 0,
      discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, eventConfig.freeEggMonsterId]),
      acquiredLetters: [...state.acquiredLetters, nextLetter]
    },
    eventId,
    (eventState) => ({
      ...eventState,
      ownedEggCount: Math.max(0, eventState.ownedEggCount - 1),
      updatedAt: new Date().toISOString()
    })
  );

  return {
    nextState,
    started: true
  };
}

export function purchaseEventReward(state: GameState, eventId: string, itemId: string): PurchaseEventRewardResult {
  const eventConfig = getEventById(eventId);
  if (!eventConfig) {
    return { nextState: state, purchased: false, reason: "event_not_found" };
  }
  if (!isEventActive(eventConfig)) {
    return { nextState: state, purchased: false, reason: "event_inactive" };
  }

  const item = [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems].find((entry) => entry.itemId === itemId);
  if (!item) {
    return { nextState: state, purchased: false, reason: "item_not_found" };
  }

  const balance = getEventItemCurrencyBalance(state, item.currencyType);
  if (balance < item.price) {
    return {
      nextState: state,
      purchased: false,
      reason: item.currencyType === "paid_coin" ? "insufficient_paid_coins" : "insufficient_free_coins"
    };
  }

  if (item.rewardType === "background" && state.ownedBackgroundIds.includes(item.grantValue)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }
  if (item.rewardType === "frame" && state.ownedFrameIds.includes(item.grantValue)) {
    return { nextState: state, purchased: false, reason: "already_owned" };
  }

  let nextState = spendEventCurrency(state, item.currencyType, item.price);
  if (item.rewardType === "background") {
    nextState = {
      ...nextState,
      ownedBackgroundIds: uniqueStrings([...nextState.ownedBackgroundIds, item.grantValue])
    };
  } else if (item.rewardType === "frame") {
    nextState = {
      ...nextState,
      ownedFrameIds: uniqueStrings([...nextState.ownedFrameIds, item.grantValue])
    };
  } else {
    nextState = updateEventState(nextState, eventId, (eventState) => ({
      ...eventState,
      ownedEggCount: eventState.ownedEggCount + 1,
      purchasedEggCount: eventState.purchasedEggCount + 1,
      updatedAt: new Date().toISOString()
    }));
  }

  return {
    nextState,
    purchased: true
  };
}

export function startTutorialFlow(state: GameState): GameState {
  if (state.hasSeenTutorial) {
    return state;
  }
  return {
    ...state,
    isInTutorialFlow: true
  };
}

export function shouldRouteToDailyReview(state: GameState): boolean {
  return Boolean(state.pendingDailyReview && !state.pendingDailyReview.skippedAt && state.hasSeenTutorial && !state.isInTutorialFlow);
}

export function skipDailyReview(state: GameState): GameState {
  if (!state.pendingDailyReview) return state;
  return {
    ...state,
    pendingDailyReview: {
      ...state.pendingDailyReview,
      skippedAt: todayLocalDate()
    }
  };
}

export function finishDailyReview(state: GameState): GameState {
  if (!state.pendingDailyReview) return state;
  return {
    ...state,
    pendingDailyReview: null
  };
}

export function getInitialRoute(state: GameState): "/tutorial" | "/tasks" | "/birth-event" | "/end-event" | "/daily-review" | "/home" {
  if (state.endEventPending) return "/end-event";
  if (state.birthEventPending) return "/birth-event";
  if (shouldRouteToDailyReview(state)) return "/daily-review";
  if (!state.hasSeenTutorial) return state.isInTutorialFlow ? "/tasks" : "/tutorial";
  return "/home";
}

export function progressToNextLevel(
  level: number,
  totalExp: number,
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): { current: number; required: number; currentTotal: number; nextTotal: number | null } {
  return getLevelProgress(level, totalExp, levelingRows);
}
