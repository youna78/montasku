import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import type { GameState } from "@/types/game";
import type { InventoryProfile, PurchaseHistoryRecord, WalletSummary } from "@/types/commerce";
import { getFirebaseFirestore } from "@/lib/firebase/firestore";

const COMMERCE_SCHEMA_VERSION = 1;

function normalizeBoosterItemCounts(
  rawCounts: Record<string, number> | Record<string, number | undefined> | undefined
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rawCounts ?? {}).filter(([, count]) => typeof count === "number" && count > 0)
  ) as Record<string, number>;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, stripUndefined(nested)])
    ) as T;
  }

  return value;
}

function getWalletDocRef(uid: string) {
  return doc(getFirebaseFirestore(), "users", uid, "wallet", "summary");
}

function getInventoryDocRef(uid: string) {
  return doc(getFirebaseFirestore(), "users", uid, "inventory", "profile");
}

function getPurchaseHistoryDocRef(uid: string, purchaseId: string) {
  return doc(getFirebaseFirestore(), "users", uid, "purchaseHistory", purchaseId);
}

function getPurchaseHistoryCollectionRef(uid: string) {
  return collection(getFirebaseFirestore(), "users", uid, "purchaseHistory");
}

export function buildWalletSummaryFromGameState(state: GameState): WalletSummary {
  return {
    schemaVersion: COMMERCE_SCHEMA_VERSION,
    freeCoinBalance: state.freeCoins,
    paidCoinBalance: state.paidCoinBalance,
    lifetimeFreeCoinsEarned: state.freeCoins,
    lifetimePaidCoinsPurchased: state.paidCoinBalance,
    lifetimeCoinsSpent: 0,
    lastCoinGrantAt: null,
    lastCoinSpendAt: null
  };
}

export function buildInventoryProfileFromGameState(state: GameState): InventoryProfile {
  return {
    schemaVersion: COMMERCE_SCHEMA_VERSION,
    ownedBackgroundIds: state.ownedBackgroundIds,
    selectedBackgroundId: state.selectedBackgroundId,
    ownedFrameIds: state.ownedFrameIds,
    selectedFrameId: state.selectedFrameId,
    ownedDecorationIds: state.ownedDecorationIds,
    selectedDecorationIds: state.selectedDecorationIds,
    ownedCharmItemCounts: {
      power: state.ownedCharmItemCounts.power ?? 0,
      heal: state.ownedCharmItemCounts.heal ?? 0,
      knowledge: state.ownedCharmItemCounts.knowledge ?? 0,
      create: state.ownedCharmItemCounts.create ?? 0
    },
    ownedPaidCharmItemCounts: {
      power: state.ownedPaidCharmItemCounts.power ?? 0,
      heal: state.ownedPaidCharmItemCounts.heal ?? 0,
      knowledge: state.ownedPaidCharmItemCounts.knowledge ?? 0,
      create: state.ownedPaidCharmItemCounts.create ?? 0
    },
    ownedBoosterItemCounts: normalizeBoosterItemCounts(state.ownedBoosterItemCounts)
  };
}

export async function loadCloudWalletSummary(uid: string): Promise<Partial<WalletSummary> | null> {
  const snapshot = await getDoc(getWalletDocRef(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Partial<WalletSummary>;
}

export async function loadCloudInventoryProfile(uid: string): Promise<Partial<InventoryProfile> | null> {
  const snapshot = await getDoc(getInventoryDocRef(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Partial<InventoryProfile>;
}

export async function saveCloudWalletSummary(uid: string, state: GameState): Promise<void> {
  const ref = getWalletDocRef(uid);
  const snapshot = await getDoc(ref);
  const current = snapshot.exists() ? (snapshot.data() as Partial<WalletSummary>) : null;
  const previousFreeBalance =
    current && typeof current.freeCoinBalance === "number" ? current.freeCoinBalance : state.freeCoins;
  const previousLifetimeEarned =
    current && typeof current.lifetimeFreeCoinsEarned === "number" ? current.lifetimeFreeCoinsEarned : state.freeCoins;
  const previousLifetimeSpent =
    current && typeof current.lifetimeCoinsSpent === "number" ? current.lifetimeCoinsSpent : 0;
  const previousLifetimePurchased =
    current && typeof current.lifetimePaidCoinsPurchased === "number"
      ? current.lifetimePaidCoinsPurchased
      : state.paidCoinBalance;
  const freeCoinDelta = state.freeCoins - previousFreeBalance;
  const gainedCoins = freeCoinDelta > 0 ? freeCoinDelta : 0;
  const spentCoins = freeCoinDelta < 0 ? Math.abs(freeCoinDelta) : 0;
  const paidCoinBalance = current && typeof current.paidCoinBalance === "number" ? current.paidCoinBalance : state.paidCoinBalance;

  await setDoc(
    ref,
    stripUndefined({
      schemaVersion: COMMERCE_SCHEMA_VERSION,
      freeCoinBalance: state.freeCoins,
      // Paid coins are server-authoritative once Stripe webhook fulfillment is enabled.
      // Do not let a stale browser state overwrite webhook-granted paid coins.
      paidCoinBalance,
      lifetimeFreeCoinsEarned: previousLifetimeEarned + gainedCoins,
      lifetimePaidCoinsPurchased: previousLifetimePurchased,
      lifetimeCoinsSpent: previousLifetimeSpent + spentCoins,
      lastCoinGrantAt: gainedCoins > 0 ? new Date().toISOString() : current?.lastCoinGrantAt ?? null,
      lastCoinSpendAt: spentCoins > 0 ? new Date().toISOString() : current?.lastCoinSpendAt ?? null,
      updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
    }),
    { merge: true }
  );
}

export async function saveCloudInventoryProfile(uid: string, state: GameState): Promise<void> {
  const ref = getInventoryDocRef(uid);
  const snapshot = await getDoc(ref);

  await setDoc(
    ref,
    stripUndefined({
      ...buildInventoryProfileFromGameState(state),
      updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
    }),
    { merge: true }
  );
}

export async function saveCloudCommerceState(uid: string, state: GameState): Promise<void> {
  await saveCloudInventoryProfile(uid, state);

  try {
    await saveCloudWalletSummary(uid, state);
  } catch (error) {
    // Wallet contains paid-coin fields, so production Firestore rules may block
    // client writes. Do not let that prevent game state / monster loading.
    console.warn("[cloudCommerce] skipped client wallet save", error);
  }
}

export function mergeCommerceIntoGameState(
  state: GameState,
  wallet: Partial<WalletSummary> | null,
  inventory: Partial<InventoryProfile> | null
): GameState {
  let nextState = state;

  if (wallet && typeof wallet.freeCoinBalance === "number") {
    nextState = {
      ...nextState,
      freeCoins: Math.max(0, wallet.freeCoinBalance)
    };
  }

  if (wallet && typeof wallet.paidCoinBalance === "number") {
    nextState = {
      ...nextState,
      paidCoinBalance: Math.max(0, wallet.paidCoinBalance)
    };
  }

  if (inventory) {
    const ownedBackgroundIds =
      Array.isArray(inventory.ownedBackgroundIds) && inventory.ownedBackgroundIds.length > 0
        ? [...new Set(inventory.ownedBackgroundIds.filter(Boolean))]
        : nextState.ownedBackgroundIds;
    const ownedFrameIds =
      Array.isArray(inventory.ownedFrameIds) && inventory.ownedFrameIds.length > 0
        ? [...new Set(inventory.ownedFrameIds.filter(Boolean))]
        : nextState.ownedFrameIds;
    const ownedDecorationIds =
      Array.isArray(inventory.ownedDecorationIds) && inventory.ownedDecorationIds.length > 0
        ? [...new Set(inventory.ownedDecorationIds.filter(Boolean))]
        : nextState.ownedDecorationIds;
    const selectedDecorationIds = Array.isArray(inventory.selectedDecorationIds)
      ? inventory.selectedDecorationIds.filter((itemId): itemId is string => typeof itemId === "string" && ownedDecorationIds.includes(itemId))
      : nextState.selectedDecorationIds.filter((itemId) => ownedDecorationIds.includes(itemId));
    const ownedCharmItemCounts =
      inventory.ownedCharmItemCounts && typeof inventory.ownedCharmItemCounts === "object"
        ? {
            power:
              typeof inventory.ownedCharmItemCounts.power === "number" && inventory.ownedCharmItemCounts.power > 0
                ? Math.floor(inventory.ownedCharmItemCounts.power)
                : 0,
            heal:
              typeof inventory.ownedCharmItemCounts.heal === "number" && inventory.ownedCharmItemCounts.heal > 0
                ? Math.floor(inventory.ownedCharmItemCounts.heal)
                : 0,
            knowledge:
              typeof inventory.ownedCharmItemCounts.knowledge === "number" && inventory.ownedCharmItemCounts.knowledge > 0
                ? Math.floor(inventory.ownedCharmItemCounts.knowledge)
                : 0,
            create:
              typeof inventory.ownedCharmItemCounts.create === "number" && inventory.ownedCharmItemCounts.create > 0
                ? Math.floor(inventory.ownedCharmItemCounts.create)
                : 0
          }
        : nextState.ownedCharmItemCounts;
    const ownedPaidCharmItemCounts =
      inventory.ownedPaidCharmItemCounts && typeof inventory.ownedPaidCharmItemCounts === "object"
        ? {
            power:
              typeof inventory.ownedPaidCharmItemCounts.power === "number" && inventory.ownedPaidCharmItemCounts.power > 0
                ? Math.floor(inventory.ownedPaidCharmItemCounts.power)
                : 0,
            heal:
              typeof inventory.ownedPaidCharmItemCounts.heal === "number" && inventory.ownedPaidCharmItemCounts.heal > 0
                ? Math.floor(inventory.ownedPaidCharmItemCounts.heal)
                : 0,
            knowledge:
              typeof inventory.ownedPaidCharmItemCounts.knowledge === "number" && inventory.ownedPaidCharmItemCounts.knowledge > 0
                ? Math.floor(inventory.ownedPaidCharmItemCounts.knowledge)
                : 0,
            create:
              typeof inventory.ownedPaidCharmItemCounts.create === "number" && inventory.ownedPaidCharmItemCounts.create > 0
                ? Math.floor(inventory.ownedPaidCharmItemCounts.create)
                : 0
          }
        : nextState.ownedPaidCharmItemCounts;
    const ownedBoosterItemCounts =
      inventory.ownedBoosterItemCounts && typeof inventory.ownedBoosterItemCounts === "object"
        ? normalizeBoosterItemCounts(inventory.ownedBoosterItemCounts)
        : nextState.ownedBoosterItemCounts;

    nextState = {
      ...nextState,
      ownedBackgroundIds,
      selectedBackgroundId:
        typeof inventory.selectedBackgroundId === "string" && ownedBackgroundIds.includes(inventory.selectedBackgroundId)
          ? inventory.selectedBackgroundId
          : nextState.selectedBackgroundId,
      ownedFrameIds,
      selectedFrameId:
        typeof inventory.selectedFrameId === "string" && ownedFrameIds.includes(inventory.selectedFrameId)
          ? inventory.selectedFrameId
          : nextState.selectedFrameId,
      ownedDecorationIds,
      selectedDecorationIds,
      ownedCharmItemCounts,
      ownedPaidCharmItemCounts,
      ownedBoosterItemCounts
    };
  }

  return nextState;
}

export async function appendCloudPurchaseHistory(uid: string, record: PurchaseHistoryRecord): Promise<void> {
  const ref = getPurchaseHistoryDocRef(uid, record.purchaseId);

  await setDoc(
    ref,
    stripUndefined({
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );
}

export async function loadCloudPurchaseHistory(uid: string): Promise<PurchaseHistoryRecord[]> {
  const snapshot = await getDocs(getPurchaseHistoryCollectionRef(uid));
  return snapshot.docs
    .map((docSnapshot) => docSnapshot.data() as PurchaseHistoryRecord)
    .sort((left, right) => {
      const leftTime = Date.parse(left.purchasedAt ?? "") || 0;
      const rightTime = Date.parse(right.purchasedAt ?? "") || 0;
      return rightTime - leftTime;
    });
}
