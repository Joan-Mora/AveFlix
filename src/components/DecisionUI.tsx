import { useGameState } from '../hooks/useGameState';

export const DecisionUI = () => {
  const { currentNode, makeChoice } = useGameState();

  return (
    <div className="relative z-20 flex flex-col justify-between min-h-screen p-6 md:p-10 pointer-events-none">

      {/* HEADER: No invasivo, en la parte superior */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center mt-4">
        <div className="bg-black/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-center pointer-events-auto transform transition-all duration-500 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-white tracking-wide">{currentNode.title}</h2>
            {currentNode.pillar !== 'none' && (
              <span className="px-3 py-1 bg-avellano-red/80 rounded-full text-xs font-bold text-white tracking-wider uppercase shadow-[0_0_10px_rgba(230,0,0,0.5)]">
                {currentNode.pillar}
              </span>
            )}
          </div>
          <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-3xl">
            {currentNode.text}
          </p>
        </div>
      </div>

      {/* BOTONES: Rejilla 2x2 en la parte inferior */}
      <div className="w-full max-w-5xl mx-auto mb-8 pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentNode.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => makeChoice(choice, currentNode)}
              className="relative p-5 bg-black/50 backdrop-blur-sm border border-white/20 hover:border-avellano-red hover:bg-black/70 text-left text-white font-medium rounded-xl transition-all duration-300 group overflow-hidden shadow-lg hover:shadow-[0_0_15px_rgba(230,0,0,0.3)] cursor-pointer"
            >
              {/* Barra lateral roja al hover */}
              <div className="absolute inset-y-0 left-0 w-1 bg-avellano-red transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <span className="relative z-10 block pl-2 group-hover:translate-x-2 transition-transform duration-300 text-lg">
                {choice.text}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

