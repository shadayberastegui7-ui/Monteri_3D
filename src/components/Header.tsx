import React, { useState } from 'react';
import { NavigationTab } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenInfo: () => void;
  onExit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onOpenInfo, onExit }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#fff9eb]/80 dark:bg-[#e9e2ce]/10 backdrop-blur-md border-b border-[#bec9c8]/30 flex justify-between items-center px-5 py-3">
        {/* Left Icon */}
        <button
          onClick={onOpenInfo}
          className="flex items-center gap-2 text-[#3e4948] dark:text-[#e9e2ce] hover:text-[#ffc24b] transition-colors cursor-pointer active:scale-95 duration-150"
          title="Ver Información de Montería"
        >
          <span className="material-symbols-outlined text-[24px]">architecture</span>
          <span className="hidden sm:inline text-xs font-mono uppercase tracking-widest text-[#9ff1f0]">
            8.7479° N
          </span>
        </button>

        {/* Center Title Logo */}
        <button
          onClick={() => {
            if (onExit) onExit();
            else onTabChange('explorer');
          }}
          className="font-cormorant text-2xl md:text-3xl text-[#005151] dark:text-[#9ff1f0] tracking-tight font-bold cursor-pointer hover:opacity-90 transition-opacity"
        >
          MONTERÍA EN 3D
        </button>

        {/* Right Icon / Drawer Trigger */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 text-[#3e4948] dark:text-[#e9e2ce] hover:text-[#ffc24b] transition-colors cursor-pointer active:scale-95 duration-150 p-1"
          title="Menú de Opciones"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Slide-Down Quick Menu */}
      {isMenuOpen && (
        <div className="fixed top-[57px] left-0 w-full z-40 bg-[#0a0806]/95 backdrop-blur-xl border-b border-[#006b6b]/40 text-[#fff9eb] p-6 shadow-2xl animate-fade-in-up">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => {
                onTabChange('explorer');
                setIsMenuOpen(false);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'explorer'
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white'
                  : 'bg-[#1e1c0f]/60 border-[#6e7979]/30 hover:border-[#ffc24b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-[#ffc24b]">
                view_in_ar
              </span>
              <div className="font-bold text-sm">Explorador 3D</div>
              <div className="text-xs text-gray-300">Recorrido tridimensional</div>
            </button>

            <button
              onClick={() => {
                onTabChange('gallery');
                setIsMenuOpen(false);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'gallery'
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white'
                  : 'bg-[#1e1c0f]/60 border-[#6e7979]/30 hover:border-[#ffc24b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-[#ffc24b]">
                collections
              </span>
              <div className="font-bold text-sm">Galería Digital</div>
              <div className="text-xs text-gray-300">Colección fotográfica</div>
            </button>

            <button
              onClick={() => {
                onTabChange('map');
                setIsMenuOpen(false);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'map'
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white'
                  : 'bg-[#1e1c0f]/60 border-[#6e7979]/30 hover:border-[#ffc24b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-[#ffc24b]">map</span>
              <div className="font-bold text-sm">Mapa & Rutas</div>
              <div className="text-xs text-gray-300">Rutas e hitos del Sinú</div>
            </button>

            <button
              onClick={() => {
                onTabChange('his');
                setIsMenuOpen(false);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'his'
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white'
                  : 'bg-[#1e1c0f]/60 border-[#6e7979]/30 hover:border-[#ffc24b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-[#ffc24b]">
                code
              </span>
              <div className="font-bold text-sm">Mapa .HIS Código</div>
              <div className="text-xs text-gray-300">Vectorizado & Workbench</div>
            </button>

            <button
              onClick={() => {
                onTabChange('settings');
                setIsMenuOpen(false);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white'
                  : 'bg-[#1e1c0f]/60 border-[#6e7979]/30 hover:border-[#ffc24b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-[#ffc24b]">
                settings
              </span>
              <div className="font-bold text-sm">Ajustes & Render</div>
              <div className="text-xs text-gray-300">Opciones de render</div>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
