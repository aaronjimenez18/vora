"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { TabId, UserProfile } from "../types";

// ─── State (UI only) ─────────────────────────────────────────

export interface AppState {
  activeTab: TabId;
}

const INITIAL_STATE: AppState = {
  activeTab: "today",
};

type Action = { type: "SET_TAB"; tab: TabId };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Auth
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) setProfile((data as UserProfile) ?? null);
      setProfileLoading(false);
    },
    [supabase]
  );

  // Sesión inicial + cambios de estado de auth
  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      setUser(u);
      if (u) loadProfile(u.id);
      else {
        setProfile(null);
        setProfileLoading(false);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else {
        setProfile(null);
        setProfileLoading(false);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        user,
        profile,
        authLoading,
        profileLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
