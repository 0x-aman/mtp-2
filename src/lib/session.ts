export const SESSION_COOKIE = "mpt_session";
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS ?? DEFAULT_SESSION_MAX_AGE_SECONDS);

const encoder = new TextEncoder();

function getSessionSecret() {
  return process.env.SESSION_SECRET || "replace-with-a-long-random-secret";
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = Array.from(new Uint8Array(buffer));
  const binary = String.fromCharCode(...bytes);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return toBase64Url(signature);
}

function sameSignature(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}

export async function createSessionToken(now = Date.now()) {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const signature = await sign(payload);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");
  const expires = Number(expiresAt);

  if (!expiresAt || !signature || !Number.isFinite(expires) || expires <= Date.now()) {
    return false;
  }

  const expected = await sign(expiresAt);

  return sameSignature(signature, expected);
}

export function sessionCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}
