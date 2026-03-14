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
        <div className="relative w-full h-[95%] flex items-center justify-center overflow-hidden bg-black pt-4 pb-[45vh] md:pb-[40vh] mx-auto my-auto">
          {/* Fondo difuminado y oscurecido para no perder la esencia cinematográfica */}
          <div 
            className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center filter blur-xl opacity-30 scale-110"
            style={{ backgroundImage: `url(${displayNode.mediaUrl})` }}
          />

          {/* Contenedor Cuadrado con Borde Rojo y Bordes Redondeados */}
          <div className="relative z-10 w-full max-w-[45vw] md:max-w-[40vh] aspect-square rounded-3xl border-[5px] border-avellano-red overflow-hidden shadow-[0_0_40px_rgba(211,17,17,0.4)] transition-all duration-500 hover:scale-105">
            <img
              key={displayNode.mediaUrl}
              src={displayNode.mediaUrl}
              alt={displayNode.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};
