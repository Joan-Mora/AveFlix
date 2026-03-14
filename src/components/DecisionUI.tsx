import { useGameState } from '../hooks/useGameState';

export const DecisionUI = () => {
  const { currentNode, makeChoice, resetGame, skipNode } = useGameState();

  return (
    <div className="relative z-20 flex flex-col justify-end min-h-screen p-4 md:p-8 pointer-events-none pb-4 md:pb-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
      
      {/* BOTONES DE NAVEGACIÓN RÁPIDA: Top Right Overlay */}
      <div className="fixed top-6 right-6 z-50 flex gap-4 pointer-events-auto animate-fade-in-down">
        {currentNode.id.startsWith('q') && (
          <button 
            onClick={skipNode}
            className="px-5 py-2.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-avellano-red/50 hover:bg-avellano-red/20 transition-all duration-300 flex items-center gap-2 group"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
            Saltar Pregunta
          </button>
        )}
        <button 
          onClick={resetGame}
          className="px-5 py-2.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:border-red-500/50 hover:bg-red-900/20 transition-all duration-300 flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-[3]">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          Salir al Menú
        </button>
      </div>
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center mt-auto mb-6">
        <div className="px-6 py-5 md:px-10 md:py-8 rounded-3xl border border-[var(--color-glass-border)] bg-[#0a0a0a]/80 backdrop-blur-2xl shadow-2xl pointer-events-auto w-full text-center
          animate-fade-in-up transition-all duration-500 hover:shadow-[0_0_20px_rgba(211,17,17,0.2)]">
          <div className="flex flex-col items-center justify-center gap-3 mb-3 md:flex-row">
            <h2 className="text-xl md:text-3xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center gap-3">
              {currentNode.id.startsWith('q') && (
                <span className="text-avellano-red drop-shadow-[0_0_8px_rgba(230,0,0,0.6)]">
                  #{currentNode.id.match(/\d+/)?.[0]}
                </span>
              )}
              {currentNode.title}
            </h2>
            {currentNode.pillar !== 'none' && (
              <span className="px-4 py-1.5 bg-avellano-red/90 rounded-full text-xs font-black text-white tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(211,17,17,0.6)] border border-white/20">
                {currentNode.pillar}
              </span>
            )}
          </div>
          <p className="text-base md:text-xl text-gray-200 font-medium leading-relaxed max-w-4xl mx-auto drop-shadow-lg">
            {currentNode.text}
          </p>
        </div>
      </div>

      {/* BOTONES: Rejilla elegante en la parte más inferior */}
      <div className="w-full max-w-5xl mx-auto pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {currentNode.choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => makeChoice(choice, currentNode)}
              className="relative flex items-center p-6 bg-[var(--color-glass)] backdrop-blur-md border border-[var(--color-glass-border)] 
                hover:border-avellano-red hover:bg-white/5 text-left text-white rounded-2xl transition-all duration-300 group overflow-hidden 
                shadow-xl hover:shadow-[0_0_25px_rgba(232,63,63,0.3)] hover:-translate-y-1 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Barra lateral indicadora al hover */}
              <div className="absolute inset-y-0 left-0 w-1.5 bg-avellano-red transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 shadow-[0_0_10px_rgba(211,17,17,0.8)]" />
              
              <span className="relative z-10 block pl-4 group-hover:pl-6 transition-all duration-300 text-base md:text-lg font-bold tracking-wide">
                {choice.text}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

