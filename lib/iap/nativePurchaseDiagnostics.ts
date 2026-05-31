import type { NativeStorePlatform, NativeStorePurchaseSnapshot } from "@/lib/iap/appStorePurchases";

export type NativeStoreRejectedPurchaseSnapshot = NativeStorePurchaseSnapshot & {
  reason: string;
};

export type NativeStoreDiagnosticPayload = {
  eventName: string;
  platform?: NativeStorePlatform | "web" | null;
  appAccountTokenPresent?: boolean;
  productIds?: string[];
  targetProductId?: string | null;
  rawPurchaseCount?: number;
  restorablePurchaseCount?: number;
  rejectedPurchaseCount?: number;
  restoreSyncAttempted?: boolean;
  restoreSyncError?: string | null;
  rawPurchaseSnapshots?: NativeStorePurchaseSnapshot[];
  restorablePurchaseSnapshots?: NativeStorePurchaseSnapshot[];
  rejectedPurchaseSnapshots?: NativeStoreRejectedPurchaseSnapshot[];
  transaction?: NativeStorePurchaseSnapshot | null;
  responseStatus?: number | null;
  errorMessage?: string | null;
  grantedPaidCoins?: number | null;
};

export async function writeNativeStoreDiagnostic(
  idToken: string,
  payload: NativeStoreDiagnosticPayload
): Promise<string | null> {
  try {
    const response = await fetch("/api/native-store/diagnostics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    const body = (await response.json().catch(() => null)) as { diagnosticId?: string } | null;
    return response.ok ? body?.diagnosticId ?? null : null;
  } catch (error) {
    console.warn("[native-store-diagnostics] failed to write client diagnostic", error);
    return null;
  }
}
