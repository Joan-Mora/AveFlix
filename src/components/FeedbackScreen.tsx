import { useGameState } from '../hooks/useGameState';

export const FeedbackScreen = () => {
  const { currentNode, makeChoice } = useGameState();
  const choice = currentNode.choices[0];

  return (
    <div className="relative z-20 flex flex-col justify-end items-center min-h-screen p-8 pointer-events-none">
      {/* Viñeta roja sutil en bordes */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(150,0,0,0.5)] pointer-events-none z-0"></div>

      {/* Panel inferior anclado */}
      <div className="bg-avellano-dark/80 backdrop-blur-xl p-8 rounded-t-3xl border-t-4 border-avellano-red shadow-[0_-10px_40px_rgba(230,0,0,0.4)] w-full max-w-4xl pointer-events-auto relative z-10 flex flex-col md:flex-row items-center gap-8">

        <div className="flex-shrink-0 w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center border-2 border-avellano-red animate-pulse">
          <svg className="w-10 h-10 text-avellano-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="flex-grow text-center md:text-left">
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">
            {currentNode.title}
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed mb-6 md:mb-0">
            {currentNode.text}
          </p>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={() => makeChoice(choice, currentNode)}
            className="px-8 py-4 bg-avellano-red hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:scale-105 whitespace-nowrap text-lg cursor-pointer"
          >
            {choice.text}
          </button>
        </div>
      </div>
    </div>
  );
};

