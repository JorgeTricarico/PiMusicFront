import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, X, Maximize2, Loader2, Music2, Film, SkipBack, SkipForward } from 'lucide-react';
import { getStreamMediaUrl } from '../api/client';
import type { QualityId } from './StreamPlayerModal';
import { useQueue } from '../context/QueueContext';
import {
  updateMediaSessionMetadata,
  setMediaSessionActionHandlers,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
  clearMediaSession,
} from '../utils/mediaSession';

export interface PlayerTrack {
  videoId: string;
  title: string;
  channel?: string;
  artist?: string;
  type: 'audio' | 'video';
  duration?: number;
  quality?: QualityId;
  currentTime?: number;
  isPlaying?: boolean;
  streamUrl?: string;
}

interface MiniPlayerProps {
  track: PlayerTrack;
  onClose: () => void;
  onExpand?: (currentTime: number, quality: QualityId, isPlaying: boolean) => void;
  onChangeType?: (type: 'audio' | 'video') => void;
  onTrackChange?: (track: PlayerTrack) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  onClose,
  onExpand,
  onTrackChange,
}) => {
  const currentQuality: QualityId = track.quality || (track.type === 'video' ? '480p' : 'audio');
  const [isPlaying, setIsPlaying] = useState(track.isPlaying ?? false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(track.currentTime || 0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const { queue, canSkipNext, canSkipPrev, skipToNext, skipToPrev, handleTrackEnded } = useQueue();

  const handleMediaEnded = () => {
    const nextTrack = handleTrackEnded();
    if (nextTrack) {
      onTrackChange?.({
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        type: nextTrack.initialType || (nextTrack.initialQuality === 'audio' ? 'audio' : 'video'),
        quality: nextTrack.initialQuality || '480p',
        currentTime: 0,
        isPlaying: true,
        duration: nextTrack.duration,
        streamUrl: nextTrack.streamUrl,
      });
    }
  };

  const handleNextTrack = () => {
    const nextTrack = skipToNext();
    if (nextTrack) {
      onTrackChange?.({
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        type: nextTrack.initialType || (nextTrack.initialQuality === 'audio' ? 'audio' : 'video'),
        quality: nextTrack.initialQuality || '480p',
        currentTime: 0,
        isPlaying: true,
        duration: nextTrack.duration,
        streamUrl: nextTrack.streamUrl,
      });
    }
  };

  const handlePrevTrack = () => {
    const prevTrack = skipToPrev();
    if (prevTrack) {
      onTrackChange?.({
        videoId: prevTrack.videoId,
        title: prevTrack.title,
        type: prevTrack.initialType || (prevTrack.initialQuality === 'audio' ? 'audio' : 'video'),
        quality: prevTrack.initialQuality || '480p',
        currentTime: 0,
        isPlaying: true,
        duration: prevTrack.duration,
        streamUrl: prevTrack.streamUrl,
      });
    }
  };

  const isAudio = track.type === 'audio' || currentQuality === 'audio';
  const streamUrl = track.streamUrl || getStreamMediaUrl(track.videoId, isAudio ? 'audio' : 'video', currentQuality);
  const thumbUrl = track.videoId.startsWith('local_')
    ? ''
    : `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

  const segundosAdelantados = Math.max(0, bufferedEnd - currentTime);
  const currentPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  // Intento de reproducción seguro (política de autoplay móvil)
  const attemptPlay = async () => {
    if (!mediaRef.current) return;
    try {
      await mediaRef.current.play();
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setIsAutoplayBlocked(true);
        setIsPlaying(false);
      } else {
        console.warn('Error al reanudar audio:', err);
      }
    }
  };

  // Actualizar tiempos y buffer TimeRanges
  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (!el) return;
    const cur = el.currentTime || 0;
    const dur = el.duration || 0;
    setCurrentTime(cur);
    if (dur && dur !== duration) setDuration(dur);

    const b = el.buffered;
    let end = 0;
    if (b && b.length > 0) {
      for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= cur && cur <= b.end(i)) {
          end = b.end(i);
          break;
        }
      }
      if (end === 0) {
        for (let i = 0; i < b.length; i++) {
          if (b.end(i) > end) end = b.end(i);
        }
      }
    }
    setBufferedEnd(end);

    if (end - cur >= 3) {
      setIsBuffering(false);
    }

    updateMediaSessionPositionState({
      duration: dur || duration,
      playbackRate: 1,
      position: cur,
    });
  };

  // Conexión con MediaSession API: metadatos y carátulas HD
  useEffect(() => {
    updateMediaSessionMetadata({
      title: track.title,
      channel: track.channel || track.artist,
      videoId: track.videoId,
      artworkUrl: thumbUrl,
    });
  }, [track.title, track.channel, track.artist, track.videoId, thumbUrl]);

  // Conexión con MediaSession API: manejadores de hardware
  useEffect(() => {
    setMediaSessionActionHandlers({
      play: () => {
        attemptPlay();
      },
      pause: () => {
        if (mediaRef.current) {
          mediaRef.current.pause();
          setIsPlaying(false);
        }
      },
      seekbackward: (details) => {
        const offset = details?.seekOffset || 10;
        if (mediaRef.current) {
          const nextTime = Math.max(0, mediaRef.current.currentTime - offset);
          mediaRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }
      },
      seekforward: (details) => {
        const offset = details?.seekOffset || 10;
        if (mediaRef.current) {
          const nextTime = Math.min(duration || Infinity, mediaRef.current.currentTime + offset);
          mediaRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }
      },
      previoustrack: () => {
        if (mediaRef.current) {
          const nextTime = Math.max(0, mediaRef.current.currentTime - 10);
          mediaRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }
      },
      nexttrack: () => {
        if (mediaRef.current) {
          const nextTime = Math.min(duration || Infinity, mediaRef.current.currentTime + 10);
          mediaRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }
      },
      seekto: (details) => {
        if (mediaRef.current && details?.seekTime !== undefined && details.seekTime !== null) {
          mediaRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      },
    });

    return () => {
      clearMediaSession();
    };
  }, [track.videoId, duration]);

  // Conexión con MediaSession API: sincronización de estado de reproducción
  useEffect(() => {
    updateMediaSessionPlaybackState(isPlaying ? 'playing' : 'paused');
  }, [isPlaying]);

  // Restaurar tiempo inicial si se transfirió desde el modal
  useEffect(() => {
    const el = mediaRef.current;
    if (el && track.currentTime && Math.abs(el.currentTime - track.currentTime) > 1) {
      el.currentTime = track.currentTime;
    }
    if (track.isPlaying) {
      attemptPlay();
    }
  }, [track.videoId, track.quality, track.currentTime, track.isPlaying]);

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      attemptPlay();
    }
  };

  const handleExpandClick = () => {
    const cur = mediaRef.current ? mediaRef.current.currentTime : currentTime;
    onExpand?.(cur, currentQuality, isPlaying);
  };

  return (
    <>
      {/* Elemento de audio o video en segundo plano para reproducción continua */}
      {track.type === 'video' ? (
        <video
          ref={(el) => { mediaRef.current = el; }}
          src={streamUrl}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleTimeUpdate}
          onPlay={() => { setIsPlaying(true); setIsAutoplayBlocked(false); }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
          onEnded={handleMediaEnded}
          onError={(e) => console.warn('Error en video stream:', e)}
          className="sr-only"
        />
      ) : (
        <audio
          ref={(el) => { mediaRef.current = el; }}
          src={streamUrl}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleTimeUpdate}
          onPlay={() => { setIsPlaying(true); setIsAutoplayBlocked(false); }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
          onEnded={handleMediaEnded}
          onError={(e) => console.warn('Error en audio stream:', e)}
          className="sr-only"
        />
      )}

      {/* MINI-PLAYER FLOTANTE (ESTILO SPOTIFY / YOUTUBE MUSIC) */}
      <div className="fixed bottom-[4.25rem] md:bottom-5 left-2 right-2 md:left-auto md:right-5 md:max-w-md z-40 animate-slideUp">
        <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 overflow-hidden flex flex-col gap-2">
          {/* Barra Dual Mini de Progreso y Buffer en el Borde Superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
            {/* Buffer descargado */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-slate-500 transition-all duration-300"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Reproducción actual */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 to-amber-500"
              style={{ width: `${currentPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            {/* Thumbnail con tap para expandir */}
            <div
              onClick={handleExpandClick}
              className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 cursor-pointer border border-slate-800 group"
              title="Toca para expandir el reproductor"
            >
              {thumbUrl ? (
                <img src={thumbUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900" />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                {isBuffering ? (
                  <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
                ) : track.type === 'video' ? (
                  <Film className="w-4 h-4 text-white/90" />
                ) : (
                  <Music2 className="w-4 h-4 text-white/90" />
                )}
              </div>
            </div>

            {/* Título, Tipo y Estado de Búfer */}
            <div
              onClick={handleExpandClick}
              className="flex-1 min-w-0 cursor-pointer"
              title="Toca para abrir controles avanzados"
            >
              <h4 className="text-xs font-bold text-white truncate leading-tight">
                {track.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] text-rose-400 font-semibold uppercase">
                  {currentQuality}
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                {/* Indicador de Salud de Búfer compacto */}
                {isBuffering ? (
                  <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Amortiguando (+{segundosAdelantados.toFixed(0)}s)
                  </span>
                ) : segundosAdelantados >= 10 ? (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    🟢 Búfer saludable (+{Math.round(segundosAdelantados)}s)
                  </span>
                ) : (
                  <span className="text-[10px] text-sky-400 font-medium">
                    🔵 +{Math.round(segundosAdelantados)}s
                  </span>
                )}
              </div>
            </div>

            {/* Acciones Rápidas */}
            {isAutoplayBlocked ? (
              <button
                onClick={attemptPlay}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold shadow-md animate-pulse active:scale-95 flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Tocar ▶</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Botón Anterior si hay cola */}
                {queue.length > 0 && (
                  <button
                    onClick={handlePrevTrack}
                    disabled={!canSkipPrev}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors active:scale-90 ${
                      !canSkipPrev ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Pista anterior"
                    aria-label="Pista anterior"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                  title={isPlaying ? 'Pausar' : 'Reanudar'}
                >
                  {isBuffering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  )}
                </button>

                {/* Botón Siguiente si hay cola */}
                {queue.length > 0 && (
                  <button
                    onClick={handleNextTrack}
                    disabled={!canSkipNext}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors active:scale-90 ${
                      !canSkipNext ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Pista siguiente"
                    aria-label="Pista siguiente"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={handleExpandClick}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Expandir reproductor avanzado"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Cerrar reproductor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
