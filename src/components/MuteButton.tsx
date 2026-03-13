import { useGameState } from '../hooks/useGameState';

export const MuteButton = () => {
  const { isMuted, toggleMute } = useGameState();

  return (
    <button
      onClick={toggleMute}
      className="fixed top-5 right-5 z-50 p-3 bg-black/50 hover:bg-black/80
        backdrop-blur-sm rounded-full text-white border border-white/20
        transition-all duration-200 hover:scale-110 cursor-pointer"
      aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
      title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
    >
      {isMuted ? (
        /* Icono: altavoz tachado */
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        /* Icono: altavoz con ondas */
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  );
};
