import { useContext } from 'react';
import { GameContext } from '../context/GameContext';

export const useGameState = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState debe ser usado dentro de un <GameProvider>');
  }
  return context;
};
