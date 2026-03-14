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
import { ref, set } from 'firebase/database';
import { db } from './services/firebase';
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

  const handleClearAllRooms = async () => {
    if (window.confirm('¿Deseas ELIMINAR TODAS las salas activas de la base de datos? Esto invalidará todas las sesiones actuales.')) {
      try {
        await set(ref(db, 'rooms'), {});
        alert('Todas las salas han sido eliminadas correctamente.');
      } catch (err) {
        console.warn('[HomeView] Error clearing rooms:', err);
        alert('Error al limpiar las salas.');
      }
    }
  };

  return (
    <GameProvider>
      <HomeViewContent 
        showJoinPanel={showJoinPanel} 
        setShowJoinPanel={setShowJoinPanel}
        pin={pin}
        setPin={setPin}
        handleCreateRoom={handleCreateRoom}
        handleJoinByPin={handleJoinByPin}
        handleClearAllRooms={handleClearAllRooms}
      />
    </GameProvider>
  );
};

const HomeViewContent = ({ 
  showJoinPanel, 
  setShowJoinPanel, 
  pin, 
  setPin, 
  handleCreateRoom, 
  handleJoinByPin,
  handleClearAllRooms 
}: any) => {
  const navigate = useNavigate();
  const { currentNode } = useGameState();
  const isStart = currentNode.nodeType === 'start';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      <GameController />

      {/* Botones globales: Solo visibles en pantalla de inicio del single player */}
      {isStart && (
        <div className="fixed top-5 left-5 md:top-8 md:left-8 z-50 flex flex-col md:flex-row items-start gap-4 animate-fade-in">
          <button
            onClick={handleCreateRoom}
            className="px-6 py-3 rounded-full bg-avellano-red text-white text-sm md:text-base font-black tracking-widest uppercase
              shadow-[0_0_25px_rgba(211,17,17,0.4)] transition-all duration-300 hover:scale-105 hover:bg-avellano-accent hover:shadow-[0_0_35px_rgba(232,63,63,0.6)] cursor-pointer
              border border-white/10"
          >
            Ser Anfitrion
          </button>

          <button
            onClick={() => navigate('/history')}
            className="px-6 py-3 rounded-full bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-white text-sm md:text-base font-bold tracking-widest uppercase
              backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:bg-white/10 cursor-pointer shadow-2xl"
          >
            Ver Historial
          </button>

          <button
            onClick={handleClearAllRooms}
            className="px-6 py-3 rounded-full bg-black/40 border border-white/5 text-gray-500 text-[10px] md:text-xs font-bold tracking-widest uppercase
              backdrop-blur-md transition-all duration-300 hover:text-red-500 hover:border-red-500/30 cursor-pointer"
            title="Mantenimiento: Borrar todas las salas"
          >
            Limpiar Todas las Salas
          </button>

          {!showJoinPanel ? (
            <button
              onClick={() => setShowJoinPanel(true)}
              className="px-6 py-3 rounded-full bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-white text-sm md:text-base font-bold tracking-widest uppercase
                backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:bg-white/10 cursor-pointer shadow-2xl"
            >
              Tengo un PIN
            </button>
          ) : (
            <form
              onSubmit={handleJoinByPin}
              className="w-[320px] rounded-3xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] backdrop-blur-xl p-6 shadow-2xl animate-fade-in-up md:absolute md:top-0 md:left-[110%]"
            >
              <div className="flex justify-between items-center mb-4">
                <label htmlFor="join-pin" className="block text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">
                  Ingresa a la sala
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowJoinPanel(false)}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <input
                id="join-pin"
                type="text"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="PIN Ej: OQXX9"
                maxLength={8}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-white text-center text-xl tracking-widest uppercase font-black
                  focus:outline-none focus:ring-2 focus:ring-avellano-red transition-all shadow-inner mb-4"
              />
              <button
                type="submit"
                disabled={!pin.trim()}
                className="w-full px-4 py-4 rounded-xl bg-avellano-red hover:bg-avellano-accent disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent
                  text-white font-black tracking-widest uppercase transition-all duration-300 cursor-pointer disabled:cursor-not-allowed
                  border border-white/10 shadow-[0_0_15px_rgba(211,17,17,0.3)]"
              >
                Conectar
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
};

import { HistoryView } from './views/HistoryView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/host/:roomId" element={<HostView />} />
        <Route path="/play/:roomId" element={<PlayerView />} />
        <Route path="/history" element={<HistoryView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

