export const ADMIN_EMAIL = "admin123@agrofam.local";
export const ADMIN_USERNAME = "admin123";

export function isAdminLogin(raw: string) {
  const v = raw.trim().toLowerCase();
  return v === ADMIN_USERNAME || v === ADMIN_EMAIL;
}

export function isAdminEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/** PGLite/Postgres may return bool as true, 1, "t", or "true". */
export function coerceAdminFlag(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "t" || value === "true";
}

export function loginEmailOf(raw: string) {
  const v = raw.trim();
  if (!v) return v;
  if (v.includes("@")) return v.toLowerCase();
  return `${v.toLowerCase()}@agrofam.local`;
}
