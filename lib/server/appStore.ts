import { createPrivateKey, sign } from "crypto";

type AppStoreEnvironment = "sandbox" | "production";

export type AppStoreTransactionInfo = {
  transactionId: string;
  originalTransactionId?: string;
  productId: string;
  bundleId: string;
  type?: string;
  appAccountToken?: string;
  environment?: string;
  purchaseDate?: number;
  revocationDate?: number;
};

type TransactionInfoResponse = {
  signedTransactionInfo?: string;
};

function base64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64UrlJson<T>(value: string): T {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function normalizePrivateKey(rawValue: string): string {
  return rawValue.replace(/\\n/g, "\n");
}

function getAppStoreEnvironment(): AppStoreEnvironment {
  return process.env.APP_STORE_ENV === "production" ? "production" : "sandbox";
}

function getAppStoreApiBaseUrl(environment: AppStoreEnvironment): string {
  return environment === "production"
    ? "https://api.storekit.itunes.apple.com"
    : "https://api.storekit-sandbox.itunes.apple.com";
}

function createAppStoreJwt(): string {
  const keyId = getRequiredEnv("APP_STORE_KEY_ID");
  const issuerId = getRequiredEnv("APP_STORE_ISSUER_ID");
  const bundleId = getRequiredEnv("APP_STORE_BUNDLE_ID");
  const privateKey = createPrivateKey(normalizePrivateKey(getRequiredEnv("APP_STORE_PRIVATE_KEY")));
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 20 * 60,
      aud: "appstoreconnect-v1",
      bid: bundleId
    })
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  });

  return `${header}.${payload}.${base64Url(signature)}`;
}

export function decodeSignedTransactionInfo(jws: string): AppStoreTransactionInfo {
  const [, payload] = jws.split(".");
  if (!payload) {
    throw new Error("Invalid signed transaction info.");
  }
  return decodeBase64UrlJson<AppStoreTransactionInfo>(payload);
}

export async function fetchAppStoreTransactionInfo(transactionId: string): Promise<AppStoreTransactionInfo> {
  const token = createAppStoreJwt();
  const environment = getAppStoreEnvironment();
  const response = await fetch(`${getAppStoreApiBaseUrl(environment)}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Store transaction lookup failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as TransactionInfoResponse;
  if (!payload.signedTransactionInfo) {
    throw new Error("App Store transaction response did not include signedTransactionInfo.");
  }

  return decodeSignedTransactionInfo(payload.signedTransactionInfo);
}
