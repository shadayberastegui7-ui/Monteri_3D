import React, { useState } from 'react';
import { Landmark, CategoryFilter } from '../types';

interface RightSidebarProps {
  landmarks: Landmark[];
  itinerary: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  startPoiId: string;
  onSelectStartPoi: (id: string) => void;
  availableHours: number;
  onChangeHours: (hours: number) => void;
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  isCalculating?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  landmarks,
  itinerary,
  selectedLandmark,
  onSelectLandmark,
  startPoiId,
  onSelectStartPoi,
  availableHours,
  onChangeHours,
  selectedCategory,
  onSelectCategory,
  onCalculateRoute,
  onClearRoute,
  isCalculating = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const totalDistance = (itinerary.length * 1.35).toFixed(1);

  if (isCollapsed) {
    return (
      <aside className="pointer-events-auto self-start mt-14 animate-fade-in">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="bg-black/80 backdrop-blur-md border border-white/15 hover:border-[#ffc24b] px-3 py-2 rounded-xl text-white shadow-2xl flex items-center gap-2 transition-all cursor-pointer group"
          title="Desplegar Panel de Ruta"
        >
          <span className="material-symbols-outlined text-xs text-gray-400 group-hover:-translate-x-0.5 transition-transform">
            chevron_left
          </span>
          <span className="text-[11px] font-bold font-sans-technical tracking-wide hidden sm:inline">
            Panel Ruta
          </span>
          <span className="material-symbols-outlined text-[18px] text-[#ffc24b]">alt_route</span>
          {itinerary.length >= 2 && (
            <span className="text-[9px] font-mono bg-[#006b6b] text-white px-1.5 py-0.5 rounded-full font-bold">
              {itinerary.length}
            </span>
          )}
        </button>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto w-80 max-w-[320px] max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar bg-black/65 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-white shadow-2xl flex flex-col gap-3 transition-all animate-fade-in text-xs select-none">
      {/* 1. Header & Collapse Control */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#ffc24b] text-[18px]">alt_route</span>
          <h2 className="font-cormorant text-base font-bold text-white tracking-wide">
            Planificador de Ruta
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {itinerary.length >= 2 && (
            <span className="text-[9px] font-mono uppercase bg-[#006b6b]/70 text-[#9ff1f0] px-1.5 py-0.5 rounded border border-[#9ff1f0]/30 font-bold">
              {itinerary.length} Paradas
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Contraer Panel"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* 2. BLOQUE SUPERIOR: Configuración de Parámetros de Ruta */}
      <div className="space-y-2.5 bg-[#14120c]/80 p-2.5 rounded-xl border border-white/10">
        {/* A. Selector: Punto de Partida */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#ffc24b]">
                location_on
              </span>
              Punto de Partida
            </span>
          </label>
          <select
            value={startPoiId}
            onChange={(e) => onSelectStartPoi(e.target.value)}
            className="w-full bg-[#1e1c0f]/90 border border-white/15 hover:border-[#9ff1f0] text-[#fff9eb] text-[11px] rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#9ff1f0]/50 transition-all cursor-pointer"
          >
            {landmarks.map((landmark) => (
              <option key={landmark.id} value={landmark.id}>
                {landmark.name}
              </option>
            ))}
          </select>
        </div>

        {/* B. Slider Compacto: Tiempo Disponible (1h a 6h) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-300">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[13px] text-[#ffc24b]">
                schedule
              </span>
              Tiempo Disponible
            </span>
            <span className="font-bold text-[#ffc24b] text-[11px]">
              {availableHours} {availableHours === 1 ? 'Hora' : 'Horas'}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={availableHours}
            onChange={(e) => onChangeHours(Number(e.target.value))}
            className="w-full accent-[#006b6b] hover:accent-[#9ff1f0] cursor-pointer h-1 bg-gray-700 rounded-lg"
          />
          <div className="flex justify-between text-[8px] font-mono text-gray-400">
            <span>1h</span>
            <span>3h</span>
            <span>6h</span>
          </div>
        </div>

        {/* C. Selector de Categoría / Ritmo */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-gray-300 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#ffc24b]">category</span>
            Interés Principal
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value as CategoryFilter)}
            className="w-full bg-[#1e1c0f]/90 border border-white/15 hover:border-[#9ff1f0] text-[#fff9eb] text-[11px] rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#9ff1f0]/50 transition-all cursor-pointer"
          >
            <option value="all">Todas las Categorías (Ruta Completa)</option>
            <option value="nature">Naturaleza & Río Sinú</option>
            <option value="architecture">Patrimonio & Arquitectura</option>
            <option value="culture">Cultura & Deportes</option>
          </select>
        </div>

        {/* D. Botones de Acción: Calcular y Limpiar */}
        <div className="pt-1 flex gap-2">
          <button
            type="button"
            onClick={onCalculateRoute}
            disabled={isCalculating}
            className="flex-1 bg-gradient-to-r from-[#006b6b] via-[#005151] to-[#ba2215] hover:from-[#008b8b] hover:to-[#dc2626] text-white font-sans-technical font-bold py-2 px-2.5 rounded-xl shadow-lg border border-[#9ff1f0]/40 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] animate-spin-slow">
              auto_awesome
            </span>
            <span className="uppercase tracking-wider text-[10px] font-extrabold">
              {isCalculating ? 'Calculando...' : 'Calcular Ruta Óptima'}
            </span>
          </button>

          {itinerary.length >= 2 && (
            <button
              type="button"
              onClick={onClearRoute}
              className="bg-[#1e1c0f] hover:bg-[#ba2215]/80 text-gray-300 hover:text-white p-2 rounded-xl border border-white/15 transition-all flex items-center justify-center cursor-pointer"
              title="Limpiar trazado de ruta 3D"
            >
              <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. BLOQUE INFERIOR: Resultados e Itinerario Guiado */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-mono uppercase text-gray-300 tracking-wider">
            Resumen del Recorrido
          </h3>
          {itinerary.length >= 2 && (
            <button
              onClick={onClearRoute}
              className="text-[9px] text-gray-400 hover:text-[#ffc24b] flex items-center gap-0.5 underline cursor-pointer"
            >
              Limpiar ruta
            </button>
          )}
        </div>

        {itinerary.length < 2 ? (
          /* Estado Inicial Limpio sin Ruta por Defecto */
          <div className="bg-[#1e1c0f]/50 border border-dashed border-white/15 rounded-xl p-4 text-center text-gray-400 space-y-1.5">
            <span className="material-symbols-outlined text-2xl text-gray-500">map</span>
            <p className="text-[10px] leading-relaxed text-[#e9e2ce]/70">
              Selecciona tu punto de partida y presiona <strong className="text-white font-bold">"Calcular Ruta Óptima"</strong> para desplegar la línea verde en la maqueta 3D.
            </p>
          </div>
        ) : (
          /* Visualización de Resultados Calculados */
          <div className="space-y-2.5">
            {/* Metricas Resumen */}
            <div className="grid grid-cols-2 gap-2 bg-[#1e1c0f]/80 p-2 rounded-lg border border-white/10 text-center font-mono text-[10px]">
              <div>
                <span className="text-[8px] text-gray-400 uppercase tracking-wider block">
                  Tiempo Est.
                </span>
                <span className="font-bold text-[#ffc24b]">{availableHours} Horas</span>
              </div>
              <div>
                <span className="text-[8px] text-gray-400 uppercase tracking-wider block">
                  Distancia Total
                </span>
                <span className="font-bold text-[#9ff1f0]">{totalDistance} km</span>
              </div>
            </div>

            {/* Secuencia Paso a Paso */}
            <div className="relative pl-3 space-y-2 border-l border-[#006b6b]/60">
              {itinerary.map((item, index) => {
                const isSelected = selectedLandmark?.id === item.id;
                return (
                  <div key={item.id} className="relative group">
                    <span
                      className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'bg-[#ffc24b] border-white scale-125'
                          : 'bg-black border-[#006b6b] group-hover:border-[#9ff1f0]'
                      }`}
                    />

                    <div
                      onClick={() => onSelectLandmark(item)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#006b6b]/60 border-[#9ff1f0] text-white shadow-md'
                          : 'bg-[#1e1c0f]/60 hover:bg-[#006b6b]/30 border-white/10 hover:border-[#9ff1f0]/40 text-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono text-[#ffc24b] font-bold uppercase">
                          Paso {index + 1}
                        </span>
                        {item.rating && (
                          <span className="text-[8px] text-amber-300">★ {item.rating}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-[11px] text-white mt-0.5">{item.name}</h4>
                      <p className="text-[9px] text-gray-300 line-clamp-1">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón de Inicio de Recorrido */}
            <button
              onClick={() => onSelectLandmark(itinerary[0])}
              className="w-full bg-[#1e1c0f] hover:bg-[#006b6b] text-[#fff9eb] text-[11px] font-bold py-2 px-3 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span className="material-symbols-outlined text-[14px]">play_circle</span>
              <span>Iniciar Recorrido Guiado</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
