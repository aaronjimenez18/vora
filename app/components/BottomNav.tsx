"use client";

import { useApp } from "../context/AppContext";
import type { TabId } from "../types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today",    label: "Hoy",      icon: "today" },
  { id: "workout",  label: "Rutina",   icon: "fitness_center" },
  { id: "diet",     label: "Dieta",    icon: "restaurant" },
  { id: "progress", label: "Progreso", icon: "insights" },
  { id: "coach",    label: "Coach",    icon: "auto_awesome" },
];

export default function BottomNav() {
  const { state, dispatch } = useApp();

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <div className="pointer-events-auto glass-pill p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-2xl">
        {TABS.map(({ id, label, icon }) => {
          const isActive = state.activeTab === id;
          return (
            <button
              key={id}
              onClick={() => dispatch({ type: "SET_TAB", tab: id })}
              className={`flex items-center gap-2 px-2.5 sm:px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-white/[0.1] text-[#f4f4f0] shadow-sm"
                  : "text-[#a1a1aa] hover:text-[#f4f4f0] hover:bg-white/[0.04]"
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ color: isActive ? "#a3e635" : "inherit" }}
              >
                {icon}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
