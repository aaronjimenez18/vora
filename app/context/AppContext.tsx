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
import type {
  AppState,
  MealEntry,
  MacroGoal,
  AnalyticsDay,
  InventoryItem,
  BudgetEntry,
  ChatMessage,
  TabId,
  UserProfile,
} from "../types";

// ─── Initial State ────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

const DEFAULT_GOALS: MacroGoal = {
  calories: 2400,
  protein: 160,
  carbs: 300,
  fat: 70,
};

const INITIAL_MEALS: MealEntry[] = [
  {
    id: "m1",
    name: "Oatmeal & Berries",
    category: "breakfast",
    calories: 420,
    macros: { protein: 14, carbs: 65, fat: 8 },
    time: new Date().setHours(8, 0, 0, 0).toString(),
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBRgpJzmUM7BecfdUf5wCIOrglkzpl17ezMTJShac6yvhJEvqaD2sVx5QZz50kPAQiDDh0qD4pLUMXrRpXooT5EaVcJ9xQvOm0w4rfaXsdL0ZBBAROkUxB4FE8eU8GPAXlXy5TkLA1CieqzivWUn099KorGgGryF1DmCYT1KHzW7tMDQP-AXVIYQQC0sxEHnnx0nXNNg2vNF__NKQ7la9Lloi8EnP47bKeh1TPJUtGMD9iCWxVg03lDIg",
  },
  {
    id: "m2",
    name: "Grilled Chicken Salad",
    category: "lunch",
    calories: 550,
    macros: { protein: 48, carbs: 24, fat: 22 },
    time: new Date().setHours(13, 30, 0, 0).toString(),
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5w_fExv5tKJhFKSiDK1vLHNs1tWHxZb8v4k67xpFPg4bqt3EfakA5KCd7vCPMflJZ09IpEgHN3f3u7mBY7dELk5tkFCEsCL1MFXQ0Hq7LFnxKLKXvUlC5Kf88jxnY06YDfT5pVoSOZMxGQ",
  },
  {
    id: "m3",
    name: "Greek Yogurt Parfait",
    category: "snack",
    calories: 280,
    macros: { protein: 18, carbs: 38, fat: 6 },
    time: new Date().setHours(16, 0, 0, 0).toString(),
  },
];

const INITIAL_STATE: AppState = {
  meals: INITIAL_MEALS,
  water: { date: today, glasses: 6, goal: 8 },
  goals: DEFAULT_GOALS,
  analytics: generateAnalytics(),
  weights: [
    { date: "2026-07-28", weight: 78.5 },
    { date: "2026-08-01", weight: 78.1 },
    { date: "2026-08-04", weight: 77.8 },
    { date: "2026-08-06", weight: 77.5 },
  ],
  inventory: [
    { id: "i1", name: "Chicken breast", quantity: 500, unit: "g", expiresAt: "2026-08-08", category: "protein", cost: 4.5 },
    { id: "i2", name: "Brown rice", quantity: 1000, unit: "g", category: "carbs", cost: 2.0 },
    { id: "i3", name: "Olive oil", quantity: 500, unit: "ml", category: "fats", cost: 6.0 },
    { id: "i4", name: "Spinach", quantity: 200, unit: "g", expiresAt: "2026-08-07", category: "vegetables", cost: 1.8 },
    { id: "i5", name: "Whey protein", quantity: 900, unit: "g", category: "supplements", cost: 32.0 },
    { id: "i6", name: "Greek yogurt", quantity: 400, unit: "g", expiresAt: "2026-08-10", category: "dairy", cost: 2.5 },
  ],
  budgetEntries: [
    { id: "b1", name: "Chicken & rice prep", amount: 28.5, category: "meal prep", date: "2026-08-01" },
    { id: "b2", name: "Protein powder", amount: 42.0, category: "supplements", date: "2026-08-03" },
    { id: "b3", name: "Weekly grocery run", amount: 65.0, category: "groceries", date: "2026-08-05" },
  ],
  budgetGoal: 200,
  chatMessages: [
    {
      id: "cm1",
      role: "assistant",
      content:
        "Hola! Soy tu coach de nutrición IA. He analizado tu ingesta de hoy: llevas 1,250 kcal con 80g de proteína. Para alcanzar tu meta de 2,400 kcal necesitas aproximadamente 1,150 kcal más. ¿Quieres que te sugiera una cena balanceada?",
      timestamp: new Date().toISOString(),
    },
  ],
  activeTab: "today",
};

function generateAnalytics(): AnalyticsDay[] {
  const days: AnalyticsDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      calories: 1800 + Math.floor(Math.random() * 600),
      protein: 110 + Math.floor(Math.random() * 60),
      carbs: 180 + Math.floor(Math.random() * 100),
      fat: 55 + Math.floor(Math.random() * 30),
    });
  }
  return days;
}

// ─── Reducer ──────────────────────────────────────────────────

type Action =
  | { type: "SET_TAB"; tab: TabId }
  | { type: "ADD_MEAL"; meal: MealEntry }
  | { type: "REMOVE_MEAL"; id: string }
  | { type: "LOG_WATER"; glasses: number }
  | { type: "SET_GOALS"; goals: MacroGoal }
  | { type: "ADD_INVENTORY"; item: InventoryItem }
  | { type: "REMOVE_INVENTORY"; id: string }
  | { type: "ADD_BUDGET"; entry: BudgetEntry }
  | { type: "REMOVE_BUDGET"; id: string }
  | { type: "SET_BUDGET_GOAL"; goal: number }
  | { type: "ADD_CHAT_MESSAGE"; message: ChatMessage }
  | { type: "LOAD_STATE"; state: Partial<AppState> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "ADD_MEAL":
      return { ...state, meals: [...state.meals, action.meal] };
    case "REMOVE_MEAL":
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) };
    case "LOG_WATER":
      return { ...state, water: { ...state.water, glasses: Math.max(0, Math.min(action.glasses, state.water.goal + 4)) } };
    case "SET_GOALS":
      return { ...state, goals: action.goals };
    case "ADD_INVENTORY":
      return { ...state, inventory: [...state.inventory, action.item] };
    case "REMOVE_INVENTORY":
      return { ...state, inventory: state.inventory.filter((i) => i.id !== action.id) };
    case "ADD_BUDGET":
      return { ...state, budgetEntries: [...state.budgetEntries, action.entry] };
    case "REMOVE_BUDGET":
      return { ...state, budgetEntries: state.budgetEntries.filter((b) => b.id !== action.id) };
    case "SET_BUDGET_GOAL":
      return { ...state, budgetGoal: action.goal };
    case "ADD_CHAT_MESSAGE":
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case "LOAD_STATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Computed
  totalCalories: number;
  totalMacros: { protein: number; carbs: number; fat: number };
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

  // Persist to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vora-state");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        dispatch({ type: "LOAD_STATE", state: parsed });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const { chatMessages, meals, water, goals, weights, inventory, budgetEntries, budgetGoal } = state;
      localStorage.setItem("vora-state", JSON.stringify({ chatMessages, meals, water, goals, weights, inventory, budgetEntries, budgetGoal }));
    } catch {}
  }, [state]);

  const totalCalories = state.meals.reduce((s, m) => s + m.calories, 0);
  const totalMacros = state.meals.reduce(
    (acc, m) => ({
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        totalCalories,
        totalMacros,
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
