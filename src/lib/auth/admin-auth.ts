import { cookies } from "next/headers";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database";

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
  profile?: Profile;
  error?: string;
  statusCode: number;
}

export interface AdminSessionPayload {
  email: string;
  role: "admin";
  iat: number;
  exp: number;
}

export const ADMIN_COOKIE_NAME = "admin_session";
export const DEFAULT_SESSION_MAX_AGE = 86400; // 24 hours in seconds

/**
 * Convert Uint8Array bytes to Base64URL string
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Convert Base64URL string to Uint8Array bytes
 */
function base64UrlToBytes(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert UTF-8 string to Base64URL
 */
function stringToBase64Url(str: string): string {
  return bytesToBase64Url(new TextEncoder().encode(str));
}

/**
 * Convert Base64URL to UTF-8 string
 */
function base64UrlToString(base64Url: string): string {
  return new TextDecoder().decode(base64UrlToBytes(base64Url));
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Compute SHA-256 hex string
 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute SHA-512 hex string
 */
export async function sha512Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive HMAC-SHA256 CryptoKey for session token signing and verification
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD_HASH ||
    "mmi-admin-default-secure-secret-key";
  const enc = new TextEncoder().encode(secret);

  return crypto.subtle.importKey(
    "raw",
    enc,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"]
  );
}

/**
 * Verifies candidate password against stored ADMIN_PASSWORD_HASH
 * Supports:
 * - Direct SHA-256 hex (64 chars)
 * - Direct SHA-512 hex (128 chars)
 * - Salted hex "salt:sha256_hex" or "sha256:salt:hex"
 * - Salted hex "salt:sha512_hex" or "sha512:salt:hex"
 */
export async function verifyPasswordHash(
  passwordCandidate: string,
  storedHash: string
): Promise<boolean> {
  if (!passwordCandidate || !storedHash) return false;

  const trimmedHash = storedHash.trim();

  // Salted format check: "salt:hash" or "alg:salt:hash"
  if (trimmedHash.includes(":")) {
    const parts = trimmedHash.split(":");
    if (parts.length === 2) {
      const [salt, expectedHash] = parts;
      const expectedLower = expectedHash.toLowerCase();

      // Check SHA-256 with salt + password
      const candSha256_1 = await sha256Hex(salt + passwordCandidate);
      if (timingSafeEqual(candSha256_1, expectedLower)) return true;

      // Check SHA-256 with password + salt
      const candSha256_2 = await sha256Hex(passwordCandidate + salt);
      if (timingSafeEqual(candSha256_2, expectedLower)) return true;

      // Check SHA-512 with salt + password
      const candSha512_1 = await sha512Hex(salt + passwordCandidate);
      if (timingSafeEqual(candSha512_1, expectedLower)) return true;

      // Check SHA-512 with password + salt
      const candSha512_2 = await sha512Hex(passwordCandidate + salt);
      if (timingSafeEqual(candSha512_2, expectedLower)) return true;
    } else if (parts.length === 3) {
      const [alg, salt, expectedHash] = parts;
      const expectedLower = expectedHash.toLowerCase();

      if (alg.toLowerCase() === "sha256") {
        const cand = await sha256Hex(salt + passwordCandidate);
        if (timingSafeEqual(cand, expectedLower)) return true;
      } else if (alg.toLowerCase() === "sha512") {
        const cand = await sha512Hex(salt + passwordCandidate);
        if (timingSafeEqual(cand, expectedLower)) return true;
      }
    }
  }

  // Standard SHA-256 hex (64 characters)
  if (trimmedHash.length === 64) {
    const candSha256 = await sha256Hex(passwordCandidate);
    return timingSafeEqual(candSha256, trimmedHash.toLowerCase());
  }

  // Standard SHA-512 hex (128 characters)
  if (trimmedHash.length === 128) {
    const candSha512 = await sha512Hex(passwordCandidate);
    return timingSafeEqual(candSha512, trimmedHash.toLowerCase());
  }

  return false;
}

/**
 * Validates admin login credentials against ADMIN_EMAIL and ADMIN_PASSWORD_HASH
 */
export async function verifyAdminCredentials(
  emailCandidate: string,
  passwordCandidate: string
): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!configuredEmail || !configuredPasswordHash) {
    console.error(
      "Admin credentials not configured in environment variables (ADMIN_EMAIL, ADMIN_PASSWORD_HASH)"
    );
    return false;
  }

  if (
    !emailCandidate ||
    emailCandidate.trim().toLowerCase() !== configuredEmail.trim().toLowerCase()
  ) {
    return false;
  }

  return verifyPasswordHash(passwordCandidate, configuredPasswordHash);
}

/**
 * Generates an HMAC-SHA256 signed session token for the admin
 */
export async function createAdminSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = Number(process.env.ADMIN_SESSION_MAX_AGE) || DEFAULT_SESSION_MAX_AGE;

  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    role: "admin",
    iat: now,
    exp: now + maxAge,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = stringToBase64Url(payloadJson);

  const key = await getSigningKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );

  const signatureB64 = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token
 */
export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;

  try {
    const key = await getSigningKey();
    const sigBytes = base64UrlToBytes(signatureB64);

    const isValidSig = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      new TextEncoder().encode(payloadB64)
    );

    if (!isValidSig) return null;

    const payloadJson = base64UrlToString(payloadB64);
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return null;
    }

    const configuredEmail = process.env.ADMIN_EMAIL;
    if (
      configuredEmail &&
      payload.email.toLowerCase() !== configuredEmail.trim().toLowerCase()
    ) {
      return null;
    }

    if (payload.role !== "admin") {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the admin session from request cookies or headers
 */
export async function getAdminSession(
  reqOrToken?: Request | string
): Promise<AdminSessionPayload | null> {
  let token: string | null = null;

  if (typeof reqOrToken === "string") {
    token = reqOrToken;
  } else if (reqOrToken instanceof Request) {
    const cookieHeader = reqOrToken.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    } else {
      const authHeader = reqOrToken.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);
      if (sessionCookie) {
        token = sessionCookie.value;
      }
    } catch {
      // Called outside server component / request context
    }
  }

  if (!token) return null;
  return verifyAdminSessionToken(token);
}

/**
 * Server-Side Admin Authorization Validator
 * Validates the HMAC session token for all protected API routes and server actions.
 */
export async function requireAdminSession(
  tokenOrReq?: Request | string
): Promise<AdminAuthResult> {
  const session = await getAdminSession(tokenOrReq);

  if (!session) {
    return {
      authorized: false,
      error: "Authentication required. Please log in with admin credentials.",
      statusCode: 401,
    };
  }

  const profile: Profile = {
    id: session.email,
    email: session.email,
    role: "admin",
    display_name: "Administrator",
    avatar_url: null,
    city: null,
    created_at: new Date(session.iat * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    authorized: true,
    userId: session.email,
    email: session.email,
    profile,
    statusCode: 200,
  };
}

/**
 * Record an immutable administrative action to public.admin_actions (if DB is configured)
 */
export async function logAdminAuditAction({
  adminId,
  action,
  targetType,
  targetId,
  metadata,
}: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
}) {
  try {
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) return;

    await serviceClient.from("admin_actions").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Audit action logged (database write skipped):", action);
  }
}
