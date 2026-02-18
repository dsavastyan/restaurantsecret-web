const PROFILE_NAME_STORAGE_PREFIX = "rs_profile_name_v1:";

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

export function getEmailFromAccessToken(token: string | null | undefined): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded);
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    return email || null;
  } catch {
    return null;
  }
}

function getNameStorageKey(email: string | null | undefined) {
  return `${PROFILE_NAME_STORAGE_PREFIX}${email || "guest"}`;
}

export function saveProfileNameForToken(token: string | null | undefined, name: string) {
  if (typeof window === "undefined") return;

  const normalizedName = name.trim();
  if (!normalizedName) return;

  const tokenEmail = getEmailFromAccessToken(token);

  try {
    window.localStorage.setItem(getNameStorageKey(tokenEmail), normalizedName);
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}

export function getProfileNameForToken(token: string | null | undefined) {
  if (typeof window === "undefined") return "";

  const tokenEmail = getEmailFromAccessToken(token);

  try {
    return window.localStorage.getItem(getNameStorageKey(tokenEmail)) || "";
  } catch {
    return "";
  }
}
