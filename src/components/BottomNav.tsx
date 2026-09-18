import React from 'react';
import { NavigationTab } from '../types';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-auto rounded-t-2xl border-t border-[#bec9c8]/20 shadow-2xl bg-[#0a0806]/90 dark:bg-[#0a0806]/95 backdrop-blur-xl select-none"
    >
      <div className="flex justify-around items-center px-4 pb-4 pt-2 max-w-lg mx-auto pointer-events-auto">
        {/* Explorer */}
        <button
          id="nav-btn-explorer"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('explorer');
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
            activeTab === 'explorer'
              ? 'bg-[#006b6b] text-[#97e8e8] rounded-full px-4 py-1 active:scale-90 shadow-lg ring-1 ring-[#9ff1f0]/40'
              : 'text-[#e9e2ce]/70 hover:text-white hover:bg-[#e9e2ce]/10 px-3 py-1 rounded-full active:scale-90'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'explorer' ? "'FILL' 1" : "'FILL' 0" }}
          >
            view_in_ar
          </span>
          <span className="font-sans-technical text-[12px] tracking-wider font-semibold mt-0.5">
            Explorer
          </span>
        </button>

        {/* Gallery */}
        <button
          id="nav-btn-gallery"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('gallery');
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
            activeTab === 'gallery'
              ? 'bg-[#006b6b] text-[#97e8e8] rounded-full px-4 py-1 active:scale-90 shadow-lg ring-1 ring-[#9ff1f0]/40'
              : 'text-[#e9e2ce]/70 hover:text-white hover:bg-[#e9e2ce]/10 px-3 py-1 rounded-full active:scale-90'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'gallery' ? "'FILL' 1" : "'FILL' 0" }}
          >
            collections
          </span>
          <span className="font-sans-technical text-[12px] tracking-wider font-semibold mt-0.5">
            Gallery
          </span>
        </button>

        {/* Map */}
        <button
          id="nav-btn-map"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('map');
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
            activeTab === 'map'
              ? 'bg-[#006b6b] text-[#97e8e8] rounded-full px-4 py-1 active:scale-90 shadow-lg ring-1 ring-[#9ff1f0]/40'
              : 'text-[#e9e2ce]/70 hover:text-white hover:bg-[#e9e2ce]/10 px-3 py-1 rounded-full active:scale-90'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'map' ? "'FILL' 1" : "'FILL' 0" }}
          >
            map
          </span>
          <span className="font-sans-technical text-[12px] tracking-wider font-semibold mt-0.5">
            Map
          </span>
        </button>

        {/* Settings */}
        <button
          id="nav-btn-settings"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('settings');
          }}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
            activeTab === 'settings'
              ? 'bg-[#006b6b] text-[#97e8e8] rounded-full px-4 py-1 active:scale-90 shadow-lg ring-1 ring-[#9ff1f0]/40'
              : 'text-[#e9e2ce]/70 hover:text-white hover:bg-[#e9e2ce]/10 px-3 py-1 rounded-full active:scale-90'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}
          >
            settings
          </span>
          <span className="font-sans-technical text-[12px] tracking-wider font-semibold mt-0.5">
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
};

