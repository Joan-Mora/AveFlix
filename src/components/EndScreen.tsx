import { useGameState } from '../hooks/useGameState';

// Componente auxiliar para las tarjetas de cada pilar
const PillarCard = ({ title, data }: { title: string; data: { earned: number; maxPossible: number; attempts: number; firstTryBonus: boolean } }) => {
  const isPerfect = data.firstTryBonus && data.attempts === 1;
  const isDanger = data.attempts > 2;

  return (
    <div className={`bg-black/40 border rounded-xl p-5 relative overflow-hidden ${isDanger ? 'border-red-500/50' : 'border-gray-700'}`}>
      {isPerfect && (
        <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
          PERFECTO
        </div>
      )}
      <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm mb-3">{title}</h3>
      <div className="flex justify-between items-end mb-2">
        <span className="text-3xl font-black text-white">{data.earned}<span className="text-lg text-gray-500">/{data.maxPossible}</span></span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full ${isPerfect ? 'bg-green-500' : 'bg-avellano-red'}`}
          style={{ width: `${(data.earned / data.maxPossible) * 100}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-400 flex justify-between">
        <span>Intentos: <strong className={isDanger ? 'text-red-400' : 'text-white'}>{data.attempts}</strong></span>
        {data.attempts > 1 && <span className="text-red-400">- Requirió reentrenamiento</span>}
      </div>
    </div>
  );
};

export const EndScreen = () => {
  const { score, failHistory, resetGame } = useGameState();

  const totalEarned = score.Cultura.earned + score.SST.earned + score.SIG.earned;
  const maxScore = score.Cultura.maxPossible + score.SST.maxPossible + score.SIG.maxPossible;
  const isPerfect = totalEarned === maxScore && failHistory.length === 0;

  return (
    <div className="relative z-20 flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <div className="bg-avellano-dark/95 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl w-full max-w-4xl mx-auto overflow-y-auto max-h-[90vh]">

        {/* Encabezado */}
        <div className="text-center mb-10 pb-6 border-b border-gray-800">
          <h1 className={`text-5xl md:text-6xl font-black mb-4 ${isPerfect ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-white'}`}>
            {isPerfect ? '¡Rango de Explorador Élite!' : 'Evaluación de Expedición'}
          </h1>
          <p className="text-xl text-gray-400">
            {isPerfect
              ? 'Has demostrado una ejecución impecable del ADN corporativo de Avellano.'
              : 'Has completado la ruta. Revisa el análisis de tu toma de decisiones a continuación.'}
          </p>
        </div>

        {/* Resumen de Puntuación Global */}
        <div className="flex justify-center mb-10">
          <div className="bg-black/50 border border-gray-700 rounded-2xl p-6 text-center shadow-inner">
            <span className="block text-sm text-gray-400 uppercase tracking-widest mb-1">Puntuación Total</span>
            <span className="text-5xl font-black text-white">{totalEarned}</span>
            <span className="text-2xl text-gray-500">/{maxScore}</span>
          </div>
        </div>

        {/* Desglose por Pilares */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <PillarCard title="CULTURA" data={score.Cultura} />
          <PillarCard title="SST" data={score.SST} />
          <PillarCard title="SIG & CALIDAD" data={score.SIG} />
        </div>

        {/* Registro de Auditoría */}
        {failHistory.length > 0 && (
          <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 mb-10">
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Registro de Desviaciones (Auditoría)
            </h3>
            <ul className="space-y-3">
              {failHistory.map((fail, idx) => (
                <li key={idx} className="text-sm text-gray-300 bg-black/40 p-3 rounded-lg border-l-4 border-avellano-red">
                  <span className="font-bold text-white">[{fail.pillar}]</span> {fail.choiceText}{' '}
                  <span className="text-red-400 italic">({fail.failType.replace('_', ' ')})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center mt-8">
          <button
            onClick={resetGame}
            className="px-10 py-4 bg-avellano-red hover:bg-red-700 text-white text-xl font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(230,0,0,0.4)] cursor-pointer"
          >
            Realizar Nueva Expedición
          </button>
        </div>
      </div>
    </div>
  );
};
