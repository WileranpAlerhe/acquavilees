const COOKIE_NAME = "acqualive_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function adminSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim()
    || process.env.PINPAY_TOKEN?.trim()
    || "acqualive-admin-session-change-me";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(adminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function parseCookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export async function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

export function adminCookieHeader(value: string, secure = true) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearAdminCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAdminRequest(request: Request) {
  const cookie = parseCookies(request)[COOKIE_NAME];
  if (!cookie) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return parts[2] === await sign(payload);
}

export function validAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USER?.trim() || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin";
  return username === expectedUser && password === expectedPassword;
}
