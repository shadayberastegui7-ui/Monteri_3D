import React from 'react';
import { Landmark } from '../types';

interface ExplorerViewProps {
  onStartTour: () => void;
  landmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
  isTourActive: boolean;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  onStartTour,
  landmarks,
  onSelectLandmark,
  isTourActive,
}) => {
  if (isTourActive) {
    return null;
  }

  return (
    <div className="relative z-20 w-full h-full flex flex-col items-center justify-center px-5 pb-[80px] md:pb-0 pt-[64px] md:pt-0 pointer-events-none">
      {/* Centerpiece Content - Pointer events active on buttons */}
      <div className="flex flex-col items-center justify-center text-center max-w-4xl w-full gap-6">
        <h1
          className="font-cormorant font-bold text-white tracking-tight animate-fade-in-up drop-shadow-2xl"
          style={{ fontSize: 'clamp(44px, 7.5vw, 92px)', lineHeight: 1.05 }}
        >
          MONTERÍA EN 3D
        </h1>

        <p className="font-sans-technical text-sm md:text-base text-[#e9e2ce] tracking-widest animate-fade-in-up delay-100 uppercase drop-shadow">
          EXPLORACIÓN DIGITAL DE PRECISIÓN
        </p>

        <div className="mt-6 animate-fade-in-up delay-300 pointer-events-auto">
          <button
            onClick={onStartTour}
            className="bg-[#006b6b] text-white font-sans-technical font-bold py-3.5 px-7 rounded inner-glow hover:bg-[#005151] transition-all active:scale-95 duration-150 flex items-center gap-2 group relative overflow-hidden shadow-2xl cursor-pointer"
          >
            <span className="relative z-10 uppercase tracking-widest text-xs md:text-sm">
              Empezar Recorrido
            </span>
            <span className="material-symbols-outlined relative z-10 text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
          </button>
        </div>

        {/* Featured Quick Quick-Launch Chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-xl pointer-events-auto animate-fade-in-up delay-500">
          {landmarks.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectLandmark(item)}
              className="bg-[#1e1c0f]/60 hover:bg-[#006b6b]/80 border border-[#bec9c8]/20 hover:border-[#9ff1f0] text-[#fff9eb] text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffc24b]" />
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Decorative Telemetry Left */}
      <div className="absolute bottom-28 left-8 hidden lg:block opacity-75">
        <div className="w-px h-24 bg-gradient-to-b from-transparent to-[#ffc24b]" />
        <div className="text-[#ffc24b] font-sans-technical text-[10px] transform -rotate-90 origin-bottom-left absolute bottom-0 -left-6 tracking-[0.3em] font-semibold">
          ALTITUD 18M
        </div>
      </div>

      {/* Decorative Telemetry Right */}
      <div className="absolute bottom-28 right-8 hidden lg:block opacity-75 flex flex-col items-end">
        <div className="flex gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 bg-[#ffc24b] rounded-full animate-pulse" />
          <div className="w-1.5 h-1.5 bg-[#e9e2ce] rounded-full" />
          <div className="w-1.5 h-1.5 bg-[#e9e2ce] rounded-full" />
        </div>
        <div className="text-[#e9e2ce] font-sans-technical text-[10px] tracking-[0.2em] font-mono">
          COORD: 8.7479° N, 75.8814° W
        </div>
      </div>
    </div>
  );
};
