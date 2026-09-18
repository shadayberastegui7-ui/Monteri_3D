import { Landmark } from '../types';

export interface GeoPoint3D {
  lng: number;
  lat: number;
  alt: number;
}

/**
 * Calculates approximate distance in meters between two GPS coordinates
 */
export function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a 3D Quadratic Bezier Arc with lateral curvature and 3D parabolic elevation (40 intermediate steps).
 * - Lateral deviation creates a curved arc on screen.
 * - Altitude follows parabolic formula: h(t) = 4 * Hmax * t * (1 - t)
 */
export function generate3DParabolicArc(
  p1: [number, number],
  p2: [number, number],
  steps = 40,
  legIndex = 0
): { arc3D: [number, number, number][]; shadow2D: [number, number, number][] } {
  const distanceMeters = getDistanceMeters(p1, p2);
  const dLng = p2[0] - p1[0];
  const dLat = p2[1] - p1[1];
  const distDegrees = Math.hypot(dLng, dLat);

  // Perpendicular normal vector for lateral Bezier curve deviation
  const sign = legIndex % 2 === 0 ? 1 : -1;
  const nLng = -dLat * sign;
  const nLat = dLng * sign;
  const len = Math.hypot(nLng, nLat) || 1;

  // Lateral curve offset amount
  const lateralOffset = Math.min(0.015, Math.max(0.003, distDegrees * 0.35));
  const controlLng = (p1[0] + p2[0]) / 2 + (nLng / len) * lateralOffset;
  const controlLat = (p1[1] + p2[1]) / 2 + (nLat / len) * lateralOffset;

  // Maximum 3D altitude (range 150m to 500m)
  const maxAltitude = Math.min(500, Math.max(150, distanceMeters * 0.22));

  const arc3D: [number, number, number][] = [];
  const shadow2D: [number, number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // 2D Quadratic Bezier formula for lateral curvature: (1-t)^2*P0 + 2(1-t)t*Pctrl + t^2*P1
    const oneMinusT = 1 - t;
    const lng =
      oneMinusT * oneMinusT * p1[0] +
      2 * oneMinusT * t * controlLng +
      t * t * p2[0];
    const lat =
      oneMinusT * oneMinusT * p1[1] +
      2 * oneMinusT * t * controlLat +
      t * t * p2[1];

    // 3D Parabolic height formula: h(t) = 4 * Hmax * t * (1 - t)
    const alt = 4 * maxAltitude * t * (1 - t);

    arc3D.push([lng, lat, alt]);
    shadow2D.push([lng, lat, 0]);
  }

  return { arc3D, shadow2D };
}

/**
 * Generates the full 3D Bezier arc route geometry for a sequence of POIs in an itinerary
 */
export function generateItinerary3DArc(itinerary: Landmark[]): {
  arc3DCoordinates: [number, number, number][];
  shadowCoordinates: [number, number, number][];
  landingPoints: [number, number][];
} {
  if (!itinerary || itinerary.length < 2) {
    return { arc3DCoordinates: [], shadowCoordinates: [], landingPoints: [] };
  }

  const arc3DCoordinates: [number, number, number][] = [];
  const shadowCoordinates: [number, number, number][] = [];
  const landingPoints: [number, number][] = itinerary.map((item) => [
    item.coordinates.lng,
    item.coordinates.lat
  ]);

  for (let i = 0; i < itinerary.length - 1; i++) {
    const p1: [number, number] = [itinerary[i].coordinates.lng, itinerary[i].coordinates.lat];
    const p2: [number, number] = [
      itinerary[i + 1].coordinates.lng,
      itinerary[i + 1].coordinates.lat
    ];

    const { arc3D, shadow2D } = generate3DParabolicArc(p1, p2, 40, i);

    for (let k = 0; k < arc3D.length; k++) {
      if (arc3DCoordinates.length === 0 || k > 0) {
        arc3DCoordinates.push(arc3D[k]);
        shadowCoordinates.push(shadow2D[k]);
      }
    }
  }

  return { arc3DCoordinates, shadowCoordinates, landingPoints };
}
