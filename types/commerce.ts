export type WalletSummary = {
  schemaVersion: number;
  freeCoinBalance: number;
  paidCoinBalance: number;
  lifetimeFreeCoinsEarned: number;
  lifetimePaidCoinsPurchased: number;
  lifetimeCoinsSpent: number;
  lastCoinGrantAt?: string | null;
  lastCoinSpendAt?: string | null;
};

export type InventoryProfile = {
  schemaVersion: number;
  ownedBackgroundIds: string[];
  selectedBackgroundId: string;
  ownedFrameIds: string[];
  selectedFrameId: string;
  ownedDecorationIds: string[];
  ownedBoosterIds: string[];
};

export type PurchaseHistoryRecord = {
  purchaseId: string;
  platform: "web" | "ios" | "android";
  channel: string;
  status: "pending" | "paid" | "fulfilled" | "refunded" | "failed";
  productId: string;
  productType: string;
  quantity: number;
  grantedPaidCoins: number;
  grantedItemIds: string[];
  currencyType: "free_coin" | "paid_coin" | "jpy";
  amountTotalMinor: number;
  purchasedAt: string;
  fulfilledAt?: string;
  stripePaymentLinkId?: string | null;
  stripeCheckoutSessionId?: string | null;
  idempotencyKey?: string | null;
};
