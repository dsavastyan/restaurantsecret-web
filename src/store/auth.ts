import { useSyncExternalStore } from "react";

type AuthState = {
  accessToken: string | null;
  setToken: (token: string | null) => void;
};

export const selectAccessToken = (state: AuthState) => state.accessToken;
export const selectSetToken = (state: AuthState) => state.setToken;

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const readStoredToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("rs_access");
  } catch (error) {
    console.warn("Failed to read access token from localStorage", error);
    return null;
  }
};

let state: AuthState;

const persistToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem("rs_access", token);
    } else {
      window.localStorage.removeItem("rs_access");
    }
  } catch (error) {
    console.warn("Failed to persist access token", error);
  }
};

const setToken = (token: string | null) => {
  persistToken(token);
  state = { ...state, accessToken: token };
  notify();
};

state = {
  accessToken: readStoredToken(),
  setToken,
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (selector) {
    return selector(snapshot);
  }
  return snapshot;
}
