import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Landmark, RouteItem } from '../types';
import { MONTERIA_ROUTES } from '../data/monteriaData';
import { fetchMapboxRoute } from '../utils/directions';

interface MapViewProps {
  landmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
  onNavigateTo3D: (landmark: Landmark) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const CUSTOM_STYLE_URI = 'mapbox://styles/shaday25/cmu6erpyo005001qt5hauaw07';

export const MapView: React.FC<MapViewProps> = ({ landmarks, onSelectLandmark, onNavigateTo3D }) => {
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [activePin, setActivePin] = useState<Landmark | null>(landmarks[0]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: CUSTOM_STYLE_URI,
      center: [-75.887, 8.756],
      zoom: 16.5,
      pitch: 60,
      bearing: -25,
      antialias: true,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('style.load', () => {
      try {
        if (typeof (map as any).setConfigProperty === 'function') {
          (map as any).setConfigProperty('basemap', 'lightPreset', 'dusk');
        }
      } catch (e) {
        // Style loaded successfully
      }
    });

    map.on('load', () => {
      if (!map.getSource('map-selected-route-source')) {
        map.addSource('map-selected-route-source', {
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
          id: 'map-selected-route-casing',
          type: 'line',
          source: 'map-selected-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#4a004a',
            'line-width': 11,
            'line-opacity': 0.85
          }
        });

        map.addLayer({
          id: 'map-selected-route-layer',
          type: 'line',
          source: 'map-selected-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff00aa',
            'line-width': 8,
            'line-opacity': 0.98
          }
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    landmarks.forEach((landmark) => {
      const isActive = activePin?.id === landmark.id;
      const el = document.createElement('div');
      el.className = 'mapbox-marker-pin cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full ${
          isActive
            ? 'bg-[#ffc24b] text-black ring-2 ring-white scale-110'
            : 'bg-[#006b6b] text-white border border-[#9ff1f0]/40'
        } shadow-lg text-[11px] font-bold backdrop-blur-md">
          <span>${landmark.name}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        setActivePin(landmark);
        onSelectLandmark(landmark);
        map.flyTo({
          center: [landmark.coordinates.lng, landmark.coordinates.lat],
          zoom: 16.5,
          pitch: 60,
          bearing: -25,
          duration: 1200,
        });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([landmark.coordinates.lng, landmark.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [landmarks, activePin, onSelectLandmark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let isCancelled = false;

    const drawRoute = async () => {
      const source = map.getSource('map-selected-route-source') as mapboxgl.GeoJSONSource;
      if (!source) return;

      if (selectedRoute) {
        const routeLandmarks = selectedRoute.landmarkIds
          .map((id) => landmarks.find((l) => l.id === id))
          .filter((l): l is Landmark => Boolean(l));

        if (routeLandmarks.length >= 2) {
          const waypoints: [number, number][] = routeLandmarks.map((l) => [
            l.coordinates.lng,
            l.coordinates.lat
          ]);

          const streetCoords = await fetchMapboxRoute(waypoints, 'walking');

          if (!isCancelled && source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: streetCoords
              }
            });

            if (map.getLayer('map-selected-route-layer')) {
              map.setPaintProperty('map-selected-route-layer', 'line-color', selectedRoute.color || '#ff00aa');
            }

            if (streetCoords.length > 0) {
              const bounds = streetCoords.reduce(
                (b, coord) => b.extend(coord as [number, number]),
                new mapboxgl.LngLatBounds(streetCoords[0], streetCoords[0])
              );
              map.fitBounds(bounds, { padding: 60, maxZoom: 16.5, duration: 1200 });
            }
          }
        }
      } else {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      drawRoute();
    } else {
      map.once('load', drawRoute);
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedRoute, landmarks]);

  return (
    <div className="relative z-20 w-full h-full overflow-y-auto px-4 md:px-8 pt-20 pb-28 text-[#fff9eb]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-[#006b6b]/40 pb-4 gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#ffc24b]">
              Georeferenciación Digital
            </span>
            <h2 className="font-cormorant text-3xl md:text-5xl font-bold text-white mt-1">
              Mapa Interactivo del Sinú
            </h2>
            <p className="text-sm text-[#e9e2ce]">
              Coordenadas 3D: 8.756° N, 75.887° W | Corredor Fluvial Montería
            </p>
          </div>

          <div className="bg-[#0a0806]/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#ffc24b]/30 text-xs font-mono text-[#ffc24b] flex items-center gap-2 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#ffc24b] animate-ping" />
            GPS 3D Activo | Mapbox Standard
          </div>
        </div>

        {/* Routes Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MONTERIA_ROUTES.map((route) => {
            const isSelected = selectedRoute?.id === route.id;
            return (
              <button
                key={route.id}
                onClick={() => setSelectedRoute(isSelected ? null : route)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[#006b6b] border-[#9ff1f0] text-white shadow-xl'
                    : 'bg-[#0a0806]/70 hover:bg-[#1e1c0f] border-[#bec9c8]/20 text-[#fff9eb]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: route.color + '33', color: route.color }}
                >
                  <span className="material-symbols-outlined text-[24px]">{route.icon}</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm">{route.title}</h4>
                  <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{route.description}</p>
                  <div className="flex gap-3 text-[11px] font-mono mt-2 text-[#ffc24b]">
                    <span>{route.distanceKm} km</span>
                    <span>•</span>
                    <span>{route.durationMinutes} min a pie</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Map Viewport Grid + Active Pin Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapbox Map Canvas Container */}
          <div className="lg:col-span-2 bg-[#0a1c1d] border border-[#006b6b]/40 rounded-2xl min-h-[420px] h-[450px] relative overflow-hidden flex flex-col justify-between shadow-2xl">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full rounded-2xl" />

            {/* Map Controls Top Overlay Bar */}
            <div className="relative z-10 p-4 flex justify-between items-center text-xs text-[#97e8e8] font-mono pointer-events-none">
              <span className="bg-[#0a0806]/80 px-3 py-1 rounded border border-[#006b6b]/30 pointer-events-auto">
                Plano 3D Montería
              </span>
              <span className="bg-[#0a0806]/80 px-3 py-1 rounded border border-[#006b6b]/30 pointer-events-auto">
                Pitch: 60° | Zoom: 16.5
              </span>
            </div>

            {/* Map Legend Footer */}
            <div className="relative z-10 p-4 flex justify-between items-center text-[11px] text-[#e9e2ce]/80 font-mono border-t border-[#006b6b]/30 bg-[#0a0806]/70 backdrop-blur-md pointer-events-none">
              <span>Hitos Marcados: {landmarks.length}</span>
              <span className="text-[#ffc24b]">Estilo: Mapbox Standard Dusk</span>
            </div>
          </div>

          {/* Active Pin Detailed Info Panel */}
          {activePin && (
            <div className="bg-[#0a0806]/90 backdrop-blur-md border border-[#006b6b] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <div className="relative h-40 rounded-xl overflow-hidden mb-4 border border-[#bec9c8]/20">
                  <img
                    src={activePin.imageUrl}
                    alt={activePin.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-[#0a0806]/80 text-[#ffc24b] text-[10px] font-mono px-2 py-0.5 rounded border border-[#ffc24b]/40">
                    {activePin.category.toUpperCase()}
                  </div>
                </div>

                <h3 className="font-cormorant text-2xl font-bold text-white">{activePin.name}</h3>
                <p className="text-xs text-[#97e8e8] font-semibold mb-2">{activePin.subtitle}</p>

                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-4">
                  {activePin.description}
                </p>

                <div className="bg-[#1e1c0f]/60 p-3 rounded-lg border border-[#6e7979]/20 space-y-1.5 text-xs font-mono text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dirección:</span>
                    <span className="text-white text-right">{activePin.locationAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Coordenadas:</span>
                    <span className="text-[#ffc24b]">
                      {activePin.coordinates.lat}, {activePin.coordinates.lng}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Altitud:</span>
                    <span>{activePin.coordinates.alt} msnm</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => onNavigateTo3D(activePin)}
                  className="flex-1 bg-[#006b6b] hover:bg-[#005151] text-white py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-[#9ff1f0]/40"
                >
                  <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                  Ver en 3D
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
