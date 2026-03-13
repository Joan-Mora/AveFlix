import { useState, useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import type { StoryNode } from '../context/GameContext';

export const MediaViewer = () => {
  const { currentNode } = useGameState();

  // Retiene el nodo visible mientras ocurre la transición de fundido
  const [displayNode, setDisplayNode] = useState<StoryNode>(currentNode);
  const [isFading, setIsFading] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentNode.id === displayNode.id) return;

    // Limpiar cualquier transición anterior pendiente
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 1. Fundir a negro
    setIsFading(true);

    // 2. Cuando la pantalla esté oscura, cambiar el recurso multimedia
    timeoutRef.current = setTimeout(() => {
      setDisplayNode(currentNode);
      setIsFading(false);
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentNode, displayNode.id]);

  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-black">

      {/* Capa de fundido negro — cubre el cambio de media */}
      <div
        className={`absolute inset-0 z-10 bg-black pointer-events-none transition-opacity duration-500 ease-in-out
          ${isFading ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Renderizado condicional: video o imagen */}
      {displayNode.mediaType === 'video' ? (
        <video
          key={displayNode.mediaUrl}
          src={displayNode.mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          key={displayNode.mediaUrl}
          src={displayNode.mediaUrl}
          alt={displayNode.title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};
