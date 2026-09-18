import React from 'react';
import { AppSettings } from '../types';
import { ALTERNATE_BACKGROUNDS, MONTERIA_FACTS } from '../data/monteriaData';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onToggleAmbientAudio: () => void;
  isAudioPlaying: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onToggleAmbientAudio,
  isAudioPlaying,
}) => {
  return (
    <div className="relative z-20 w-full h-full overflow-y-auto px-4 md:px-8 pt-20 pb-28 text-[#fff9eb]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="border-b border-[#006b6b]/40 pb-4">
          <span className="text-xs uppercase font-bold tracking-widest text-[#ffc24b]">
            Configuración & Render
          </span>
          <h2 className="font-cormorant text-3xl md:text-5xl font-bold text-white mt-1">
            Personalización del Entorno
          </h2>
          <p className="text-sm text-[#e9e2ce]">
            Ajustes visuales, fondo del prototipo, sonido ambiental del Río Sinú y preferencias de renderizado 3D.
          </p>
        </div>

        {/* Background Image Selector */}
        <div className="bg-[#0a0806]/80 backdrop-blur-md border border-[#bec9c8]/20 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffc24b]">image</span>
                Fondo del Prototipo
              </h3>
              <p className="text-xs text-gray-300">
                Seleccione la imagen de fondo de alta calidad para mantener la estética del prototipo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ALTERNATE_BACKGROUNDS.map((bg, idx) => {
              const isSelected = settings.activeBackgroundIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onUpdateSettings({ activeBackgroundIndex: idx })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-[#006b6b] border-[#9ff1f0] shadow-lg ring-2 ring-[#ffc24b]'
                      : 'bg-[#1e1c0f]/60 hover:bg-[#1e1c0f] border-[#6e7979]/30'
                  }`}
                >
                  <div className="h-24 rounded-lg overflow-hidden mb-2 bg-black">
                    <img
                      src={bg.url}
                      alt={bg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="font-semibold text-xs text-white">{bg.title}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{bg.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Rendering Modes & Effects */}
        <div className="bg-[#0a0806]/80 backdrop-blur-md border border-[#bec9c8]/20 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc24b]">view_in_ar</span>
            Modo de Renderizado 3D
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'realistic', label: 'Realista', icon: 'filter_hdr', desc: 'Sombres y texturas' },
              { id: 'lowpoly', label: 'Low-Poly', icon: 'interests', desc: 'Geometría suave' },
              { id: 'wireframe', label: 'Wireframe', icon: 'grid_4x4', desc: 'Malla arquitectónica' },
              { id: 'night', label: 'Nocturno', icon: 'dark_mode', desc: 'Iluminación cálida' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() =>
                  onUpdateSettings({ rendererMode: mode.id as AppSettings['rendererMode'] })
                }
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.rendererMode === mode.id
                    ? 'bg-[#006b6b] border-[#9ff1f0] text-white shadow-lg'
                    : 'bg-[#1e1c0f]/60 hover:bg-[#1e1c0f] border-[#6e7979]/30 text-gray-300'
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-[#ffc24b] mb-1">
                  {mode.icon}
                </span>
                <div className="font-bold text-xs">{mode.label}</div>
                <div className="text-[10px] opacity-75">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Ambient Generator (Sonido del Río Sinú) */}
        <div className="bg-[#0a0806]/80 backdrop-blur-md border border-[#bec9c8]/20 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffc24b]">waves</span>
              Sonido Ambiental del Río Sinú
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Atmósfera sonora sintetizada del agua y brisa tropical del departamento de Córdoba.
            </p>
          </div>

          <button
            onClick={onToggleAmbientAudio}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
              isAudioPlaying
                ? 'bg-[#006b6b] border-[#9ff1f0] text-white shadow-lg animate-pulse'
                : 'bg-[#1e1c0f] border-[#bec9c8]/30 text-[#e9e2ce] hover:border-[#ffc24b]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isAudioPlaying ? 'volume_up' : 'volume_off'}
            </span>
            {isAudioPlaying ? 'Pausar Sonido' : 'Reproducir Río'}
          </button>
        </div>

        {/* Information Metadata Card */}
        <div className="bg-[#0a0806]/90 backdrop-blur-md border border-[#006b6b] rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#006b6b]/30 pb-3">
            <h3 className="font-cormorant text-2xl font-bold text-white">{MONTERIA_FACTS.title}</h3>
            <span className="text-xs font-mono text-[#ffc24b]">{MONTERIA_FACTS.department}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-[#1e1c0f]/60 p-3 rounded-lg border border-[#6e7979]/20">
              <div className="text-gray-400 text-[10px]">Fundación</div>
              <div className="text-white font-bold mt-0.5">{MONTERIA_FACTS.foundingDate}</div>
            </div>
            <div className="bg-[#1e1c0f]/60 p-3 rounded-lg border border-[#6e7979]/20">
              <div className="text-gray-400 text-[10px]">Fundador</div>
              <div className="text-white font-bold mt-0.5 line-clamp-1">{MONTERIA_FACTS.founder}</div>
            </div>
            <div className="bg-[#1e1c0f]/60 p-3 rounded-lg border border-[#6e7979]/20">
              <div className="text-gray-400 text-[10px]">Población</div>
              <div className="text-white font-bold mt-0.5">{MONTERIA_FACTS.population}</div>
            </div>
            <div className="bg-[#1e1c0f]/60 p-3 rounded-lg border border-[#6e7979]/20">
              <div className="text-gray-400 text-[10px]">Clima Promedio</div>
              <div className="text-white font-bold mt-0.5">{MONTERIA_FACTS.climate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
