import React, { useState } from 'react';
import { CategoryFilter, Landmark } from '../types';

interface GalleryViewProps {
  landmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ landmarks, onSelectLandmark }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = landmarks.filter((l) => {
    const matchesCat = selectedCategory === 'all' || l.category === selectedCategory;
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const categories: { id: CategoryFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos', icon: 'auto_awesome' },
    { id: 'architecture', label: 'Arquitectura', icon: 'account_balance' },
    { id: 'nature', label: 'Naturaleza', icon: 'park' },
    { id: 'history', label: 'Historia', icon: 'history_edu' },
    { id: 'culture', label: 'Cultura', icon: 'theater_comedy' },
  ];

  return (
    <div className="relative z-20 w-full h-full overflow-y-auto px-4 md:px-8 pt-20 pb-28 text-[#fff9eb]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#006b6b]/40 pb-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#ffc24b]">
              Colección Digital
            </span>
            <h2 className="font-cormorant text-3xl md:text-5xl font-bold text-white mt-1">
              Galería de Montería
            </h2>
            <p className="text-sm text-[#e9e2ce] max-w-xl mt-1">
              Registro visual y documental de los hitos patrimoniales, naturales y culturales del Valle del Sinú.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar sitio, etiqueta o historia..."
              className="w-full bg-[#1e1c0f]/80 border border-[#6e7979]/40 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#006b6b]"
            />
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 text-[20px]">
              search
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#006b6b] text-white border border-[#9ff1f0] shadow-lg'
                  : 'bg-[#1e1c0f]/60 hover:bg-[#1e1c0f] text-[#e9e2ce] border border-[#6e7979]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectLandmark(item)}
              className="group bg-[#0a0806]/80 backdrop-blur-md rounded-xl overflow-hidden border border-[#bec9c8]/20 hover:border-[#ffc24b] transition-all cursor-pointer shadow-lg hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="relative h-52 overflow-hidden bg-black/40">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-transparent to-transparent opacity-80" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-[#006b6b]/90 backdrop-blur-md text-[#97e8e8] text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded">
                    {item.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3 bg-[#0a0806]/80 backdrop-blur-md text-[#ffc24b] text-xs font-mono px-2 py-0.5 rounded border border-[#ffc24b]/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">3d_rotation</span>
                  Modelo 3D
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-cormorant text-2xl font-bold text-white group-hover:text-[#ffc24b] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#97e8e8] font-medium mt-0.5">{item.subtitle}</p>
                  <p className="text-xs text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#6e7979]/20 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#ffc24b]">
                      location_on
                    </span>
                    {item.coordinates.lat}° N
                  </span>
                  <span className="text-[#ffc24b] font-semibold group-hover:underline flex items-center gap-1">
                    Explorar
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#1e1c0f]/40 rounded-xl border border-dashed border-[#6e7979]/30">
            <span className="material-symbols-outlined text-4xl text-[#ffc24b] mb-2">
              search_off
            </span>
            <p className="text-sm font-semibold text-gray-300">No se encontraron sitios con esa búsqueda.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-3 text-xs text-[#97e8e8] underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
