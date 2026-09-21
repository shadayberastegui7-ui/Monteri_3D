export type NavigationTab = 'explorer' | 'gallery' | 'map' | 'his' | 'settings';

export type CategoryFilter = 'all' | 'architecture' | 'nature' | 'history' | 'culture';

export interface Landmark {
  id: string;
  name: string;
  subtitle: string;
  category: CategoryFilter;
  coordinates: {
    lat: number;
    lng: number;
    alt: number;
  };
  position3D: {
    x: number;
    y: number;
    z: number;
  };
  description: string;
  history: string;
  imageUrl: string;
  image?: string;
  additionalImages?: string[];
  audioUrl?: string;
  audioGuideUrl?: string;
  audioDuration?: string;
  tags: string[];
  builtYear?: string;
  locationAddress: string;
  rating?: number;
  featured?: boolean;
}

export interface RouteItem {
  id: string;
  title: string;
  description: string;
  distanceKm: number;
  durationMinutes: number;
  landmarkIds: string[];
  icon: string;
  color: string;
}

export interface AppSettings {
  backgroundBlur: number; // 0 to 10px
  overlayOpacity: number; // 0.2 to 0.95
  rendererMode: 'realistic' | 'lowpoly' | 'wireframe' | 'night';
  enableAmbientAudio: boolean;
  ambientVolume: number;
  language: 'es' | 'en';
  unitSystem: 'metric' | 'imperial';
  showCoordinates: boolean;
  showCompass: boolean;
  activeBackgroundIndex: number;
}
