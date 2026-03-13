import { GameProvider } from './context/GameContext';
import { useGameState } from './hooks/useGameState';
import { MediaViewer } from './components/MediaViewer';
import { StartScreen } from './components/StartScreen';
import { DecisionUI } from './components/DecisionUI';
import { FeedbackScreen } from './components/FeedbackScreen';
import { EndScreen } from './components/EndScreen';
import { MuteButton } from './components/MuteButton';
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

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    navigate(`/host/${roomId}`);
  };

  return (
    <GameProvider>
      <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
        <GameController />
        <button
          onClick={handleCreateRoom}
          className="absolute top-4 right-4 z-40 px-5 py-3 rounded-full bg-avellano-red text-white text-sm md:text-base font-bold tracking-wide
            shadow-[0_0_20px_rgba(230,0,0,0.35)] transition-all duration-300 hover:scale-105 hover:bg-red-700 cursor-pointer"
        >
          Crear Sala Live
        </button>
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

