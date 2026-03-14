import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { onDisconnect, onValue, push, ref, set, update } from 'firebase/database';
import { db } from '../services/firebase';
import storyData from '../data/storyNodes.json';
import { audio } from '../utils/audioManager';

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
  nodeType?: 'start' | 'dilemma' | 'feedback_fail' | 'end';
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
  correctCount?: number;
  incorrectCount?: number;
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
  const autoPhaseLockRef = useRef(false);
  const lastTickSecRef = useRef<number | null>(null);
  const [isDangerTime, setIsDangerTime] = useState(false);
  // Leaderboard persistido en Firebase, usado cuando los jugadores ya no están en memoria
  const [savedLeaderboard, setSavedLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const currentNode = useMemo(() => {
    const allNodes = (storyData.nodes ?? []) as StoryNode[];
    const id = gameState.currentNodeId;
    if (!id) return null;
    return allNodes.find((node) => node.id === id) ?? null;
  }, [gameState.currentNodeId]);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/play/${roomId}`;
  }, [roomId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => console.error('Error copying text: ', err));
  };

  // Bypass queue logic for multiplayer, we just need single state
  // const buildFeedbackQueue = ... removed

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const playersRef = ref(db, `rooms/${roomId}/players`);
    const roomStatusRef = ref(db, `rooms/${roomId}/meta/status`);
    const phaseRef = ref(db, `rooms/${roomId}/meta/phase`);
    const gameStateRef = ref(db, `rooms/${roomId}/gameState`);

    // Usamos update en lugar de set para no borrar los jugadores existentes si el anfitrión recarga
    update(roomRef, {
      'meta/roomId': roomId,
      'meta/phase': 'LOBBY',
      'meta/status': 'ACTIVE',
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

    // Suscribirse al leaderboard guardado para usarlo como fuente de verdad en el PODIO
    const savedLbRef = ref(db, `rooms/${roomId}/leaderboard`);
    const unsubscribeSavedLb = onValue(savedLbRef, (snapshot) => {
      const raw = snapshot.val();
      if (raw?.entries && Array.isArray(raw.entries)) {
        setSavedLeaderboard(raw.entries as LeaderboardEntry[]);
      } else if (raw?.entries && typeof raw.entries === 'object') {
        setSavedLeaderboard(Object.values(raw.entries) as LeaderboardEntry[]);
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribePhase();
      unsubscribeGameState();
      unsubscribeSavedLb();
    };
  }, [roomId]);

  // Manejo de BGM y transiciones de Fase Global del Host
  useEffect(() => {
    // Pedir interaccion inicial pasiva (autoplay BGM cuando la fase cambie significa que ya inició)
    if (phase === 'LOBBY') {
      audio.playBgm('menu');
    } else if (phase === 'QUESTION') {
      audio.playBgm('tension');
      audio.playSfx('swoosh');
    } else if (phase === 'LEADERBOARD') {
      audio.playBgm('victory');
      audio.playSfx('success');
    } else {
      audio.playBgm('menu');
    }
    
    // Si entramos a fase de resultados
    if (phase === 'VOTING_RESULTS') {
      audio.playSfx('timeup');
      setIsDangerTime(false);
    }
  }, [phase]);

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

      const secondsLeft = Math.ceil(nextRemaining / 1000);
      setIsDangerTime(secondsLeft <= 5 && secondsLeft > 0);
      
      // Controlar el SFX de tick-tock una vez por segundo cuando queden 5s
      if (secondsLeft <= 5 && secondsLeft > 0 && lastTickSecRef.current !== secondsLeft) {
        audio.playSfx('tick');
        lastTickSecRef.current = secondsLeft;
      }
    };

    tick();
    const timer = setInterval(tick, 100);

    return () => {
      clearInterval(timer);
    };
  }, [phase, gameState.endsAt]);

  // Auto-advance to VOTING_RESULTS when all players have responded (don't wait full timer)
  useEffect(() => {
    if (!roomId || phase !== 'QUESTION' || players.length === 0) return;
    const totalVoted = Object.keys(responses).length;
    if (totalVoted > 0 && totalVoted >= players.length && !autoPhaseLockRef.current) {
      autoPhaseLockRef.current = true;
      // Short visual delay so players see the question briefly before stats appear
      setTimeout(() => {
        update(ref(db, `rooms/${roomId}/meta`), { phase: 'VOTING_RESULTS' });
      }, 2000);
    }
  }, [roomId, phase, responses, players.length]);

  useEffect(() => {
    if (!roomId || phase !== 'QUESTION' || !gameState.endsAt) return;
    if (autoPhaseLockRef.current) return;

    // Solo disparamos el final si el tiempo actual supero el tiempo de finalizacion absoluto
    if (Date.now() >= gameState.endsAt) {
      autoPhaseLockRef.current = true;
      update(ref(db, `rooms/${roomId}/meta`), { phase: 'VOTING_RESULTS' });
    }
  }, [roomId, phase, remainingMs, gameState.endsAt]);

  const handleStart = async () => {
    if (!roomId || players.length < 2) return;

    // Obtener el primer nodo desde storyData "start"
    const startNode = (storyData.nodes as StoryNode[]).find((node) => node.id === 'start');
    
    // Fallback asegurado: si encontramos startNode, tomamos el nextNode de su primera opcion
    let firstNodeId = 'c1_dilema_1';
    if (startNode && startNode.choices && startNode.choices.length > 0) {
      firstNodeId = startNode.choices[0].nextNode || 'c1_dilema_1';
    }

    const startedAt = Date.now();
    const endsAt = startedAt + 30_000;

    await update(ref(db, `rooms/${roomId}`), {
      'meta/phase': 'QUESTION',
      'gameState/currentNodeId': firstNodeId,
      'gameState/startedAt': startedAt,
      'gameState/endsAt': endsAt,
    });

    // Limpiar respuestas antiguas explícitamente sin usar null porque podría dar error en la lectura de Firebase iterando keys
    await set(ref(db, `rooms/${roomId}/responses`), {});

    autoPhaseLockRef.current = false;
    setResponses({});
  };

  const handleShowConsequences = async () => {
    if (!roomId) return;
    await update(ref(db, `rooms/${roomId}/meta`), { phase: 'FEEDBACK_LOOP' });
  };

  // handleNextFeedback removed as it's no longer a queue
  
  /** Limpieza manual de la sala (solo Lobby) */
  const handleResetRoom = async () => {
    if (!roomId) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar a todos los jugadores y respuestas de esta sala?')) {
      try {
        await set(ref(db, `rooms/${roomId}/players`), {});
        await set(ref(db, `rooms/${roomId}/responses`), {});
        await update(ref(db, `rooms/${roomId}/meta`), { phase: 'LOBBY' });
        console.log('[HostView] Room reset successfully');
      } catch (err) {
        console.warn('[HostView] Error resetting room:', err);
      }
    }
  };

  const handleGoLeaderboard = async () => {
    if (!roomId) return;
    await update(ref(db, `rooms/${roomId}/meta`), { phase: 'LEADERBOARD' });
  };

  // MONTHS for season label (matches StartScreen)
  const MONTHS = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];
  // Detect current season from month (March=0, April=1, ...)
  const currentSeasonIndex = Math.max(0, new Date().getMonth() - 2); // March=2 → index 0
  const currentSeason = MONTHS[Math.min(currentSeasonIndex, MONTHS.length - 1)];

  /** Saves the completed session to /history and then navigates home */
  const handleFinalize = async () => {
    if (!roomId) { navigate('/'); return; }

    const finalLeaderboard = leaderboard.length > 0 ? leaderboard : savedLeaderboard;
    if (finalLeaderboard.length > 0) {
      const sessionPayload = {
        roomId,
        season: currentSeason,
        seasonNumber: currentSeasonIndex + 1,
        playedAt: Date.now(),
        totalPlayers: finalLeaderboard.length,
        entries: finalLeaderboard.map((e, idx) => ({
          playerId: e.playerId,
          name: e.name,
          rank: idx + 1,
          score: e.score,
          correctCount: e.correctCount ?? 0,
          incorrectCount: e.incorrectCount ?? 0,
        })),
      };
      try {
        const histRef = push(ref(db, 'history'));
        await set(histRef, sessionPayload);
        
        // --- OPTIMIZACIÓN: Limpiar sala tras guardar ---
        await update(ref(db, `rooms/${roomId}`), {
          players: {},
          responses: {},
          gameState: {},
          leaderboard: { entries: [] },
          'meta/phase': 'LOBBY'
        });
        
      } catch (err) {
        console.warn('[HistoryView] Could not save history:', err);
      }
    }
    navigate('/');
  };

  const handleAdvanceFromFeedback = async () => {
    if (!roomId || !currentNode) return;

    const correctChoice = currentNode.choices.find((c) => c.isCorrect);
    if (!correctChoice || correctChoice.nextNode === 'end') {
      await handleGoLeaderboard();
      return;
    }

    const nextRealNode = (storyData.nodes as StoryNode[]).find(n => n.id === correctChoice.nextNode);

    // If next node is dilemma, we go directly to question. 
    // If it's another start (shouldnt happen), we go there.
    if (nextRealNode && (nextRealNode.nodeType === 'dilemma' || nextRealNode.nodeType === 'start' || !nextRealNode.nodeType)) {
      const startedAt = Date.now();
      const endsAt = startedAt + 30_000;

      await update(ref(db, `rooms/${roomId}`), {
        'meta/phase': 'QUESTION',
        'gameState/currentNodeId': nextRealNode.id,
        'gameState/startedAt': startedAt,
        'gameState/endsAt': endsAt,
      });

      autoPhaseLockRef.current = false;
      setResponses({});
    } else {
      await handleGoLeaderboard();
    }
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
    const statsByPlayer: Record<string, {
      score: number;
      streak: number;
      correctCount: number;
      incorrectCount: number;
    }> = {};

    players.forEach((player) => {
      statsByPlayer[player.playerId] = {
        score: 0,
        streak: 0,
        correctCount: 0,
        incorrectCount: 0,
      };
    });

    const allNodes = (storyData.nodes ?? []) as StoryNode[];
    
    // Flatten responses to compute streaks chronologically
    const flattenedResponses: Array<{ playerId: string; nodeId: string; response: ResponseData }> = [];
    
    Object.entries(allResponses).forEach(([nodeId, nodeResponses]) => {
      Object.entries(nodeResponses).forEach(([playerId, response]) => {
        flattenedResponses.push({ playerId, nodeId, response });
      });
    });
    
    flattenedResponses.sort((a, b) => a.response.submittedAt - b.response.submittedAt);

    flattenedResponses.forEach(({ playerId, nodeId, response }) => {
      const node = allNodes.find((item) => item.id === nodeId);
      if (!node) return;
      
      const stats = statsByPlayer[playerId];
      if (!stats) return; // Player might have left

      const selectedChoice = node.choices.find((choice) => choice.id === response.choiceId);
      
      if (selectedChoice?.isCorrect) {
        stats.correctCount += 1;
        stats.streak += 1;
        
        const speedBonus = Math.max(0, Math.floor(500 - response.responseMs / 100));
        let streakMultiplier = 1;
        if (stats.streak === 2) streakMultiplier = 1.2;
        if (stats.streak >= 3) streakMultiplier = 1.5;
        
        const pointsAwarded = Math.floor((1000 + speedBonus) * streakMultiplier);
        stats.score += pointsAwarded;
      } else {
        stats.incorrectCount += 1;
        stats.streak = 0;
      }
    });

    const entries: LeaderboardEntry[] = players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      score: statsByPlayer[player.playerId]?.score ?? 0,
      correctCount: statsByPlayer[player.playerId]?.correctCount ?? 0,
      incorrectCount: statsByPlayer[player.playerId]?.incorrectCount ?? 0,
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
      <main className={`relative bg-black text-white transition-all duration-300 flex flex-col overflow-hidden ${isDangerTime ? 'shadow-[inset_0_0_150px_rgba(255,0,0,0.4)]' : ''}`} style={{ height: '100dvh' }}>
        
        {/* TOP BAR: TIMER & TITLE */}
        <div className="relative z-20 w-full px-3 py-2 md:px-5 md:py-3 shrink-0">
          <div className="mx-auto max-w-7xl rounded-xl border border-avellano-red bg-avellano-dark/85 backdrop-blur-xl px-4 py-3 shadow-[0_0_30px_rgba(230,0,0,0.3)]">
            <div className="flex items-start md:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-avellano-red font-bold leading-none mb-1">Fase QUESTION</p>
                <h1 className="text-base md:text-2xl font-black truncate leading-tight">{currentNode.title}</h1>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 leading-none mb-0.5">Tiempo</p>
                <p className="text-xl md:text-3xl font-black text-avellano-red tabular-nums leading-none">
                  {(remainingMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            {/* ENUNCIADO DE LA PREGUNTA */}
            {currentNode.text && (
              <p className="text-sm md:text-[17px] text-gray-200 mt-3 font-medium leading-relaxed border-t border-white/10 pt-3">
                {currentNode.text}
              </p>
            )}
            <div className="mt-3 h-1.5 rounded-full bg-black/60 overflow-hidden">
               <div className="h-full bg-avellano-red transition-[width]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* MIDDLE IMAGE — capped height so choices always have room */}
        <div className="relative z-10 flex items-center justify-center px-4 py-3 overflow-hidden shrink-0" style={{ height: 'clamp(200px, 45dvh, 500px)' }}>
          <div className="absolute inset-0 z-0">
            {currentNode.mediaType === 'video' ? (
              <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-20 blur-xl scale-110" />
            ) : (
              <div 
                className="w-full h-full bg-no-repeat bg-cover bg-center filter blur-xl opacity-30 scale-110"
                style={{ backgroundImage: `url(${currentNode.mediaUrl})` }}
              />
            )}
            <div className="absolute inset-0 bg-black/50" />
          </div>

          <div className="relative z-10 aspect-square rounded-3xl border-[5px] border-avellano-red overflow-hidden shadow-[0_0_40px_rgba(211,17,17,0.4)] transition-all duration-500 hover:scale-105"
               style={{ maxHeight: '100%' }}>
            {currentNode.mediaType === 'video' ? (
              <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={currentNode.mediaUrl} alt={currentNode.title} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* BOTTOM CHOICES — flex-1 so they fill remaining space; always 2-col */}
        <div className="relative z-20 w-full flex-1 min-h-0 px-3 pb-3 pt-2 md:px-6 md:pb-5 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
               {currentNode.choices.map((choice, index) => (
                  <div key={choice.id} className="flex items-center gap-3 md:gap-4 bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 md:px-5 md:py-4 lg:py-5 shadow-xl">
                     <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 shrink-0">
                        {index === 0 && <svg viewBox="0 0 100 100" className="w-full h-full text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] fill-current"><polygon points="50,12 92,87 8,87" /></svg>}
                        {index === 1 && <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] fill-current"><rect x="12" y="12" width="76" height="76" rx="10" /></svg>}
                        {index === 2 && <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] fill-current"><circle cx="50" cy="50" r="38" /></svg>}
                        {index === 3 && <svg viewBox="0 0 100 100" className="w-full h-full text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] fill-current"><polygon points="50,10 88,50 50,90 12,50" /></svg>}
                     </div>
                     <span className="text-sm md:text-base lg:text-lg xl:text-xl font-bold leading-snug">{choice.text}</span>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'VOTING_RESULTS' && currentNode) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden p-4 md:p-8">
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
          {/* Fondo desenfocado */}
          <div className="absolute inset-0 z-0">
            {currentNode.mediaType === 'video' ? (
              <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 blur-xl scale-110" />
            ) : (
              <img src={currentNode.mediaUrl} alt="" className="w-full h-full object-cover opacity-30 blur-xl scale-110" />
            )}
            <div className="absolute inset-0 bg-black/60" />
          </div>

          {/* Imagen central */}
          <div className="relative z-10 w-full h-full flex items-center justify-center opacity-40">
            {currentNode.mediaType === 'video' ? (
              <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="max-w-full max-h-full object-contain" />
            ) : (
              <img src={currentNode.mediaUrl} alt={currentNode.title} className="max-w-full max-h-full object-contain" />
            )}
          </div>
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
              Mostrar Resultado
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === 'FEEDBACK_LOOP') {
    if (!currentNode) return null;

    const allNodes = (storyData.nodes ?? []) as StoryNode[];
    const correctChoice = currentNode.choices.find(c => c.isCorrect);
    const correctIndex = currentNode.choices.findIndex(c => c.isCorrect);
    
    // Attempt to find explanation from a fail node sibling
    const incorrectChoice = currentNode.choices.find(c => !c.isCorrect);
    let explanationNode = null;
    if (incorrectChoice && incorrectChoice.nextNode) {
      explanationNode = allNodes.find(n => n.id === incorrectChoice.nextNode);
    }
    const explanationText = explanationNode?.text || "Analiza esta decisión con tu equipo.";

    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 z-0 bg-black">
          {currentNode.mediaType === 'video' ? (
            <video src={currentNode.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30" />
          ) : (
            <img src={currentNode.mediaUrl} alt={currentNode.title} className="w-full h-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <section className="relative z-10 w-full max-w-4xl rounded-3xl border-t-8 border-green-500 bg-avellano-dark/95 backdrop-blur-2xl p-6 md:p-10 shadow-[0_0_60px_rgba(34,197,94,0.15)] flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-green-400 font-bold mb-4">Respuesta Correcta</p>
          
          <div className="w-24 h-24 mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            {correctIndex === 0 && (
              <svg viewBox="0 0 100 100" className="w-full h-full text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] fill-current"><polygon points="50,15 90,85 10,85" /></svg>
            )}
            {correctIndex === 1 && (
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] fill-current"><rect x="15" y="15" width="70" height="70" rx="8" /></svg>
            )}
            {correctIndex === 2 && (
              <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] fill-current"><circle cx="50" cy="50" r="35" /></svg>
            )}
            {correctIndex === 3 && (
              <svg viewBox="0 0 100 100" className="w-full h-full text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] fill-current"><polygon points="50,15 85,50 50,85 15,50" /></svg>
            )}
          </div>

          <h2 className="text-2xl md:text-4xl font-black mb-6 text-green-400">{correctChoice?.text}</h2>
          
          <div className="w-full h-px bg-white/10 mb-6"></div>
          
          <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            {explanationText}
          </p>

          <button
            onClick={handleAdvanceFromFeedback}
            className="px-10 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
              transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer"
          >
            Siguiente
          </button>
        </section>
      </main>
    );
  }

  if (phase === 'LEADERBOARD') {
    // Usar el leaderboard computado en vivo si tiene datos, sino usar el guardado en Firebase
    const displayLeaderboard = leaderboard.length > 0 ? leaderboard : savedLeaderboard;
    const top3   = displayLeaderboard.slice(0, 3);
    const second = top3[1];
    const first  = top3[0];
    const third  = top3[2];

    return (
      <main className="h-[100dvh] bg-black text-white p-3 md:p-6 overflow-hidden flex flex-col">
        <section className="mx-auto w-full max-w-6xl rounded-3xl border border-avellano-red/35 bg-avellano-dark/85 backdrop-blur-xl p-4 md:p-8 flex flex-col flex-1 min-h-0 shadow-[0_0_45px_rgba(230,0,0,0.2)]">
          
          {/* HEADER SECTION (Shrink 0) */}
          <div className="shrink-0">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-avellano-red mb-1 font-bold text-center">Fase LEADERBOARD</p>
            <h1 className="text-3xl md:text-5xl font-black text-center mb-6 md:mb-10 animate-fade-in-up">Podio Final</h1>

            <div className="grid grid-cols-3 gap-2 md:gap-5 items-end mb-6">
              <div className="order-2 md:order-1 rounded-2xl border border-gray-400/40 bg-black/45 p-3 md:p-6 text-center animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <p className="text-2xl md:text-3xl mb-1 md:mb-2">🥈</p>
                <p className="text-sm md:text-lg font-black truncate">{second?.name ?? '---'}</p>
                <p className="text-gray-300 text-xs md:text-base">{second ? `${second.score} pts` : 'Sin datos'}</p>
                {second && (
                  <div className="flex items-center justify-center gap-2 mt-1 md:mt-2 text-[10px] md:text-xs text-gray-400">
                    <span className="text-green-500 font-bold">✓ {second.correctCount}</span>
                    <span className="text-red-500 font-bold">✗ {second.incorrectCount}</span>
                  </div>
                )}
              </div>

              <div className="order-1 md:order-2 rounded-2xl border border-yellow-400/50 bg-black/60 p-4 md:p-8 text-center md:-translate-y-6 shadow-[0_0_35px_rgba(250,204,21,0.25)] animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <p className="text-4xl md:text-5xl mb-1 md:mb-2 animate-bounce">🥇</p>
                <p className="text-lg md:text-3xl font-black truncate">{first?.name ?? '---'}</p>
                <p className="text-yellow-300 font-black text-base md:text-xl">{first ? `${first.score} pts` : 'Sin datos'}</p>
                {first && (
                  <div className="flex items-center justify-center gap-2 mt-1 md:mt-2 text-[10px] md:text-sm text-gray-300">
                    <span className="text-green-500 font-bold">✓ {first.correctCount}</span>
                    <span className="text-red-500 font-bold">✗ {first.incorrectCount}</span>
                  </div>
                )}
              </div>

              <div className="order-3 rounded-2xl border border-amber-700/50 bg-black/45 p-3 md:p-6 text-center animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                <p className="text-2xl md:text-3xl mb-1 md:mb-2">🥉</p>
                <p className="text-sm md:text-lg font-black truncate">{third?.name ?? '---'}</p>
                <p className="text-gray-300 text-xs md:text-base">{third ? `${third.score} pts` : 'Sin datos'}</p>
                {third && (
                  <div className="flex items-center justify-center gap-2 mt-1 md:mt-2 text-[10px] md:text-xs text-gray-400">
                    <span className="text-green-500 font-bold">✓ {third.correctCount}</span>
                    <span className="text-red-500 font-bold">✗ {third.incorrectCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SCROLLABLE TABLE SECTION (Flex-1) */}
          {displayLeaderboard.length > 3 && (
            <div className="flex flex-col flex-1 min-h-0 mb-4 md:mb-6">
              <h2 className="text-base md:text-xl font-black mb-3 text-center text-gray-200">
                Ranking general ({displayLeaderboard.length} Jugadores)
              </h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-black/40 p-3 md:p-4">
                <ul className="space-y-2">
                {displayLeaderboard.slice(3).map((entry, index) => (
                  <li key={entry.playerId ?? index} className="flex items-center justify-between rounded-xl bg-black/60 border border-white/5 px-4 py-3 hover:bg-black/80 transition-colors">
                    <span className="font-bold text-gray-300">
                      <span className="text-gray-500 mr-2 w-6 inline-block">#{index + 4}</span> 
                      {entry.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-green-500/80">✓{entry.correctCount ?? 0}</span>
                        <span className="text-red-500/80">✗{entry.incorrectCount ?? 0}</span>
                      </div>
                      <span className="text-avellano-red font-black tabular-nums">{entry.score} pts</span>
                    </div>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          )}

          {/* BUTTON SECTION (Shrink 0) */}
          <div className="flex justify-center shrink-0">
            <button
              onClick={handleFinalize}
              className="px-8 md:px-10 py-3 md:py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-base md:text-lg font-black tracking-wide
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
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">PIN de sala</p>
              <p className="text-4xl md:text-5xl lg:text-6xl font-black text-avellano-red tracking-widest leading-none mb-4">{roomId}</p>
              <button 
                onClick={handleCopyLink}
                className="w-full px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-avellano-red transition-all rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
              >
                {isCopied ? (
                  <>
                    <span className="text-green-400">✓</span> Copiado
                  </>
                ) : (
                  <>
                    <span className="text-gray-300">🔗</span> Copiar Link
                  </>
                )}
              </button>
            </div>

            <div className="bg-white rounded-2xl p-4 inline-flex">
              <QRCode value={joinUrl} size={180} />
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl md:text-3xl font-black">Jugadores en Lobby</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleResetRoom}
                  className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-avellano-red transition-colors font-bold border border-white/5 px-2 py-1 rounded"
                >
                  Limpiar Sala
                </button>
                <span className="text-sm text-gray-400">{players.length} conectados</span>
              </div>
            </div>

            <div className="h-[45vh] lg:h-[350px] rounded-2xl border border-white/10 bg-black/35 p-2 overflow-hidden flex flex-col">
              {players.length === 0 ? (
                <div className="flex-1 grid place-items-center text-center text-gray-500 p-8">
                  Esperando exploradores... Comparte el PIN o el QR.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 p-2">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {players.map((player) => (
                      <li
                        key={player.playerId}
                        className="rounded-xl border border-avellano-red/25 bg-black/55 px-4 py-3 flex items-center justify-between hover:border-avellano-red/60 transition-colors"
                      >
                        <span className="font-bold truncate pr-3 text-[15px]">{player.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-600'}`}></span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-400">
          {players.length < 2
            ? 'Esperando al menos 2 exploradores para competir...'
            : 'Equipo listo para iniciar la expedicion competitiva.'}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleStart}
            disabled={players.length < 2}
            className="px-8 md:px-10 py-4 rounded-full bg-avellano-red hover:bg-red-700 text-white text-lg font-black tracking-wide
              transition-all duration-300 hover:scale-105 shadow-[0_0_24px_rgba(230,0,0,0.4)] cursor-pointer
              disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-avellano-red disabled:cursor-not-allowed"
          >
            Iniciar Expedicion
          </button>
        </div>
      </section>
    </main>
  );
};
