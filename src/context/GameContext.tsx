import { createContext, useState, useEffect, type ReactNode } from 'react';
import storyData from '../data/storyNodes.json';
import { audio } from '../utils/audioManager';

// --- Tipos base ---
export type Pillar = 'Cultura' | 'SST' | 'SIG' | 'none';
export type FailType =
  | 'aislamiento' | 'conflicto_valores' | 'deshonestidad'
  | 'caida_altura' | 'quemadura_electrica' | 'asfixia'
  | 'proceso_saltado' | 'registro_falso' | 'no_conformidad'
  | 'none';
export type NodeType = 'start' | 'dilemma' | 'feedback_fail' | 'end';

// --- Interfaces de datos (espejo del JSON) ---
export interface Choice {
  id: string;
  text: string;
  nextNode: string;
  points: number;
  pillarPoints: Partial<Record<Pillar, number>>;
  sfx?: string;
  isCorrect: boolean;
  failType?: FailType;
}

export interface StoryNode {
  id: string;
  nodeType: NodeType;
  pillar: Pillar;
  failType?: FailType;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  audioBgm?: string;
  title: string;
  text: string;
  retryNode?: string;
  /** @deprecated usar nodeType */
  isFeedback: boolean;
  /** @deprecated usar nodeType */
  isEnd?: boolean;
  choices: Choice[];
}

// --- Interfaces de estado ---
export interface PillarScore {
  earned: number;
  maxPossible: number;
  attempts: number;
  firstTryBonus: boolean;
}

export type ScoreMap = Record<Exclude<Pillar, 'none'>, PillarScore>;

export interface FailEvent {
  dilemmaNodeId: string;
  choiceId: string;
  choiceText: string;
  failType: FailType;
  pillar: Pillar;
  timestamp: number;
}

// --- Tipo del Contexto ---
interface GameContextType {
  currentNode: StoryNode;
  score: ScoreMap;
  history: string[];
  failHistory: FailEvent[];
  isMuted: boolean;
  makeChoice: (choice: Choice, node: StoryNode) => void;
  resetGame: () => void;
  toggleMute: () => void;
}

// --- Helpers de inicialización ---
const emptyPillar = (): PillarScore => ({ earned: 0, maxPossible: 10, attempts: 0, firstTryBonus: true });
const initialScore = (): ScoreMap => ({
  Cultura: emptyPillar(),
  SST: emptyPillar(),
  SIG: emptyPillar(),
});

// --- Creación del Contexto ---
export const GameContext = createContext<GameContextType | undefined>(undefined);

// --- Componente Provider ---
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const nodes = storyData.nodes as StoryNode[];

  const [currentNodeId, setCurrentNodeId] = useState<string>('start');
  const [score, setScore] = useState<ScoreMap>(initialScore());
  const [history, setHistory] = useState<string[]>(['start']);
  const [failHistory, setFailHistory] = useState<FailEvent[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const currentNode = nodes.find(n => n.id === currentNodeId) ?? nodes[0];

  useEffect(() => {
    audio.playBgm(currentNode.audioBgm);
  }, [currentNode.audioBgm]);

  useEffect(() => {
    audio.setMute(isMuted);
  }, [isMuted]);

  const makeChoice = (choice: Choice, node: StoryNode) => {
    if (choice.sfx) audio.playSfx(choice.sfx);
    setHistory(prev => [...prev, choice.nextNode]);

    // Solo registrar puntuación y auditoría en nodos de dilema
    if (node.nodeType === 'dilemma' && node.pillar !== 'none') {
      const pillar = node.pillar as Exclude<Pillar, 'none'>;
      if (choice.isCorrect) {
        setScore(prev => ({
          ...prev,
          [pillar]: {
            ...prev[pillar],
            earned: prev[pillar].earned + choice.points,
            attempts: prev[pillar].attempts + 1,
            firstTryBonus: prev[pillar].attempts === 0,
          },
        }));
      } else {
        const event: FailEvent = {
          dilemmaNodeId: node.id,
          choiceId: choice.id,
          choiceText: choice.text,
          failType: choice.failType ?? 'none',
          pillar: node.pillar,
          timestamp: Date.now(),
        };
        setFailHistory(prev => [...prev, event]);
        setScore(prev => ({
          ...prev,
          [pillar]: {
            ...prev[pillar],
            attempts: prev[pillar].attempts + 1,
            firstTryBonus: false,
          },
        }));
      }
    }

    setCurrentNodeId(choice.nextNode);
  };

  const resetGame = () => {
    setCurrentNodeId('start');
    setScore(initialScore());
    setHistory(['start']);
    setFailHistory([]);
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  return (
    <GameContext.Provider value={{ currentNode, score, history, failHistory, isMuted, makeChoice, resetGame, toggleMute }}>
      {children}
    </GameContext.Provider>
  );
};
