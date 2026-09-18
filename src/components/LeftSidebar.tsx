import React, { useState } from 'react';
import { CategoryFilter } from '../types';

interface LeftSidebarProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  availableHours: number;
  onChangeHours: (hours: number) => void;
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
  onOptimizeItinerary: () => void;
  isOptimizing?: boolean;
}

const INTEREST_CHIPS = [
  'Gastronomía',
  'Historia',
  'Naturaleza',
  'Cultura',
  'Deportes',
  'Arquitectura',
  'Fotografía',
  'Vida Nocturna',
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  availableHours,
  onChangeHours,
  selectedInterests,
  onToggleInterest,
  onOptimizeItinerary,
  isOptimizing = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <aside className="pointer-events-auto self-start mt-14 animate-fade-in">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="bg-[#0a0806]/85 backdrop-blur-xl border border-white/10 hover:border-[#ffc24b] px-3 py-2.5 rounded-xl text-white shadow-2xl flex items-center gap-2 transition-all cursor-pointer group"
          title="Desplegar Preferencias"
        >
          <span className="material-symbols-outlined text-[18px] text-[#ffc24b]">tune</span>
          <span className="text-xs font-bold font-sans-technical tracking-wide hidden sm:inline">Filtros</span>
          <span className="material-symbols-outlined text-xs text-gray-400 group-hover:translate-x-0.5 transition-transform">
            chevron_right
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto w-72 sm:w-80 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar bg-[#0a0806]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 text-white shadow-2xl flex flex-col justify-between gap-4 transition-all animate-fade-in">
      <div className="space-y-4">
        {/* Header Title with Collapse Button */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc24b] text-[20px]">tune</span>
            <h2 className="font-cormorant text-lg font-bold text-white tracking-wide">
              Preferencias
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase bg-[#005151]/50 text-[#97e8e8] px-1.5 py-0.5 rounded border border-[#9ff1f0]/20">
              Filtros IA
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Contraer Panel"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
          </div>
        </div>

        {/* 1. Dropdown: Categoría Principal */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-[#ffc24b]">category</span>
            Categoría / Ritmo
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value as CategoryFilter)}
            className="w-full bg-[#1e1c0f]/90 border border-white/15 hover:border-[#9ff1f0] text-[#fff9eb] text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#9ff1f0]/40 transition-all cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            <option value="nature">Naturaleza & Ecoturismo (Río Sinú)</option>
            <option value="architecture">Arquitectura & Patrimonio</option>
            <option value="history">Historia & Monumentos</option>
            <option value="culture">Cultura, Deporte & Folclor</option>
          </select>
        </div>

        {/* 2. Slider de Tiempo Disponibilidad */}
        <div className="space-y-1.5 bg-[#1e1c0f]/60 p-3 rounded-xl border border-white/10">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-gray-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-[#ffc24b]">schedule</span>
              Tiempo
            </span>
            <span className="font-bold text-[#ffc24b] font-mono text-xs">
              {availableHours} {availableHours === 1 ? 'Hora' : 'Horas'}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={availableHours}
            onChange={(e) => onChangeHours(Number(e.target.value))}
            className="w-full accent-[#006b6b] hover:accent-[#9ff1f0] cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />

          <div className="flex justify-between text-[9px] font-mono text-gray-400">
            <span>1h (Rápido)</span>
            <span>4h</span>
            <span>8h (Día completo)</span>
          </div>
        </div>

        {/* 3. Chips de Intereses */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-[#ffc24b]">interests</span>
            Intereses
          </label>

          <div className="flex flex-wrap gap-1">
            {INTEREST_CHIPS.map((chip) => {
              const isSelected = selectedInterests.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onToggleInterest(chip)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#006b6b] border-[#9ff1f0] text-white shadow-md'
                      : 'bg-[#1e1c0f]/80 hover:bg-[#006b6b]/40 border-white/10 text-gray-300'
                  }`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[12px]">check</span>
                  )}
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botón OPTIMIZAR ITINERARIO CON IA */}
      <div className="pt-2.5 border-t border-white/10 mt-auto">
        <button
          type="button"
          onClick={onOptimizeItinerary}
          disabled={isOptimizing}
          className="w-full bg-gradient-to-r from-[#006b6b] via-[#005151] to-[#ba2215] hover:from-[#008b8b] hover:to-[#dc2626] text-white font-sans-technical font-bold py-2.5 px-3.5 rounded-xl shadow-lg border border-[#9ff1f0]/40 transition-all active:scale-95 duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px] animate-spin-slow">auto_awesome</span>
          <span className="uppercase tracking-widest text-[11px] font-extrabold">
            {isOptimizing ? 'Generando...' : 'OPTIMIZAR ITINERARIO CON IA'}
          </span>
        </button>
      </div>
    </aside>
  );
};
