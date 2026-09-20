import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, X, Film, Music2, Clock } from 'lucide-react';
import {
  getWatchHistory,
  removeWatchProgress,
  clearWatchHistory,
  formatDuration,
  formatRemainingTime,
  type WatchProgress
} from '../utils/watchHistory';
import type { QualityId } from './StreamPlayerModal';

export interface ContinueWatchingShelfProps {
  onPlayTrack: (track: {
    videoId: string;
    title: string;
    type: 'audio' | 'video';
    quality: QualityId;
    initialTime: number;
    duration?: number;
    streamUrl?: string;
  }) => void;
  className?: string;
}

export const ContinueWatchingShelf: React.FC<ContinueWatchingShelfProps> = ({
  onPlayTrack,
  className = '',
}) => {
  const [history, setHistory] = useState<WatchProgress[]>([]);

  const loadHistory = () => {
    setHistory(getWatchHistory());
  };

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener('watchHistoryUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('watchHistoryUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  if (history.length === 0) {
    return null;
  }

  const handlePlay = (item: WatchProgress) => {
    onPlayTrack({
      videoId: item.videoId,
      title: item.title,
      type: item.type,
      quality: item.quality as QualityId,
      initialTime: item.currentTime,
      duration: item.duration,
    });
  };

  const handleRemove = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    removeWatchProgress(videoId);
    setHistory(getWatchHistory());
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearWatchHistory();
    setHistory([]);
  };

  return (
    <div
      data-testid="continue-watching-shelf"
      className={`w-full flex flex-col gap-3 py-2 animate-fadeIn ${className}`}
    >
      {/* Encabezado del estante */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Continuar viendo
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 border border-slate-700">
                {history.length}
              </span>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800/60"
          title="Borrar todos los videos en progreso"
        >
          Borrar historial
        </button>
      </div>

      {/* Carrusel horizontal táctil con scroll suave */}
      <div className="w-full overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-0.5 -mx-1 px-1">
        <div className="flex items-stretch gap-3 sm:gap-4 min-w-max">
          {history.map((item) => {
            const percent = item.duration > 0
              ? Math.min(100, Math.max(0, (item.currentTime / item.duration) * 100))
              : 0;
            const remaining = item.duration > item.currentTime
              ? formatRemainingTime(item.duration - item.currentTime)
              : '';
            const fallbackThumb = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
            const thumb = item.thumbnail || fallbackThumb;

            return (
              <div
                key={item.videoId}
                data-testid={`continue-card-${item.videoId}`}
                onClick={() => handlePlay(item)}
                className="group relative w-60 sm:w-64 flex flex-col justify-between bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                {/* Contenedor Miniatura */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img
                    src={thumb}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackThumb;
                    }}
                  />

                  {/* Gradiente oscuro superior e inferior */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

                  {/* Badge de tipo y calidad */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-semibold text-white border border-white/10">
                    {item.type === 'audio' ? (
                      <Music2 className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Film className="w-3 h-3 text-rose-400" />
                    )}
                    <span>{item.quality === 'audio' ? 'MP3' : item.quality}</span>
                  </div>

                  {/* Botón descartar de la lista */}
                  <button
                    type="button"
                    aria-label={`Quitar ${item.title} de continuar viendo`}
                    title="Quitar de continuar viendo"
                    onClick={(e) => handleRemove(e, item.videoId)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white transition-all backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Botón Play central en hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-white translate-x-0.5" />
                    </div>
                  </div>

                  {/* Badge de tiempo restante */}
                  {remaining && (
                    <div className="absolute bottom-3 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-medium text-slate-200 border border-white/10">
                      <Clock className="w-2.5 h-2.5 text-rose-400" />
                      <span>{remaining}</span>
                    </div>
                  )}

                  {/* Badge de posición actual */}
                  <div className="absolute bottom-3 left-2 text-[10px] font-mono text-slate-300 bg-black/75 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {formatDuration(item.currentTime)}
                  </div>

                  {/* Barra de progreso roja en porcentaje */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700/80">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-red-500 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Contenido textual */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h3
                      title={item.title}
                      className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors"
                    >
                      {item.title}
                    </h3>
                    {item.channel && (
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {item.channel}
                      </p>
                    )}
                  </div>

                  {/* Botón Reanudar con 1 toque */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlay(item);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-transparent text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Reanudar en {formatDuration(item.currentTime)}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
