import { useGameState } from '../hooks/useGameState';
import { audio } from '../utils/audioManager';
import { useEffect } from 'react';

// Icono de candado para las temporadas bloqueadas
const LockIcon = () => (
  <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export const StartScreen = () => {
  const { currentNode, makeChoice } = useGameState();

  useEffect(() => {
    // Intenta reproducir el BGM del menú, aunque los navegadores lo bloquearán
    // hasta que el usuario interactúe (click).
    audio.playBgm('menu');
  }, []);

  const handleInteraction = () => {
    audio.ensureContext().then(() => {
      audio.playBgm('menu');
    });
  };

  // Meses reales del año lectivo (empezando en Marzo 2026)
  const MONTHS = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];

  // Generamos un arreglo para las 9 temporadas (representando meses letivos)
  const seasons = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div 
      className="relative z-20 flex flex-col min-h-screen pt-24 pb-4 px-6 md:px-16 overflow-hidden"
      onClick={handleInteraction}
    >
      {/* Fondo inmersivo Global */}
      <div 
        className="absolute inset-0 z-[-1] bg-cover bg-center bg-no-repeat opacity-90"
        style={{ backgroundImage: 'url(/assets/images/avelino_dark_bg.png)', backgroundColor: '#0a0a0a' }}
      />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-[-1]" />

      {/* ===== Header Principal (Estilo Cinematográfico) ===== */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-7xl mx-auto mb-8 mt-4 gap-8">
        
        {/* Título y CTA */}
        <div className="flex-1 max-w-3xl">
          <div className="w-16 h-1 flex bg-avellano-red mb-6 shadow-[0_0_15px_rgba(230,0,0,0.8)]" />
          <h1 className="text-4xl md:text-6xl lg:text-[5.5rem] font-black text-white uppercase leading-tight tracking-tight drop-shadow-2xl mb-4">
            Avelino <br className="hidden md:block" /> Aventurero
          </h1>
          <p className="text-gray-300 text-sm md:text-xl font-medium tracking-wide max-w-xl mb-8 leading-relaxed">
            Acompaña a nuestro protagonista en la expedición más grande del año. Explora la espesa 'Selva de los Negocios' y descubre el verdadero valor de Avellano.
          </p>
          <button 
            onClick={() => makeChoice(currentNode.choices[0], currentNode)}
            className="group relative px-8 py-4 md:px-10 bg-avellano-red hover:bg-avellano-accent text-white font-black tracking-widest uppercase rounded-full shadow-[0_0_30px_rgba(230,0,0,0.4)] transition-all duration-300 hover:scale-105 flex items-center gap-4 cursor-pointer"
          >
            <span className="text-sm md:text-base">Jugar Temporada 1</span>
            <svg className="w-5 h-5 md:w-6 md:h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Imagen del Protagonista */}
        <div className="relative w-56 h-56 md:w-96 md:h-96 shrink-0 rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transform hover:scale-[1.03] transition-transform duration-500">
          <img 
            src="/assets/images/avelino_explorer_chick.png" 
            alt="Avelino"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </div>

      {/* ===== Carrusel de Temporadas 1 al 9 ===== */}
      <div className="w-full max-w-7xl mx-auto mt-auto">
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
          Temporadas <span className="text-avellano-red">2026</span>
        </h2>
        
        {/* Contenedor de Scroll Horizontal */}
        <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 snap-x snap-mandatory pt-2 px-2 -mx-2"
             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(230,0,0,0.5) transparent' }}>
             
          {/* Temporada 1 (Desbloqueada) */}
          <div className="snap-start shrink-0 min-w-[260px] md:min-w-[320px] h-44 md:h-56 relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-avellano-red shadow-[0_0_20px_rgba(230,0,0,0.3)] hover:scale-[1.02] transition-transform duration-300"
               onClick={() => makeChoice(currentNode.choices[0], currentNode)}>
            <img src="/assets/images/avelino_explorer_chick.png" className="absolute inset-0 w-full h-full object-cover object-top brightness-75 group-hover:brightness-100 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            <div className="absolute top-3 left-3 bg-avellano-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              Activa
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-4 md:p-6">
              <span className="text-avellano-red text-[10px] sm:text-xs font-black tracking-widest uppercase block mb-1">{MONTHS[0]}</span>
              <h3 className="text-white text-lg md:text-xl font-black leading-tight drop-shadow-md">T1: El Origen</h3>
            </div>
          </div>

          {/* Temporadas 2 al 9 (Bloqueadas con Candado) */}
          {seasons.slice(1).map(num => (
            <div key={num} className="snap-start shrink-0 min-w-[260px] md:min-w-[320px] h-44 md:h-56 relative rounded-2xl overflow-hidden cursor-not-allowed border border-white/5 bg-[#171717] opacity-80 grayscale">
              <div className="absolute inset-0 bg-gradient-to-br from-[#222] to-[#111]" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="bg-black/50 rounded-full p-3 border border-white/10 shadow-inner">
                  <LockIcon />
                </div>
                <span className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">Próximamente</span>
              </div>
              
              <div className="absolute top-3 left-3 bg-black/60 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {MONTHS[num - 1] ?? `Mes ${num}`}
              </div>
              
              <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 opacity-40">
                <h3 className="text-white text-lg md:text-xl font-black leading-tight drop-shadow-md">Temporada {num}</h3>
              </div>
            </div>
          ))}

        </div>
      </div>
      
    </div>
  );
};
