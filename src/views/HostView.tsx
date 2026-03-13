import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { onDisconnect, onValue, ref, set, update } from 'firebase/database';
import { db } from '../services/firebase';
import storyData from '../data/storyNodes.json';

type Player = {
  playerId: string;
  name: string;
  totalScore: number;
  connected: boolean;
};

type RoomPhase = 'LOBBY' | 'QUESTION' | 'VOTING_RESULTS' | 'FEEDBACK_LOOP' | 'LEADERBOARD';

type RoomGameState = {
  currentNodeId?: string;
  startedAt?: number;
  endsAt?: number;
};

type ResponseData = {
  choiceId: string;
  responseMs: number;
  submittedAt: number;
};

type StoryChoice = {
  id: string;
  text: string;
  nextNode: string;
  isCorrect: boolean;
};

type StoryNode = {
  id: string;
  title: string;
  text: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  choices: StoryChoice[];
};

type LeaderboardEntry = {
  playerId: string;
  name: string;
  score: number;
};

export const HostView = () => {
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<RoomPhase>('LOBBY');
  const [gameState, setGameState] = useState<RoomGameState>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseData>>({});
  const [allResponses, setAllResponses] = useState<Record<string, Record<string, ResponseData>>>({});
  const [feedbackQueue, setFeedbackQueue] = useState<string[]>([]);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const autoPhaseLockRef = useRef(false);

  const currentNode = useMemo(() => {
    const allNodes = (storyData.nodes ?? []) as StoryNode[];
    const id = gameState.currentNodeId;
    if (!id) return null;
    return allNodes.find((node) => node.id === id) ?? null;
  }, [gameState.currentNodeId]);

  const feedbackNode = useMemo(() => {
    const allNodes = (storyData.nodes ?? []) as StoryNode[];
    const activeFeedbackNodeId = feedbackQueue[currentFeedbackIndex];
    if (!activeFeedbackNodeId) return null;
    return allNodes.find((node) => node.id === activeFeedbackNodeId) ?? null;
  }, [feedbackQueue, currentFeedbackIndex]);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/play/${roomId}`;
  }, [roomId]);

  const buildFeedbackQueue = (node: StoryNode, rawResponses: Record<string, ResponseData>) => {
    const voteCountByChoice: Record<string, number> = {};

    Object.values(rawResponses).forEach((response) => {
      voteCountByChoice[response.choiceId] = (voteCountByChoice[response.choiceId] ?? 0) + 1;
    });

    const incorrectWithVotes = node.choices
      .filter((choice) => !choice.isCorrect && (voteCountByChoice[choice.id] ?? 0) > 0)
      .map((choice) => choice.nextNode);

    const correctNextNode = node.choices.find((choice) => choice.isCorrect)?.nextNode;
    const queue = [...incorrectWithVotes];

    if (correctNextNode) {
      queue.push(correctNextNode);
    }

    return queue.filter((value, index) => queue.indexOf(value) === index);
  };

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const playersRef = ref(db, `rooms/${roomId}/players`);
    const roomStatusRef = ref(db, `rooms/${roomId}/meta/status`);
    const phaseRef = ref(db, `rooms/${roomId}/meta/phase`);
    const gameStateRef = ref(db, `rooms/${roomId}/gameState`);

    set(roomRef, {
      meta: {
        roomId,
        phase: 'LOBBY',
        status: 'ACTIVE',
      },
      players: {},
      gameState: {},
    });

    onDisconnect(roomStatusRef).set('INACTIVE');

    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      const raw = snapshot.val() as Record<string, Player> | null;
      if (!raw) {
        setPlayers([]);
        return;
      }

      const nextPlayers = Object.values(raw).sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(nextPlayers);
    });

    const unsubscribePhase = onValue(phaseRef, (snapshot) => {
      const nextPhase = (snapshot.val() as RoomPhase | null) ?? 'LOBBY';
      setPhase(nextPhase);
      if (nextPhase !== 'QUESTION') {
        autoPhaseLockRef.current = false;
      }
    });

    const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
      const raw = (snapshot.val() as RoomGameState | null) ?? {};
      setGameState(raw);
    });

    return () => {
      unsubscribePlayers();
      unsubscribePhase();
      unsubscribeGameState();
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || phase !== 'VOTING_RESULTS' || !gameState.currentNodeId) {
      setResponses({});
      return;
    }

    const responsesRef = ref(db, `rooms/${roomId}/responses/${gameState.currentNodeId}`);
    const unsubscribeResponses = onValue(responsesRef, (snapshot) => {
      const raw = (snapshot.val() as Record<string, ResponseData> | null) ?? {};
      setResponses(raw);
    });

    return () => {
      unsubscribeResponses();
    };
  }, [roomId, phase, gameState.currentNodeId]);

  useEffect(() => {
    if (!roomId || phase !== 'LEADERBOARD') {
      setAllResponses({});
      return;
    }

    const allResponsesRef = ref(db, `rooms/${roomId}/responses`);
    const unsubscribeAllResponses = onValue(allResponsesRef, (snapshot) => {
      const raw = (snapshot.val() as Record<string, Record<string, ResponseData>> | null) ?? {};
      setAllResponses(raw);
    });

    return () => {
      unsubscribeAllResponses();
    };
  }, [roomId, phase]);

  useEffect(() => {
    if (phase !== 'QUESTION') {
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

  useEffect(() => {
    if (!roomId || phase !== 'QUESTION') return;
    if (remainingMs > 0 || autoPhaseLockRef.current) return;

    autoPhaseLockRef.current = true;
    update(ref(db, `rooms/${roomId}/meta`), { phase: 'VOTING_RESULTS' });
  }, [roomId, phase, remainingMs]);

  const handleStart = async () => {
    if (!roomId) return;

    const startedAt = Date.now();
    const endsAt = startedAt + 30_000;

    await update(ref(db, `rooms/${roomId}`), {
      'meta/phase': 'QUESTION',
      'gameState/currentNodeId': 'escena_1_cultura',
      'gameState/startedAt': startedAt,
      'gameState/endsAt': endsAt,
    });

    setFeedbackQueue([]);
    setCurrentFeedbackIndex(0);
    setResponses({});
  };

  const handleShowConsequences = async () => {
    if (!roomId || !currentNode) return;

    const queue = buildFeedbackQueue(currentNode, responses);
    setFeedbackQueue(queue);
    setCurrentFeedbackIndex(0);

    await update(ref(db, `rooms/${roomId}/meta`), { phase: 'FEEDBACK_LOOP' });
  };

  const handleNextFeedback = () => {
    setCurrentFeedbackIndex((previous) => previous + 1);
  };

  const handleGoLeaderboard = async () => {
    if (!roomId) return;
    await update(ref(db, `rooms/${roomId}/meta`), { phase: 'LEADERBOARD' });
  };

  const choiceStats = useMemo(() => {
    if (!currentNode) return [];

    const totalVotes = Object.keys(responses).length;
    const voteCountByChoice: Record<string, number> = {};

    Object.values(responses).forEach((response) => {
      voteCountByChoice[response.choiceId] = (voteCountByChoice[response.choiceId] ?? 0) + 1;
    });

    return currentNode.choices.map((choice) => {
      const count = voteCountByChoice[choice.id] ?? 0;
      const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

      return {
        ...choice,
        count,
        percent,
      };
    });
  }, [currentNode, responses]);

  const totalVotes = Object.keys(responses).length;

  const leaderboard = useMemo(() => {
    const scoreByPlayer: Record<string, number> = {};
    players.forEach((player) => {
      scoreByPlayer[player.playerId] = 0;
    });

    const allNodes = (storyData.nodes ?? []) as StoryNode[];

    Object.entries(allResponses).forEach(([nodeId, nodeResponses]) => {
      const node = allNodes.find((item) => item.id === nodeId);
      if (!node) return;

      Object.entries(nodeResponses).forEach(([playerId, response]) => {
        const selectedChoice = node.choices.find((choice) => choice.id === response.choiceId);
        if (!selectedChoice?.isCorrect) return;

        const speedBonus = Math.max(0, Math.floor(500 - response.responseMs / 100));
        const pointsAwarded = 1000 + speedBonus;

        scoreByPlayer[playerId] = (scoreByPlayer[playerId] ?? 0) + pointsAwarded;
      });
    });

    const entries: LeaderboardEntry[] = players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      score: scoreByPlayer[player.playerId] ?? 0,
    }));

    return entries.sort((a, b) => b.score - a.score);
  }, [allResponses, players]);

  useEffect(() => {
    if (!roomId || phase !== 'LEADERBOARD') return;

    const payload = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    update(ref(db, `rooms/${roomId}`), {
      leaderboard: {
        generatedAt: Date.now(),
        entries: payload,
      },
    });
  }, [roomId, phase, leaderboard]);

  const totalQuestionMs = gameState.startedAt && gameState.endsAt
    ? Math.max(1, gameState.endsAt - gameState.startedAt)
    : 30_000;
  const elapsedMs = Math.max(0, totalQuestionMs - remainingMs);
  const progressPct = Math.min(100, (elapsedMs / totalQuestionMs) * 100);

  if (phase === 'QUESTION' && currentNode) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          {currentNode.mediaType === 'video' ? (
            <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={currentNode.mediaUrl} alt={currentNode.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/45" />
        </div>

        <div className="relative z-10 p-4 md:p-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-avellano-red/35 bg-avellano-dark/70 backdrop-blur-xl p-5 md:p-7 shadow-[0_0_35px_rgba(230,0,0,0.2)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-avellano-red font-bold mb-2">Fase QUESTION</p>
                <h1 className="text-2xl md:text-4xl font-black">{currentNode.title}</h1>
              </div>

              <div className="text-left md:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Tiempo restante</p>
                <p className="text-5xl md:text-6xl font-black text-avellano-red tabular-nums">
                  {(remainingMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div className="h-full bg-avellano-red transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'VOTING_RESULTS' && currentNode) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden p-4 md:p-8">
        <div className="absolute inset-0 z-0 bg-black">
          {currentNode.mediaType === 'video' ? (
            <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={currentNode.mediaUrl} alt={currentNode.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <section className="relative z-10 mx-auto w-full max-w-5xl rounded-3xl border border-avellano-red/35 bg-avellano-dark/85 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_45px_rgba(230,0,0,0.2)]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-avellano-red font-bold mb-2">Fase VOTING_RESULTS</p>
              <h1 className="text-2xl md:text-4xl font-black">Resultados de votacion</h1>
            </div>
            <p className="text-sm md:text-base text-gray-300">Votos totales: <span className="font-black text-white">{totalVotes}</span></p>
          </div>

          <div className="space-y-4">
            {choiceStats.map((choice) => (
              <div key={choice.id} className="rounded-2xl border border-white/10 bg-black/45 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-gray-100">{choice.text}</p>
                  <p className="shrink-0 text-sm font-black text-avellano-red">{choice.percent.toFixed(0)}%</p>
                </div>
                <div className="h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                  <div className="h-full bg-avellano-red transition-all duration-1000" style={{ width: `${choice.percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-400">{choice.count} votos</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleShowConsequences}
              className="px-8 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
                transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
            >
              Mostrar Consecuencias
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === 'FEEDBACK_LOOP') {
    const isLastFeedback = currentFeedbackIndex >= feedbackQueue.length - 1;

    if (!feedbackNode) {
      return (
        <main className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
          <section className="w-full max-w-3xl rounded-3xl border border-avellano-red/35 bg-avellano-dark/85 backdrop-blur-xl p-8 text-center">
            <h1 className="text-3xl font-black mb-3">Sin retroalimentacion disponible</h1>
            <p className="text-gray-300 mb-6">No hay nodos en cola para mostrar.</p>
            <button
              onClick={handleGoLeaderboard}
              className="px-8 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide transition-all duration-300 cursor-pointer"
            >
              Ver Ranking
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          {feedbackNode.mediaType === 'video' ? (
            <video src={feedbackNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={feedbackNode.mediaUrl} alt={feedbackNode.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 p-4 md:p-8">
          <section className="mx-auto w-full max-w-4xl rounded-3xl border border-avellano-red/35 bg-avellano-dark/85 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_45px_rgba(230,0,0,0.2)]">
            <p className="text-xs uppercase tracking-[0.3em] text-avellano-red font-bold mb-2">Fase FEEDBACK_LOOP</p>
            <h1 className="text-3xl md:text-5xl font-black mb-4">{feedbackNode.title}</h1>
            <p className="text-gray-200 text-lg leading-relaxed">{feedbackNode.text}</p>

            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-400">
                Paso {Math.min(currentFeedbackIndex + 1, Math.max(feedbackQueue.length, 1))} de {Math.max(feedbackQueue.length, 1)}
              </p>

              {isLastFeedback ? (
                <button
                  onClick={handleGoLeaderboard}
                  className="px-8 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
                    transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
                >
                  Ver Ranking
                </button>
              ) : (
                <button
                  onClick={handleNextFeedback}
                  className="px-8 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
                    transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
                >
                  Siguiente
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === 'LEADERBOARD') {
    const top3 = leaderboard.slice(0, 3);
    const second = top3[1];
    const first = top3[0];
    const third = top3[2];

    return (
      <main className="min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden">
        <section className="mx-auto w-full max-w-6xl rounded-3xl border border-avellano-red/35 bg-avellano-dark/85 backdrop-blur-xl p-6 md:p-10 shadow-[0_0_45px_rgba(230,0,0,0.2)]">
          <p className="text-xs uppercase tracking-[0.35em] text-avellano-red mb-2 font-bold text-center">Fase LEADERBOARD</p>
          <h1 className="text-4xl md:text-6xl font-black text-center mb-10 animate-fade-in-up">Podio Final</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end mb-10">
            <div className="order-2 md:order-1 rounded-2xl border border-gray-400/40 bg-black/45 p-6 text-center animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <p className="text-3xl mb-2">🥈</p>
              <p className="text-lg font-black truncate">{second?.name ?? '---'}</p>
              <p className="text-gray-300">{second ? `${second.score} pts` : 'Sin datos'}</p>
            </div>

            <div className="order-1 md:order-2 rounded-2xl border border-yellow-400/50 bg-black/60 p-7 md:p-8 text-center md:-translate-y-6 shadow-[0_0_35px_rgba(250,204,21,0.25)] animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <p className="text-5xl mb-2 animate-bounce">🥇</p>
              <p className="text-2xl md:text-3xl font-black truncate">{first?.name ?? '---'}</p>
              <p className="text-yellow-300 font-black text-xl">{first ? `${first.score} pts` : 'Sin datos'}</p>
            </div>

            <div className="order-3 rounded-2xl border border-amber-700/50 bg-black/45 p-6 text-center animate-fade-in-up" style={{ animationDelay: '240ms' }}>
              <p className="text-3xl mb-2">🥉</p>
              <p className="text-lg font-black truncate">{third?.name ?? '---'}</p>
              <p className="text-gray-300">{third ? `${third.score} pts` : 'Sin datos'}</p>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 md:p-6 mb-8">
              <h2 className="text-xl font-black mb-4">Ranking completo</h2>
              <ul className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li key={entry.playerId} className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 px-4 py-3">
                    <span className="font-bold">#{index + 1} {entry.name}</span>
                    <span className="text-avellano-red font-black">{entry.score} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-10 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
                transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
            >
              Finalizar Capacitacion
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <section className="mx-auto w-full max-w-6xl rounded-3xl border border-avellano-red/40 bg-avellano-dark/85 backdrop-blur-xl shadow-[0_0_50px_rgba(230,0,0,0.15)] p-6 md:p-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          <div className="w-full lg:w-[420px] shrink-0">
            <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-avellano-red mb-3 font-bold">
              AveFlix Live  Host
            </p>
            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">Unete a la Expedicion</h1>
            <p className="text-gray-400 mb-6">Escanea el QR o entra con el PIN en la vista movil.</p>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-5 md:p-6 mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">PIN de sala</p>
              <p className="text-4xl md:text-6xl font-black text-avellano-red tracking-widest">{roomId}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 inline-flex">
              <QRCode value={joinUrl} size={180} />
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl md:text-3xl font-black">Jugadores en Lobby</h2>
              <span className="text-sm text-gray-400">{players.length} conectados</span>
            </div>

            <div className="min-h-[260px] rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5">
              {players.length === 0 ? (
                <div className="h-full min-h-[220px] grid place-items-center text-center text-gray-500">
                  Esperando jugadores...
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {players.map((player) => (
                    <li
                      key={player.playerId}
                      className="rounded-xl border border-avellano-red/25 bg-black/55 px-4 py-3 flex items-center justify-between"
                    >
                      <span className="font-bold truncate pr-2">{player.name}</span>
                      <span
                        className={`text-xs font-bold uppercase ${
                          player.connected ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {player.connected ? 'online' : 'offline'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleStart}
            className="px-8 md:px-10 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
              transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
          >
            Iniciar Expedicion
          </button>
        </div>
      </section>
    </main>
  );
};
