import React from 'react';
import { Landmark } from '../types';

interface WelcomeHeroProps {
  onEnterDashboard: () => void;
  landmarks: Landmark[];
  onSelectLandmark?: (landmark: Landmark) => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  onEnterDashboard,
  landmarks,
  onSelectLandmark,
}) => {
  return (
    // REQUIREMENT 1: Capa superior con z-50 y fondo con desenfoque (backdrop-blur-xl bg-slate-950/80)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in-up">
      <div className="relative max-w-2xl w-full bg-slate-950/80 backdrop-blur-xl border border-[#006b6b]/40 rounded-3xl p-6 sm:p-10 text-white shadow-2xl text-center space-y-6 overflow-hidden">
        
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#006b6b]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-[#ffc24b]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge & Title Header */}
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-[#005151]/60 text-[#97e8e8] border border-[#9ff1f0]/20">
            <span className="w-2 h-2 rounded-full bg-[#ffc24b] animate-pulse" />
            Experiencia Inmersiva de Precisión
          </span>

          <h1
            className="font-cormorant font-bold text-white tracking-tight drop-shadow-xl mt-2"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.05 }}
          >
            MONTERÍA EN 3D
          </h1>

          <p className="font-sans-technical text-xs sm:text-sm text-[#e9e2ce]/90 max-w-lg mx-auto leading-relaxed">
            Plataforma digital para explorar la Capital Ganadera de Colombia, la majestuosa Ronda del Sinú y sus principales hitos arquitectónicos y culturales.
          </p>
        </div>

        {/* Action Button to enter Dashboard */}
        <div className="pt-2 relative z-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={onEnterDashboard}
            className="w-full sm:w-auto bg-[#006b6b] hover:bg-[#005151] text-white font-sans-technical font-bold py-4 px-8 rounded-xl inner-glow transition-all active:scale-95 duration-200 flex items-center justify-center gap-3 group relative overflow-hidden shadow-xl cursor-pointer border border-[#9ff1f0]/40"
          >
            <span className="relative z-10 uppercase tracking-widest text-xs sm:text-sm">
              Explorar Dashboard
            </span>
            <span className="material-symbols-outlined relative z-10 text-[20px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
          </button>
        </div>

        {/* Landmark Chips preview */}
        <div className="pt-4 relative z-10 border-t border-white/10">
          <p className="text-[11px] font-mono uppercase text-[#e9e2ce]/60 mb-3 tracking-wider">
            Puntos destacados listos para explorar
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {landmarks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (onSelectLandmark) onSelectLandmark(item);
                  onEnterDashboard();
                }}
                className="bg-slate-900/60 hover:bg-[#006b6b]/80 border border-white/10 hover:border-[#9ff1f0] text-[#fff9eb] text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffc24b]" />
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
