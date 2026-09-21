import React, { useState, useEffect, useRef } from 'react';
import { Landmark } from '../types';

interface LandmarkModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  onNavigateTo3D: (landmark: Landmark) => void;
}

export const LandmarkModal: React.FC<LandmarkModalProps> = ({
  landmark,
  onClose,
  onNavigateTo3D,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio when landmark changes or component unmounts / modal closes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    };
  }, [landmark]);

  if (!landmark) return null;

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const handleCloseModal = () => {
    handleStopAudio();
    onClose();
  };

  const toggleAudioGuide = () => {
    const audioSrc = landmark.audioUrl || landmark.audioGuideUrl || '/audio/sabores-de-pablo-florez.mp3';

    if (isPlayingAudio) {
      handleStopAudio();
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      if (!audioRef.current || audioRef.current.src !== new URL(audioSrc, window.location.href).href) {
        audioRef.current = new Audio(audioSrc);
        audioRef.current.onended = () => setIsPlayingAudio(false);
        audioRef.current.onerror = () => {
          // Fallback to speech synthesis if audio file fails
          const textToSpeak = `${landmark.name}. ${landmark.subtitle}. ${landmark.description}. ${landmark.history}`;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = 'es-CO';
          utterance.rate = 0.95;
          utterance.onend = () => setIsPlayingAudio(false);
          utterance.onerror = () => setIsPlayingAudio(false);
          window.speechSynthesis.speak(utterance);
        };
      }

      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((err) => {
        console.warn('HTML5 Audio play error, falling back to speech synthesis:', err);
        const textToSpeak = `${landmark.name}. ${landmark.subtitle}. ${landmark.description}. ${landmark.history}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-CO';
        utterance.rate = 0.95;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
      <div className="bg-[#0a0806] border border-[#006b6b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-[#fff9eb] shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 z-20 bg-[#0a0806]/80 hover:bg-[#ba2215] text-white p-2 rounded-full border border-white/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Hero Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
          <img
            src={landmark.image || landmark.imageUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"}
            alt={landmark.name}
            className="w-full h-full object-cover rounded-t-2xl"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-transparent to-transparent opacity-90" />

          <div className="absolute bottom-4 left-6 right-6">
            <span className="bg-[#006b6b] text-[#97e8e8] text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded">
              {landmark.category}
            </span>
            <h2 className="font-cormorant text-3xl sm:text-4xl font-bold text-white mt-1">
              {landmark.name}
            </h2>
            <p className="text-xs text-[#97e8e8] font-semibold">{landmark.subtitle}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Audio Guide Player Bar */}
          <div className="bg-[#1e1c0f]/80 p-4 rounded-xl border border-[#ffc24b]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#ffc24b]">graphic_eq</span>
              <div>
                <div className="font-bold text-xs text-white">Audioguía Oficial en Español</div>
                <div className="text-[10px] text-gray-400">Duración: {landmark.audioDuration || '2:30 min'}</div>
              </div>
            </div>

            <button
              onClick={toggleAudioGuide}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                isPlayingAudio
                  ? 'bg-[#ba2215] text-white shadow-lg animate-pulse'
                  : 'bg-[#006b6b] hover:bg-[#005151] text-white border border-[#9ff1f0]/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPlayingAudio ? 'pause' : 'play_arrow'}
              </span>
              {isPlayingAudio ? 'PAUSAR' : 'ESCUCHAR'}
            </button>
          </div>

          {/* Description & History */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-[#ffc24b] uppercase tracking-wider mb-1">
                Descripción
              </h3>
              <p className="text-xs text-gray-200 leading-relaxed">{landmark.description}</p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#ffc24b] uppercase tracking-wider mb-1">
                Reseña Histórica
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">{landmark.history}</p>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono bg-[#1e1c0f]/50 p-4 rounded-xl border border-[#6e7979]/20">
            <div>
              <span className="text-gray-400 text-[10px] block">Año / Período:</span>
              <span className="text-white font-bold">{landmark.builtYear || 'Siglo XX'}</span>
            </div>
            <div>
              <span className="text-gray-400 text-[10px] block">Coordenadas:</span>
              <span className="text-[#ffc24b] font-bold">
                {landmark.coordinates.lat}° N
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-[10px] block">Ubicación:</span>
              <span className="text-white font-bold line-clamp-1">{landmark.locationAddress}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {landmark.tags.map((tag, idx) => (
              <span
                key={idx}
                className="bg-[#006b6b]/30 text-[#97e8e8] text-[10px] font-mono px-2.5 py-1 rounded border border-[#006b6b]/50"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => {
                handleCloseModal();
                onNavigateTo3D(landmark);
              }}
              className="flex-1 bg-[#006b6b] hover:bg-[#005151] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-[#9ff1f0]/40 shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
              Iniciar Recorrido 3D
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
