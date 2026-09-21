import { Landmark, RouteItem } from '../types';

export const PROTOTYPE_BACKGROUND_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuDWg9y9Vbm7rV53_r4ddMutUYWvm_wOHz7pNmteJJhqbRL4Z9FotT7FXzIHv9YxEOqEGdFU2OcxcVhPn972cBB0p2odjgB3lsqCRR7ZdKJN-xWZCLjpNyDPCxOoKEQLxn9unYUIUVlX0q6WpAWnhzBMbmfb2xA1-VFCg50WFR7wlvgyGtvQaIm4qtP3YPbYsi06e3vtWBrrKwB5reHNb0hwrRb5DfE-sH49KiDhwtaxZfbKIM_ZTnkLpRisVVZJCCaugw";

export const ALTERNATE_BACKGROUNDS = [
  {
    title: "Vista Panorámica del Río Sinú",
    url: PROTOTYPE_BACKGROUND_IMAGE,
    description: "Perspectiva general del cauce del Río Sinú y el valle de Montería."
  },
  {
    title: "Atardecer en la Ronda del Sinú",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    description: "Luces doradas reflejadas sobre las aguas tranquilas del cauce fluvial."
  },
  {
    title: "Ronda Norte & Parque Lineal",
    url: "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=1600&q=80",
    description: "El parque lineal urbano más grande de América Latina a lo largo del Sinú."
  }
];

export const MONTERIA_LANDMARKS: Landmark[] = [
  {
    id: "ronda-del-sinu",
    name: "Ronda del Sinú",
    subtitle: "Parque Lineal Más Largo de Latinoamérica",
    category: "nature",
    coordinates: { lat: 8.7578, lng: -75.8872, alt: 18 },
    position3D: { x: 0.8, y: 0, z: -1.0 },
    description: "Impresionante parque ecoturístico lineal bordeando las riberas del majestuoso Río Sinú. Alberga fauna silvestre, iguanas, osos perezosos y una frondosa vegetación tropical.",
    history: "Inaugurado a principios de la década de 2000, transformó la ribera del río en el epicentro ecológico, social y turístico de Montería, extendiéndose por más de 4 kilómetros.",
    imageUrl: "/image/ronda.png",
    image: "/image/ronda.png",
    additionalImages: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      PROTOTYPE_BACKGROUND_IMAGE
    ],
    audioDuration: "2:45 min",
    tags: ["Ecoturismo", "Río Sinú", "Flora & Fauna", "Sostenibilidad"],
    builtYear: "2002",
    locationAddress: "Carrera 1a entre Calles 21 y 41, Montería",
    rating: 4.9,
    featured: true
  },
  {
    id: "catedral-san-jeronimo",
    name: "Catedral San Jerónimo",
    subtitle: "Joya Arquitectónica y Corazón Neoclásico",
    category: "architecture",
    coordinates: { lat: 8.7562, lng: -75.8856, alt: 22 },
    position3D: { x: 3, y: 0.8, z: 2 },
    description: "Majestuoso templo católico ubicado en el Parque Simón Bolívar. Destaca por sus torres simétricas, vitrales de valor patrimonial y cúpulas de estilo ecléctico neoclásico.",
    history: "Construida en 1903 y finalizada a mediados del siglo XX, es el símbolo religioso y arquitectónico más icónico del departamento de Córdoba.",
    imageUrl: "/image/catedral.png",
    image: "/image/catedral.png",
    audioDuration: "3:10 min",
    tags: ["Patrimonio", "Arquitectura Neoclásica", "Centro Histórico"],
    builtYear: "1903 - 1956",
    locationAddress: "Calle 27 # 3-16, Frente al Parque Simón Bolívar",
    rating: 4.8,
    featured: true
  },
  {
    id: "muelle-turistico",
    name: "Muelle Turístico del Río Sinú",
    subtitle: "Embarcadero y Mirador Fluvial",
    category: "nature",
    coordinates: { lat: 8.7550, lng: -75.8885, alt: 18 },
    position3D: { x: -4, y: -0.2, z: -3 },
    description: "Punto de partida para los paseos en planchones tradicionales y lanchas motorizadas. Un espacio ideal para contemplar la brisa del Sinú y las puestas de sol.",
    history: "Rescata la herencia navegable del Río Sinú, el cual históricamente fue la principal arteria de transporte comercial hacia el Caribe colombiano.",
    imageUrl: "/image/muelle.png",
    image: "/image/muelle.png",
    audioDuration: "2:15 min",
    tags: ["Navegación Fluvial", "Planchones", "Puesta de Sol"],
    builtYear: "2010",
    locationAddress: "Avenida Primera con Calle 35, Montería",
    rating: 4.7,
    featured: true
  },
  {
    id: "monumento-al-porro",
    name: "Monumento al Porro",
    subtitle: "Homenaje al Ritmo Folclórico Sinú",
    category: "culture",
    coordinates: { lat: 8.7520, lng: -75.8765, alt: 20 },
    position3D: { x: 5, y: 0.3, z: -4 },
    description: "Escultura monumental que rinde honores a las bandas de viento y al folclor tradicional sabanero, símbolo de la identidad musical cordobesa.",
    history: "Diseñada para preservar la tradición intangible del Porro Pelayero y Palitiao que define las festividades del Sinú.",
    imageUrl: "/image/monumento.png",
    image: "/image/monumento.png",
    audioDuration: "2:30 min",
    tags: ["Música", "Folclor", "Porro", "Cultura Sinuana"],
    builtYear: "2015",
    locationAddress: "Avenida Circunvalar con Calle 20",
    rating: 4.9,
    featured: true
  },
  {
    id: "villa-olimpica",
    name: "Villa Olímpica",
    subtitle: "Complejo Deportivo y Recreativo",
    category: "culture",
    coordinates: { lat: 8.7610, lng: -75.8650, alt: 22 },
    position3D: { x: 7.8, y: 0.3, z: 6.8 },
    description: "El principal complejo deportivo y recreativo de Montería. Cuenta con estadio de béisbol, pista de atletismo, canchas de fútbol, tenis, patinódromo y amplias zonas verdes para el esparcimiento ciudadano.",
    history: "Modernizado y ampliado para albergar los Juegos Deportivos Nacionales, consolidando a Montería como referente deportivo del Caribe colombiano.",
    imageUrl: "/image/villa-olimpica.png",
    image: "/image/villa-olimpica.png",
    additionalImages: [
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
      PROTOTYPE_BACKGROUND_IMAGE
    ],
    audioDuration: "2:20 min",
    tags: ["Deportes", "Estadio", "Atletismo", "Recreación", "Vida Sana"],
    builtYear: "1990 - Renovado 2012",
    locationAddress: "Calle 50 con Carrera 6a, Montería",
    rating: 4.8,
    featured: true
  }
];

export const MONTERIA_ROUTES: RouteItem[] = [
  {
    id: "ruta-rio",
    title: "Ruta Verde del Río Sinú",
    description: "Recorrido eco-turístico por la Ronda del Sinú, muelle de planchones y parque de fauna silvestre.",
    distanceKm: 4.2,
    durationMinutes: 45,
    landmarkIds: ["ronda-del-sinu", "muelle-turistico"],
    icon: "directions_boat",
    color: "#006b6b"
  },
  {
    id: "ruta-historica",
    title: "Ruta Histórica y Colonial",
    description: "Caminata arquitectónica por la Catedral San Jerónimo, Parque Simón Bolívar y Centro Histórico.",
    distanceKm: 2.8,
    durationMinutes: 35,
    landmarkIds: ["catedral-san-jeronimo", "ronda-del-sinu"],
    icon: "account_balance",
    color: "#c8921a"
  },
  {
    id: "ruta-cultural",
    title: "Ruta Deportiva & Cultural",
    description: "Deporte y folclor del Sinú: Monumento al Porro y Complejo Villa Olímpica.",
    distanceKm: 4.5,
    durationMinutes: 50,
    landmarkIds: ["monumento-al-porro", "villa-olimpica"],
    icon: "sports_score",
    color: "#960200"
  }
];

export const MONTERIA_FACTS = {
  title: "Montería - La Perla del Sinú",
  department: "Córdoba, Colombia",
  foundingDate: "1 de mayo de 1777",
  founder: "Antonio de la Torre y Miranda",
  population: "Approx. 510,000 habitantes",
  climate: "Cálido tropical (28°C - 34°C)",
  coordinatesStr: "8.7479° N, 75.8814° W",
  altitude: "18 msnm",
  river: "Río Sinú (Tercer río más importante del Caribe colombiano)"
};
