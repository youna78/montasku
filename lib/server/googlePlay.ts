import { createHash, createPrivateKey, sign } from "crypto";

const GOOGLE_PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_ANDROID_PACKAGE_NAME = "com.ikizurasenryaku.montasku";

type GoogleServiceAccount = {
  client_email?: string;
  private_key?: string;
};

export type GooglePlayProductPurchase = {
  kind?: string;
  purchaseTimeMillis?: string;
  purchaseState?: number;
  consumptionState?: number;
  developerPayload?: string;
  orderId?: string;
  purchaseType?: number;
  acknowledgementState?: number;
  purchaseToken?: string;
  productId?: string;
  quantity?: number;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
  regionCode?: string;
};

function base64Url(value: Buffer | string): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function getGooglePlayCredentials() {
  const rawServiceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (rawServiceAccountJson) {
    const parsed = JSON.parse(rawServiceAccountJson) as GoogleServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    }
    return {
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key)
    };
  }

  const clientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Play service account is not configured.");
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey)
  };
}

function createGoogleOAuthJwt(): string {
  const { clientEmail, privateKey } = getGooglePlayCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const payload = {
    iss: clientEmail,
    scope: GOOGLE_PLAY_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 55 * 60
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), createPrivateKey(privateKey));
  return `${signingInput}.${base64Url(signature)}`;
}

async function fetchGooglePlayAccessToken(): Promise<string> {
  const assertion = createGoogleOAuthJwt();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  const payload = (await response.json().catch(() => null)) as { access_token?: string; error?: string; error_description?: string } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? payload?.error ?? "Google OAuth token request failed.");
  }

  return payload.access_token;
}

export function getGooglePlayPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME
    ?? process.env.ANDROID_PACKAGE_NAME
    ?? DEFAULT_ANDROID_PACKAGE_NAME;
}

export async function fetchGooglePlayProductPurchase(
  productId: string,
  purchaseToken: string
): Promise<GooglePlayProductPurchase> {
  const accessToken = await fetchGooglePlayAccessToken();
  const packageName = getGooglePlayPackageName();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const payload = (await response.json().catch(() => null)) as GooglePlayProductPurchase & { error?: { message?: string } } | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message ?? "Google Play purchase lookup failed.");
  }

  return payload;
}

export function hashGooglePlayPurchaseToken(purchaseToken: string): string {
  return createHash("sha256").update(purchaseToken).digest("hex");
}
