import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Landmark, AppSettings } from '../types';
import { generateItinerary3DArc } from '../utils/arcGenerator';

interface MapboxViewProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  settings: AppSettings;
  isTourActive: boolean;
  onExitTour?: () => void;
  itinerary?: Landmark[];
}

export const MapboxView: React.FC<MapboxViewProps> = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  settings,
  isTourActive,
  onExitTour,
  itinerary = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isNightMode, setIsNightMode] = useState<boolean>(settings.rendererMode === 'night');

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const CUSTOM_STYLE_URI = 'mapbox://styles/shaday25/cmu6erpyo005001qt5hauaw07';

  // 1. Map Initializer & Layer Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: CUSTOM_STYLE_URI,
      center: [-75.887, 8.756], // 3D Precision Montería Coords
      zoom: 16.5,
      pitch: 60, // 3D Tilt angle
      bearing: -25, // Rotation angle
      antialias: true,
    });

    mapRef.current = map;

    // Add navigation controls (Zoom & Rotate)
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('style.load', () => {
      try {
        if (typeof (map as any).setConfigProperty === 'function') {
          (map as any).setConfigProperty('basemap', 'lightPreset', 'dusk');
        }
      } catch (e) {
        // Custom style loaded successfully
      }
    });

    map.on('load', () => {
      // Add 3D native building extrusion layer
      const layers = map.getStyle()?.layers;
      let labelLayerId: string | undefined;
      if (layers) {
        for (let i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
            labelLayerId = layers[i].id;
            break;
          }
        }
      }

      if (!map.getLayer('3d-buildings')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'case',
                ['boolean', ['feature-state', 'select'], false],
                '#006b6b',
                '#1e2937'
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.85
            }
          },
          labelLayerId
        );
      }

      // A. Ground Shadow Projection Source & Layer
      map.addSource('route-shadow-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.addLayer({
        id: 'route-shadow-layer',
        type: 'line',
        source: 'route-shadow-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#005151',
          'line-width': 3,
          'line-opacity': 0.5,
          'line-dasharray': [2, 2]
        }
      });

      // B. 3D Parabolic Arc Source & Layer ("Vuelo de Pájaro")
      map.addSource('route-3d-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.addLayer({
        id: 'route-3d-layer',
        type: 'line',
        source: 'route-3d-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00F5D4', // Bright Neon Cyan / Emerald Glowing Arc
          'line-width': 5.5,
          'line-opacity': 0.95
        }
      });

      // C. Landing Impact Rings at POIs
      map.addSource('landing-rings-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'landing-rings-layer',
        type: 'circle',
        source: 'landing-rings-source',
        paint: {
          'circle-radius': 10,
          'circle-color': '#00F5D4',
          'circle-opacity': 0.35,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Single Elegant Set of HTML Markers (No duplicates)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    landmarks.forEach((landmark) => {
      const isSelected = selectedLandmark?.id === landmark.id;

      const el = document.createElement('div');
      el.className = 'single-mapbox-marker group cursor-pointer';
      el.innerHTML = `
        <div class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a0806]/90 border ${
          isSelected
            ? 'border-[#ffc24b] ring-2 ring-[#ffc24b]/40 shadow-[0_0_15px_rgba(255,194,75,0.6)] scale-110 z-50'
            : 'border-[#006b6b]/60 hover:border-[#9ff1f0] z-30'
        } backdrop-blur-md shadow-2xl transition-all duration-300">
          <div class="w-5 h-5 rounded-full ${
            isSelected ? 'bg-[#ffc24b] text-black' : 'bg-[#006b6b] text-[#9ff1f0]'
          } flex items-center justify-center font-bold text-[10px]">
            <span class="material-symbols-outlined text-[13px]">
              ${landmark.category === 'nature' ? 'nature_people' : landmark.category === 'architecture' ? 'church' : 'sports_score'}
            </span>
          </div>
          <span class="text-[10px] font-bold font-sans-technical tracking-wide ${
            isSelected ? 'text-[#ffc24b]' : 'text-white'
          }">
            ${landmark.name}
          </span>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectLandmark(landmark);
      });

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div class="p-2 bg-[#0a0806] text-white rounded-lg font-sans-technical">
          <h4 class="font-bold text-xs text-[#ffc24b]">${landmark.name}</h4>
          <p class="text-[10px] text-gray-300">${landmark.subtitle}</p>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([landmark.coordinates.lng, landmark.coordinates.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [landmarks, selectedLandmark]);

  // 3. Camera Glide flyTo on Selected Landmark
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLandmark) return;

    map.flyTo({
      center: [selectedLandmark.coordinates.lng, selectedLandmark.coordinates.lat],
      zoom: 16.5,
      pitch: 60,
      bearing: -25,
      duration: 1500,
      essential: true
    });
  }, [selectedLandmark]);

  // 4. On-Demand 3D Parabolic Arc Route Layer Update
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      const source3D = map.getSource('route-3d-source') as mapboxgl.GeoJSONSource;
      const sourceShadow = map.getSource('route-shadow-source') as mapboxgl.GeoJSONSource;
      const sourceRings = map.getSource('landing-rings-source') as mapboxgl.GeoJSONSource;

      if (!source3D || !sourceShadow || !sourceRings) return;

      if (itinerary && itinerary.length >= 2) {
        const { arc3DCoordinates, shadowCoordinates, landingPoints } = generateItinerary3DArc(itinerary);

        // Update 3D Parabolic Arc ("Vuelo de Pájaro")
        source3D.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: arc3DCoordinates
          }
        });

        // Update Ground Shadow Line
        sourceShadow.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: shadowCoordinates
          }
        });

        // Update POI Landing Impact Rings
        sourceRings.setData({
          type: 'FeatureCollection',
          features: landingPoints.map((pt) => ({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: pt
            }
          }))
        });
      } else {
        source3D.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });

        sourceShadow.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });

        sourceRings.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('load', updateRoute);
    }
  }, [itinerary]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Mapbox Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Viewport HUD Overlays */}
      {isTourActive && (
        <>
          {/* Top Bar Status HUD */}
          <div className="absolute top-20 left-4 right-4 md:left-8 md:right-8 flex justify-between items-center pointer-events-none z-30">
            <div className="bg-[#0a0806]/80 backdrop-blur-md px-4 py-2 rounded-lg border border-[#9ff1f0]/20 flex items-center gap-3 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-ping" />
              <div className="text-xs font-mono tracking-wider text-[#97e8e8]">
                Arco 3D "Vuelo de Pájaro" | Mapbox WebGIS Montería
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 pointer-events-auto">
              {onExitTour && (
                <button
                  type="button"
                  onClick={onExitTour}
                  className="bg-[#ba2215] hover:bg-[#dc2626] active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-white/20 transition-all cursor-pointer z-50 pointer-events-auto"
                  title="Salir del Mapa y Regresar al Inicio"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  <span>Salir</span>
                </button>
              )}
            </div>
          </div>

          {/* Left HUD Coordinates Info */}
          <div className="absolute bottom-28 left-6 hidden sm:flex flex-col gap-2 pointer-events-none z-30">
            <div className="flex items-center gap-3 bg-[#0a0806]/70 backdrop-blur-md px-3 py-2 rounded border border-[#ffc24b]/30">
              <div className="w-1 h-8 bg-[#ffc24b]" />
              <div>
                <div className="text-[10px] text-[#ffc24b] font-mono tracking-widest uppercase">
                  Elevación Arco 3D
                </div>
                <div className="text-sm font-semibold font-mono text-[#fff9eb]">Hmax 450m • Pitch 55°</div>
              </div>
            </div>
            <div className="text-[10px] text-[#e9e2ce]/70 font-mono tracking-widest bg-[#0a0806]/60 backdrop-blur-sm px-2.5 py-1 rounded">
              8.7479° N, 75.8814° W
            </div>
          </div>

          {/* Selected Landmark Details Overlay Card */}
          {selectedLandmark && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-md w-[90%] bg-[#0a0806]/90 backdrop-blur-xl border border-[#006b6b] rounded-xl p-4 text-[#fff9eb] z-40 shadow-2xl animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#97e8e8] bg-[#005151]/50 px-2 py-0.5 rounded">
                    {selectedLandmark.category}
                  </span>
                  <h3 className="font-cormorant text-2xl font-bold text-white mt-1">
                    {selectedLandmark.name}
                  </h3>
                  <p className="text-xs text-[#e9e2ce]">{selectedLandmark.subtitle}</p>
                </div>
                <button
                  onClick={() => onSelectLandmark(selectedLandmark)}
                  className="text-xs text-[#ffc24b] hover:underline"
                >
                  Ver detalles
                </button>
              </div>
              <p className="text-xs text-gray-300 line-clamp-2">{selectedLandmark.description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
