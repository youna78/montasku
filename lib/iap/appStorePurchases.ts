import { PURCHASE_TYPE, NativePurchases, type Product, type Transaction } from "@capgo/native-purchases";
import type { ShopPaidCoinItem } from "@/lib/game/shop";

export type AppStoreProductMap = Record<string, Product>;

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
  return items
    .map((item) => item.appStoreProductId)
    .filter((productId): productId is string => Boolean(productId));
}

export async function loadAppStoreProducts(items: ShopPaidCoinItem[]): Promise<AppStoreProductMap> {
  const productIdentifiers = getAppStoreProductIds(items);
  if (productIdentifiers.length === 0) return {};

  const { products } = await NativePurchases.getProducts({
    productIdentifiers,
    productType: PURCHASE_TYPE.INAPP
  });

  return Object.fromEntries(products.map((product) => [product.identifier, product]));
}

export async function purchaseAppStoreProduct(item: ShopPaidCoinItem, appAccountToken: string): Promise<Transaction> {
  if (!item.appStoreProductId) {
    throw new Error("App Store product ID is not configured.");
  }

  return NativePurchases.purchaseProduct({
    productIdentifier: item.appStoreProductId,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
    appAccountToken,
    autoAcknowledgePurchases: false
  });
}

export async function finishAppStoreTransaction(transactionId: string): Promise<void> {
  await NativePurchases.acknowledgePurchase({ purchaseToken: transactionId });
}
