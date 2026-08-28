"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import type { TabId } from "./types";
import { insertMealLog } from "@/lib/supabase/gym";

import BottomNav from "./components/BottomNav";
import AICameraModal from "./components/gym/AICameraModal";
import TodayView from "./components/gym/TodayView";
import WorkoutView from "./components/gym/WorkoutView";
import DietView from "./components/gym/DietView";
import ProgressView from "./components/gym/ProgressView";
import CoachView from "./components/gym/CoachView";

function VoraApp() {
  const router = useRouter();
  const { state, dispatch, authLoading, user, profile, profileLoading } = useApp();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Cada vez que se cambia de pantalla (tab), volver al inicio
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.activeTab]);

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
      <main key={reloadKey} className="flex-1 px-3 sm:px-4 pt-4 sm:pt-6 max-w-xl mx-auto w-full overflow-x-hidden">
        {renderView()}
      </main>
      <BottomNav onOpenCamera={() => setCameraOpen(true)} />
      {cameraOpen && user && profile && (
        <AICameraModal
          allergies={profile.allergies ?? []}
          onLog={(log) => {
            if (!user) return;
            insertMealLog(user.id, {
              date: new Date().toISOString().split("T")[0],
              ...log,
            }).then(() => setReloadKey((k) => k + 1));
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
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
