"use client";

import { useApp } from "../context/AppContext";
import type { TabId } from "../types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today",    label: "hoy",      icon: "today" },
  { id: "workout",  label: "rutina",   icon: "fitness_center" },
  { id: "diet",     label: "dieta",    icon: "restaurant" },
  { id: "progress", label: "progreso", icon: "insights" },
  { id: "coach",    label: "coach",    icon: "auto_awesome" },
];

export default function BottomNav({ onOpenCamera }: { onOpenCamera: () => void }) {
  const { state, dispatch } = useApp();

  const renderTab = (id: TabId, label: string, icon: string) => {
    const isActive = state.activeTab === id;
    return (
      <button
        key={id}
        onClick={() => dispatch({ type: "SET_TAB", tab: id })}
        className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-3.5 py-2 rounded-full text-[9px] font-medium transition-all duration-200 ${
          isActive
            ? "bg-white/[0.1] text-[#f4f4f0]"
            : "text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.04]"
        }`}
      >
        <span
          className="material-symbols-outlined text-[18px] transition-colors duration-200"
          style={{ color: isActive ? "#a3e635" : "inherit" }}
        >
          {icon}
        </span>
        <span className="leading-none tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <div className="pointer-events-auto glass-pill p-1.5 flex items-center gap-0.5 sm:gap-1 shadow-2xl">
        {TABS.slice(0, 2).map(({ id, label, icon }) => renderTab(id, label, icon))}

        {/* CTA foto — elevated lime */}
        <button
          onClick={onOpenCamera}
          aria-label="registrar comida con foto"
          title="foto"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#a3e635] text-[#09090b] flex items-center justify-center -mt-2 sm:-mt-3 border-[3px] border-[#09090b] lime-pulse transition-all duration-200 hover:bg-[#bef264] hover:scale-105 active:scale-95 shrink-0 mx-0.5"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
        </button>

        {TABS.slice(2).map(({ id, label, icon }) => renderTab(id, label, icon))}
      </div>
    </nav>
  );
}
