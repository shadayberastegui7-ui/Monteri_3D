import React from 'react';
import { Landmark } from '../types';

interface POIMarkersProps {
  viewState: 'welcome' | 'dashboard';
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
}

export const POIMarkers: React.FC<POIMarkersProps> = ({
  viewState,
  landmarks,
  selectedLandmark,
  onSelectLandmark,
}) => {
  // Ocultar marcadores si no se está en el dashboard
  if (viewState !== 'dashboard') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {landmarks.map((poi) => {
        const isSelected = selectedLandmark?.id === poi.id;

        // Static positioning offsets mapped from 3D coordinates for clean 2D HUD representation
        const posX = 50 + poi.position3D.x * 4.8; // % from center
        const posY = 50 + poi.position3D.z * 3.8; // % from center

        return (
          <div
            key={poi.id}
            onClick={() => onSelectLandmark(poi)}
            className="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-auto group cursor-pointer"
            style={{
              left: `${Math.max(12, Math.min(88, posX))}%`,
              top: `${Math.max(16, Math.min(84, posY))}%`,
              zIndex: isSelected ? 40 : 20,
            }}
          >
            {/* POI Name & Category Card Badge */}
            <button
              onClick={() => onSelectLandmark(poi)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer shadow-xl ${
                isSelected
                  ? 'bg-[#006b6b] border-[#9ff1f0] text-white scale-105 ring-2 ring-[#9ff1f0]/60 z-10'
                  : 'bg-[#0a0806]/85 hover:bg-[#006b6b]/90 border-white/20 hover:border-[#9ff1f0] text-[#fff9eb] hover:scale-105'
              }`}
            >
              {/* Pin Pulsing Dot Indicator */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc24b] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffc24b]" />
              </span>

              {/* POI Name Label */}
              <span className="text-xs font-semibold tracking-wide whitespace-nowrap font-sans">
                {poi.name}
              </span>

              {/* Category Badge */}
              <span className="text-[9px] uppercase tracking-wider text-[#97e8e8] bg-[#005151]/60 px-1.5 py-0.5 rounded font-mono">
                {poi.category}
              </span>
            </button>

            {/* Vertical Tether Line connecting Badge to 3D Ground Anchor */}
            <div
              className={`w-0.5 h-4 transition-all ${
                isSelected
                  ? 'bg-gradient-to-b from-[#9ff1f0] to-[#ffc24b]'
                  : 'bg-gradient-to-b from-[#ffc24b]/80 to-transparent'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
