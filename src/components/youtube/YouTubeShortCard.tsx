/**
 * RAYO — YouTube Short Card (Task #57)
 * Visual alinhado ao mock Home.html `.short` (aspect 9/14, tag mono terra
 * topo-esquerdo, fav circular topo-direito, views + título no rodapé com
 * gradiente sand-50 sobre overlay escuro).
 */

import { Heart } from 'lucide-react';
import { YouTubeShort } from './YouTubeTypes';
import { useVideoProgress } from '../hooks/useVideoProgress';

interface YouTubeShortCardProps {
  short: YouTubeShort;
  onClick: (short: YouTubeShort) => void;
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}

export function YouTubeShortCard({ short, onClick }: YouTubeShortCardProps) {
  const { isFavorite, toggleFavorite } = useVideoProgress();
  const favorite = isFavorite(short.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(short.id);
  };

  // Wrapper como `div role=button` (e não `<button>` nativo) pra evitar
  // botão aninhado dentro de botão (HTML inválido) — o coraçãozinho
  // de favoritar é um `<button>` real e precisa ficar como sibling
  // interativo.
  const handleCardKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(short);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(short)}
      onKeyDown={handleCardKey}
      className="rh-short group"
      aria-label={short.title}
    >
      <div className="rh-short-img">
        <img
          src={short.thumbnail.high}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <span className="rh-short-tag">Shorts</span>
      <button
        type="button"
        onClick={handleFavoriteClick}
        className="rh-short-fav"
        aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Heart
          className="w-3.5 h-3.5"
          fill={favorite ? 'currentColor' : 'none'}
          strokeWidth={1.6}
        />
      </button>
      <div className="rh-short-views">▶ {formatViews(short.viewCount)} views</div>
      <div className="rh-short-title">{short.title}</div>
    </div>
  );
}
