import { create } from "zustand";
import type { User } from "@scenego/shared";

const STORAGE_KEY = "scenego.auth";

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface AuthStore {
  user?: User;
  accessToken?: string;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

function loadInitialSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const initialSession = loadInitialSession();

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialSession?.user,
  accessToken: initialSession?.accessToken,
  setSession: (session) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({
      user: session.user,
      accessToken: session.accessToken
    });
  },
  clearSession: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({
      user: undefined,
      accessToken: undefined
    });
  }
}));

