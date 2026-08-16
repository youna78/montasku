"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/gtag";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadLevelingMaster } from "@/lib/csv/levelingMaster";
import { loadMonstersMaster } from "@/lib/csv/monstersMaster";
import { loadTasksMaster } from "@/lib/csv/tasksMaster";
import { loadCloudGameState, saveCloudGameState } from "@/lib/game/cloudState";
import { loadCloudEventStates, saveCloudEventStates } from "@/lib/game/cloudEvents";
import { getEventById } from "@/lib/game/events";
import { getMonsterImage, getMonsterMotionAsset } from "@/lib/game/assets";
import {
  appendCloudPurchaseHistory,
  loadCloudInventoryProfile,
  loadCloudWalletSummary,
  mergeCommerceIntoGameState,
  purchaseCloudPaidCharm,
  saveCloudCommerceState,
  spendCloudPaidCoins
} from "@/lib/game/cloudCommerce";
import {
  addTaskToActive,
  completeTask as runCompleteTask,
  equipBackground as runEquipBackground,
  equipFrame as runEquipFrame,
  unequipFrame as runUnequipFrame,
  equipDecoration as runEquipDecoration,
  finishEndEvent as runFinishEndEvent,
  finishBirthEvent as runFinishBirthEvent,
  finishDailyReview as runFinishDailyReview,
  hydrateGameState,
  claimEventFreeEgg as runClaimEventFreeEgg,
  forceStartEventEgg as runForceStartEventEgg,
  loadGameState,
  markEventIntroPopupSeen as runMarkEventIntroPopupSeen,
  moveTaskInActive,
  purchaseEventReward as runPurchaseEventReward,
  queueEventEgg as runQueueEventEgg,
  reconcileMonsterProgress,
  resolveDailyReviewTask as runResolveDailyReviewTask,
  removeTaskFromActive,
  purchaseBackgroundItem as runPurchaseBackgroundItem,
  purchaseAttributeCharmItem as runPurchaseAttributeCharmItem,
  purchaseBoosterItem as runPurchaseBoosterItem,
  purchaseDecorationItem as runPurchaseDecorationItem,
  purchaseFrameItem as runPurchaseFrameItem,
  purchasePaidBackgroundItem as runPurchasePaidBackgroundItem,
  purchasePaidBundleItem as runPurchasePaidBundleItem,
  purchasePaidFrameItem as runPurchasePaidFrameItem,
  purchasePaidAttributeCharmItem as runPurchasePaidAttributeCharmItem,
  refreshGameStateForToday as runRefreshGameStateForToday,
  saveGameState,
  skipDailyReview as runSkipDailyReview,
  startTutorialFlow as runStartTutorialFlow,
  toggleDecoration as runToggleDecoration,
  unequipDecoration as runUnequipDecoration,
  useAttributeCharm as runUseAttributeCharm,
  useBoosterItem as runUseBoosterItem,
  type AddTaskResult,
  type CompleteTaskResult,
  type DailyReviewResolveResult,
  type EquipBackgroundResult,
  type EquipFrameResult,
  type EventEggClaimResult,
  type ForceStartEventEggResult,
  type EventEggUseResult,
  type RemoveTaskResult,
  type PurchaseCharmResult,
  type PurchaseBoosterResult,
  type PurchasePaidInventoryResult,
  type PurchaseEventRewardResult,
  type PurchaseShopItemResult,
  type ReorderTaskResult,
  type ToggleDecorationResult,
  type UseBoosterResult,
  type UseCharmResult
} from "@/lib/game/state";
import type { CharmAttribute, GameState } from "@/types/game";
import { getBoosterShopItem, getDecorationShopItem, getPaidBackgroundShopItem, getPaidBundleShopItem, getPaidFrameShopItem } from "@/lib/game/shop";
import type { PurchaseHistoryRecord } from "@/types/commerce";
import type { LevelingMaster, MonsterMaster, TaskMaster } from "@/types/master";

type GameMasters = {
  tasks: TaskMaster[];
  levelingRows: LevelingMaster[];
  monsters: MonsterMaster[];
};

let gameMastersPromise: Promise<GameMasters> | null = null;
let hydratedUserUidThisSession: string | null = null;

function getStateUpdatedAtMs(state: Partial<GameState> | null | undefined): number {
  if (!state?.stateUpdatedAt) return 0;
  const timestamp = new Date(state.stateUpdatedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeNewestEventStates(
  localStates: GameState["eventStates"],
  cloudStates: GameState["eventStates"]
): GameState["eventStates"] {
  const merged = { ...localStates };
  for (const [eventId, cloudState] of Object.entries(cloudStates)) {
    const localState = merged[eventId];
    const localTime = localState?.updatedAt ? new Date(localState.updatedAt).getTime() : 0;
    const cloudTime = cloudState.updatedAt ? new Date(cloudState.updatedAt).getTime() : 0;
    if (!localState || !Number.isFinite(localTime) || cloudTime >= localTime) {
      merged[eventId] = cloudState;
    }
  }
  return merged;
}

function loadGameMasters(): Promise<GameMasters> {
  if (!gameMastersPromise) {
    gameMastersPromise = Promise.all([
      loadTasksMaster(),
      loadLevelingMaster(),
      loadMonstersMaster()
    ])
      .then(([tasks, levelingRows, monsters]) => ({ tasks, levelingRows, monsters }))
      .catch((error) => {
        gameMastersPromise = null;
        throw error;
      });
  }
  return gameMastersPromise;
}

async function preloadMonsterAssets(monsterId: number): Promise<void> {
  if (typeof window === "undefined") return;

  const paths = new Set<string>([getMonsterImage(monsterId)]);
  for (const kind of ["walk", "happy", "sway"] as const) {
    const motionAsset = getMonsterMotionAsset(monsterId, kind);
    if (motionAsset) paths.add(motionAsset.imagePath);
  }

  await Promise.all(
    [...paths].map(
      (path) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          const finish = () => resolve();
          const timeout = window.setTimeout(finish, 3000);
          image.onload = () => {
            window.clearTimeout(timeout);
            finish();
          };
          image.onerror = () => {
            window.clearTimeout(timeout);
            finish();
          };
          image.src = path;
          if (image.complete) {
            window.clearTimeout(timeout);
            finish();
          }
        })
    )
  );
}

type UseGameResult = {
  tasks: TaskMaster[];
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
  gameState: GameState | null;
  isLoading: boolean;
  completeTask: (taskId: number) => CompleteTaskResult | null;
  addTask: (taskId: number) => AddTaskResult | null;
  removeTask: (taskId: number) => RemoveTaskResult | null;
  moveTask: (taskId: number, direction: "up" | "down") => ReorderTaskResult | null;
  purchaseBackground: (backgroundId: string, price: number) => PurchaseShopItemResult | null;
  equipBackground: (backgroundId: string) => EquipBackgroundResult | null;
  purchaseFrame: (frameId: string, price: number) => PurchaseShopItemResult | null;
  equipFrame: (frameId: string) => EquipFrameResult | null;
  unequipFrame: () => EquipFrameResult | null;
  purchaseAttributeCharm: (attribute: CharmAttribute) => PurchaseCharmResult | null;
  purchasePaidAttributeCharm: (attribute: CharmAttribute) => Promise<PurchaseCharmResult | null>;
  useAttributeCharm: (attribute: CharmAttribute, variant?: "free" | "paid") => UseCharmResult | null;
  purchaseBooster: (itemId: string) => PurchaseBoosterResult | null;
  purchasePaidBackground: (itemId: string) => PurchasePaidInventoryResult | null;
  purchasePaidFrame: (itemId: string) => PurchasePaidInventoryResult | null;
  purchasePaidBundle: (itemId: string) => PurchasePaidInventoryResult | null;
  purchaseDecoration: (itemId: string) => PurchasePaidInventoryResult | null;
  equipDecoration: (itemId: string) => ToggleDecorationResult | null;
  toggleDecoration: (itemId: string) => ToggleDecorationResult | null;
  unequipDecoration: (itemId: string) => ToggleDecorationResult | null;
  useBooster: (itemId: string) => UseBoosterResult | null;
  resolveDailyReviewTask: (taskId: number, didComplete: boolean) => DailyReviewResolveResult | null;
  skipDailyReview: () => Promise<void>;
  finishDailyReview: () => Promise<void>;
  startTutorialFlow: () => void;
  finishBirthEvent: () => void;
  finishEndEvent: () => Promise<void>;
  claimEventFreeEgg: (eventId: string) => EventEggClaimResult | null;
  queueEventEgg: (eventId: string) => EventEggUseResult | null;
  forceStartEventEgg: (eventId: string) => ForceStartEventEggResult | null;
  purchaseEventReward: (eventId: string, itemId: string) => Promise<PurchaseEventRewardResult | null>;
  markEventIntroPopupSeen: (eventId: string) => void;
  waitForPendingSave: () => Promise<void>;
};

export function useGame(): UseGameResult {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskMaster[]>([]);
  const [monsters, setMonsters] = useState<MonsterMaster[]>([]);
  const [levelingRows, setLevelingRows] = useState<LevelingMaster[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const gameStateRef = useRef<GameState | null>(null);
  const pendingSaveRef = useRef<Promise<void>>(Promise.resolve());

  const buildPurchaseHistoryRecord = useCallback(
    (params: {
      productId: string;
      productType: string;
      grantedItemIds: string[];
      amountTotalMinor: number;
      currencyType: PurchaseHistoryRecord["currencyType"];
    }): PurchaseHistoryRecord => {
      const purchaseId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      return {
        purchaseId,
        platform: "web",
        channel: "in_app_shop",
        status: "fulfilled",
        productId: params.productId,
        productType: params.productType,
        quantity: 1,
        grantedPaidCoins: 0,
        grantedItemIds: params.grantedItemIds,
        currencyType: params.currencyType,
        amountTotalMinor: params.amountTotalMinor,
        purchasedAt: new Date().toISOString(),
        fulfilledAt: new Date().toISOString(),
        stripePaymentLinkId: null,
        stripeCheckoutSessionId: null,
        idempotencyKey: purchaseId
      };
    },
    []
  );

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      let localState: GameState | null = null;
      try {
        const {
          tasks: loadedTasks,
          levelingRows: loadedLeveling,
          monsters: loadedMonsters
        } = await loadGameMasters();
        localState = loadGameState(loadedTasks, loadedLeveling);
        let loadedState = localState;
        let shouldMarkMigrated = false;
        const canRenderLocalState = !user || hydratedUserUidThisSession === user.uid;

        if (cancelled) return;
        setTasks(loadedTasks);
        setLevelingRows(loadedLeveling);
        setMonsters(loadedMonsters);
        await preloadMonsterAssets(localState.currentMonsterId);
        if (cancelled) return;
        if (canRenderLocalState) {
          setGameState(localState);
          gameStateRef.current = localState;
          setIsLoading(false);
        }

        if (user) {
          const [cloudState, cloudWallet, cloudInventory, cloudEventStates] = await Promise.all([
            loadCloudGameState(user.uid),
            loadCloudWalletSummary(user.uid),
            loadCloudInventoryProfile(user.uid),
            loadCloudEventStates(user.uid)
          ]);
          if (cloudState) {
            const mergedCloudEventStates = {
              ...(cloudState.eventStates ?? {}),
              ...cloudEventStates
            };
            const shouldPreferLocalState =
              hydratedUserUidThisSession === user.uid &&
              getStateUpdatedAtMs(localState) > getStateUpdatedAtMs(cloudState);
            const baseState = shouldPreferLocalState ? localState : cloudState;
            loadedState = hydrateGameState(
              {
                ...baseState,
                eventStates: mergeNewestEventStates(localState.eventStates, mergedCloudEventStates)
              },
              loadedTasks,
              loadedLeveling
            );
          } else {
            shouldMarkMigrated = true;
            loadedState = hydrateGameState(
              {
                ...localState,
                eventStates: {
                  ...localState.eventStates,
                  ...cloudEventStates
                }
              },
              loadedTasks,
              loadedLeveling
            );
          }

          loadedState = mergeCommerceIntoGameState(loadedState, cloudWallet, cloudInventory);
        }

        const reconciledState = reconcileMonsterProgress({
          state: loadedState,
          monsters: loadedMonsters,
          levelingRows: loadedLeveling
        });
        await preloadMonsterAssets(reconciledState.currentMonsterId);
        if (cancelled) return;

        setGameState(reconciledState);
        gameStateRef.current = reconciledState;
        saveGameState(reconciledState);
        if (user) hydratedUserUidThisSession = user.uid;

        if (user) {
          void saveCloudGameState(
            user.uid,
            reconciledState,
            shouldMarkMigrated ? { migratedFromLocal: true } : undefined
          ).catch((error) => {
            console.error("[useGame] failed to save initialized cloud state", error);
          });
          void saveCloudCommerceState(user.uid, reconciledState).catch((error) => {
            console.error("[useGame] failed to save initialized commerce state", error);
          });
          void saveCloudEventStates(user.uid, reconciledState.eventStates).catch((error) => {
            console.error("[useGame] failed to save initialized event state", error);
          });
        }
      } catch (taskError) {
        console.error("[useGame] failed to initialize game", taskError);
        if (localState && !cancelled) {
          setGameState(localState);
          gameStateRef.current = localState;
          saveGameState(localState);
        } else if (!cancelled) {
          const fallbackState = loadGameState([]);
          setTasks([]);
          setMonsters([]);
          setLevelingRows([]);
          setGameState(fallbackState);
          gameStateRef.current = fallbackState;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init().catch((unexpectedError) => {
      console.error("[useGame] unexpected init error", unexpectedError);
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (typeof window === "undefined" || !gameState) return;
    if (!gameState.lastLoginBonusDate || gameState.lastLoginBonusDate !== gameState.lastPlayedDate) return;
    if (gameState.lastLoginBonusCoins <= 0) return;

    const storageKey = `montasku-login-bonus-tracked:${gameState.lastLoginBonusDate}`;
    if (window.sessionStorage.getItem(storageKey)) return;

    trackEvent("coin_earned", {
      source: "daily_login_bonus",
      amount: gameState.lastLoginBonusCoins
    });
    window.sessionStorage.setItem(storageKey, "1");
  }, [gameState]);

  const commitState = useCallback(async (next: GameState): Promise<void> => {
    const updatedState: GameState = {
      ...next,
      stateUpdatedAt: new Date().toISOString()
    };
    gameStateRef.current = updatedState;
    setGameState(updatedState);
    saveGameState(updatedState);
    if (user) {
      pendingSaveRef.current = pendingSaveRef.current.then(async () => {
        await Promise.all([
          saveCloudGameState(user.uid, updatedState).catch((error) => {
            console.error("[useGame] failed to save cloud game state", error);
          }),
          saveCloudCommerceState(user.uid, updatedState).catch((error) => {
            console.error("[useGame] failed to save cloud commerce state", error);
          }),
          saveCloudEventStates(user.uid, updatedState.eventStates).catch((error) => {
            console.error("[useGame] failed to save cloud event state", error);
          })
        ]);
      });
      await pendingSaveRef.current;
    }
  }, [user]);

  const waitForPendingSave = useCallback(async () => {
    await pendingSaveRef.current;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncTodayState = () => {
      const current = gameStateRef.current;
      if (!current) return;
      const refreshed = runRefreshGameStateForToday(current);
      const next =
        monsters.length > 0
          ? reconcileMonsterProgress({ state: refreshed, monsters, levelingRows })
          : refreshed;
      if (next === current) return;
      commitState(next);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTodayState();
      }
    };

    window.addEventListener("focus", syncTodayState);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", syncTodayState);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [commitState, levelingRows, monsters]);

  const completeTask = useCallback(
    (taskId: number): CompleteTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) return null;

      const result = runCompleteTask({ state: current, task, monsters, levelingRows });
      commitState(result.nextState);
      if (!result.alreadyCompleted) {
        trackEvent("task_complete", {
          task_id: taskId,
          source: "task_button",
          exp: result.gainedExp,
          free_coins: result.gainedFreeCoins,
          level_up: result.levelUp,
          evolved: result.evolved,
          tutorial: !current.hasSeenTutorial || current.isInTutorialFlow,
          monster_id: current.currentMonsterId
        });
        if (result.evolved) {
          trackEvent("monster_evolved", {
            previous_monster_id: result.previousMonsterId,
            next_monster_id: result.nextMonsterId,
            level: result.nextState.currentMonsterLevel
          });
        }
      }
      return result;
    },
    [commitState, monsters, tasks, levelingRows]
  );

  const addTask = useCallback(
    (taskId: number): AddTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = addTaskToActive(current, taskId);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const removeTask = useCallback(
    (taskId: number): RemoveTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = removeTaskFromActive(current, taskId);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const moveTask = useCallback(
    (taskId: number, direction: "up" | "down"): ReorderTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = moveTaskInActive(current, taskId, direction);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const purchaseBackground = useCallback(
    (backgroundId: string, price: number): PurchaseShopItemResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseBackgroundItem(current, backgroundId, price);
      commitState(result.nextState);
      if (user && result.purchased) {
        const record = buildPurchaseHistoryRecord({
          productId: backgroundId,
          productType: "background",
          grantedItemIds: [backgroundId],
          amountTotalMinor: price,
          currencyType: "free_coin"
        });
        void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
          console.error("[useGame] failed to save background purchase history", error);
        });
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const equipBackground = useCallback(
    (backgroundId: string): EquipBackgroundResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runEquipBackground(current, backgroundId);
      commitState(result.nextState);
      if (result.equipped) {
        trackEvent("item_equipped", {
          item_id: backgroundId,
          item_type: "background"
        });
      }
      return result;
    },
    [commitState]
  );

  const purchaseFrame = useCallback(
    (frameId: string, price: number): PurchaseShopItemResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseFrameItem(current, frameId, price);
      commitState(result.nextState);
      if (user && result.purchased) {
        const record = buildPurchaseHistoryRecord({
          productId: frameId,
          productType: "frame",
          grantedItemIds: [frameId],
          amountTotalMinor: price,
          currencyType: "free_coin"
        });
        void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
          console.error("[useGame] failed to save frame purchase history", error);
        });
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchaseAttributeCharm = useCallback(
    (attribute: CharmAttribute): PurchaseCharmResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseAttributeCharmItem(current, attribute);
      commitState(result.nextState);
      if (user && result.purchased) {
        const record = buildPurchaseHistoryRecord({
          productId: `${attribute}_charm`,
          productType: "attribute_charm",
          grantedItemIds: [`${attribute}_charm`],
          amountTotalMinor: 300,
          currencyType: "free_coin"
        });
        void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
          console.error("[useGame] failed to save attribute charm purchase history", error);
        });
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchasePaidAttributeCharm = useCallback(
    async (attribute: CharmAttribute): Promise<PurchaseCharmResult | null> => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchasePaidAttributeCharmItem(current, attribute);
      if (!result.purchased) return result;
      if (!user) return { nextState: current, purchased: false, reason: "login_required" };

      const itemId = `paid_charm_${attribute}_01`;
      const record = buildPurchaseHistoryRecord({
        productId: itemId,
        productType: "premium_attribute_charm",
        grantedItemIds: [itemId],
        amountTotalMinor: 300,
        currencyType: "paid_coin"
      });

      try {
        const purchase = await purchaseCloudPaidCharm(itemId, record.purchaseId, record.platform);
        if (!purchase.spent) {
          const failedResult: PurchaseCharmResult = {
            nextState: { ...current, paidCoinBalance: purchase.paidCoinBalance },
            purchased: false,
            reason: "insufficient_coins"
          };
          await commitState(failedResult.nextState);
          return failedResult;
        }

        result.nextState = {
          ...result.nextState,
          paidCoinBalance: purchase.paidCoinBalance,
          ownedPaidCharmItemCounts: {
            ...result.nextState.ownedPaidCharmItemCounts,
            [attribute]: purchase.itemCount
          }
        };
      } catch (error) {
        console.error("[useGame] failed to purchase paid attribute charm", error);
        return { nextState: current, purchased: false, reason: "wallet_sync_failed" };
      }

      await commitState(result.nextState);
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchaseBooster = useCallback(
    (itemId: string): PurchaseBoosterResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseBoosterItem(current, itemId);
      commitState(result.nextState);
      if (user && result.purchased) {
        const boosterItem = getBoosterShopItem(itemId);
        const record = buildPurchaseHistoryRecord({
          productId: itemId,
          productType: "booster",
          grantedItemIds: [itemId],
          amountTotalMinor: boosterItem?.price ?? 0,
          currencyType: boosterItem?.currencyType ?? "paid_coin"
        });
        void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
          console.error("[useGame] failed to save booster purchase history", error);
        });
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchasePaidBackground = useCallback(
    (itemId: string): PurchasePaidInventoryResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchasePaidBackgroundItem(current, itemId);
      commitState(result.nextState);
      if (user && result.purchased) {
        const item = getPaidBackgroundShopItem(itemId);
        if (item) {
          const record = buildPurchaseHistoryRecord({
            productId: itemId,
            productType: "background",
            grantedItemIds: [itemId],
            amountTotalMinor: item.price,
            currencyType: "paid_coin"
          });
          void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
            console.error("[useGame] failed to save paid background purchase history", error);
          });
        }
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchasePaidFrame = useCallback(
    (itemId: string): PurchasePaidInventoryResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchasePaidFrameItem(current, itemId);
      commitState(result.nextState);
      if (user && result.purchased) {
        const item = getPaidFrameShopItem(itemId);
        if (item) {
          const record = buildPurchaseHistoryRecord({
            productId: itemId,
            productType: "frame",
            grantedItemIds: [itemId],
            amountTotalMinor: item.price,
            currencyType: "paid_coin"
          });
          void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
            console.error("[useGame] failed to save paid frame purchase history", error);
          });
        }
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchasePaidBundle = useCallback(
    (itemId: string): PurchasePaidInventoryResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchasePaidBundleItem(current, itemId);
      commitState(result.nextState);
      if (user && result.purchased) {
        const item = getPaidBundleShopItem(itemId);
        if (item) {
          const grantedItemIds =
            item.bundleType === "spring_starter"
              ? ["spring_meadow", "spring_sakura", "spring_easter_2026:egg"]
              : [itemId];
          const record = buildPurchaseHistoryRecord({
            productId: itemId,
            productType: "bundle",
            grantedItemIds,
            amountTotalMinor: item.price,
            currencyType: "paid_coin"
          });
          void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
            console.error("[useGame] failed to save paid bundle purchase history", error);
          });
        }
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const purchaseDecoration = useCallback(
    (itemId: string): PurchasePaidInventoryResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseDecorationItem(current, itemId);
      commitState(result.nextState);
      if (user && result.purchased) {
        const item = getDecorationShopItem(itemId);
        if (item) {
          const record = buildPurchaseHistoryRecord({
            productId: itemId,
            productType: "decoration",
            grantedItemIds: [itemId],
            amountTotalMinor: item.price,
            currencyType: "paid_coin"
          });
          void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
            console.error("[useGame] failed to save decoration purchase history", error);
          });
        }
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const equipFrame = useCallback(
    (frameId: string): EquipFrameResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runEquipFrame(current, frameId);
      commitState(result.nextState);
      if (result.equipped) {
        trackEvent("item_equipped", {
          item_id: frameId,
          item_type: "frame"
        });
      }
      return result;
    },
    [commitState]
  );

  const unequipFrame = useCallback(
    (): EquipFrameResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runUnequipFrame(current);
      commitState(result.nextState);
      if (result.equipped) {
        trackEvent("item_unequipped", {
          item_type: "frame"
        });
      }
      return result;
    },
    [commitState]
  );

  const useAttributeCharm = useCallback(
    (attribute: CharmAttribute, variant: "free" | "paid" = "free") => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runUseAttributeCharm(current, attribute, variant);
      commitState(result.nextState);
      if (result.used) {
        trackEvent("item_used", {
          item_id: `${variant}_charm_${attribute}`,
          item_type: "attribute_charm",
          attribute,
          variant
        });
      }
      return result;
    },
    [commitState]
  );

  const useBooster = useCallback(
    (itemId: string) => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runUseBoosterItem(current, itemId);
      commitState(result.nextState);
      if (result.used) {
        trackEvent("item_used", {
          item_id: itemId,
          item_type: "booster"
        });
      }
      return result;
    },
    [commitState]
  );

  const toggleDecoration = useCallback(
    (itemId: string): ToggleDecorationResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runToggleDecoration(current, itemId);
      commitState(result.nextState);
      if (result.toggled) {
        trackEvent(result.active ? "item_equipped" : "item_unequipped", {
          item_id: itemId,
          item_type: "decoration"
        });
      }
      return result;
    },
    [commitState]
  );

  const equipDecoration = useCallback(
    (itemId: string): ToggleDecorationResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runEquipDecoration(current, itemId);
      commitState(result.nextState);
      if (result.toggled && result.active) {
        trackEvent("item_equipped", {
          item_id: itemId,
          item_type: "decoration"
        });
      }
      return result;
    },
    [commitState]
  );

  const unequipDecoration = useCallback(
    (itemId: string): ToggleDecorationResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runUnequipDecoration(current, itemId);
      commitState(result.nextState);
      if (result.toggled && !result.active) {
        trackEvent("item_unequipped", {
          item_id: itemId,
          item_type: "decoration"
        });
      }
      return result;
    },
    [commitState]
  );

  const resolveDailyReviewTask = useCallback(
    (taskId: number, didComplete: boolean): DailyReviewResolveResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) return null;

      const result = runResolveDailyReviewTask({
        state: current,
        tasks,
        task,
        didComplete,
        monsters,
        levelingRows
      });
      commitState(result.nextState);
      trackEvent("daily_review_answer", {
        task_id: taskId,
        completed: didComplete,
        rewarded: result.rewarded,
        exp: result.gainedExp,
        free_coins: result.gainedFreeCoins
      });
      return result;
    },
    [commitState, monsters, tasks, levelingRows]
  );

  const skipDailyReview = useCallback(async () => {
    const current = gameStateRef.current;
    if (!current) return;
    await commitState(runSkipDailyReview(current));
    trackEvent("daily_review_skip");
  }, [commitState]);

  const finishDailyReview = useCallback(async () => {
    const current = gameStateRef.current;
    if (!current) return;
    await commitState(runFinishDailyReview(current));
    trackEvent("daily_review_finish");
  }, [commitState]);

  const finishBirthEvent = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    const wasTutorial = !current.hasSeenTutorial || current.isInTutorialFlow;
    commitState(runFinishBirthEvent(current, monsters, levelingRows));
    if (wasTutorial) {
      trackEvent("tutorial_complete");
    }
  }, [commitState, monsters, levelingRows]);

  const finishEndEvent = useCallback(async () => {
    const current = gameStateRef.current;
    if (!current) return;
    await commitState(runFinishEndEvent(current, monsters));
    trackEvent("monster_cycle_restart", {
      previous_monster_id: current.currentMonsterId
    });
  }, [commitState, monsters]);

  const claimEventFreeEgg = useCallback(
    (eventId: string): EventEggClaimResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runClaimEventFreeEgg(current, eventId);
      commitState(result.nextState);
      if (result.claimed) {
        trackEvent("event_egg_claimed", {
          event_id: eventId,
          source: "free_claim"
        });
      }
      return result;
    },
    [commitState]
  );

  const queueEventEgg = useCallback(
    (eventId: string): EventEggUseResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runQueueEventEgg(current, eventId);
      commitState(result.nextState);
      if (result.used) {
        trackEvent("event_egg_queued", {
          event_id: eventId
        });
      }
      return result;
    },
    [commitState]
  );

  const forceStartEventEgg = useCallback(
    (eventId: string): ForceStartEventEggResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runForceStartEventEgg(current, eventId, monsters);
      commitState(result.nextState);
      if (result.started) {
        trackEvent("event_egg_started", {
          event_id: eventId,
          mode: "start_now"
        });
      }
      return result;
    },
    [commitState, monsters]
  );

  const purchaseEventReward = useCallback(
    async (eventId: string, itemId: string): Promise<PurchaseEventRewardResult | null> => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = runPurchaseEventReward(current, eventId, itemId);
      const eventConfig = getEventById(eventId);
      const item = eventConfig
        ? [...eventConfig.freeCoinShopItems, ...eventConfig.paidCoinShopItems].find((entry) => entry.itemId === itemId)
        : null;

      if (result.purchased && item?.currencyType === "paid_coin") {
        if (!user) {
          return { nextState: current, purchased: false, reason: "login_required" };
        }

        try {
          const spendResult = await spendCloudPaidCoins(eventId, itemId);
          if (!spendResult.spent) {
            const failedResult: PurchaseEventRewardResult = {
              nextState:
                spendResult.reason === "already_owned"
                  ? { ...result.nextState, paidCoinBalance: spendResult.paidCoinBalance }
                  : { ...current, paidCoinBalance: spendResult.paidCoinBalance },
              purchased: false,
              reason: spendResult.reason ?? "insufficient_paid_coins"
            };
            commitState(failedResult.nextState);
            return failedResult;
          }
          result.nextState = {
            ...result.nextState,
            paidCoinBalance: spendResult.paidCoinBalance
          };
        } catch (error) {
          console.error("[useGame] failed to spend cloud paid coins", error);
          return { nextState: current, purchased: false, reason: "wallet_sync_failed" };
        }
      }

      commitState(result.nextState);
      if (result.purchased) {
        trackEvent("shop_purchase", {
          item_id: itemId,
          item_name: item?.title ?? itemId,
          item_type: item?.rewardType ?? "event_reward",
          event_id: eventId,
          currency_type: item?.currencyType ?? (itemId.includes("_paid") || itemId.includes("_egg_paid") ? "paid_coin" : "free_coin"),
          price: item?.price ?? 0
        });
      }
      if (user && result.purchased) {
        const currencyType = itemId.includes("_paid") || itemId.includes("_egg_paid") ? "paid_coin" : "free_coin";
        const record = buildPurchaseHistoryRecord({
          productId: itemId,
          productType: "event_reward",
          grantedItemIds: [itemId],
          amountTotalMinor: 0,
          currencyType
        });
        void appendCloudPurchaseHistory(user.uid, record).catch((error) => {
          console.error("[useGame] failed to save event purchase history", error);
        });
      }
      return result;
    },
    [buildPurchaseHistoryRecord, commitState, user]
  );

  const markEventIntroPopupSeen = useCallback((eventId: string) => {
    const current = gameStateRef.current;
    if (!current) return;
    commitState(runMarkEventIntroPopupSeen(current, eventId));
    trackEvent("event_intro_seen", {
      event_id: eventId
    });
  }, [commitState]);

  const startTutorialFlow = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    commitState(runStartTutorialFlow(current));
    trackEvent("tutorial_begin");
  }, [commitState]);

  return {
    tasks,
    monsters,
    levelingRows,
    gameState,
    isLoading,
    completeTask,
    addTask,
    removeTask,
    moveTask,
    purchaseBackground,
    equipBackground,
    purchaseFrame,
    equipFrame,
    unequipFrame,
    purchaseAttributeCharm,
    purchasePaidAttributeCharm,
    useAttributeCharm,
    purchaseBooster,
    purchasePaidBackground,
    purchasePaidFrame,
    purchasePaidBundle,
    purchaseDecoration,
    equipDecoration,
    toggleDecoration,
    unequipDecoration,
    useBooster,
    resolveDailyReviewTask,
    skipDailyReview,
    finishDailyReview,
    startTutorialFlow,
    finishBirthEvent,
    finishEndEvent,
    claimEventFreeEgg,
    queueEventEgg,
    forceStartEventEgg,
    purchaseEventReward,
    markEventIntroPopupSeen,
    waitForPendingSave
  };
}
