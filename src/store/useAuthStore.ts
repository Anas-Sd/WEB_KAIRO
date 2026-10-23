import { create } from "zustand";
import { UserSession } from "@/types";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  initSession: () => void;
  login: (code: string) => Promise<boolean>;
  logout: () => void;
  updateUserSession: (session: UserSession) => void;
  clearError: () => void;
}

const STORAGE_KEY = "kairo_session";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  initSession: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: UserSession = JSON.parse(raw);
        if (parsed.code && parsed.name) {
          set({ user: parsed, isInitialized: true });
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse stored session", e);
    }
    set({ user: null, isInitialized: true });
  },

  login: async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      set({ error: "Please enter your access code" });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from("access_codes")
        .select("code, name")
        .eq("code", trimmed)
        .maybeSingle();

      if (error) {
        set({
          isLoading: false,
          error: "Failed to verify access code: " + error.message,
        });
        return false;
      }

      if (!data) {
        set({
          isLoading: false,
          error: "Invalid access code. Please check and try again.",
        });
        return false;
      }

      const session: UserSession = {
        code: data.code,
        name: data.name || data.code,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }

      set({ user: session, isLoading: false, error: null });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, error: null });
  },

  updateUserSession: (session: UserSession) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    set({ user: session });
  },

  clearError: () => set({ error: null }),
}));
