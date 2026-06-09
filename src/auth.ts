// Clerk JWT verification for Cloudflare Workers
// Uses Web Crypto API to verify RS256 JWT tokens without external dependencies
// Ported from IMEQry-GSPK auth.ts

type ClerkJWTPayload = {
  sub: string;
  iss: string;
  exp: number;
  iat: number;
  nbf: number;
  azp?: string;
};

const CLERK_JWKS_CACHE: { keys: JsonWebKey[]; fetchedAt: number } = {
  keys: [],
  fetchedAt: 0,
};
const CACHE_TTL = 3600_000; // 1 hour

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function fetchJWKS(issuer: string): Promise<JsonWebKey[]> {
  const now = Date.now();
  if (
    CLERK_JWKS_CACHE.keys.length > 0 &&
    now - CLERK_JWKS_CACHE.fetchedAt < CACHE_TTL
  ) {
    return CLERK_JWKS_CACHE.keys;
  }

  const url = `${issuer}/.well-known/jwks.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);

  const data = (await res.json()) as { keys: JsonWebKey[] };
  CLERK_JWKS_CACHE.keys = data.keys;
  CLERK_JWKS_CACHE.fetchedAt = now;
  return data.keys;
}

async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

export async function verifyClerkToken(
  token: string
): Promise<ClerkJWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const headerJson = new TextDecoder().decode(base64UrlDecode(parts[0]));
    const header = JSON.parse(headerJson) as { alg: string; kid: string };
    if (header.alg !== "RS256") return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
    const payload = JSON.parse(payloadJson) as ClerkJWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.nbf > now + 60) return null; // allow 60s clock skew

    // Fetch JWKS and find matching key
    const keys = await fetchJWKS(payload.iss);
    const jwk = keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;

    // Verify signature
    const key = await importKey(jwk);
    const signatureBytes = base64UrlDecode(parts[2]);
    const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signatureBytes,
      dataBytes
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

export function extractToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}
