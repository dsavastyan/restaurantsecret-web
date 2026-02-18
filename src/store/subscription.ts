import { useSyncExternalStore } from "react";

import { apiGet, isUnauthorizedError } from "@/lib/api";

type SubscriptionState = {
  hasActiveSub: boolean;
  setHasActiveSub: (value: boolean) => void;
  fetchStatus: (token?: string | null) => Promise<boolean>;
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const normalizeStatus = (value?: string | null) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

let state: SubscriptionState = {
  hasActiveSub: false,
  setHasActiveSub: () => undefined,
  fetchStatus: async () => false,
};

const updateState = (partial: Partial<SubscriptionState>) => {
  state = { ...state, ...partial };
  notify();
};

const setHasActiveSub = (value: boolean) => {
  updateState({ hasActiveSub: value });
};

const fetchStatus = async (token?: string | null) => {
  if (!token) {
    setHasActiveSub(false);
    return false;
  }

  try {
    const response = await apiGet<{ status?: string | null; statusNorm?: string | null; expires_at?: string | null }>(
      "/api/subscriptions/status",
      token,
    );
    const statusNorm = normalizeStatus(response?.statusNorm || response?.status);
    const expiresAt = response?.expires_at;

    let isActive = (statusNorm === "active" || statusNorm === "canceled");

    if (isActive && expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (!isNaN(expiresDate.getTime()) && expiresDate < new Date()) {
        isActive = false;
      }
    }

    setHasActiveSub(isActive);
    return isActive;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      setHasActiveSub(false);
      return false;
    }
    console.error("Failed to fetch subscription status", error);
    setHasActiveSub(false);
    return false;
  }
};

state = {
  ...state,
  setHasActiveSub,
  fetchStatus,
};

const getSnapshot = () => state;

export function useSubscriptionStore(): SubscriptionState;
export function useSubscriptionStore<T>(selector: (state: SubscriptionState) => T): T;
export function useSubscriptionStore<T>(selector?: (state: SubscriptionState) => T) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (selector) return selector(snapshot);
  return snapshot;
}

export const selectHasActiveSub = (subscription: SubscriptionState) => subscription.hasActiveSub;
export const selectFetchStatus = (subscription: SubscriptionState) => subscription.fetchStatus;
export const selectSetHasActiveSub = (subscription: SubscriptionState) => subscription.setHasActiveSub;
