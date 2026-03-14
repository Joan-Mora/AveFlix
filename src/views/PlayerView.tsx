import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { onDisconnect, onValue, ref, set } from 'firebase/database';
import { db } from '../services/firebase';
import storyData from '../data/storyNodes.json';

type RoomPhase = 'LOBBY' | 'QUESTION' | 'VOTING_RESULTS' | 'FEEDBACK_LOOP' | 'LEADERBOARD' | 'CANCELED';

type RoomGameState = {
  currentNodeId?: string;
  startedAt?: number;
  endsAt?: number;
};

type QuestionChoice = {
  id: string;
  text: string;
};

type LeaderboardEntry = {
  playerId: string;
  name: string;
  score: number;
  rank?: number;
};

export const PlayerView = () => {
  const { roomId = '' } = useParams();
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [phase, setPhase] = useState<RoomPhase>('LOBBY');
  const [gameState, setGameState] = useState<RoomGameState>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [lastChoiceId, setLastChoiceId] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isDangerTime, setIsDangerTime] = useState(false);

  const cleanName = useMemo(() => playerName.trim(), [playerName]);
  const currentQuestionNode = useMemo(() => {
    const id = gameState.currentNodeId;
    if (!id) return null;
    return storyData.nodes.find((node) => node.id === id) ?? null;
  }, [gameState.currentNodeId]);

  useEffect(() => {
    if (!roomId) return;

    const phaseRef = ref(db, `rooms/${roomId}/meta/phase`);
    const gameStateRef = ref(db, `rooms/${roomId}/gameState`);
    const leaderboardRef = ref(db, `rooms/${roomId}/leaderboard/entries`);

    const unsubscribePhase = onValue(phaseRef, (snapshot) => {
      const nextPhase = snapshot.val() as RoomPhase | null;
      setPhase(nextPhase ?? 'LOBBY');
    });

    const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
      const raw = (snapshot.val() as RoomGameState | null) ?? {};
      setGameState(raw);
    });

    const unsubscribeLeaderboard = onValue(leaderboardRef, (snapshot) => {
      const raw = (snapshot.val() as LeaderboardEntry[] | null) ?? [];
      setLeaderboardEntries(raw);
    });

    return () => {
      unsubscribePhase();
      unsubscribeGameState();
      unsubscribeLeaderboard();
    };
  }, [roomId]);

  useEffect(() => {
    setHasVoted(false);
    setLastChoiceId(null);
  }, [gameState.currentNodeId]);

  useEffect(() => {
    if (phase !== 'QUESTION' || !gameState.endsAt) {
      setRemainingMs(0);
      return;
    }

    const endsAt = gameState.endsAt ?? 0;
    const tick = () => {
      const nextRemaining = Math.max(0, endsAt - Date.now());
      setRemainingMs(nextRemaining);
      
      const secondsLeft = Math.ceil(nextRemaining / 1000);
      setIsDangerTime(secondsLeft <= 5 && secondsLeft > 0);
    };

    tick();
    const timer = setInterval(tick, 100);

    return () => {
      clearInterval(timer);
    };
  }, [phase, gameState.endsAt]);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomId || !cleanName) return;

    const generatedPlayerId = Math.random().toString(36).substring(2, 8);
    const playerRef = ref(db, `rooms/${roomId}/players/${generatedPlayerId}`);

    await set(playerRef, {
      playerId: generatedPlayerId,
      name: cleanName,
      totalScore: 0,
      connected: true,
    });

    onDisconnect(ref(db, `rooms/${roomId}/players/${generatedPlayerId}/connected`)).set(false);

    setPlayerId(generatedPlayerId);
    setJoined(true);
  };

  const handleVote = async (choice: QuestionChoice) => {
    if (!roomId || !playerId || !gameState.currentNodeId || !gameState.startedAt) return;
    if (hasVoted || remainingMs <= 0) return;

    setHasVoted(true);
    setLastChoiceId(choice.id);

    const now = Date.now();
    const responseMs = Math.max(0, now - gameState.startedAt);

    await set(ref(db, `rooms/${roomId}/responses/${gameState.currentNodeId}/${playerId}`), {
      choiceId: choice.id,
      responseMs,
      submittedAt: now,
    });
  };

  if (joined && phase === 'LOBBY') {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <h1 className="text-3xl font-black mb-3">¡Conectado, {cleanName}!</h1>
          <p className="text-gray-300 leading-relaxed">Mira la pantalla principal y prepárate para responder.</p>
          <p className="mt-6 text-xs text-gray-500 uppercase tracking-[0.2em]">Sala {roomId} · ID {playerId}</p>
        </section>
      </main>
    );
  }

  if (joined && phase === 'QUESTION' && currentQuestionNode) {
    if (!gameState.currentNodeId || !gameState.startedAt || !gameState.endsAt) {
      return (
        <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
          <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
            <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-avellano-red/30 border-t-avellano-red animate-spin" />
            <h1 className="text-3xl font-black mb-3">Cargando desafio</h1>
            <p className="text-gray-300 leading-relaxed">Esperando sincronizacion de la ronda...</p>
          </section>
        </main>
      );
    }

    const questionDurationMs = gameState.startedAt && gameState.endsAt
      ? Math.max(1, gameState.endsAt - gameState.startedAt)
      : 30_000;
    const elapsedMs = Math.max(0, questionDurationMs - remainingMs);
    const progressPct = Math.min(100, (elapsedMs / questionDurationMs) * 100);
    const isLocked = hasVoted || remainingMs <= 0;

    if (isLocked) {
      return (
        <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
          <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
            <h1 className="text-3xl font-black mb-3">¡Respuesta enviada!</h1>
            <p className="text-gray-300 leading-relaxed">Mira la pantalla principal para ver el resultado.</p>
          </section>
        </main>
      );
    }

    return (
      <main className={`min-h-screen bg-black text-white px-4 py-6 transition-all duration-300 ${isDangerTime ? 'shadow-[inset_0_0_80px_rgba(255,0,0,0.4)]' : ''}`}>
        <section className={`mx-auto w-full max-w-xl rounded-3xl border ${isDangerTime ? 'border-red-500' : 'border-avellano-red/30'} bg-avellano-dark/90 backdrop-blur-xl p-5 shadow-[0_0_35px_rgba(230,0,0,0.18)] transition-colors duration-300`}>
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">Pregunta en curso</p>

          <div className="mb-4">
            <div className="h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div className="h-full bg-avellano-red transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="mt-2 text-right text-sm text-avellano-red font-black tabular-nums">{(remainingMs / 1000).toFixed(1)}s</div>
          </div>

          <h1 className="text-xl font-black mb-5 text-center">{currentQuestionNode.title}</h1>

          <div className="grid grid-cols-2 gap-4 pb-2">
            {currentQuestionNode.choices.map((choice, index) => (
              <button
                key={choice.id}
                onClick={() => handleVote({ id: choice.id, text: choice.text })}
                className={`relative flex items-center justify-center p-6 rounded-3xl transition-all duration-300 min-h-[140px] overflow-hidden group 
                  shadow-xl cursor-pointer transform hover:scale-105 border backdrop-blur-md bg-black/40
                  ${index === 0 ? 'border-red-500/50 hover:border-red-400 hover:bg-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : ''}
                  ${index === 1 ? 'border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]' : ''}
                  ${index === 2 ? 'border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-900/40 shadow-[0_0_20px_rgba(234,179,8,0.25)]' : ''}
                  ${index === 3 ? 'border-green-500/50 hover:border-green-400 hover:bg-green-900/40 shadow-[0_0_20px_rgba(34,197,94,0.25)]' : ''}
                `}
              >
                <div className="relative z-10 w-20 h-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  {/* Triangulo Rojo */}
                  {index === 0 && (
                    <svg viewBox="0 0 100 100" className="w-full h-full text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] fill-current">
                      <polygon points="50,15 90,85 10,85" />
                    </svg>
                  )}
                  {/* Cuadrado Azul */}
                  {index === 1 && (
                    <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] fill-current">
                      <rect x="15" y="15" width="70" height="70" rx="8" />
                    </svg>
                  )}
                  {/* Circulo Amarillo */}
                  {index === 2 && (
                    <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] fill-current">
                      <circle cx="50" cy="50" r="35" />
                    </svg>
                  )}
                  {/* Rombo Verde */}
                  {index === 3 && (
                    <svg viewBox="0 0 100 100" className="w-full h-full text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] fill-current">
                      <polygon points="50,15 85,50 50,85 15,50" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (joined && phase === 'QUESTION' && !currentQuestionNode) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-avellano-red/30 border-t-avellano-red animate-spin" />
          <h1 className="text-3xl font-black mb-3">Cargando desafio</h1>
          <p className="text-gray-300 leading-relaxed">Preparando pregunta y opciones...</p>
        </section>
      </main>
    );
  }

  if (joined && phase === 'VOTING_RESULTS') {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-avellano-red/30 border-t-avellano-red animate-spin" />
          <h1 className="text-3xl font-black mb-3">Tiempo agotado</h1>
          <p className="text-gray-300 leading-relaxed">Mira los resultados en la pantalla principal.</p>
        </section>
      </main>
    );
  }

  if (joined && phase === 'FEEDBACK_LOOP') {
    const correctIndex = currentQuestionNode?.choices.findIndex(c => c.isCorrect) ?? -1;
    const correctChoice = correctIndex >= 0 ? currentQuestionNode?.choices[correctIndex] : null;
    const isActuallyCorrect = lastChoiceId && correctChoice && lastChoiceId === correctChoice.id;

    return (
      <main className="min-h-screen bg-black text-white flex flex-col p-6 items-center justify-center text-center">
        <p className={`text-xs uppercase tracking-[0.3em] font-bold mb-6 ${isActuallyCorrect ? 'text-green-400' : 'text-red-500'}`}>
          {isActuallyCorrect ? '¡Respuesta Correcta!' : 'Respuesta Incorrecta'}
        </p>

        <div className="w-32 h-32 mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-bounce">
          {correctIndex === 0 && <svg viewBox="0 0 100 100" className="w-full h-full text-red-500 fill-current drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"><polygon points="50,15 90,85 10,85" /></svg>}
          {correctIndex === 1 && <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 fill-current drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]"><rect x="15" y="15" width="70" height="70" rx="8" /></svg>}
          {correctIndex === 2 && <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 fill-current drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]"><circle cx="50" cy="50" r="35" /></svg>}
          {correctIndex === 3 && <svg viewBox="0 0 100 100" className="w-full h-full text-green-500 fill-current drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]"><polygon points="50,15 85,50 50,85 15,50" /></svg>}
        </div>

        {correctChoice && (
          <h2 className="text-xl md:text-2xl font-black mb-4 text-white">{correctChoice.text}</h2>
        )}
        <p className="text-gray-500 text-sm mt-4">Mira la pantalla principal para ver la explicación.</p>
      </main>
    );
  }

  if (joined && phase === 'CANCELED') {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-red-500/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-red-500 mb-4 font-bold">AveFlix Live · Player</p>
          <h1 className="text-3xl font-black mb-3 text-red-100">Partida Finalizada</h1>
          <p className="text-gray-300 leading-relaxed">El anfitrión ha cancelado la expedición actual.</p>
          <div className="mt-8">
             <button 
               onClick={() => window.location.href = '/'}
               className="w-full px-6 py-3 rounded-xl bg-avellano-red text-white font-bold tracking-widest uppercase transition-all hover:bg-red-700"
             >
               Volver al Inicio
             </button>
          </div>
        </section>
      </main>
    );
  }

  if (joined && phase === 'LEADERBOARD') {
    const rankIndex = leaderboardEntries.findIndex((entry) => entry.playerId === playerId);
    const myEntry = rankIndex >= 0 ? leaderboardEntries[rankIndex] : null;
    const rankLabel = myEntry?.rank ?? (rankIndex >= 0 ? rankIndex + 1 : null);

    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <h1 className="text-3xl font-black mb-3">Expedicion Concluida</h1>

          {myEntry ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 mb-5">
              <p className="text-sm text-gray-400 mb-1">Tu resultado</p>
              <p className="text-4xl font-black text-avellano-red mb-2">#{rankLabel}</p>
              <p className="text-xl font-black">{myEntry.score} pts</p>
            </div>
          ) : (
            <p className="text-gray-300 leading-relaxed mb-4">Mira la pantalla principal para conocer a los ganadores.</p>
          )}

          <p className="text-gray-400 text-sm">Gracias por participar en la capacitacion AveFlix.</p>
        </section>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <h1 className="text-3xl font-black mb-3">Esperando siguiente fase</h1>
          <p className="text-gray-300 leading-relaxed">La sala está en {phase}. Sigue la pantalla principal.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_35px_rgba(230,0,0,0.18)]">
        <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Unirse a la Sala</h1>
        <p className="text-gray-400 mb-6">PIN: <span className="text-avellano-red font-black tracking-widest">{roomId}</span></p>

        <form onSubmit={handleJoin} className="space-y-4">
          <label htmlFor="player-cedula" className="block text-sm font-bold text-gray-300">
            Tu Cédula
          </label>
          <input
            id="player-cedula"
            type="text"
            inputMode="numeric"
            value={playerName}
            onChange={(event) => {
              const val = event.target.value.replace(/\D/g, ''); // Extract only digits
              setPlayerName(val);
            }}
            placeholder="Ej: 123456789"
            maxLength={12}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-4 text-lg text-white
              focus:outline-none focus:ring-2 focus:ring-avellano-red focus:border-avellano-red transition-all"
          />

          <button
            type="submit"
            disabled={!cleanName}
            className="w-full rounded-xl py-4 bg-avellano-red hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 text-white text-lg font-black
              transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
          >
            Unirse a la Sala
          </button>
        </form>

        {phase !== 'LOBBY' && (
          <p className="mt-5 text-sm text-yellow-400">La sala ya no está en Lobby (fase actual: {phase}).</p>
        )}
      </section>
    </main>
  );
};
