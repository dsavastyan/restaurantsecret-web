// src/store/auth.ts
import { create } from "zustand";

type AuthState = {
  accessToken: string | null;
  setToken: (t: string | null) => void;
};
export const useAuth = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("rs_access") || null,
  setToken: (t) => {
    if (t) localStorage.setItem("rs_access", t);
    else localStorage.removeItem("rs_access");
    set({ accessToken: t });
  },
}));
