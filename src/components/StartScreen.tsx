import { useState } from 'react';
import { useGameState } from '../hooks/useGameState';

const LockIcon = () => (
  <svg className="w-10 h-10 text-white/70 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const LOCKED_SEASONS = [
  {
    id: 'season-2',
    title: 'Temporada 2: La Expansión',
    subtitle: 'Liderazgo en campo',
    mediaUrl: '/assets/images/puente_inestable.svg',
  },
  {
    id: 'season-3',
    title: 'Temporada 3: El Legado',
    subtitle: 'Gestión avanzada',
    mediaUrl: '/assets/images/calidad_dilema.svg',
  },
];

export const StartScreen = () => {
  const { currentNode, makeChoice } = useGameState();
  const [currentView, setCurrentView] = useState<'main' | 'seasons'>('main');

  if (currentView === 'main') {
    return (
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen p-6 text-center overflow-hidden">
        {/* Vignette radial oscura para profundidad */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.75)_100%)] pointer-events-none" />

        {/* Badge corporativo */}
        <p className="relative text-xs font-bold tracking-[0.4em] text-avellano-red uppercase mb-8 animate-fade-in-up">
          Avellano · Capacitación Corporativa
        </p>

        {/* Logo principal */}
        <h1
          className="relative font-black text-white uppercase leading-none mb-3 animate-fade-in-up"
          style={{
            fontSize: 'clamp(5rem, 20vw, 13rem)',
            textShadow: '0 0 60px rgba(230,0,0,0.4), 0 4px 30px rgba(0,0,0,0.8)',
            letterSpacing: '-0.02em',
          }}
        >
          AveFlix
        </h1>

        {/* Línea roja decorativa */}
        <div className="relative w-32 h-1 bg-avellano-red rounded-full mb-6 shadow-[0_0_12px_rgba(230,0,0,0.7)]" />

        <p className="relative text-xl md:text-2xl text-gray-300 font-light tracking-widest uppercase mb-16 animate-fade-in-up">
          Temporada 1: El Origen
        </p>

        {/* Botón JUGAR */}
        <button
          onClick={() => setCurrentView('seasons')}
          className="relative group px-16 py-5 bg-avellano-red text-white text-2xl font-black tracking-widest uppercase
            rounded-full transition-all duration-300 cursor-pointer
            hover:scale-105 hover:bg-red-600
            shadow-[0_0_30px_rgba(230,0,0,0.5)]
            hover:shadow-[0_0_50px_rgba(230,0,0,0.8)]
            animate-fade-in-up"
        >
          <span className="relative z-10">JUGAR</span>
          {/* Shimmer sweep */}
          <span className="absolute inset-0 rounded-full overflow-hidden">
            <span className="absolute inset-y-0 -left-full w-1/2 bg-white/10 skew-x-[-20deg] group-hover:left-full transition-all duration-700 ease-in-out" />
          </span>
        </button>

        <p className="relative mt-10 text-sm text-gray-600 tracking-widest uppercase">
          Presiona JUGAR para comenzar
        </p>
      </div>
    );
  }

  // ── Vista 'seasons' ──────────────────────────────────────────────
  return (
    <div className="relative z-20 flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white
            transition-colors duration-200 cursor-pointer group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <span className="text-xs tracking-[0.3em] text-avellano-red uppercase font-bold">
          Avellano · Capacitación Corporativa
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
        Selecciona una Temporada
      </h2>
      <p className="text-gray-500 text-sm mb-8">Completa cada temporada para desbloquear la siguiente.</p>

      {/* Carrusel horizontal */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 -mx-2 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(230,0,0,0.4) transparent' }}>

        {/* ── Tarjeta T1: Desbloqueada ── */}
        <div
          onClick={() => makeChoice(currentNode.choices[0], currentNode)}
          className="snap-start shrink-0 min-w-[300px] h-[420px] md:min-w-[340px] md:h-[460px]
            relative rounded-2xl overflow-hidden cursor-pointer
            border border-avellano-red/40 shadow-[0_0_30px_rgba(230,0,0,0.25)]
            transition-transform duration-300 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(230,0,0,0.5)]
            group"
        >
          {/* Imagen de fondo */}
          <img
            src={currentNode.mediaUrl}
            alt={currentNode.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradiente inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Badge ACTIVA */}
          <div className="absolute top-4 left-4 bg-avellano-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
            Activa
          </div>

          {/* Contenido inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-avellano-red text-xs font-bold uppercase tracking-widest mb-1">Temporada 1</p>
            <h3 className="text-white text-xl font-black leading-tight mb-2">{currentNode.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">{currentNode.text}</p>
            <div className="mt-4 flex items-center gap-2 text-avellano-red font-bold text-sm group-hover:gap-3 transition-all duration-200">
              <span>Comenzar expedición</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Tarjetas bloqueadas ── */}
        {LOCKED_SEASONS.map((season, idx) => (
          <div
            key={season.id}
            className="snap-start shrink-0 min-w-[300px] h-[420px] md:min-w-[340px] md:h-[460px]
              relative rounded-2xl overflow-hidden cursor-not-allowed
              border border-gray-700/50 opacity-60 grayscale"
          >
            <img
              src={season.mediaUrl}
              alt={season.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />

            {/* Candado centrado */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="bg-black/60 backdrop-blur-sm rounded-full p-4 border border-white/10">
                <LockIcon />
              </div>
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Bloqueada</span>
            </div>

            {/* Badge número */}
            <div className="absolute top-4 left-4 bg-gray-800/80 text-gray-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Temporada {idx + 2}
            </div>

            {/* Contenido inferior */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-white/70 text-xl font-black leading-tight mb-1">{season.title}</h3>
              <p className="text-gray-500 text-sm">{season.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
