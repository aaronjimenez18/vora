"use client";

import { useRouter } from "next/navigation";
import { AppProvider, useApp } from "./context/AppContext";
import type { TabId } from "./types";

import BottomNav from "./components/BottomNav";
import TodayView from "./components/gym/TodayView";
import WorkoutView from "./components/gym/WorkoutView";
import DietView from "./components/gym/DietView";
import ProgressView from "./components/gym/ProgressView";
import CoachView from "./components/gym/CoachView";

function VoraApp() {
  const router = useRouter();
  const { state, dispatch, authLoading, user, profile, profileLoading } = useApp();

  // Puerta de auth: esperar resolución de sesión
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse" />
      </div>
    );
  }

  if (!user) return null; // el proxy redirige a /login

  // Gate de onboarding: sin perfil completo → wizard
  if (!profileLoading && !profile) {
    router.replace("/onboarding");
    return null;
  }

  const navigate = (tab: TabId) => dispatch({ type: "SET_TAB", tab });

  const renderView = () => {
    switch (state.activeTab) {
      case "workout":
        return <WorkoutView />;
      case "diet":
        return <DietView />;
      case "progress":
        return <ProgressView />;
      case "coach":
        return <CoachView />;
      case "today":
      default:
        return <TodayView onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <main className="flex-1 px-3 sm:px-4 pt-4 sm:pt-6 max-w-xl mx-auto w-full overflow-x-hidden">{renderView()}</main>
      <BottomNav />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <VoraApp />
    </AppProvider>
  );
}
