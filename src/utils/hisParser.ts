import * as THREE from 'three';

export interface HISCoordinate {
  lat: number;
  lng: number;
  alt?: number;
}

export interface HISPolygon {
  id: string;
  name: string;
  category: string;
  coordinates: HISCoordinate[];
  attributes?: Record<string, string>;
}

export interface HISPolyline {
  id: string;
  name: string;
  category: string;
  coordinates: HISCoordinate[];
  attributes?: Record<string, string>;
}

export interface HISPoint {
  id: string;
  name: string;
  category: string;
  coordinate: HISCoordinate;
  attributes?: Record<string, string>;
}

export interface HISHeader {
  title: string;
  version: string;
  crs: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  center: HISCoordinate;
  units: string;
  elevation_msnm: number;
  department: string;
  country: string;
  raw: Record<string, string>;
}

export interface HISMapData {
  header: HISHeader;
  polygons: HISPolygon[];
  polylines: HISPolyline[];
  points: HISPoint[];
  attributesMap: Record<string, Record<string, string>>;
}

/**
 * Convierte coordenadas geográficas (lat, lng, alt) del formato .HIS a coordenadas cartesianas 3D (X, Y, Z)
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  alt = 18,
  centerLat = 8.7500,
  centerLng = -75.8800,
  scaleLat = 300,
  scaleLng = 300
): THREE.Vector3 {
  const x = (lng - centerLng) * scaleLng;
  const z = -(lat - centerLat) * scaleLat;
  const y = (alt - 18) * 0.05;
  return new THREE.Vector3(x, y, z);
}

/**
 * Parsea el contenido de texto de un archivo en formato .HIS (Header-Indexed Spatial)
 */
export function parseHIS(hisContent: string): HISMapData {
  const lines = hisContent.split(/\r?\n/);
  
  let currentSection = '';
  const rawHeader: Record<string, string> = {};
  const polygons: HISPolygon[] = [];
  const polylines: HISPolyline[] = [];
  const points: HISPoint[] = [];
  const attributesMap: Record<string, Record<string, string>> = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1).toUpperCase();
      continue;
    }

    if (currentSection === 'HEADER') {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        rawHeader[key] = value;
      }
    } else if (currentSection === 'POLYGONS') {
      const parts = line.split('|');
      if (parts.length >= 4) {
        const id = parts[0].trim();
        const name = parts[1].trim();
        const category = parts[2].trim();
        const coordsStr = parts[3].trim();
        
        const coords: HISCoordinate[] = coordsStr.split(';').map(p => {
          const [latStr, lngStr] = p.split(',');
          return { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
        }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));

        polygons.push({ id, name, category, coordinates: coords });
      }
    } else if (currentSection === 'POLYLINES') {
      const parts = line.split('|');
      if (parts.length >= 4) {
        const id = parts[0].trim();
        const name = parts[1].trim();
        const category = parts[2].trim();
        const coordsStr = parts[3].trim();
        
        const coords: HISCoordinate[] = coordsStr.split(';').map(p => {
          const [latStr, lngStr] = p.split(',');
          return { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
        }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));

        polylines.push({ id, name, category, coordinates: coords });
      }
    } else if (currentSection === 'POINTS') {
      const parts = line.split('|');
      if (parts.length >= 5) {
        const id = parts[0].trim();
        const name = parts[1].trim();
        const category = parts[2].trim();
        const lat = parseFloat(parts[3].trim());
        const lng = parseFloat(parts[4].trim());
        const alt = parts[5] ? parseFloat(parts[5].trim()) : 0;

        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({
            id,
            name,
            category,
            coordinate: { lat, lng, alt }
          });
        }
      }
    } else if (currentSection === 'ATTRIBUTES') {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const targetId = parts[0].trim();
        const attrDict: Record<string, string> = {};
        for (let i = 1; i < parts.length; i++) {
          const [k, v] = parts[i].split('=');
          if (k && v) attrDict[k.trim()] = v.trim();
        }
        attributesMap[targetId] = attrDict;
      }
    }
  }

  // Attach attributes to features
  polygons.forEach(p => { if (attributesMap[p.id]) p.attributes = attributesMap[p.id]; });
  polylines.forEach(l => { if (attributesMap[l.id]) l.attributes = attributesMap[l.id]; });
  points.forEach(pt => { if (attributesMap[pt.id]) pt.attributes = attributesMap[pt.id]; });

  const header: HISHeader = {
    title: rawHeader.title || 'Mapa Vectorial Montería',
    version: rawHeader.version || '1.0.0',
    crs: rawHeader.crs || 'EPSG:4326',
    bbox: {
      minLat: parseFloat(rawHeader.bbox_min_lat || '8.7000'),
      maxLat: parseFloat(rawHeader.bbox_max_lat || '8.8300'),
      minLng: parseFloat(rawHeader.bbox_min_lng || '-75.9300'),
      maxLng: parseFloat(rawHeader.bbox_max_lng || '-75.8100'),
    },
    center: {
      lat: parseFloat(rawHeader.center_lat || '8.7500'),
      lng: parseFloat(rawHeader.center_lng || '-75.8800'),
    },
    units: rawHeader.units || 'degrees',
    elevation_msnm: parseFloat(rawHeader.elevation_msnm || '18'),
    department: rawHeader.department || 'Córdoba',
    country: rawHeader.country || 'Colombia',
    raw: rawHeader,
  };

  return {
    header,
    polygons,
    polylines,
    points,
    attributesMap,
  };
}

/**
 * Convierte un objeto HISMapData a especificación estándar GeoJSON FeatureCollection
 */
export function hisToGeoJSON(hisData: HISMapData): Record<string, any> {
  const features: any[] = [];

  // Polygons -> Polygon Features
  hisData.polygons.forEach(p => {
    features.push({
      type: 'Feature',
      id: p.id,
      properties: {
        name: p.name,
        category: p.category,
        ...p.attributes,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [p.coordinates.map(c => [c.lng, c.lat])],
      },
    });
  });

  // Polylines -> LineString Features
  hisData.polylines.forEach(l => {
    features.push({
      type: 'Feature',
      id: l.id,
      properties: {
        name: l.name,
        category: l.category,
        ...l.attributes,
      },
      geometry: {
        type: 'LineString',
        coordinates: l.coordinates.map(c => [c.lng, c.lat]),
      },
    });
  });

  // Points -> Point Features
  hisData.points.forEach(pt => {
    features.push({
      type: 'Feature',
      id: pt.id,
      properties: {
        name: pt.name,
        category: pt.category,
        elevation: pt.coordinate.alt || 0,
        ...pt.attributes,
      },
      geometry: {
        type: 'Point',
        coordinates: [pt.coordinate.lng, pt.coordinate.lat],
      },
    });
  });

  return {
    type: 'FeatureCollection',
    metadata: {
      crs: hisData.header.crs,
      title: hisData.header.title,
      department: hisData.header.department,
    },
    features,
  };
}

/**
 * Genera un string SVG vectorial dinámico proyectado a 2D desde el archivo .HIS
 */
export function hisToSVG(hisData: HISMapData, width = 800, height = 800): string {
  const bbox = hisData.header.bbox;
  const lngSpan = bbox.maxLng - bbox.minLng || 0.12;
  const latSpan = bbox.maxLat - bbox.minLat || 0.13;
  const padding = 40;

  const projectLng = (lng: number) => padding + ((lng - bbox.minLng) / lngSpan) * (width - padding * 2);
  const projectLat = (lat: number) => height - (padding + ((lat - bbox.minLat) / latSpan) * (height - padding * 2));

  let svgElements = '';

  // Background
  svgElements += `<rect width="${width}" height="${height}" fill="#0a0e14" rx="12"/>\n`;

  // Render Polygons
  hisData.polygons.forEach(p => {
    const pointsStr = p.coordinates.map(c => `${projectLng(c.lng).toFixed(1)},${projectLat(c.lat).toFixed(1)}`).join(' ');
    let fill = '#1e293b';
    let stroke = '#475569';
    let fillOpacity = '0.3';

    if (p.category === 'hydrography') {
      fill = '#006b6b';
      stroke = '#9ff1f0';
      fillOpacity = '0.7';
    } else if (p.category === 'district') {
      fill = '#111827';
      stroke = '#006b6b';
      fillOpacity = '0.4';
    } else if (p.category === 'park') {
      fill = '#15803d';
      stroke = '#4ade80';
      fillOpacity = '0.6';
    }

    svgElements += `  <polygon points="${pointsStr}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="1.5"><title>${p.name}</title></polygon>\n`;
  });

  // Render Polylines
  hisData.polylines.forEach(l => {
    const pointsStr = l.coordinates.map(c => `${projectLng(c.lng).toFixed(1)},${projectLat(c.lat).toFixed(1)}`).join(' ');
    let stroke = '#ffc24b';
    let strokeWidth = '2';

    if (l.category === 'hydrography') {
      stroke = '#38bdf8';
      strokeWidth = '3';
    } else if (l.category === 'bridge') {
      stroke = '#f43f5e';
      strokeWidth = '3.5';
    }

    svgElements += `  <polyline points="${pointsStr}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"><title>${l.name}</title></polyline>\n`;
  });

  // Render Points
  hisData.points.forEach(pt => {
    const cx = projectLng(pt.coordinate.lng).toFixed(1);
    const cy = projectLat(pt.coordinate.lat).toFixed(1);
    svgElements += `  <circle cx="${cx}" cy="${cy}" r="5" fill="#ffc24b" stroke="#ffffff" stroke-width="1.5"><title>${pt.name}</title></circle>\n`;
    svgElements += `  <text x="${cx}" y="${(parseFloat(cy) - 8).toFixed(1)}" fill="#ffffff" font-size="10" font-family="sans-serif" text-anchor="middle">${pt.name}</text>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">\n${svgElements}</svg>`;
}

/**
 * Convierte datos vectoriales .HIS en un grupo 3D de objetos Three.js listo para agregarse a una escena
 */
export function hisToThreeJS(hisData: HISMapData, scaleFactor = 300): THREE.Group {
  const group = new THREE.Group();
  group.name = 'HIS_Montería_Vector_Group';

  const center = hisData.header.center;

  const projectTo3D = (lat: number, lng: number, alt = 18) => {
    return latLngToVector3(lat, lng, alt, center.lat, center.lng, scaleFactor, scaleFactor);
  };

  // 1. Polygon Meshes & Outlines
  hisData.polygons.forEach(p => {
    if (p.coordinates.length < 3) return;

    if (p.category === 'border') {
      // Outline for Urban Perimeter Boundary
      const points3D: THREE.Vector3[] = p.coordinates.map(c => {
        const v = projectTo3D(c.lat, c.lng, 18);
        return new THREE.Vector3(v.x, 0.05, v.z);
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points3D);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x9ff1f0,
        linewidth: 2,
        scale: 1,
        dashSize: 1,
        gapSize: 0.5,
      });
      const borderLine = new THREE.LineLoop(lineGeo, lineMat);
      borderLine.computeLineDistances();
      group.add(borderLine);
      return;
    }

    const shape = new THREE.Shape();
    const first = projectTo3D(p.coordinates[0].lat, p.coordinates[0].lng);
    shape.moveTo(first.x, first.z);

    for (let i = 1; i < p.coordinates.length; i++) {
      const pt = projectTo3D(p.coordinates[i].lat, p.coordinates[i].lng);
      shape.lineTo(pt.x, pt.z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    let color = 0x334155;
    let opacity = 0.4;
    let yPos = 0.01;

    if (p.category === 'hydrography') {
      color = 0x34a5bb; // Río Sinú water tone
      opacity = 0.85;
      yPos = 0.03;
    } else if (p.category === 'park') {
      color = 0x48bb78; // Ronda del Sinú park green
      opacity = 0.7;
      yPos = 0.02;
    } else if (p.category === 'district') {
      color = 0x1e293b;
      opacity = 0.25;
      yPos = 0.01;
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
      roughness: 0.7,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = yPos;
    group.add(mesh);
  });

  // 2. Polyline Roads & Hydrography Axis Lines
  hisData.polylines.forEach(l => {
    const points3D: THREE.Vector3[] = l.coordinates.map(c => {
      const v = projectTo3D(c.lat, c.lng, 19);
      return new THREE.Vector3(v.x, 0.08, v.z);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
    let color = 0xffc24b; // Standard road (Circunvalar, Calle 27, Carrera 1a)
    if (l.category === 'hydrography') color = 0x38bdf8;
    else if (l.category === 'bridge') color = 0xf43f5e;
    else if (l.id.includes('caribe')) color = 0xeab308;

    const material = new THREE.LineBasicMaterial({ color, linewidth: 3 });
    const line = new THREE.Line(geometry, material);
    group.add(line);
  });

  // 3. Point Markers
  const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const pointMat = new THREE.MeshStandardMaterial({ color: 0xffc24b, metalness: 0.3, roughness: 0.2 });

  hisData.points.forEach(pt => {
    const v = projectTo3D(pt.coordinate.lat, pt.coordinate.lng, pt.coordinate.alt || 18);
    const marker = new THREE.Mesh(sphereGeo, pointMat);
    marker.position.set(v.x, Math.max(0.5, v.y + 0.5), v.z);
    group.add(marker);
  });

  return group;
}

/**
 * Calcula la distancia haversine en kilómetros entre dos coordenadas
 */
export function calculateDistanceKm(c1: HISCoordinate, c2: HISCoordinate): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (c2.lat - c1.lat) * (Math.PI / 180);
  const dLng = (c2.lng - c1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * (Math.PI / 180)) *
      Math.cos(c2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Busca puntos de interés dentro de un radio específico en kilómetros
 */
export function findPointsInRadius(
  hisData: HISMapData,
  lat: number,
  lng: number,
  radiusKm: number
): HISPoint[] {
  const center: HISCoordinate = { lat, lng };
  return hisData.points.filter(pt => calculateDistanceKm(center, pt.coordinate) <= radiusKm);
}

/**
 * Exporta un objeto HISMapData a string en formato .HIS estándar
 */
export function exportHIS(hisData: HISMapData): string {
  let output = `# HIS_SPATIAL_VECTOR_V1\n# EXPORTED FROM MONTERÍA EN 3D\n\n`;

  // Header
  output += `[HEADER]\n`;
  output += `title=${hisData.header.title}\n`;
  output += `version=${hisData.header.version}\n`;
  output += `crs=${hisData.header.crs}\n`;
  output += `bbox_min_lat=${hisData.header.bbox.minLat}\n`;
  output += `bbox_max_lat=${hisData.header.bbox.maxLat}\n`;
  output += `bbox_min_lng=${hisData.header.bbox.minLng}\n`;
  output += `bbox_max_lng=${hisData.header.bbox.maxLng}\n`;
  output += `center_lat=${hisData.header.center.lat}\n`;
  output += `center_lng=${hisData.header.center.lng}\n`;
  output += `units=${hisData.header.units}\n`;
  output += `elevation_msnm=${hisData.header.elevation_msnm}\n`;
  output += `department=${hisData.header.department}\n`;
  output += `country=${hisData.header.country}\n\n`;

  // Polygons
  output += `[POLYGONS]\n`;
  hisData.polygons.forEach(p => {
    const coordsStr = p.coordinates.map(c => `${c.lat},${c.lng}`).join(';');
    output += `${p.id}|${p.name}|${p.category}|${coordsStr}\n`;
  });
  output += `\n`;

  // Polylines
  output += `[POLYLINES]\n`;
  hisData.polylines.forEach(l => {
    const coordsStr = l.coordinates.map(c => `${c.lat},${c.lng}`).join(';');
    output += `${l.id}|${l.name}|${l.category}|${coordsStr}\n`;
  });
  output += `\n`;

  // Points
  output += `[POINTS]\n`;
  hisData.points.forEach(pt => {
    output += `${pt.id}|${pt.name}|${pt.category}|${pt.coordinate.lat}|${pt.coordinate.lng}|${pt.coordinate.alt || 0}\n`;
  });
  output += `\n`;

  // Attributes
  output += `[ATTRIBUTES]\n`;
  Object.entries(hisData.attributesMap).forEach(([id, attrs]) => {
    const attrPairs = Object.entries(attrs).map(([k, v]) => `${k}=${v}`).join('|');
    output += `${id}|${attrPairs}\n`;
  });

  return output;
}
