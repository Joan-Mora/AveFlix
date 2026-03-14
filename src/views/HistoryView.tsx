import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerResult = {
  playerId: string;
  name: string;
  rank: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
};

type MatchSession = {
  sessionId: string;
  roomId: string;
  season: string;        // e.g. "Marzo"
  seasonNumber: number;  // 1-9
  playedAt: number;      // timestamp
  totalPlayers: number;
  entries: PlayerResult[];
};

// ─── Season labels (same as StartScreen) ─────────────────────────────────────
const SEASONS = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];

// ─── Medal icons ─────────────────────────────────────────────────────────────
const MedalIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="text-yellow-400 font-black text-lg">🥇</span>;
  if (rank === 2) return <span className="text-gray-300 font-black text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
  return <span className="text-gray-500 font-mono text-sm">#{rank}</span>;
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const HistoryView = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MatchSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [filterPlayer, setFilterPlayer] = useState<string>('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // ── Load history from Firebase ─────────────────────────────────────────────
  useEffect(() => {
    // Limitamos la carga a las últimas 20 sesiones para mantener la velocidad
    const histRef = ref(db, 'history');
    const recentQuery = query(histRef, orderByChild('playedAt'), limitToLast(20));
    
    const unsub = onValue(recentQuery, (snapshot) => {
      const raw = snapshot.val() as Record<string, Omit<MatchSession, 'sessionId'>> | null;
      if (!raw) { setSessions([]); setLoading(false); return; }

      const parsed = Object.entries(raw).map(([sessionId, data]) => ({
        sessionId,
        ...data,
        entries: Array.isArray(data.entries)
          ? data.entries
          : Object.values(data.entries ?? {}),
      })) as MatchSession[];

      parsed.sort((a, b) => b.playedAt - a.playedAt); // newest first
      setSessions(parsed);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Derived / Filtered data ───────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (filterSeason !== 'all') {
      result = result.filter(s => s.season === filterSeason);
    }

    if (filterPlayer.trim()) {
      const q = filterPlayer.trim().toLowerCase();
      result = result.filter(s =>
        s.entries.some(e => e.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [sessions, filterSeason, filterPlayer]);

  // Stats for sidebar
  const globalStats = useMemo(() => {
    const playerMap: Record<string, { name: string; sessions: number; bestRank: number; totalScore: number; wins: number }> = {};
    sessions.forEach(s => {
      s.entries.forEach(e => {
        if (!playerMap[e.playerId]) {
          playerMap[e.playerId] = { name: e.name, sessions: 0, bestRank: 999, totalScore: 0, wins: 0 };
        }
        const pm = playerMap[e.playerId];
        pm.sessions++;
        pm.totalScore += e.score;
        if (e.rank < pm.bestRank) pm.bestRank = e.rank;
        if (e.rank === 1) pm.wins++;
      });
    });
    return Object.values(playerMap).sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
  }, [sessions]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Inicio
            </button>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">
              Historial <span className="text-avellano-red">Competencias</span>
            </h1>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">
            {sessions.length} sesiones · {sessions.reduce((s, c) => s + c.totalPlayers, 0)} participaciones totales
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col xl:flex-row gap-8">

        {/* ── LEFT: Sessions list ─────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Season filter */}
            <select
              value={filterSeason}
              onChange={e => setFilterSeason(e.target.value)}
              className="bg-black/60 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-bold
                focus:outline-none focus:ring-2 focus:ring-avellano-red cursor-pointer flex-1 sm:max-w-[200px]"
            >
              <option value="all">Todas las temporadas</option>
              {SEASONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Player name search */}
            <div className="relative flex-1">
              <input
                type="text"
                value={filterPlayer}
                onChange={e => setFilterPlayer(e.target.value)}
                placeholder="Buscar por nombre de participante..."
                className="w-full bg-black/60 border border-white/10 text-white rounded-xl px-4 py-3 pl-10 text-sm
                  focus:outline-none focus:ring-2 focus:ring-avellano-red placeholder-gray-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">🔍</span>
              {filterPlayer && (
                <button
                  onClick={() => setFilterPlayer('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >✕</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500">Cargando historial...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-lg font-bold">No hay sesiones registradas</p>
              <p className="text-sm mt-2">Las competencias multijugador se guardan automáticamente aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const isExpanded = expandedSession === session.sessionId;
                const top3 = session.entries.slice(0, 3);

                // If filtering by player, highlight their entry
                const matchedPlayer = filterPlayer
                  ? session.entries.find(e => e.name.toLowerCase().includes(filterPlayer.toLowerCase()))
                  : null;

                return (
                  <div
                    key={session.sessionId}
                    className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden transition-all duration-300"
                  >
                    {/* Session header — always visible */}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.sessionId)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Season pill */}
                        <span className="bg-avellano-red/15 border border-avellano-red/40 text-avellano-red
                          text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                          {session.season ?? `Temporada ${session.seasonNumber ?? ''}`}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base">{session.roomId}</span>
                            <span className="text-gray-500 text-xs">·</span>
                            <span className="text-gray-400 text-sm">{session.totalPlayers} jugadores</span>
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5">{formatDate(session.playedAt)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Mini-podio */}
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                          {top3.map((e, i) => (
                            <span key={e.playerId} className="flex items-center gap-1">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                              <span className="text-gray-300 text-xs max-w-[80px] truncate">{e.name}</span>
                            </span>
                          ))}
                        </div>
                        <span className="text-gray-500 text-xl">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* If player search matches, show their position always */}
                    {matchedPlayer && !isExpanded && (
                      <div className="px-5 pb-3">
                        <div className="bg-avellano-red/10 border border-avellano-red/30 rounded-xl px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <MedalIcon rank={matchedPlayer.rank} />
                            <span className="font-bold text-white">{matchedPlayer.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-yellow-400 font-black">{matchedPlayer.score.toLocaleString()} pts</span>
                            <span className="text-green-500 text-xs">✓{matchedPlayer.correctCount}</span>
                            <span className="text-red-500 text-xs">✗{matchedPlayer.incorrectCount}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded: full ranking ──────────────────────────────── */}
                    {isExpanded && (
                      <div className="border-t border-white/10">
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur z-10">
                              <tr className="text-gray-500 text-xs uppercase tracking-widest border-b border-white/10">
                                <th className="px-5 py-3 text-left">Pos.</th>
                                <th className="px-5 py-3 text-left">Jugador</th>
                                <th className="px-5 py-3 text-right">Puntaje</th>
                                <th className="px-5 py-3 text-right hidden sm:table-cell">✓ Correctas</th>
                                <th className="px-5 py-3 text-right hidden sm:table-cell">✗ Incorrectas</th>
                                <th className="px-5 py-3 text-right hidden md:table-cell">Precisión</th>
                              </tr>
                            </thead>
                            <tbody>
                              {session.entries.map((entry) => {
                                const total = (entry.correctCount ?? 0) + (entry.incorrectCount ?? 0);
                                const acc   = total > 0 ? Math.round(((entry.correctCount ?? 0) / total) * 100) : 0;
                                const isMatch = filterPlayer && entry.name.toLowerCase().includes(filterPlayer.toLowerCase());

                                return (
                                  <tr
                                    key={entry.playerId ?? entry.name}
                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors
                                      ${isMatch ? 'bg-avellano-red/10 border-avellano-red/20' : ''}`}
                                  >
                                    <td className="px-5 py-3"><MedalIcon rank={entry.rank} /></td>
                                    <td className="px-5 py-3 font-bold text-white">{entry.name}</td>
                                    <td className="px-5 py-3 text-right text-avellano-red font-black tabular-nums">
                                      {entry.score.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3 text-right text-green-500 hidden sm:table-cell">{entry.correctCount ?? 0}</td>
                                    <td className="px-5 py-3 text-right text-red-500 hidden sm:table-cell">{entry.incorrectCount ?? 0}</td>
                                    <td className="px-5 py-3 text-right hidden md:table-cell">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                                        ${acc >= 80 ? 'bg-green-500/20 text-green-400' :
                                          acc >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-red-500/20 text-red-400'}`}>
                                        {acc}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── RIGHT: Global leaderboard sidebar ─────────────────────────────── */}
        <aside className="xl:w-80 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* All-time top scorers */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <span>🏆</span> Top Histórico (puntaje total)
              </h2>
              {globalStats.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin datos aún</p>
              ) : (
                <ul className="space-y-3">
                  {globalStats.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-black w-6 shrink-0 text-center
                          ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                          #{i + 1}
                        </span>
                        <span className="truncate text-sm font-bold text-white">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-avellano-red font-black text-sm tabular-nums">
                          {p.totalScore.toLocaleString()}
                        </div>
                        <div className="text-gray-600 text-[10px]">{p.sessions} sesión{p.sessions !== 1 ? 'es' : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Competencias', value: sessions.length },
                { label: 'Participaciones', value: sessions.reduce((s,c) => s + c.totalPlayers, 0) },
                { label: 'Temporadas activas', value: new Set(sessions.map(s => s.season)).size },
                { label: 'Jugadores únicos', value: new Set(sessions.flatMap(s => s.entries.map(e => e.name))).size },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-black text-avellano-red">{stat.value}</div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
