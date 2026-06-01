import { PURCHASE_TYPE, NativePurchases, type Product, type Transaction } from "@capgo/native-purchases";
import type { ShopPaidCoinItem } from "@/lib/game/shop";

export type AppStoreProductMap = Record<string, Product>;
export type NativeStorePlatform = "ios" | "android";
export type NativeStoreProductMap = Record<string, Product>;
export type NativeStorePurchaseSnapshot = {
  productIdentifier: string | null;
  transactionId: string | null;
  orderId: string | null;
  purchaseState: string | null;
  purchaseDate: string | null;
  productType: string | null;
  appAccountTokenPresent: boolean;
  purchaseTokenPresent: boolean;
  purchaseTokenHash: string | null;
  jwsRepresentationPresent: boolean;
  isAcknowledged: boolean | null;
  quantity: number | null;
};

export type NativeStorePurchaseInspection = {
  productIds: string[];
  restoreSyncAttempted: boolean;
  restoreSyncError: string | null;
  rawPurchases: Transaction[];
  restorablePurchases: Transaction[];
  rawPurchaseSnapshots: NativeStorePurchaseSnapshot[];
  restorablePurchaseSnapshots: NativeStorePurchaseSnapshot[];
  rejectedPurchaseSnapshots: Array<NativeStorePurchaseSnapshot & { reason: string }>;
};

const APP_ACCOUNT_TOKEN_NAMESPACE = "77b06a9e-2eb8-5f21-a2e1-7f4cf2c0b7f4";
const ANDROID_NATIVE_STORE_PURCHASES_DISABLED = true;

function hexToUuid(hex: string): string {
  const normalized = hex.padEnd(32, "0").slice(0, 32).split("");
  normalized[12] = "5";
  const variant = parseInt(normalized[16], 16);
  normalized[16] = ((variant & 0x3) | 0x8).toString(16);
  const value = normalized.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeStoreValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePurchaseState(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function isAndroidPurchasedState(value: string | number | null | undefined): boolean {
  const normalized = normalizePurchaseState(value);
  return !normalized || normalized === "1" || normalized.toUpperCase() === "PURCHASED";
}

export async function summarizeNativeStoreTransaction(transaction: Transaction): Promise<NativeStorePurchaseSnapshot> {
  return {
    productIdentifier: normalizeStoreValue(transaction.productIdentifier),
    transactionId: normalizeStoreValue(transaction.transactionId),
    orderId: normalizeStoreValue(transaction.orderId),
    purchaseState: normalizePurchaseState(transaction.purchaseState),
    purchaseDate: normalizeStoreValue(transaction.purchaseDate),
    productType: normalizeStoreValue(transaction.productType),
    appAccountTokenPresent: Boolean(transaction.appAccountToken),
    purchaseTokenPresent: Boolean(transaction.purchaseToken),
    purchaseTokenHash: transaction.purchaseToken ? await sha256Hex(transaction.purchaseToken) : null,
    jwsRepresentationPresent: Boolean(transaction.jwsRepresentation),
    isAcknowledged: typeof transaction.isAcknowledged === "boolean" ? transaction.isAcknowledged : null,
    quantity: typeof transaction.quantity === "number" ? transaction.quantity : null
  };
}

export async function createAppAccountToken(uid: string): Promise<string> {
  const hash = await sha256Hex(`${APP_ACCOUNT_TOKEN_NAMESPACE}:${uid}`);
  return hexToUuid(hash);
}

export function getAppStoreProductIds(items: ShopPaidCoinItem[]): string[] {
  return getNativeStoreProductIds(items, "ios");
}

export function getNativeStoreProductId(item: ShopPaidCoinItem, platform: NativeStorePlatform): string | null {
  return platform === "android"
    ? item.googlePlayProductId ?? null
    : item.appStoreProductId ?? null;
}

export function getNativeStoreProductIds(items: ShopPaidCoinItem[], platform: NativeStorePlatform): string[] {
  return items
    .map((item) => getNativeStoreProductId(item, platform))
    .filter((productId): productId is string => Boolean(productId));
}

export function areAndroidNativeStorePurchasesDisabled(): boolean {
  return ANDROID_NATIVE_STORE_PURCHASES_DISABLED;
}

export async function loadNativeStoreProducts(items: ShopPaidCoinItem[], platform: NativeStorePlatform): Promise<NativeStoreProductMap> {
  const productIdentifiers = getNativeStoreProductIds(items, platform);
  if (productIdentifiers.length === 0) return {};

  const { products } = await NativePurchases.getProducts({
    productIdentifiers,
    productType: PURCHASE_TYPE.INAPP
  });

  return Object.fromEntries(products.map((product) => [product.identifier, product]));
}

export async function loadAppStoreProducts(items: ShopPaidCoinItem[]): Promise<AppStoreProductMap> {
  return loadNativeStoreProducts(items, "ios");
}

export async function purchaseNativeStoreProduct(
  item: ShopPaidCoinItem,
  platform: NativeStorePlatform,
  appAccountToken: string
): Promise<Transaction> {
  const productIdentifier = getNativeStoreProductId(item, platform);
  if (!productIdentifier) {
    throw new Error(`${platform === "android" ? "Google Play" : "App Store"} product ID is not configured.`);
  }
  if (platform === "android" && ANDROID_NATIVE_STORE_PURCHASES_DISABLED) {
    throw new Error("Android版のモンタコイン購入は現在一時停止中です。");
  }

  return NativePurchases.purchaseProduct({
    productIdentifier,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
    appAccountToken,
    // Keep Android coin purchases queryable until the server has granted coins.
    // The plugin consumes immediately when isConsumable is true, which makes
    // failed grants impossible to restore from getPurchases().
    isConsumable: false,
    autoAcknowledgePurchases: false
  });
}

export async function purchaseAppStoreProduct(item: ShopPaidCoinItem, appAccountToken: string): Promise<Transaction> {
  return purchaseNativeStoreProduct(item, "ios", appAccountToken);
}

export async function restoreNativeStorePurchases(
  items: ShopPaidCoinItem[],
  platform: NativeStorePlatform,
  appAccountToken: string
): Promise<Transaction[]> {
  const inspection = await inspectNativeStorePurchases(items, platform, appAccountToken);
  return inspection.restorablePurchases;
}

export async function inspectNativeStorePurchases(
  items: ShopPaidCoinItem[],
  platform: NativeStorePlatform,
  appAccountToken: string
): Promise<NativeStorePurchaseInspection> {
  let restoreSyncError: string | null = null;
  try {
    await NativePurchases.restorePurchases();
  } catch (error) {
    restoreSyncError = error instanceof Error ? error.message : "restorePurchases failed";
  }

  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP
  });

  const productIds = getNativeStoreProductIds(items, platform);
  const productIdSet = new Set(productIds);
  const rawPurchaseSnapshots = await Promise.all(purchases.map((purchase) => summarizeNativeStoreTransaction(purchase)));
  const restorablePurchases: Transaction[] = [];
  const rejectedPurchaseSnapshots: Array<NativeStorePurchaseSnapshot & { reason: string }> = [];

  for (let index = 0; index < purchases.length; index += 1) {
    const purchase = purchases[index];
    const snapshot = rawPurchaseSnapshots[index];

    if (!productIdSet.has(purchase.productIdentifier)) {
      rejectedPurchaseSnapshots.push({ ...snapshot, reason: "product_not_configured" });
      continue;
    }

    if (platform === "android" && !isAndroidPurchasedState(purchase.purchaseState)) {
      rejectedPurchaseSnapshots.push({ ...snapshot, reason: "android_purchase_not_completed" });
      continue;
    }

    if (platform === "ios" && purchase.appAccountToken && purchase.appAccountToken.toLowerCase() !== appAccountToken.toLowerCase()) {
      rejectedPurchaseSnapshots.push({ ...snapshot, reason: "app_account_token_mismatch" });
      continue;
    }

    restorablePurchases.push(purchase);
  }

  return {
    productIds,
    restoreSyncAttempted: true,
    restoreSyncError,
    rawPurchases: purchases,
    restorablePurchases,
    rawPurchaseSnapshots,
    restorablePurchaseSnapshots: await Promise.all(restorablePurchases.map((purchase) => summarizeNativeStoreTransaction(purchase))),
    rejectedPurchaseSnapshots
  };
}

export async function restoreAppStorePurchases(items: ShopPaidCoinItem[], appAccountToken: string): Promise<Transaction[]> {
  return restoreNativeStorePurchases(items, "ios", appAccountToken);
}

export async function finishNativeStoreTransaction(transaction: Transaction, platform: NativeStorePlatform): Promise<void> {
  if (platform === "android") {
    const purchaseToken = transaction.purchaseToken ?? transaction.transactionId;
    if (!purchaseToken) {
      throw new Error("Google Play purchase token is missing.");
    }
    await NativePurchases.consumePurchase({ purchaseToken });
    return;
  }

  await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.transactionId });
}

export async function finishAppStoreTransaction(transactionId: string): Promise<void> {
  await NativePurchases.acknowledgePurchase({ purchaseToken: transactionId });
}
