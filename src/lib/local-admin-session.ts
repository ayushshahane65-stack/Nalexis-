export const LOCAL_ADMIN_COOKIE = "nalexis_local_admin";
export const LOCAL_ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function getSessionSecret(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return process.env.LOCAL_ADMIN_SESSION_SECRET || null;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): ArrayBuffer {
  const buffer = new ArrayBuffer(value.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return buffer;
}

export async function createLocalAdminSession(): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Local admin sign-in is not configured for this environment.");

  const expiresAt = String(Math.floor(Date.now() / 1000) + LOCAL_ADMIN_SESSION_SECONDS);
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiresAt));
  return `${expiresAt}.${toHex(signature)}`;
}

export async function verifyLocalAdminSession(token: string | undefined): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  const [expiresAt, signature, extra] = token.split(".");
  if (
    extra !== undefined ||
    !/^\d+$/.test(expiresAt) ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    Number(expiresAt) <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const key = await importSigningKey(secret);
  return crypto.subtle.verify(
    "HMAC",
    key,
    fromHex(signature),
    new TextEncoder().encode(expiresAt),
  );
}
