import React, { useState, useEffect, useRef } from 'react';
import { NavigationTab, Landmark, AppSettings, CategoryFilter } from './types';
import { MONTERIA_LANDMARKS, PROTOTYPE_BACKGROUND_IMAGE } from './data/monteriaData';
import { MapboxView } from './components/MapboxView';
import { Header } from './components/Header';
import { LandmarkModal } from './components/LandmarkModal';
import { POIMarkers } from './components/POIMarkers';
import { WelcomeHero } from './components/WelcomeHero';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { GalleryView } from './components/GalleryView';
import { MapView } from './components/MapView';
import { HISMapView } from './components/HISMapView';
import { SettingsView } from './components/SettingsView';
import { optimizePOIOrder } from './utils/roadGraph';

export function App() {
  // Main viewState state as explicitly required: 'welcome' | 'dashboard'
  const [viewState, setViewState] = useState<'welcome' | 'dashboard'>('welcome');
  
  const [activeTab, setActiveTab] = useState<NavigationTab>('explorer');
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [inspectLandmark, setInspectLandmark] = useState<Landmark | null>(null);
  const [isTourActive, setIsTourActive] = useState<boolean>(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Single Unified Sidebar & Route state
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [availableHours, setAvailableHours] = useState<number>(4);
  const [startPoiId, setStartPoiId] = useState<string>('ronda-del-sinu');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  
  // Requirement 1: Clean initial state (no 3D route line rendered on load)
  const [itinerary, setItinerary] = useState<Landmark[]>([]);

  // Mobile QR View State: 'map' | 'preferences' | 'itinerary'
  const [mobileActivePanel, setMobileActivePanel] = useState<'map' | 'preferences' | 'itinerary'>('map');

  const [settings, setSettings] = useState<AppSettings>({
    backgroundBlur: 4,
    overlayOpacity: 0.85,
    rendererMode: 'realistic',
    enableAmbientAudio: false,
    ambientVolume: 0.2,
    language: 'es',
    unitSystem: 'metric',
    showCoordinates: true,
    showCompass: true,
    activeBackgroundIndex: 0,
  });

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<GainNode | null>(null);

  // Ambient Audio Player
  const toggleAmbientAudio = () => {
    if (isAudioPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend();
      }
      setIsAudioPlaying(false);
    } else {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.04;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        noiseNodeRef.current = gainNode;
      } else {
        audioCtxRef.current.resume();
      }
      setIsAudioPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab !== 'explorer') {
      setIsTourActive(false);
      setSelectedLandmark(null);
      setInspectLandmark(null);
    } else {
      setIsTourActive(true);
    }
  };

  const handleNavigateTo3D = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setIsTourActive(true);
    setActiveTab('explorer');
    setInspectLandmark(null);
  };

  const handleExitTour = () => {
    setIsTourActive(false);
    setSelectedLandmark(null);
    setInspectLandmark(null);
    setIsInfoModalOpen(false);
    setSelectedCategory('all');
    setViewState('welcome');
    setActiveTab('explorer');
    setItinerary([]);
  };

  // Requirement 1 & 2: Calculate TSP route explicitly on demand starting from startPoiId
  const handleCalculateRoute = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      let filtered = [...MONTERIA_LANDMARKS];
      if (selectedCategory !== 'all') {
        filtered = filtered.filter((l) => l.category === selectedCategory);
      }
      if (filtered.length === 0) {
        filtered = [...MONTERIA_LANDMARKS];
      }

      // Optimize sequence starting from startPoiId
      const ordered = optimizePOIOrder(filtered, startPoiId);
      setItinerary(ordered);
      setIsOptimizing(false);

      if (ordered.length > 0) {
        setSelectedLandmark(ordered[0]);
      }
    }, 400);
  };

  // Requirement 1: Clear 3D route line on demand
  const handleClearRoute = () => {
    setItinerary([]);
    setSelectedLandmark(null);
  };



  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0806] text-[#fff9eb] font-sans-technical">
      {/* 1. Background Panoramic Image */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <img
          src={PROTOTYPE_BACKGROUND_IMAGE}
          alt="Montería Background"
          className="absolute inset-0 w-full h-full object-cover scale-105 animate-gentle-pan"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* 2. Glass Overlay */}
      <div
        className="absolute inset-0 w-full h-full glass-overlay z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 81, 81, 0.4), rgba(10, 8, 6, 0.85))',
          backdropFilter: viewState === 'welcome' ? 'none' : 'blur(4px)',
          WebkitBackdropFilter: viewState === 'welcome' ? 'none' : 'blur(4px)',
        }}
      />

      {/* 3. Mapbox GL JS 3D WebGIS Layer */}
      {isTourActive && viewState === 'dashboard' && (
        <div className="absolute inset-0 z-20 transition-opacity duration-700 opacity-100 pointer-events-auto">
          <MapboxView
            landmarks={MONTERIA_LANDMARKS}
            selectedLandmark={selectedLandmark}
            onSelectLandmark={(l) => setInspectLandmark(l)}
            settings={settings}
            isTourActive={isTourActive}
            onExitTour={handleExitTour}
            itinerary={itinerary}
          />
        </div>
      )}



      {/* REQUIREMENT 1: Welcome Screen floating card with z-50 and backdrop-blur-xl bg-slate-950/80 */}
      {viewState === 'welcome' && (
        <WelcomeHero
          onEnterDashboard={() => {
            setViewState('dashboard');
            setActiveTab('explorer');
            setIsTourActive(true);
          }}
          landmarks={MONTERIA_LANDMARKS}
          onSelectLandmark={(l) => {
            setSelectedLandmark(l);
            setViewState('dashboard');
            setActiveTab('explorer');
            setIsTourActive(true);
          }}
        />
      )}

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        onExit={handleExitTour}
      />

      {/* REQUIREMENT 2 & 3: UNIFIED SINGLE RIGHT SIDEBAR LAYOUT */}
      {viewState === 'dashboard' && activeTab === 'explorer' && (
        <>
          {/* DESKTOP SIDEBAR CONTAINER: Compact single panel on the right (w-80 / 320px) */}
          <div className="hidden md:flex h-full w-full absolute inset-0 pointer-events-none justify-end p-4 pt-16 z-40">
            <RightSidebar
              landmarks={MONTERIA_LANDMARKS}
              itinerary={itinerary}
              selectedLandmark={selectedLandmark}
              onSelectLandmark={(l) => setSelectedLandmark(l)}
              startPoiId={startPoiId}
              onSelectStartPoi={setStartPoiId}
              availableHours={availableHours}
              onChangeHours={setAvailableHours}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onCalculateRoute={handleCalculateRoute}
              onClearRoute={handleClearRoute}
              isCalculating={isOptimizing}
            />
          </div>

          {/* MOBILE & QR CODE ADAPTABILIDAD */}
          <div className="md:hidden absolute inset-x-0 bottom-16 top-16 z-40 pointer-events-none flex flex-col justify-end p-3">
            {mobileActivePanel === 'preferences' && (
              <div className="pointer-events-auto max-h-[75vh] mb-2 animate-fade-in-up">
                <RightSidebar
                  landmarks={MONTERIA_LANDMARKS}
                  itinerary={itinerary}
                  selectedLandmark={selectedLandmark}
                  onSelectLandmark={(l) => {
                    setSelectedLandmark(l);
                    setMobileActivePanel('map');
                  }}
                  startPoiId={startPoiId}
                  onSelectStartPoi={setStartPoiId}
                  availableHours={availableHours}
                  onChangeHours={setAvailableHours}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onCalculateRoute={() => {
                    handleCalculateRoute();
                    setMobileActivePanel('map');
                  }}
                  onClearRoute={handleClearRoute}
                  isCalculating={isOptimizing}
                />
              </div>
            )}

            {/* Mobile Bottom Tab Selector Bar for QR smartphone access */}
            <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl border border-[#006b6b]/60 rounded-full p-1.5 flex justify-around shadow-2xl">
              <button
                onClick={() =>
                  setMobileActivePanel(mobileActivePanel === 'preferences' ? 'map' : 'preferences')
                }
                className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileActivePanel === 'preferences'
                    ? 'bg-[#006b6b] text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Preferencias</span>
              </button>

              <button
                onClick={() => setMobileActivePanel('map')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileActivePanel === 'map'
                    ? 'bg-[#006b6b] text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">3d_rotation</span>
                <span>Mapa 3D</span>
              </button>

              <button
                onClick={() =>
                  setMobileActivePanel(mobileActivePanel === 'itinerary' ? 'map' : 'itinerary')
                }
                className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileActivePanel === 'itinerary'
                    ? 'bg-[#006b6b] text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">route</span>
                <span>Itinerario</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Additional Tabs Content */}
      <main className={`relative z-20 w-full h-full ${activeTab === 'explorer' ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        {activeTab === 'gallery' && (
          <GalleryView
            landmarks={MONTERIA_LANDMARKS}
            onSelectLandmark={(l) => setInspectLandmark(l)}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            landmarks={MONTERIA_LANDMARKS}
            onSelectLandmark={(l) => setSelectedLandmark(l)}
            onNavigateTo3D={handleNavigateTo3D}
          />
        )}

        {activeTab === 'his' && <HISMapView />}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onToggleAmbientAudio={toggleAmbientAudio}
            isAudioPlaying={isAudioPlaying}
          />
        )}
      </main>

      {/* Detailed Landmark Modal */}
      <LandmarkModal
        landmark={inspectLandmark}
        onClose={() => setInspectLandmark(null)}
        onNavigateTo3D={handleNavigateTo3D}
      />

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="bg-[#0a0806] border border-[#006b6b] rounded-2xl max-w-lg w-full p-6 text-[#fff9eb] relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute top-4 right-4 bg-[#1e1c0f] hover:bg-[#ba2215] text-white p-2 rounded-full border border-white/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <span className="text-xs uppercase font-bold tracking-widest text-[#ffc24b]">
              Capital Ganadera de Colombia
            </span>
            <h2 className="font-cormorant text-3xl font-bold text-white">Montería en 3D</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Montería es la capital del departamento de Córdoba, fundada en 1777 sobre la ribera del Río Sinú. Es famosa por sus paisajes fluviales, su rica gastronomía sabanera y la Ronda del Sinú, el parque ecológico lineal urbano más grande de América Latina.
            </p>

            <div className="bg-[#1e1c0f]/80 p-3 rounded-xl border border-[#6e7979]/20 space-y-1 text-xs font-mono text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Coordenadas:</span>
                <span className="text-[#ffc24b]">8.7479° N, 75.8814° W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Altitud:</span>
                <span>18 msnm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Clima:</span>
                <span>28°C Tropical Warm</span>
              </div>
            </div>

            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="w-full bg-[#006b6b] hover:bg-[#005151] text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer border border-[#9ff1f0]/30"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


