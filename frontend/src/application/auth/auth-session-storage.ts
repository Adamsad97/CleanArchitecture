import type { AuthSession } from "../../api/ecoeats-api";

const authSessionStorageKey = "ecoeats_session";

export function loadAuthSessionFromStorage(): AuthSession | null {
  const serializedSession = window.localStorage.getItem(authSessionStorageKey);
  if (!serializedSession) return null;

  try {
    return JSON.parse(serializedSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(authSessionStorageKey);
    return null;
  }
}

export function saveAuthSessionToStorage(session: AuthSession): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

export function clearAuthSessionFromStorage(): void {
  window.localStorage.removeItem(authSessionStorageKey);
}
