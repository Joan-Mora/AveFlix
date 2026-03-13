import { GameProvider } from './context/GameContext';
import { useGameState } from './hooks/useGameState';
import { MediaViewer } from './components/MediaViewer';
import { StartScreen } from './components/StartScreen';
import { DecisionUI } from './components/DecisionUI';
import { FeedbackScreen } from './components/FeedbackScreen';
import { EndScreen } from './components/EndScreen';
import { MuteButton } from './components/MuteButton';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { HostView } from './views/HostView';
import { PlayerView } from './views/PlayerView';
import './index.css';

// Orquestador: decide qué pantalla de UI mostrar según el estado del nodo
const GameController = () => {
  const { currentNode } = useGameState();

  const isStart = currentNode.nodeType === 'start';
  const isEnd = currentNode.nodeType === 'end';
  const isFeedback = currentNode.nodeType === 'feedback_fail';

  return (
    <>
      {/* Capa 0: fondo multimedia siempre activo */}
      <MediaViewer />

      {/* Botón de mute persistente en todas las pantallas */}
      <MuteButton />

      {/* Pantalla de inicio */}
      {isStart && <StartScreen />}

      {/* Nodo de retroalimentación (error) */}
      {!isStart && !isEnd && isFeedback && <FeedbackScreen />}

      {/* Panel de decisión principal */}
      {!isStart && !isEnd && !isFeedback && <DecisionUI />}

      {/* Pantalla de resultados finales */}
      {isEnd && <EndScreen />}
    </>
  );
};

const generateRoomId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';

  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return value;
};

const HomeView = () => {
  const navigate = useNavigate();
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [pin, setPin] = useState('');

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    navigate(`/host/${roomId}`);
  };

  const handleJoinByPin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPin = pin.trim().toUpperCase();
    if (!normalizedPin) return;

    navigate(`/play/${normalizedPin}`);
  };

  return (
    <GameProvider>
      <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
        <GameController />

        <div className="fixed top-5 left-5 z-50 flex flex-col gap-3">
          <button
            onClick={handleCreateRoom}
            className="px-5 py-3 rounded-full bg-avellano-red text-white text-sm md:text-base font-bold tracking-wide
              shadow-[0_0_20px_rgba(230,0,0,0.35)] transition-all duration-300 hover:scale-105 hover:bg-red-700 cursor-pointer"
          >
            Crear Sala Live
          </button>

          <button
            onClick={() => setShowJoinPanel((previous) => !previous)}
            className="px-5 py-3 rounded-full bg-black/70 border border-white/20 text-white text-sm md:text-base font-bold tracking-wide
              backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-black/90 cursor-pointer"
          >
            Unirse con PIN
          </button>
        </div>

        {showJoinPanel && (
          <form
            onSubmit={handleJoinByPin}
            className="fixed left-5 top-[138px] z-50 w-[280px] rounded-2xl border border-avellano-red/30 bg-avellano-dark/90 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(230,0,0,0.2)]"
          >
            <label htmlFor="join-pin" className="block text-xs uppercase tracking-[0.2em] text-avellano-red font-bold mb-2">
              Codigo de sala
            </label>
            <input
              id="join-pin"
              type="text"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Ej: UQYPMB"
              maxLength={8}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-white uppercase
                focus:outline-none focus:ring-2 focus:ring-avellano-red"
            />
            <button
              type="submit"
              disabled={!pin.trim()}
              className="mt-3 w-full px-4 py-2 rounded-xl bg-avellano-red hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400
                text-white font-bold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Entrar a sala
            </button>
          </form>
        )}
      </main>
    </GameProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/host/:roomId" element={<HostView />} />
        <Route path="/play/:roomId" element={<PlayerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

