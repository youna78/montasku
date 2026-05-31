import { PURCHASE_TYPE, NativePurchases, type Product, type Transaction } from "@capgo/native-purchases";
import type { ShopPaidCoinItem } from "@/lib/game/shop";

export type AppStoreProductMap = Record<string, Product>;
export type NativeStorePlatform = "ios" | "android";
export type NativeStoreProductMap = Record<string, Product>;

const APP_ACCOUNT_TOKEN_NAMESPACE = "77b06a9e-2eb8-5f21-a2e1-7f4cf2c0b7f4";

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

  return NativePurchases.purchaseProduct({
    productIdentifier,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
    appAccountToken,
    isConsumable: platform === "android",
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
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP
  });

  const productIds = new Set(getNativeStoreProductIds(items, platform));
  return purchases.filter((purchase) => {
    if (!productIds.has(purchase.productIdentifier)) return false;
    if (platform === "android" && purchase.purchaseState && purchase.purchaseState !== "1") return false;
    if (!purchase.appAccountToken) return true;
    return purchase.appAccountToken.toLowerCase() === appAccountToken.toLowerCase();
  });
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
