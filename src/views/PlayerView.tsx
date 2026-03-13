import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { onDisconnect, onValue, ref, set } from 'firebase/database';
import { db } from '../services/firebase';
import storyData from '../data/storyNodes.json';

type RoomPhase = 'LOBBY' | 'QUESTION' | 'VOTING_RESULTS' | 'FEEDBACK_LOOP' | 'LEADERBOARD';

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
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

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
      <main className="min-h-screen bg-black text-white px-4 py-6">
        <section className="mx-auto w-full max-w-xl rounded-3xl border border-avellano-red/30 bg-avellano-dark/90 backdrop-blur-xl p-5 shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">Pregunta en curso</p>

          <div className="mb-4">
            <div className="h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div className="h-full bg-avellano-red transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="mt-2 text-right text-sm text-avellano-red font-black tabular-nums">{(remainingMs / 1000).toFixed(1)}s</div>
          </div>

          <h1 className="text-xl font-black mb-5">{currentQuestionNode.title}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestionNode.choices.map((choice, index) => (
              <button
                key={choice.id}
                onClick={() => handleVote({ id: choice.id, text: choice.text })}
                className={`rounded-2xl p-4 text-left font-bold text-white min-h-[90px] transition-all duration-200 cursor-pointer hover:scale-[1.02]
                  ${index === 0 ? 'bg-red-600 hover:bg-red-500' : ''}
                  ${index === 1 ? 'bg-blue-600 hover:bg-blue-500' : ''}
                  ${index === 2 ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : ''}
                  ${index === 3 ? 'bg-green-600 hover:bg-green-500' : ''}`}
              >
                {choice.text}
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
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-avellano-red/30 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center shadow-[0_0_35px_rgba(230,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-4 font-bold">AveFlix Live · Player</p>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-400/50 grid place-items-center">
            <svg className="w-8 h-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black mb-3">Momento de aprendizaje</h1>
          <p className="text-gray-300 leading-relaxed">Presta atencion a la explicacion en la pantalla principal.</p>
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
          <label htmlFor="player-name" className="block text-sm font-bold text-gray-300">
            Tu Nombre
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Ej: Ana"
            maxLength={24}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-4 text-lg text-white
              focus:outline-none focus:ring-2 focus:ring-avellano-red focus:border-avellano-red"
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
