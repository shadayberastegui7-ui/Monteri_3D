import React, { useState, useEffect, useMemo } from 'react';
import {
  parseHIS,
  hisToGeoJSON,
  hisToSVG,
  hisToThreeJS,
  findPointsInRadius,
  exportHIS,
  HISMapData,
  HISPolygon,
  HISPolyline,
  HISPoint,
} from '../utils/hisParser';

// Import raw .HIS string data from data file
import rawHISContent from '../data/monteria_map.his?raw';

export const HISMapView: React.FC = () => {
  const [hisData, setHisData] = useState<HISMapData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    name: string;
    type: string;
    category: string;
    details: Record<string, string>;
  } | null>(null);

  // Layer Toggles
  const [showPolygons, setShowPolygons] = useState(true);
  const [showPolylines, setShowPolylines] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Active Code Tab in Playground
  const [activeCodeTab, setActiveCodeTab] = useState<'parse' | 'geojson' | 'three' | 'query'>('parse');
  const [copyToast, setCopyToast] = useState(false);

  // Load and parse .his content on mount
  useEffect(() => {
    try {
      const parsed = parseHIS(rawHISContent);
      setHisData(parsed);
      if (parsed.points.length > 0) {
        const firstPoint = parsed.points[0];
        setSelectedFeature({
          id: firstPoint.id,
          name: firstPoint.name,
          type: 'Point',
          category: firstPoint.category,
          details: {
            Latitud: firstPoint.coordinate.lat.toString(),
            Longitud: firstPoint.coordinate.lng.toString(),
            Altitud: `${firstPoint.coordinate.alt || 18} msnm`,
            ...firstPoint.attributes,
          },
        });
      }
    } catch (err) {
      console.error('Error parsing HIS content:', err);
    }
  }, []);

  // Spatial query simulation state
  const [queryRadiusKm, setQueryRadiusKm] = useState(2.0);
  const queriedPoints = useMemo(() => {
    if (!hisData) return [];
    return findPointsInRadius(hisData, 8.7562, -75.8821, queryRadiusKm); // Center at Catedral San Jerónimo
  }, [hisData, queryRadiusKm]);

  // Code snippets for the developer playground
  const codeSnippets = {
    parse: `import { parseHIS } from './utils/hisParser';

// 1. Cargar contenido en formato .HIS desde archivo o red
const response = await fetch('/monteria_map.his');
const hisText = await response.text();

// 2. Parsear a estructura de datos TypeScript
const mapData = parseHIS(hisText);

console.log("Título del Mapa:", mapData.header.title);
console.log("Bounding Box:", mapData.header.bbox);
console.log("Total Polígonos (Comunas/Río):", mapData.polygons.length);
console.log("Total Arterias Viales:", mapData.polylines.length);
console.log("Total Puntos de Interés:", mapData.points.length);`,

    geojson: `import { parseHIS, hisToGeoJSON } from './utils/hisParser';

const mapData = parseHIS(hisContent);

// Convertir mapa vectorizado .HIS a especificación estándar GeoJSON
const geojson = hisToGeoJSON(mapData);

// Usar con Mapbox, Leaflet u OpenLayers directamente:
// L.geoJSON(geojson).addTo(map);

console.log("GeoJSON FeatureCollection:", JSON.stringify(geojson, null, 2));`,

    three: `import { parseHIS, hisToThreeJS } from './utils/hisParser';
import * as THREE from 'three';

const scene = new THREE.Scene();

// Convertir datos vectoriales .HIS en objetos 3D de Three.js (Extrusión + Malla + Líneas)
const mapData = parseHIS(hisContent);
const monteria3DGroup = hisToThreeJS(mapData, 100);

scene.add(monteria3DGroup);`,

    query: `import { parseHIS, findPointsInRadius } from './utils/hisParser';

const mapData = parseHIS(hisContent);

// Consultar POIs en un radio de 2.0 km alrededor de la Catedral San Jerónimo (8.7562, -75.8821)
const nearbyPOIs = findPointsInRadius(mapData, 8.7562, -75.8821, 2.0);

nearbyPOIs.forEach(poi => {
  console.log(\`[POI Encontrado] \${poi.name} (\${poi.category}) - Lat: \${poi.coordinate.lat}\`);
});`,
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!hisData) {
    return (
      <div className="flex items-center justify-center h-full text-white font-mono">
        Cargando mapa vectorizado .HIS de Montería...
      </div>
    );
  }

  // Projection helper for SVG
  const width = 750;
  const height = 550;
  const bbox = hisData.header.bbox;
  const lngSpan = bbox.maxLng - bbox.minLng || 0.12;
  const latSpan = bbox.maxLat - bbox.minLat || 0.13;
  const padding = 45;

  const projectLng = (lng: number) => padding + ((lng - bbox.minLng) / lngSpan) * (width - padding * 2);
  const projectLat = (lat: number) => height - (padding + ((lat - bbox.minLat) / latSpan) * (height - padding * 2));

  return (
    <div className="relative w-full h-full pt-16 pb-6 px-4 md:px-8 overflow-y-auto bg-[#0a0806] text-[#fff9eb]">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#006b6b]/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#006b6b] text-[#9ff1f0] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Formato Vectorial .HIS V1.0
            </span>
            <span className="text-xs text-gray-400 font-mono">EPSG:4326 (WGS84)</span>
          </div>
          <h1 className="font-cormorant text-3xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc24b]">map</span>
            Mapa Vectorizado de Montería (Córdoba)
          </h1>
          <p className="text-xs text-gray-300 max-w-2xl mt-1">
            Estructura vectorial optimizada para integración a nivel de código (TypeScript, Three.js, SVG, GeoJSON).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadFile(rawHISContent, 'monteria_map.his', 'text/plain')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#006b6b] hover:bg-[#005151] text-white rounded-lg text-xs font-bold transition-all border border-[#9ff1f0]/40 cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Descargar .HIS</span>
          </button>

          <button
            onClick={() =>
              downloadFile(
                JSON.stringify(hisToGeoJSON(hisData), null, 2),
                'monteria_map.geojson',
                'application/json'
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1c0f] hover:bg-[#2e2a18] text-[#ffc24b] rounded-lg text-xs font-bold transition-all border border-[#ffc24b]/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>Exportar GeoJSON</span>
          </button>

          <button
            onClick={() => downloadFile(hisToSVG(hisData), 'monteria_map.svg', 'image/svg+xml')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1c0f] hover:bg-[#2e2a18] text-[#9ff1f0] rounded-lg text-xs font-bold transition-all border border-[#9ff1f0]/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">image</span>
            <span>Exportar SVG</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Vector Canvas + Layers (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="bg-[#1e1c0f]/80 backdrop-blur-md p-3 rounded-xl border border-[#6e7979]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#ffc24b] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">layers</span>
              Capas Vectoriales:
            </span>
            <div className="flex flex-wrap gap-3 font-mono text-gray-300">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showPolygons}
                  onChange={(e) => setShowPolygons(e.target.checked)}
                  className="accent-[#006b6b]"
                />
                <span>Polígonos/Comunas</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showPolylines}
                  onChange={(e) => setShowPolylines(e.target.checked)}
                  className="accent-[#38bdf8]"
                />
                <span>Vías / Río Sinú</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showPoints}
                  onChange={(e) => setShowPoints(e.target.checked)}
                  className="accent-[#ffc24b]"
                />
                <span>POIs</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="accent-[#a7f3d0]"
                />
                <span>Etiquetas</span>
              </label>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative bg-[#0d131a] rounded-2xl border border-[#006b6b]/40 overflow-hidden shadow-2xl p-2 min-h-[420px] flex items-center justify-center">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-[520px] drop-shadow-lg select-none"
            >
              {/* Background Grid Lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={width} height={height} fill="url(#grid)" />

              {/* Render Polygons */}
              {showPolygons &&
                hisData.polygons.map((p) => {
                  const pointsStr = p.coordinates
                    .map((c) => `${projectLng(c.lng).toFixed(1)},${projectLat(c.lat).toFixed(1)}`)
                    .join(' ');
                  const isSelected = selectedFeature?.id === p.id;
                  let fill = '#1e293b';
                  let stroke = '#475569';
                  let opacity = 0.35;

                  if (p.category === 'border') {
                    fill = 'none';
                    stroke = isSelected ? '#ffc24b' : '#9ff1f0';
                    opacity = 0.9;
                  } else if (p.category === 'hydrography') {
                    fill = '#006b6b';
                    stroke = '#9ff1f0';
                    opacity = 0.75;
                  } else if (p.category === 'district') {
                    fill = '#1e293b';
                    stroke = isSelected ? '#ffc24b' : '#334155';
                    opacity = isSelected ? 0.6 : 0.4;
                  } else if (p.category === 'park') {
                    fill = '#15803d';
                    stroke = '#4ade80';
                    opacity = 0.65;
                  }

                  return (
                    <polygon
                      key={p.id}
                      points={pointsStr}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={isSelected ? '#ffc24b' : stroke}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      className="transition-all duration-200 cursor-pointer hover:fill-opacity-80"
                      onClick={() =>
                        setSelectedFeature({
                          id: p.id,
                          name: p.name,
                          type: 'Polígono',
                          category: p.category,
                          details: {
                            Vértices: p.coordinates.length.toString(),
                            ...p.attributes,
                          },
                        })
                      }
                    >
                      <title>{p.name}</title>
                    </polygon>
                  );
                })}

              {/* Render Polylines */}
              {showPolylines &&
                hisData.polylines.map((l) => {
                  const pointsStr = l.coordinates
                    .map((c) => `${projectLng(c.lng).toFixed(1)},${projectLat(c.lat).toFixed(1)}`)
                    .join(' ');
                  const isSelected = selectedFeature?.id === l.id;
                  let stroke = '#ffc24b';
                  let strokeWidth = 2.0;

                  if (l.category === 'hydrography') {
                    stroke = '#38bdf8';
                    strokeWidth = 3.5;
                  } else if (l.category === 'bridge') {
                    stroke = '#f43f5e';
                    strokeWidth = 4.0;
                  }

                  return (
                    <polyline
                      key={l.id}
                      points={pointsStr}
                      fill="none"
                      stroke={isSelected ? '#ffffff' : stroke}
                      strokeWidth={isSelected ? strokeWidth + 1.5 : strokeWidth}
                      strokeLinecap="round"
                      className="transition-all duration-200 cursor-pointer hover:stroke-[#ffffff]"
                      onClick={() =>
                        setSelectedFeature({
                          id: l.id,
                          name: l.name,
                          type: 'Polílinea',
                          category: l.category,
                          details: {
                            Puntos: l.coordinates.length.toString(),
                            ...l.attributes,
                          },
                        })
                      }
                    >
                      <title>{l.name}</title>
                    </polyline>
                  );
                })}

              {/* Render Points */}
              {showPoints &&
                hisData.points.map((pt) => {
                  const cx = projectLng(pt.coordinate.lng);
                  const cy = projectLat(pt.coordinate.lat);
                  const isSelected = selectedFeature?.id === pt.id;

                  return (
                    <g
                      key={pt.id}
                      className="cursor-pointer transition-transform hover:scale-125"
                      onClick={() =>
                        setSelectedFeature({
                          id: pt.id,
                          name: pt.name,
                          type: 'Punto de Interés (POI)',
                          category: pt.category,
                          details: {
                            Latitud: pt.coordinate.lat.toString(),
                            Longitud: pt.coordinate.lng.toString(),
                            Altitud: `${pt.coordinate.alt || 18} msnm`,
                            ...pt.attributes,
                          },
                        })
                      }
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 7 : 5}
                        fill={isSelected ? '#ffffff' : '#ffc24b'}
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                      {showLabels && (
                        <text
                          x={cx}
                          y={cy - 9}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                          className="pointer-events-none drop-shadow-md"
                        >
                          {pt.name}
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* Compass Rose Overlay */}
              <g transform="translate(680, 50)" className="pointer-events-none opacity-80">
                <circle cx="0" cy="0" r="18" fill="#0a0806" stroke="#006b6b" strokeWidth="1" />
                <text x="0" y="-6" fill="#ffc24b" fontSize="10" fontWeight="bold" textAnchor="middle">
                  N
                </text>
                <path d="M 0 -14 L 4 0 L 0 2 L -4 0 Z" fill="#ffc24b" />
              </g>
            </svg>
          </div>

          {/* Selected Feature Metadata Box */}
          {selectedFeature && (
            <div className="bg-[#1e1c0f]/90 p-4 rounded-xl border border-[#ffc24b]/40 text-xs space-y-2 animate-fade-in-up">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffc24b]">
                    {selectedFeature.type} • {selectedFeature.category}
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedFeature.name}</h3>
                </div>
                <span className="text-gray-400 font-mono text-[10px]">ID: {selectedFeature.id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#0a0806] p-2.5 rounded-lg font-mono text-gray-300">
                {Object.entries(selectedFeature.details).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-gray-500 block text-[9px] uppercase">{k}</span>
                    <span className="text-[#9ff1f0] text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Playground & Developer Workbench (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#1e1c0f]/90 rounded-2xl border border-[#006b6b]/40 p-4 space-y-4 flex-1 flex flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-[#6e7979]/30 pb-3">
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#9ff1f0]">terminal</span>
                <span>Workbench de Código .HIS</span>
              </h2>
              {copyToast && (
                <span className="text-[10px] font-bold bg-[#15803d] text-white px-2 py-0.5 rounded animate-fade-in-up">
                  ¡Código Copiado!
                </span>
              )}
            </div>

            {/* Code Tabs */}
            <div className="flex gap-1 bg-[#0a0806] p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => setActiveCodeTab('parse')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  activeCodeTab === 'parse'
                    ? 'bg-[#006b6b] text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Parsear
              </button>
              <button
                onClick={() => setActiveCodeTab('geojson')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  activeCodeTab === 'geojson'
                    ? 'bg-[#006b6b] text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                GeoJSON
              </button>
              <button
                onClick={() => setActiveCodeTab('three')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  activeCodeTab === 'three'
                    ? 'bg-[#006b6b] text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Three.js
              </button>
              <button
                onClick={() => setActiveCodeTab('query')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  activeCodeTab === 'query'
                    ? 'bg-[#006b6b] text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Consultas
              </button>
            </div>

            {/* Code Display Area */}
            <div className="relative flex-1 bg-[#0a0e14] rounded-xl border border-[#334155] p-3 font-mono text-xs overflow-hidden flex flex-col">
              <button
                onClick={() => handleCopyCode(codeSnippets[activeCodeTab])}
                className="absolute top-2.5 right-2.5 bg-[#1e293b] hover:bg-[#334155] text-gray-200 p-1.5 rounded border border-gray-600 transition-all cursor-pointer"
                title="Copiar código al portapapeles"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>

              <pre className="text-[#9ff1f0] overflow-x-auto whitespace-pre-wrap leading-relaxed pr-8 flex-1">
                {codeSnippets[activeCodeTab]}
              </pre>
            </div>

            {/* Interactive Query Simulator (If activeCodeTab === 'query') */}
            {activeCodeTab === 'query' && (
              <div className="bg-[#0a0806] p-3 rounded-xl border border-[#006b6b]/40 space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-300">
                  <span>Radio de búsqueda:</span>
                  <span className="text-[#ffc24b] font-bold font-mono">{queryRadiusKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={queryRadiusKm}
                  onChange={(e) => setQueryRadiusKm(parseFloat(e.target.value))}
                  className="w-full accent-[#006b6b] cursor-pointer"
                />
                <div className="text-[11px] text-gray-400">
                  Puntos encontrados cerca al Centro: <strong className="text-white">{queriedPoints.length}</strong>
                </div>
              </div>
            )}

            {/* Specification Format Note */}
            <div className="bg-[#0a0806]/80 p-3 rounded-xl border border-[#6e7979]/20 text-[11px] text-gray-300 space-y-1">
              <div className="font-bold text-[#ffc24b] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Estructura del Formato .HIS</span>
              </div>
              <p className="leading-snug text-gray-400">
                Un archivo <code className="text-[#9ff1f0]">.his</code> se organiza por secciones entre corchetes: <code className="text-[#9ff1f0]">[HEADER]</code> para metadatos y proyección EPSG, <code className="text-[#9ff1f0]">[POLYGONS]</code> para zonas geográficas, <code className="text-[#9ff1f0]">[POLYLINES]</code> para líneas y vías, <code className="text-[#9ff1f0]">[POINTS]</code> para POIs y <code className="text-[#9ff1f0]">[ATTRIBUTES]</code> para datos alfanuméricos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
