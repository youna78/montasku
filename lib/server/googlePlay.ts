import { createHash, createPrivateKey, sign } from "crypto";

const GOOGLE_PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_ANDROID_PACKAGE_NAME = "com.ikizurasenryaku.montasku";

type GoogleServiceAccount = {
  client_email?: string;
  private_key?: string;
};

type GooglePlayCredentials = {
  clientEmail: string;
  privateKey: string;
};

type CredentialEnvValueSummary = {
  present: boolean;
  length: number;
  startsWithJson: boolean;
  startsWithJsonString: boolean;
  looksLikePrivateKey: boolean;
  decodedStartsWithJson?: boolean;
  decodedStartsWithJsonString?: boolean;
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

function stripWrappingQuotes(value: string): string {
  let output = value.trim();
  const quotePairs = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["”", "”"],
    ["‘", "’"],
    ["’", "’"]
  ] as const;

  let changed = true;
  while (changed && output.length >= 2) {
    changed = false;
    for (const [left, right] of quotePairs) {
      if (output.startsWith(left) && output.endsWith(right)) {
        output = output.slice(left.length, -right.length).trim();
        changed = true;
      }
    }
  }

  return output;
}

function tryDecodeBase64Json(value: string): string | null {
  const compactValue = value.replace(/\s/g, "");
  if (!compactValue || !/^[A-Za-z0-9+/=_-]+$/.test(compactValue)) {
    return null;
  }

  try {
    const decodedValue = Buffer.from(compactValue.replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString("utf8")
      .trim();
    return looksLikeJsonText(decodedValue) ? decodedValue : null;
  } catch {
    return null;
  }
}

function looksLikeJsonText(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.startsWith("{") || trimmedValue.startsWith('"');
}

function summarizeCredentialEnvValue(value?: string): CredentialEnvValueSummary {
  const trimmedValue = value?.trim() ?? "";
  const decodedValue = trimmedValue ? tryDecodeBase64Json(trimmedValue) : null;

  return {
    present: Boolean(trimmedValue),
    length: trimmedValue.length,
    startsWithJson: trimmedValue.startsWith("{"),
    startsWithJsonString: trimmedValue.startsWith('"'),
    looksLikePrivateKey: trimmedValue.includes("BEGIN PRIVATE KEY"),
    decodedStartsWithJson: decodedValue ? decodedValue.startsWith("{") : false,
    decodedStartsWithJsonString: decodedValue ? decodedValue.startsWith('"') : false
  };
}

export function getGooglePlayCredentialEnvironmentSummary() {
  return {
    serviceAccountJson: summarizeCredentialEnvValue(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
    serviceAccountJsonBase64: summarizeCredentialEnvValue(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64),
    splitClientEmailPresent: Boolean(process.env.GOOGLE_PLAY_CLIENT_EMAIL?.trim()),
    splitPrivateKeyPresent: Boolean(process.env.GOOGLE_PLAY_PRIVATE_KEY?.trim()),
    packageNamePresent: Boolean(process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || process.env.ANDROID_PACKAGE_NAME?.trim())
  };
}

function parseGoogleServiceAccountJson(rawValue: string): GoogleServiceAccount {
  const trimmedValue = rawValue.trim();
  const cleanedValue = stripWrappingQuotes(trimmedValue);
  const candidates = Array.from(new Set([
    trimmedValue,
    cleanedValue,
    tryDecodeBase64Json(trimmedValue),
    tryDecodeBase64Json(cleanedValue)
  ].filter((value): value is string => Boolean(value))));

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as GoogleServiceAccount | string;
      if (typeof parsed === "string") {
        const nestedParsed = JSON.parse(stripWrappingQuotes(parsed)) as GoogleServiceAccount;
        return nestedParsed;
      }
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  if (cleanedValue === "[object Object]") {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is [object Object]. Paste the raw service account JSON text or base64 encoded JSON.");
  }

  if (cleanedValue.includes("BEGIN PRIVATE KEY")) {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON looks like a private key. Put the whole service account JSON there, or set GOOGLE_PLAY_CLIENT_EMAIL and GOOGLE_PLAY_PRIVATE_KEY separately.");
  }

  throw new Error(
    `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON could not be parsed: ${lastError instanceof Error ? lastError.message : "unknown_parse_error"}`
  );
}

function getSplitGooglePlayCredentials(): GooglePlayCredentials | null {
  const clientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey)
  };
}

function getGooglePlayCredentials(): GooglePlayCredentials {
  const serviceAccountEnvValues = [
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64
  ].filter((value): value is string => Boolean(value?.trim()));

  let serviceAccountParseError: unknown = null;

  for (const serviceAccountEnvValue of serviceAccountEnvValues) {
    try {
      const parsed = parseGoogleServiceAccountJson(serviceAccountEnvValue);
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
      }
      return {
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key)
      };
    } catch (error) {
      serviceAccountParseError = error;
    }
  }

  const splitCredentials = getSplitGooglePlayCredentials();
  if (splitCredentials) {
    if (serviceAccountParseError) {
      console.warn("[google-play] service account JSON could not be parsed. Falling back to split credentials.");
    }
    return splitCredentials;
  }

  if (serviceAccountParseError) {
    throw serviceAccountParseError;
  }

  throw new Error("Google Play service account is not configured.");
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
