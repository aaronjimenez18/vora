"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { BudgetEntry } from "../types";

export default function BudgetView() {
  const { state, dispatch } = useApp();
  const { inventory, budgetEntries, budgetGoal } = state;
  const [tab, setTab] = useState<"budget" | "inventory">("budget");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", amount: "", category: "groceries" });

  const totalSpent = budgetEntries.reduce((s, b) => s + b.amount, 0);
  const budgetPct = Math.min(Math.round((totalSpent / budgetGoal) * 100), 100);

  const handleAddBudget = () => {
    if (!newItem.name || !newItem.amount) return;
    const entry: BudgetEntry = {
      id: `b-${Date.now()}`,
      name: newItem.name,
      amount: parseFloat(newItem.amount),
      category: newItem.category,
      date: new Date().toISOString().split("T")[0],
    };
    dispatch({ type: "ADD_BUDGET", entry });
    setNewItem({ name: "", amount: "", category: "groceries" });
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col gap-10 pb-32 animate-fade-in-up">
      {/* Editorial Title */}
      <div className="flex flex-col gap-2">
        <span className="label-caps">Gestión de Insumos</span>
        <h2 className="font-serif-title text-4xl text-[#f4f4f0] font-normal">
          Despensa & <span className="italic text-[#a3e635] font-light">Presupuesto</span>
        </h2>
        <p className="text-sm text-[#a1a1aa] font-light leading-relaxed">
          Control de compras semanales, stock de alimentos e insumos de meal prep.
        </p>
      </div>

      {/* Budget Hero */}
      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="label-caps block mb-2">Presupuesto Mensual</span>
            <div className="font-serif-title text-5xl text-[#f4f4f0]">
              ${totalSpent.toFixed(2)}{" "}
              <span className="text-xl text-[#71717a] font-sans font-light">/ ${budgetGoal}</span>
            </div>
          </div>
          <span className="label-caps text-[#a3e635] text-sm font-semibold">{budgetPct}% Asignado</span>
        </div>

        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mt-2">
          <div className="h-full bg-[#a3e635] rounded-full transition-all duration-700" style={{ width: `${budgetPct}%` }} />
        </div>
      </div>

      {/* Segmented Control */}
      <div className="flex gap-3">
        <button
          onClick={() => setTab("budget")}
          className={tab === "budget" ? "btn-pill-primary" : "btn-pill-secondary"}
        >
          Gastos Registrados
        </button>
        <button
          onClick={() => setTab("inventory")}
          className={tab === "inventory" ? "btn-pill-primary" : "btn-pill-secondary"}
        >
          Stock en Despensa
        </button>
      </div>

      {/* Expense Stream */}
      {tab === "budget" && (
        <div className="flex flex-col gap-3">
          {budgetEntries.map((entry) => (
            <div key={entry.id} className="glass-floating p-5 flex items-center justify-between">
              <div>
                <h4 className="font-serif-title text-xl text-[#f4f4f0] font-normal">
                  {entry.name}
                </h4>
                <span className="text-xs text-[#71717a]">
                  {entry.date} • {entry.category}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-serif-title text-xl text-[#a3e635]">
                  ${entry.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => dispatch({ type: "REMOVE_BUDGET", id: entry.id })}
                  className="text-[#52525b] hover:text-[#ef4444] p-2"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}

          {showAdd ? (
            <div className="glass-floating p-6 flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre del gasto..."
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="input-pill"
              />
              <input
                type="number"
                placeholder="Monto ($)..."
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                className="input-pill"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="btn-pill-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={handleAddBudget} className="btn-pill-primary flex-1">
                  Guardar Gasto
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="btn-pill-secondary py-3 text-center">
              + Registrar Nuevo Gasto
            </button>
          )}
        </div>
      )}

      {/* Inventory Stream */}
      {tab === "inventory" && (
        <div className="flex flex-col gap-3">
          {inventory.map((item) => (
            <div key={item.id} className="glass-floating p-5 flex items-center justify-between">
              <div>
                <h4 className="font-serif-title text-xl text-[#f4f4f0] font-normal">
                  {item.name}
                </h4>
                <span className="text-xs text-[#71717a]">
                  {item.quantity} {item.unit} • Categoría: {item.category}
                </span>
              </div>
              <button
                onClick={() => dispatch({ type: "REMOVE_INVENTORY", id: item.id })}
                className="text-[#52525b] hover:text-[#ef4444] p-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
