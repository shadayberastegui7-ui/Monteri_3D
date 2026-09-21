/**
 * Utility to fetch real street route geometry from Mapbox Directions API
 */
export async function fetchMapboxRoute(
  coordinates: [number, number][],
  profile: 'driving' | 'walking' = 'driving'
): Promise<[number, number][]> {
  if (!coordinates || coordinates.length < 2) {
    return coordinates || [];
  }

  const token: string = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';
  if (!token) {
    console.warn('VITE_MAPBOX_TOKEN is missing. Falling back to straight line route.');
    return coordinates;
  }

  try {
    const coordsStr = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsStr}?geometries=geojson&overview=full&access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox Directions HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data.routes) && data.routes.length > 0 && data.routes[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates as [number, number][];
    }
  } catch (error) {
    console.error('Error fetching Mapbox Directions API route:', error);
  }

  // Fallback to straight segments if API call fails
  return coordinates;
}
