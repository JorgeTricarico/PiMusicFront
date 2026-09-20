import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ChevronDown,
  X,
  Loader2,
  Music2,
  Film,
  Download,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Timer,
  Smartphone,
  Crop,
  SkipBack,
  SkipForward,
  Tv,
  Keyboard
} from 'lucide-react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { getStreamMediaUrl, getDownloadUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useQueue } from '../context/QueueContext';
import {
  updateMediaSessionMetadata,
  setMediaSessionActionHandlers,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
  clearMediaSession,
} from '../utils/mediaSession';
import {
  saveWatchProgress,
  getWatchProgress,
  formatDuration,
} from '../utils/watchHistory';

export type QualityId = '1080p' | '720p' | '480p' | '360p' | 'audio';

export interface QualityOption {
  id: QualityId;
  label: string;
  tag: string;
  type: 'video' | 'audio';
  isRecommended?: boolean;
}

const STREAM_QUALITIES: QualityOption[] = [
  { id: '1080p', label: '1080p', tag: 'Full HD', type: 'video' },
  { id: '720p', label: '720p', tag: 'HD Estándar', type: 'video' },
  { id: '480p', label: '480p', tag: 'Recomendada Móvil (Ahorro)', type: 'video', isRecommended: true },
  { id: '360p', label: '360p', tag: 'Ahorro Extremo', type: 'video' },
  { id: 'audio', label: 'Solo Audio', tag: 'MP3 / AAC', type: 'audio' },
];

export interface StreamPlayerTrack {
  videoId: string;
  title: string;
  channel?: string;
  artist?: string;
  duration?: number;
  initialQuality?: QualityId;
  initialType?: 'audio' | 'video';
  initialTime?: number;
  streamUrl?: string;
}

interface StreamPlayerModalProps {
  track: StreamPlayerTrack;
  onClose: () => void;
  onMinimize?: (state: {
    videoId: string;
    title: string;
    currentTime: number;
    quality: QualityId;
    isPlaying: boolean;
  }) => void;
  onTrackChange?: (track: StreamPlayerTrack) => void;
}

export const StreamPlayerModal: React.FC<StreamPlayerModalProps> = ({
  track,
  onClose,
  onMinimize,
  onTrackChange,
}) => {
  const defaultQuality: QualityId = track.initialQuality || (track.initialType === 'audio' ? 'audio' : '480p');
  const [quality, setQuality] = useState<QualityId>(defaultQuality);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(track.initialTime || 0);
  const [duration, setDuration] = useState<number>(track.duration || 0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showTimerMenu, setShowTimerMenu] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamStartTime, setStreamStartTime] = useState<number>(track.initialTime || 0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isDevicePortrait, setIsDevicePortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth && window.innerWidth < 850;
    }
    return false;
  });
  const [forceLandscape, setForceLandscape] = useState<boolean>(true);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Notificación flotante de reanudación y persistencia de progreso
  const [resumePrompt, setResumePrompt] = useState<{ currentTime: number } | null>(null);
  const resumeDismissTimeoutRef = useRef<any>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(track.initialTime || 0);
  const durationRef = useRef<number>(track.duration || 0);
  const qualityRef = useRef<QualityId>(defaultQuality);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  // Relación de aspecto para pantallas móviles modernas (18:9 / 20:9): "Ajustar" vs "Llenar pantalla"
  const [aspectRatioMode, setAspectRatioMode] = useState<'contain' | 'cover'>('contain');

  // Feedback visual de doble toque lateral (ondas circulares fluorescentes ±10s)
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);
  const feedbackTimeoutRef = useRef<any>(null);

  // Control de gestos táctiles (Swipe Down y Doble Toque Lateral)
  const touchStartPosRef = useRef<{
    x: number;
    y: number;
    time: number;
    isDragHandle?: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; zone: 'left' | 'right' | 'center' } | null>(null);
  const singleTapTimeoutRef = useRef<any>(null);
  const isSwipingDownRef = useRef<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 850;
      setIsDevicePortrait(portrait);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const pendingSeekTimeRef = useRef<number | null>(track.initialTime || null);
  const wasPlayingRef = useRef<boolean>(true);
  const fractionalSeekRef = useRef<number>(0);

  const { toast } = useToast();
  const { queue, canSkipNext, canSkipPrev, skipToNext, skipToPrev, handleTrackEnded } = useQueue();

  const handleMediaEnded = () => {
    const nextTrack = handleTrackEnded();
    if (nextTrack) {
      onTrackChange?.(nextTrack);
      toast.info('Siguiente en cola', nextTrack.title);
    }
  };

  const handleNextTrack = () => {
    const nextTrack = skipToNext();
    if (nextTrack) {
      onTrackChange?.(nextTrack);
      toast.info('Reproduciendo', nextTrack.title);
    }
  };

  const handlePrevTrack = () => {
    const prevTrack = skipToPrev();
    if (prevTrack) {
      onTrackChange?.(prevTrack);
      toast.info('Reproduciendo anterior', prevTrack.title);
    }
  };

  useEffect(() => {
    const defaultQ: QualityId = track.initialQuality || (track.initialType === 'audio' ? 'audio' : '480p');
    setQuality(defaultQ);
    setCurrentTime(track.initialTime || 0);
    setDuration(track.duration || 0);
    setStreamStartTime(track.initialTime || 0);
    currentTimeRef.current = track.initialTime || 0;
    durationRef.current = track.duration || 0;
    pendingSeekTimeRef.current = track.initialTime || null;
    setBufferedEnd(0);
    setError(null);
    setIsBuffering(true);
    setIsAutoplayBlocked(false);
    wasPlayingRef.current = true;
  }, [track.videoId, track.streamUrl]);

  // Detección de reanudación al cargar el track si no viene con initialTime explícito
  useEffect(() => {
    if (track.initialTime === undefined) {
      const saved = getWatchProgress(track.videoId);
      if (saved && saved.currentTime >= 10 && (!saved.duration || saved.currentTime <= saved.duration - 15)) {
        setResumePrompt({ currentTime: saved.currentTime });
        if (resumeDismissTimeoutRef.current) clearTimeout(resumeDismissTimeoutRef.current);
        resumeDismissTimeoutRef.current = setTimeout(() => {
          setResumePrompt(null);
        }, 8000);
      } else {
        setResumePrompt(null);
      }
    } else {
      setResumePrompt(null);
    }

    return () => {
      if (resumeDismissTimeoutRef.current) {
        clearTimeout(resumeDismissTimeoutRef.current);
      }
    };
  }, [track.videoId, track.initialTime]);

  const isAudioOnly = quality === 'audio';
  const isLocal = track.videoId.startsWith('local_') || Boolean(track.streamUrl);
  const streamUrl = track.streamUrl || getStreamMediaUrl(
    track.videoId,
    isAudioOnly ? 'audio' : 'video',
    quality,
    streamStartTime > 0 ? streamStartTime : undefined
  );
  const thumbUrl = isLocal ? '' : `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

  // Función de guardado de progreso multimedia
  const saveCurrentProgress = useCallback(() => {
    const el = mediaRef.current;
    if (!track.videoId) return;

    const currentPos = (isLocal || isAudioOnly)
      ? (el?.currentTime ?? currentTimeRef.current)
      : (streamStartTime + (el?.currentTime ?? 0));

    const totalDur = durationRef.current || duration || el?.duration || track.duration || 0;
    if (totalDur <= 0) return;

    saveWatchProgress({
      videoId: track.videoId,
      title: track.title,
      channel: track.channel || track.artist,
      thumbnail: thumbUrl || (track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg` : undefined),
      currentTime: currentPos,
      duration: totalDur,
      quality: qualityRef.current,
      type: qualityRef.current === 'audio' ? 'audio' : 'video',
      updatedAt: Date.now(),
    });
  }, [track, isLocal, isAudioOnly, streamStartTime, duration, thumbUrl]);

  // Cálculo de posición y salud de búfer estilo YouTube
  const displayCurrentTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const currentPercent = duration > 0 ? Math.min(100, Math.max(0, (displayCurrentTime / duration) * 100)) : 0;

  let bufferLeftPercent = 0;
  let bufferWidthPercent = 0;
  if (duration > 0) {
    if (isLocal || isAudioOnly || streamStartTime === 0) {
      bufferLeftPercent = 0;
      bufferWidthPercent = Math.min(100, Math.max(0, (bufferedEnd / duration) * 100));
    } else {
      bufferLeftPercent = Math.min(100, (streamStartTime / duration) * 100);
      bufferWidthPercent = Math.min(100 - bufferLeftPercent, Math.max(0, ((bufferedEnd - streamStartTime) / duration) * 100));
    }
  }

  // Manejo de temporizador para ocultar controles al reproducir (no ocultar si hay un menú abierto)
  const triggerControlsVisibility = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !showQualityMenu && !showSpeedMenu && !showTimerMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, showQualityMenu, showSpeedMenu, showTimerMenu]);

  useEffect(() => {
    if (isPlaying) {
      triggerControlsVisibility();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, triggerControlsVisibility]);

  // Limpieza estricta al desmontar: liberar MediaSession, orientación, pantalla completa y stream
  useEffect(() => {
    return () => {
      saveCurrentProgress();
      clearMediaSession();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).unlock) {
        try { (screen.orientation as any).unlock(); } catch {}
      }
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
      if (mediaRef.current) {
        mediaRef.current.pause();
        mediaRef.current.removeAttribute('src');
        mediaRef.current.load();
      }
    };
  }, []);

  // Conexión con MediaSession API: Metadatos y Carátulas de Alta Resolución
  useEffect(() => {
    updateMediaSessionMetadata({
      title: track.title,
      channel: track.channel || track.artist,
      videoId: track.videoId,
      artworkUrl: thumbUrl,
    });
  }, [track.title, track.channel, track.artist, track.videoId, thumbUrl]);

  // Conexión con MediaSession API: Sincronización del estado de reproducción
  useEffect(() => {
    updateMediaSessionPlaybackState(isPlaying ? 'playing' : 'paused');
  }, [isPlaying]);

  // Actualización de búfer y tiempo
  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (!el) return;

    const sliceTime = el.currentTime || 0;
    const trueTime = (isLocal || isAudioOnly) ? sliceTime : (streamStartTime + sliceTime);

    currentTimeRef.current = trueTime;

    if (!isScrubbing) {
      setCurrentTime(trueTime);
    }

    if (streamStartTime === 0 && el.duration && isFinite(el.duration) && el.duration !== duration) {
      setDuration(el.duration);
      durationRef.current = el.duration;
    } else if (el.duration && isFinite(el.duration)) {
      durationRef.current = el.duration;
    }

    // Guardar progreso periódicamente cada 3 segundos
    const now = Date.now();
    if (now - lastSaveTimeRef.current >= 3000) {
      lastSaveTimeRef.current = now;
      saveCurrentProgress();
    }

    // Calcular buffered relativo al timeline total
    const b = el.buffered;
    let sliceBufferedEnd = 0;
    if (b && b.length > 0) {
      for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= sliceTime && sliceTime <= b.end(i)) {
          sliceBufferedEnd = b.end(i);
          break;
        }
      }
      if (sliceBufferedEnd === 0) {
        for (let i = 0; i < b.length; i++) {
          if (b.end(i) > sliceBufferedEnd) sliceBufferedEnd = b.end(i);
        }
      }
    }
    const trueBufferedEnd = (isLocal || isAudioOnly) ? sliceBufferedEnd : (streamStartTime + sliceBufferedEnd);
    setBufferedEnd(trueBufferedEnd);

    // Si ya avanzó de los 2.5s de búfer y estaba amortiguando, liberar estado de buffer
    if (sliceBufferedEnd - sliceTime >= 2.5) {
      setIsBuffering(false);
    }

    // Sincronizar posición y duración con MediaSession
    updateMediaSessionPositionState({
      duration,
      playbackRate,
      position: trueTime,
    });
  };

  const handleProgress = () => {
    handleTimeUpdate();
  };

  // Intento de reproducción seguro
  const attemptPlay = async () => {
    const el = mediaRef.current;
    if (!el) return;
    try {
      await el.play();
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
      setIsBuffering(false);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setIsAutoplayBlocked(true);
        setIsPlaying(false);
      } else {
        console.warn('Reproducción impedida:', err);
      }
    }
  };

  // Reanudar o pausar
  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      setShowControls(true);
      saveCurrentProgress();
    } else {
      attemptPlay();
      triggerControlsVisibility();
    }
  };

  // Ejecución de salto a cualquier punto del video (estilo YouTube)
  const executeSeek = (targetTime: number) => {
    const el = mediaRef.current;
    if (!el) return;

    const boundedTime = Math.max(0, Math.min(duration || targetTime, targetTime));
    wasPlayingRef.current = isPlaying;

    // 1. Pistas locales o solo audio: navegación nativa por HTTP Range 206
    if (isLocal || isAudioOnly) {
      el.currentTime = boundedTime;
      setCurrentTime(boundedTime);
      triggerControlsVisibility();
      return;
    }

    // 2. Video streaming remuxeado:
    // Verificar si el punto de destino ya está cargado en la memoria del búfer actual
    const sliceOffset = boundedTime - streamStartTime;
    let isWithinCurrentBuffer = false;

    if (sliceOffset >= 0 && el.buffered && el.buffered.length > 0) {
      for (let i = 0; i < el.buffered.length; i++) {
        if (el.buffered.start(i) <= sliceOffset && sliceOffset <= el.buffered.end(i)) {
          isWithinCurrentBuffer = true;
          break;
        }
      }
    }

    if (isWithinCurrentBuffer) {
      // Salto instantáneo en el búfer ya descargado
      el.currentTime = sliceOffset;
      setCurrentTime(boundedTime);
    } else {
      // Salto fuera del búfer (adelantar a cualquier minuto o retroceder antes de streamStartTime):
      // Solicitud al servidor para iniciar streaming desde boundedTime
      setIsBuffering(true);
      setCurrentTime(boundedTime);
      const newStart = Math.floor(boundedTime);
      fractionalSeekRef.current = boundedTime - newStart;
      setStreamStartTime(newStart);
    }
    triggerControlsVisibility();
  };

  // Acciones de Reanudación desde el Banner Flotante
  const handleResume = () => {
    if (resumePrompt) {
      const targetTime = resumePrompt.currentTime;
      setResumePrompt(null);
      if (resumeDismissTimeoutRef.current) clearTimeout(resumeDismissTimeoutRef.current);
      executeSeek(targetTime);
      toast.info('Reproducción reanudada', `Continuando en ${formatDuration(targetTime)}`, 2000);
    }
  };

  const handleDismissResume = () => {
    setResumePrompt(null);
    if (resumeDismissTimeoutRef.current) clearTimeout(resumeDismissTimeoutRef.current);
  };

  // Saltar ±10 segundos hacia adelante o atrás
  const skipSeconds = (seconds: number) => {
    const el = mediaRef.current;
    const currentPos = (isLocal || isAudioOnly)
      ? (el?.currentTime || currentTime)
      : (streamStartTime + (el?.currentTime || 0));
    const newTime = Math.max(0, Math.min(duration || Infinity, currentPos + seconds));
    executeSeek(newTime);
  };

  // Cálculo de tiempo desde eventos táctiles / ratón en la barra de progreso
  const calculateTimeFromPointer = (e: React.PointerEvent<HTMLDivElement>): number => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const isRotated = isFullscreen && isDevicePortrait && forceLandscape;
    const pos = isRotated
      ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      : Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    wasPlayingRef.current = isPlaying;
    const target = calculateTimeFromPointer(e);
    setScrubTime(target);
    triggerControlsVisibility();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const target = calculateTimeFromPointer(e);
    setScrubTime(target);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
    const finalTime = scrubTime !== null ? scrubTime : calculateTimeFromPointer(e);
    setScrubTime(null);
    executeSeek(finalTime);
  };

  // Cambio de resolución o calidad sin congelar ni reiniciar
  const handleSelectQuality = (newQuality: QualityId) => {
    if (newQuality === quality) {
      setShowQualityMenu(false);
      return;
    }

    const currentPos = (isLocal || isAudioOnly)
      ? (mediaRef.current?.currentTime || currentTime)
      : (streamStartTime + (mediaRef.current?.currentTime || 0));

    wasPlayingRef.current = isPlaying;
    setIsBuffering(true);
    setError(null);
    setShowQualityMenu(false);

    if (newQuality === 'audio' || isLocal) {
      setStreamStartTime(0);
      pendingSeekTimeRef.current = currentPos;
    } else {
      setStreamStartTime(Math.floor(currentPos));
      fractionalSeekRef.current = currentPos - Math.floor(currentPos);
      pendingSeekTimeRef.current = null;
    }

    setQuality(newQuality);
    const qObj = STREAM_QUALITIES.find(q => q.id === newQuality);
    toast.info('Cambiando calidad...', `Streaming en ${qObj?.label} (${qObj?.tag})`, 2500);
  };

  // Al cargar metadata del nuevo stream
  const handleLoadedMetadata = () => {
    const el = mediaRef.current;
    if (!el) return;

    if (streamStartTime === 0 && el.duration && isFinite(el.duration)) {
      setDuration(el.duration);
    } else if (!duration && el.duration && isFinite(el.duration)) {
      setDuration(streamStartTime + el.duration);
    }

    // Restaurar posición si había una pendiente tras cambio de calidad o seek fraccional
    if (pendingSeekTimeRef.current !== null && pendingSeekTimeRef.current > 0) {
      const targetTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      if (isLocal || isAudioOnly) {
        try {
          el.currentTime = targetTime;
          setCurrentTime(targetTime);
        } catch {}
      } else {
        const frac = targetTime - streamStartTime;
        if (frac > 0.1) {
          try { el.currentTime = frac; } catch {}
        }
      }
    } else if (fractionalSeekRef.current > 0.1) {
      const frac = fractionalSeekRef.current;
      fractionalSeekRef.current = 0;
      try { el.currentTime = frac; } catch {}
    }

    setError(null);
    setIsBuffering(false);
    if (wasPlayingRef.current) {
      attemptPlay();
    }
  };

  // Cambio de velocidad de reproducción (0.75x a 2x)
  const handlePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
    toast.info('Velocidad', `Reproduciendo a ${rate}x`, 1500);
  };

  // Temporizador de apagado automático (Sleep Timer)
  useEffect(() => {
    if (!sleepTimerMinutes) {
      setSleepTimerRemaining(null);
      return;
    }
    setSleepTimerRemaining(sleepTimerMinutes * 60);
    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (mediaRef.current) mediaRef.current.pause();
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          toast.info('Temporizador finalizado', 'La reproducción se ha detenido automáticamente.', 4000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerMinutes]);

  // Control de Volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (isMuted) {
      el.muted = false;
      setIsMuted(false);
      if (volume === 0) {
        setVolume(1);
        el.volume = 1;
      }
    } else {
      el.muted = true;
      setIsMuted(true);
    }
  };

  // Ajuste gradual de volumen con feedback (Teclado y Rueda del Ratón)
  const adjustVolume = useCallback((delta: number) => {
    const currentVal = isMuted ? 0 : volume;
    const next = Math.min(1, Math.max(0, Math.round((currentVal + delta) * 100) / 100));
    setVolume(next);
    if (mediaRef.current) {
      mediaRef.current.volume = next;
      mediaRef.current.muted = next === 0;
    }
    setIsMuted(next === 0);
    toast.info('Volumen', `${Math.round(next * 100)}%`, 1000);
  }, [isMuted, volume, toast]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    adjustVolume(delta);
  };

  // Alternar Modo Teatro (ancho regular max-w-4xl vs cinematográfico max-w-7xl)
  const toggleTheaterMode = useCallback(() => {
    const next = !isTheaterMode;
    setIsTheaterMode(next);
    toast.info('Modo Teatro', next ? 'Activado (Ancho cinematográfico)' : 'Desactivado (Ancho regular)', 1500);
  }, [isTheaterMode, toast]);

  // Pantalla Completa Robusta para Mobile y Desktop
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const media = mediaRef.current;

    // Detectar iOS Safari (donde solo el elemento de video tiene API de pantalla completa nativa)
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIOS && (media as any)?.webkitEnterFullscreen && !isAudioOnly) {
      try {
        (media as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      } catch (e) {
        console.warn('iOS webkitEnterFullscreen falló, usando pantalla completa por CSS:', e);
      }
    }

    const doc = document as any;
    const isCurrentlyFs =
      !!doc.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.mozFullScreenElement ||
      !!doc.msFullscreenElement ||
      isFullscreen;

    if (!isCurrentlyFs) {
      setForceLandscape(true); // Siempre que sea fullscreen en mobile debe ser horizontal por defecto
      try {
        if (container?.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container && (container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if (container && (container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } else if ((media as any)?.webkitEnterFullscreen) {
          (media as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);

        // En smartphones, forzar orientación horizontal para que siempre sea landscape
        if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch {
            try {
              await (screen.orientation as any).lock('landscape-primary');
            } catch {
              // Ignorar si el navegador no permite bloqueo por permisos; el CSS transform asegurará rotación horizontal
            }
          }
        }
      } catch (err) {
        console.warn('Fullscreen nativo no permitido, activando pantalla completa por CSS:', err);
        setIsFullscreen(true);
      }
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
        if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).unlock) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }
      } catch (err) {
        console.warn('Error al salir de fullscreen nativo:', err);
      }
      setIsFullscreen(false);
    }
  };

  // Sincronizar estado de fullscreen nativo en todos los navegadores
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
    };
  }, []);

  // Sincronizar estado de fullscreen nativo en iOS Safari
  useEffect(() => {
    const mediaEl = mediaRef.current;
    if (!mediaEl) return;

    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);

    mediaEl.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
    mediaEl.addEventListener('webkitendfullscreen', handleWebkitEnd);

    return () => {
      mediaEl.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
      mediaEl.removeEventListener('webkitendfullscreen', handleWebkitEnd);
    };
  }, [quality]);

  // Atajos de teclado en Desktop estilo YouTube (Play, Fullscreen, Mute, Seek J/L, Volumen Flechas, Teclas 0-9, Teatro T, Atajos ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditing =
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          (activeEl as HTMLElement).isContentEditable);
      if (isEditing) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        adjustVolume(0.05);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        adjustVolume(-0.05);
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        if (duration > 0) {
          executeSeek((num / 10) * duration);
          toast.info('Navegación', `Saltar al ${num * 10}%`, 1000);
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheaterMode();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showShortcutsModal) {
          e.preventDefault();
          setShowShortcutsModal(false);
        } else if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
    isPlaying,
    isMuted,
    volume,
    duration,
    adjustVolume,
    toggleTheaterMode,
    showShortcutsModal,
    streamStartTime,
    isLocal,
    isAudioOnly,
    quality,
  ]);

  // Minimizar al MiniPlayer flotante
  const handleMinimize = () => {
    if (onMinimize) {
      const currentPos = (isLocal || isAudioOnly)
        ? (mediaRef.current?.currentTime || currentTime)
        : (streamStartTime + (mediaRef.current?.currentTime || 0));
      onMinimize({
        videoId: track.videoId,
        title: track.title,
        currentTime: currentPos,
        quality,
        isPlaying,
      });
    }
    onClose();
  };

  // Feedback visual de doble toque (animación fluorescente ±10s durante 600ms)
  const triggerDoubleTapFeedback = (side: 'left' | 'right') => {
    setDoubleTapFeedback(side);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setDoubleTapFeedback(null);
    }, 600);
  };

  // Toque central (40%-60%): alterna controles / play-pause
  const handleCentralTap = () => {
    if (!isPlaying) {
      attemptPlay();
      triggerControlsVisibility();
    } else if (!showControls) {
      triggerControlsVisibility();
    } else {
      togglePlay();
    }
  };

  // Manejador de touchStart para Swipe Down y Double Tap
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, select, textarea, [role="slider"], a')) {
      return;
    }
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const isDragHandle = Boolean(target && (target.closest('[data-testid="drag-handle"]') || target.closest('[data-testid="drag-handle-bar"]')));

      // 1. Zona de exclusión de notificaciones Android:
      // Si touch.clientY < 75 (área de barra de estado y notch donde se baja el panel de notificaciones de Android),
      // ignorar por completo el gesto de swipe-down, excepto si el usuario interactúa expresamente con el tirador táctil.
      if (touch.clientY < 75 && !isDragHandle) {
        isSwipingDownRef.current = false;
        touchStartPosRef.current = null;
        return;
      }

      touchStartPosRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        isDragHandle,
      };
      isSwipingDownRef.current = false;
    }
  };

  // Manejador de touchMove para Swipe Down fluido
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartPosRef.current.y;
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);

    // Requerir que deltaY > deltaX * 1.5 para evitar que scrolls diagonales o de página lo activen accidentalmente
    if (deltaY > 10 && deltaY > deltaX * 1.5) {
      isSwipingDownRef.current = true;
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      lastTapRef.current = null;
      setSwipeOffset(Math.max(0, deltaY));
    }
  };

  // Manejador de touchEnd para detectar Swipe Down (> 110px) o Doble Toque Lateral (<40% o >60%)
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = Date.now();
    const start = touchStartPosRef.current;
    touchStartPosRef.current = null;
    isSwipingDownRef.current = false;
    setSwipeOffset(0);

    if (!start) return;

    const touch = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;
    if (!touch) return;

    const deltaY = touch.clientY - start.y;
    const deltaX = Math.abs(touch.clientX - start.x);
    const totalDistance = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);

    // 1. Gesto Swipe Down (al menos deltaY > 110px y deltaY > deltaX * 1.5): minimiza suavemente al MiniPlayer
    const isFromDragHandle = Boolean(start.isDragHandle);
    const isSwipeDown =
      (deltaY > 110 && deltaY > deltaX * 1.5) ||
      (isFromDragHandle && deltaY > 50 && deltaY > deltaX * 1.5);

    if (isSwipeDown) {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      lastTapRef.current = null;
      handleMinimize();
      return;
    }

    // Si la interacción inició en el tirador pero no alcanzó el umbral de arrastre,
    // evitar que se interprete como toque de control en el reproductor (el onClick se encarga del tap)
    if (isFromDragHandle) {
      return;
    }

    // Si hubo arrastre > 15px pero no alcanzó los 110px, no considerarlo tap
    if (totalDistance > 15) {
      return;
    }

    // 2. Detección de Toques y Doble Toque (Double-Tap to Seek ±10s)
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const containerWidth =
      rect && rect.width > 0
        ? rect.width
        : typeof window !== 'undefined' && window.innerWidth
          ? window.innerWidth
          : 1000;
    const containerLeft = rect ? rect.left : 0;
    const relativeX = (touch.clientX - containerLeft) / containerWidth;

    let zone: 'left' | 'right' | 'center' = 'center';
    if (relativeX < 0.40) {
      zone = 'left';
    } else if (relativeX > 0.60) {
      zone = 'right';
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Doble toque lateral en menos de 300ms en la misma zona
    if (
      lastTap &&
      (zone === 'left' || zone === 'right') &&
      lastTap.zone === zone &&
      now - lastTap.time < 300
    ) {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      lastTapRef.current = null;

      if (zone === 'left') {
        skipSeconds(-10);
        triggerDoubleTapFeedback('left');
      } else if (zone === 'right') {
        skipSeconds(10);
        triggerDoubleTapFeedback('right');
      }
      return;
    }

    // Toque central (40%-60%): alterna controles / play-pause
    if (zone === 'center') {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      lastTapRef.current = null;
      handleCentralTap();
      return;
    }

    // Primer toque lateral: registrar y esperar 300ms
    lastTapRef.current = { time: now, zone };
    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      triggerControlsVisibility();
      lastTapRef.current = null;
    }, 300);
  };

  const handleTouchCancel = () => {
    touchStartPosRef.current = null;
    isSwipingDownRef.current = false;
    setSwipeOffset(0);
  };

  const handleVideoClick = () => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    handleCentralTap();
  };

  // Alternar relación de aspecto ("Ajustar" vs "Llenar pantalla" con object-cover) para teléfonos 18:9 y 20:9
  const toggleAspectRatio = () => {
    const next = aspectRatioMode === 'contain' ? 'cover' : 'contain';
    setAspectRatioMode(next);
    toast.info(
      'Relación de Aspecto',
      next === 'cover' ? 'Llenar pantalla (object-cover 18:9 / 20:9)' : 'Ajustar pantalla (16:9 original)',
      1500
    );
  };

  // Conexión con MediaSession API: Handlers de Hardware (play, pause, seekbackward, seekforward, previoustrack, nexttrack, seekto)
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
        skipSeconds(-offset);
        triggerDoubleTapFeedback('left');
      },
      seekforward: (details) => {
        const offset = details?.seekOffset || 10;
        skipSeconds(offset);
        triggerDoubleTapFeedback('right');
      },
      previoustrack: () => {
        skipSeconds(-10);
      },
      nexttrack: () => {
        skipSeconds(10);
      },
      seekto: (details) => {
        if (details?.seekTime !== undefined && details.seekTime !== null) {
          executeSeek(details.seekTime);
        }
      },
    });

    return () => {
      clearMediaSession();
    };
  }, [track.videoId, duration, streamStartTime, isLocal, isAudioOnly, quality]);

  // Formato de tiempo (mm:ss o hh:mm:ss)
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;

    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }
    return `${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
  };

  const directDownloadUrl = getDownloadUrl(
    `https://www.youtube.com/watch?v=${track.videoId}`,
    isAudioOnly ? 'audio' : 'video',
    quality === 'audio' ? 'mp3_320' : quality
  );

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex items-center justify-center p-0 bg-black overflow-hidden select-none'
          : 'w-full select-none'
      }
    >
      <div
        ref={containerRef}
        data-testid="player-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseMove={triggerControlsVisibility}
        onWheel={handleWheel}
        style={{
          transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
          transition: isSwipingDownRef.current ? 'none' : 'transform 0.2s ease-out',
        }}
        className={`bg-black flex flex-col justify-center items-center relative overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? isDevicePortrait && forceLandscape
              ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vh] h-[100vw] rotate-90 origin-center z-[9999] rounded-none border-none'
              : 'w-screen h-screen max-w-none max-h-none rounded-none border-none z-50'
            : isTheaterMode
              ? 'relative w-full max-w-7xl mx-auto aspect-video rounded-xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden'
              : 'relative w-full max-w-4xl mx-auto aspect-video rounded-xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden'
        }`}
      >
        {/* ============================================================ */}
        {/* LIENZO DE VIDEO / AUDIO (100% DEL ÁREA)                       */}
        {/* ============================================================ */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          {!isAudioOnly ? (
            <video
              ref={(el) => { (mediaRef as any).current = el; }}
              src={streamUrl}
              playsInline
              webkit-playsinline="true"
              onTimeUpdate={handleTimeUpdate}
              onProgress={handleProgress}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
              onPause={() => setIsPlaying(false)}
              onEnded={handleMediaEnded}
              onError={() => {
                console.warn('Fallo en reproducción de stream en calidad:', quality);
                setIsBuffering(false);
                if (quality === '1080p') {
                  toast.info('Ajustando resolución', '1080p tardó en responder, cambiando a 720p...');
                  handleSelectQuality('720p');
                } else if (quality === '720p') {
                  toast.info('Ajustando resolución', 'Cambiando a 480p para reproducción móvil fluida...');
                  handleSelectQuality('480p');
                } else if (quality === '480p') {
                  toast.info('Ajustando resolución', 'Probando 360p para ahorro de datos...');
                  handleSelectQuality('360p');
                } else {
                  setError('No se pudo reproducir este formato. Prueba cambiar a Solo Audio o descarga el video.');
                }
              }}
              className={`w-full h-full cursor-pointer transition-all duration-200 ${
                aspectRatioMode === 'cover' ? 'object-cover' : 'object-contain'
              }`}
              onClick={handleVideoClick}
              onDoubleClick={toggleFullscreen}
            />
          ) : (
            /* Modo Solo Audio con Carátula */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
              <audio
                ref={(el) => { (mediaRef as any).current = el; }}
                src={streamUrl}
                onTimeUpdate={handleTimeUpdate}
                onProgress={handleProgress}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                onPause={() => setIsPlaying(false)}
                onEnded={handleMediaEnded}
                onError={() => {
                  setError('Error de audio stream. Verifica la conexión.');
                  setIsBuffering(false);
                }}
              />
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 mb-4">
                {thumbUrl ? (
                  <img src={thumbUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <Music2 className="w-10 h-10 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Music2 className="w-10 h-10 text-rose-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-white font-bold text-center text-sm sm:text-base max-w-md truncate px-4">
                {track.title}
              </h3>
              <p className="text-rose-400 text-xs font-mono mt-1">
                Audio Stream MP3 / AAC Nativo
              </p>
            </div>
          )}
        </div>

        {/* ANIMACIÓN VISUAL DE DOBLE TOQUE IZQUIERDO (-10s): Ondas circulares fluorescentes + RotateCcw */}
        {doubleTapFeedback === 'left' && (
          <div
            data-testid="double-tap-feedback-left"
            className="absolute left-0 top-0 bottom-0 w-2/5 flex flex-col items-center justify-center pointer-events-none z-40 bg-gradient-to-r from-rose-600/30 via-rose-500/10 to-transparent rounded-r-full transition-opacity duration-300 animate-fadeIn"
          >
            <div className="relative flex flex-col items-center justify-center">
              {/* Ondas circulares fluorescentes */}
              <div className="absolute w-24 h-24 rounded-full border-2 border-rose-400 bg-rose-500/30 animate-ping shadow-[0_0_25px_#f43f5e]" />
              <div className="absolute w-32 h-32 rounded-full border border-rose-300/50 animate-pulse shadow-[0_0_35px_#fb7185]" />
              <div className="relative z-10 flex flex-col items-center gap-1">
                <RotateCcw className="w-10 h-10 text-white drop-shadow-[0_0_12px_#f43f5e] animate-bounce" />
                <span className="text-white font-black text-xl drop-shadow-[0_0_15px_#f43f5e] tracking-wider font-mono">
                  -10s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ANIMACIÓN VISUAL DE DOBLE TOQUE DERECHO (+10s): Ondas circulares fluorescentes + RotateCw */}
        {doubleTapFeedback === 'right' && (
          <div
            data-testid="double-tap-feedback-right"
            className="absolute right-0 top-0 bottom-0 w-2/5 flex flex-col items-center justify-center pointer-events-none z-40 bg-gradient-to-l from-rose-600/30 via-rose-500/10 to-transparent rounded-l-full transition-opacity duration-300 animate-fadeIn"
          >
            <div className="relative flex flex-col items-center justify-center">
              {/* Ondas circulares fluorescentes */}
              <div className="absolute w-24 h-24 rounded-full border-2 border-rose-400 bg-rose-500/30 animate-ping shadow-[0_0_25px_#f43f5e]" />
              <div className="absolute w-32 h-32 rounded-full border border-rose-300/50 animate-pulse shadow-[0_0_35px_#fb7185]" />
              <div className="relative z-10 flex flex-col items-center gap-1">
                <RotateCw className="w-10 h-10 text-white drop-shadow-[0_0_12px_#f43f5e] animate-bounce" />
                <span className="text-white font-black text-xl drop-shadow-[0_0_15px_#f43f5e] tracking-wider font-mono">
                  +10s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BANNER FLOTANTE DE REANUDACIÓN DE REPRODUCCIÓN ("CONTINUAR VIENDO") */}
        {resumePrompt && (
          <div
            data-testid="resume-prompt-banner"
            className="absolute top-14 left-4 right-4 sm:left-auto sm:right-6 z-40 flex items-center justify-between gap-3 bg-slate-900/95 border border-rose-500/50 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl animate-fadeIn"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white font-medium">
              <RotateCcw className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                ¿Reanudar en <strong className="text-rose-400 font-mono">{formatDuration(resumePrompt.currentTime)}</strong>?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResume}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs rounded-xl shadow transition-all"
              >
                Reanudar
              </button>
              <button
                onClick={handleDismissResume}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Ignorar y reproducir desde el inicio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY DE AUTOPLAY BLOQUEADO EN MÓVILES */}
        {isAutoplayBlocked && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto p-4">
            <div className="flex flex-col items-center gap-3 bg-slate-900 border border-rose-500/30 p-6 rounded-2xl max-w-sm text-center shadow-2xl">
              <Play className="w-12 h-12 text-rose-500 fill-rose-500" />
              <p className="text-sm font-semibold text-white">Toca para iniciar la reproducción</p>
              <button
                onClick={attemptPlay}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                Reproducir Ahora
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY DE ERROR CON REINTENTO AUTOMÁTICO */}
        {error && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto p-4">
            <div className="flex flex-col items-center gap-3 bg-slate-900 border border-rose-500/50 p-6 rounded-2xl max-w-sm text-center shadow-2xl">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-sm font-medium text-slate-200">{error}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => { setError(null); handleSelectQuality('480p'); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Probar 480p
                </button>
                <button
                  onClick={() => { setError(null); handleSelectQuality('audio'); }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Solo Audio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* OVERLAY COMPLETO ESTILO YOUTUBE CON DESVANECIMIENTO AUTOMÁTICO */}
        {/* ============================================================ */}
        <div
          className={`absolute inset-0 z-30 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
            showControls || !isPlaying
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          {/* BARRA SUPERIOR (GRADIENTE CINEMATOGRÁFICO) CON TIRADOR DE ARRASTRE */}
          <div className="px-3 pt-1 pb-3 sm:px-4 sm:pt-1.5 sm:pb-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex flex-col pointer-events-auto">
            {/* TIRADOR VISUAL DE ARRASTRE (DRAG HANDLE) */}
            <div
              data-testid="drag-handle"
              onClick={handleMinimize}
              className="w-full flex items-center justify-center cursor-grab active:cursor-grabbing py-0.5 touch-none select-none"
              title="Arrastrar hacia abajo o presionar para minimizar"
              role="button"
              tabIndex={0}
              aria-label="Minimizar reproductor"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMinimize();
                }
              }}
            >
              <div
                data-testid="drag-handle-bar"
                className="w-10 h-1 bg-white/40 hover:bg-white/60 rounded-full mx-auto my-1.5 transition-all"
              />
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {/* BOTÓN COLAPSAR A MINI-REPRODUCTOR (CHEVRON DOWN YOUTUBE) */}
                <button
                  onClick={handleMinimize}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                  title="Minimizar reproductor"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>

                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {track.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono">
                    <span>Sin Publicidad</span>
                    <span>•</span>
                    <span className="text-rose-400 font-semibold">{quality.toUpperCase()}</span>
                  </div>
                </div>
              </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* BOTÓN FORZAR MODO HORIZONTAL EN MÓVIL (SOLO EN FULLSCREEN PORTRAIT) */}
              {isFullscreen && isDevicePortrait && (
                <button
                  onClick={() => setForceLandscape(!forceLandscape)}
                  className={`p-2 rounded-xl border transition-all active:scale-95 ${
                    forceLandscape
                      ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                      : 'bg-black/60 hover:bg-black/80 border-white/20 text-slate-300'
                  }`}
                  title={forceLandscape ? 'Rotación horizontal activa (Toca para vertical)' : 'Pantalla vertical (Toca para horizontal)'}
                >
                  <Smartphone className={`w-4 h-4 ${forceLandscape ? 'rotate-90 text-amber-400' : ''} transition-transform`} />
                </button>
              )}

              {/* SELECTOR DE CALIDAD / RESOLUCIÓN */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                    setShowTimerMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm"
                  title="Elegir calidad de streaming"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                  <span>{quality === 'audio' ? 'Audio MP3' : quality}</span>
                  {quality === '480p' && (
                    <span className="hidden sm:inline text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Recomendada
                    </span>
                  )}
                </button>

                {/* MENÚ DESPLEGABLE DE CALIDAD */}
                {showQualityMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="px-2 py-1.5 border-b border-slate-800 mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Resolución de Video
                      </span>
                      <span className="text-[10px] text-rose-400 font-medium">Streaming Nativo</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {STREAM_QUALITIES.map((opt) => {
                        const isSelected = quality === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectQuality(opt.id)}
                            className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'bg-rose-600 text-white font-bold shadow'
                                : 'hover:bg-slate-800/80 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {opt.type === 'video' ? (
                                <Film className="w-4 h-4 opacity-80" />
                              ) : (
                                <Music2 className="w-4 h-4 opacity-80" />
                              )}
                              <div>
                                <div className="text-xs font-semibold flex items-center gap-1.5">
                                  <span>{opt.label}</span>
                                  {opt.isRecommended && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                      isSelected ? 'bg-white text-rose-700' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}>
                                      Recomendada
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                                  {opt.tag}
                                </span>
                              </div>
                            </div>

                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÓN GUÍA DE ATAJOS DE TECLADO */}
              <button
                onClick={() => setShowShortcutsModal(true)}
                data-testid="keyboard-shortcuts-btn"
                className="hidden sm:flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-90"
                title="Atajos de teclado (?)"
                aria-label="Atajos de teclado"
              >
                <Keyboard className="w-5 h-5" />
              </button>

              {/* BOTÓN CERRAR */}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-rose-600/30 hover:text-rose-400 text-slate-300 transition-all active:scale-90"
                title="Cerrar reproductor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

          {/* CONTROLES TÁCTILES CENTRALES: PLAY/PAUSE O SPINNER DE BUFFERING */}
          <div className="flex flex-col items-center justify-center gap-3 pointer-events-auto my-auto">
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              {queue.length > 0 && (
                <button
                  onClick={handlePrevTrack}
                  disabled={!canSkipPrev}
                  className={`p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm active:scale-90 transition-all shadow-lg ${
                    !canSkipPrev ? 'opacity-35 cursor-not-allowed' : 'hover:text-rose-400'
                  }`}
                  title="Pista anterior"
                  aria-label="Pista anterior"
                >
                  <SkipBack className="w-5 h-5 sm:w-7 sm:h-7 fill-white/80" />
                </button>
              )}

              <button
                onClick={() => skipSeconds(-10)}
                className="p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm active:scale-90 transition-all shadow-lg"
                title="Retroceder 10s"
              >
                <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>

              {/* BOTÓN CENTRAL: SI ESTÁ EN BUFFERING, SE MUESTRA EL SPINNER Y SE OCULTA EL PLAY */}
              {isBuffering ? (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/80 border-2 border-rose-500/60 text-white flex items-center justify-center shadow-2xl backdrop-blur-md pointer-events-none animate-pulse"
                  title="Cargando video..."
                >
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600/95 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
                  ) : (
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
                  )}
                </button>
              )}

              <button
                onClick={() => skipSeconds(10)}
                className="p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm active:scale-90 transition-all shadow-lg"
                title="Adelantar 10s"
              >
                <RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>

              {queue.length > 0 && (
                <button
                  onClick={handleNextTrack}
                  disabled={!canSkipNext}
                  className={`p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm active:scale-90 transition-all shadow-lg ${
                    !canSkipNext ? 'opacity-35 cursor-not-allowed' : 'hover:text-rose-400'
                  }`}
                  title="Pista siguiente"
                  aria-label="Pista siguiente"
                >
                  <SkipForward className="w-5 h-5 sm:w-7 sm:h-7 fill-white/80" />
                </button>
              )}
            </div>

            {/* Cartel informativo sutil mientras buferiza */}
            {isBuffering && (
              <span className="px-3 py-1 rounded-full bg-black/80 border border-white/10 text-[11px] font-semibold text-slate-200 tracking-wide shadow-lg">
                Cargando {quality === 'audio' ? 'Audio MP3' : quality}...
              </span>
            )}
          </div>

          {/* BARRA INFERIOR (SCRUBBER DE PROGRESO + CONTROLES + ÚNICO FULLSCREEN) */}
          <div className="p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 pointer-events-auto">
            {/* Scrubber de Búfer y Progreso Interactivo (Estilo YouTube) */}
            <div
              ref={progressBarRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full h-2.5 hover:h-4 bg-white/20 rounded-full cursor-pointer transition-all touch-none group select-none py-1 -my-1"
              title="Buscar en cualquier parte del video"
            >
              {/* Barra de Búfer Descargado */}
              <div
                className="absolute top-1 bottom-1 bg-white/40 rounded-full transition-all duration-300 pointer-events-none"
                style={{
                  left: `${bufferLeftPercent}%`,
                  width: `${bufferWidthPercent}%`,
                }}
              />

              {/* Barra de Reproducción Actual */}
              <div
                className="absolute top-1 bottom-1 left-0 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 rounded-full pointer-events-none"
                style={{ width: `${currentPercent}%` }}
              />

              {/* Aguja / Cabeza Lectora (Scrubber Handle con feedback táctil) */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow border-2 border-rose-600 transition-transform pointer-events-none ${
                  isScrubbing ? 'scale-125 ring-4 ring-rose-500/40' : 'scale-0 group-hover:scale-100'
                }`}
                style={{ left: `calc(${currentPercent}% - 7px)` }}
              />
            </div>

            {/* Fila Inferior de Controles */}
            <div className="flex items-center justify-between text-xs text-white">
              {/* Lado Izquierdo: Tiempos, Volumen */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-200">
                  {formatTime(displayCurrentTime)} / {formatTime(duration)}
                </span>

                {/* Volumen (Oculto en móvil) */}
                <div className="hidden sm:flex items-center gap-1.5" onWheel={handleWheel}>
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-300 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 accent-rose-500 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Lado Derecho: Velocidad, Timer, Descarga y ÚNICO FULLSCREEN */}
              <div className="flex items-center gap-2">
                {/* Velocidad de Reproducción */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowTimerMenu(false);
                      setShowQualityMenu(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-all"
                    title="Velocidad de reproducción"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRate(rate)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                            playbackRate === rate ? 'bg-rose-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Temporizador de apagado */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTimerMenu(!showTimerMenu);
                      setShowSpeedMenu(false);
                      setShowQualityMenu(false);
                    }}
                    className={`p-1.5 rounded-lg border text-xs transition-all ${
                      sleepTimerRemaining
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/10 hover:bg-white/20 border-transparent text-slate-300'
                    }`}
                    title="Temporizador de apagado"
                  >
                    <Timer className="w-4 h-4 text-amber-400" />
                  </button>

                  {showTimerMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-44 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn">
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Apagar música en:</div>
                      {[
                        { label: 'Desactivado', mins: null },
                        { label: '15 minutos', mins: 15 },
                        { label: '30 minutos', mins: 30 },
                        { label: '45 minutos', mins: 45 },
                        { label: '60 minutos', mins: 60 }
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setSleepTimerMinutes(opt.mins);
                            setShowTimerMenu(false);
                            if (opt.mins) toast.info('Temporizador activado', `Apagado en ${opt.mins} min`, 2500);
                            else toast.info('Temporizador desactivado', 'Reproducción continua', 2000);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                            sleepTimerMinutes === opt.mins ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {sleepTimerMinutes === opt.mins && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón Descarga */}
                <a
                  href={directDownloadUrl}
                  download
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-all"
                  title="Descargar archivo"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>Descargar</span>
                </a>

                {/* BOTÓN DE AJUSTE DE RELACIÓN DE ASPECTO ("Ajustar" vs "Llenar pantalla" para teléfonos 18:9 y 20:9) */}
                {!isAudioOnly && (
                  <button
                    onClick={toggleAspectRatio}
                    data-testid="aspect-ratio-btn"
                    className={`p-1.5 sm:p-2 rounded-xl border text-xs font-semibold transition-all active:scale-90 flex items-center gap-1.5 ${
                      aspectRatioMode === 'cover'
                        ? 'bg-rose-600/30 border-rose-500/60 text-rose-300'
                        : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-300'
                    }`}
                    title={aspectRatioMode === 'cover' ? 'Llenar pantalla' : 'Ajustar'}
                    aria-label={aspectRatioMode === 'cover' ? 'Llenar pantalla' : 'Ajustar'}
                  >
                    <Crop className="w-4 h-4 text-rose-400" />
                    <span className="text-[11px]">
                      {aspectRatioMode === 'cover' ? 'Llenar pantalla' : 'Ajustar'}
                    </span>
                  </button>
                )}

                {/* BOTÓN MODO TEATRO */}
                {!isFullscreen && (
                  <button
                    onClick={toggleTheaterMode}
                    data-testid="theater-mode-btn"
                    className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-90 ${
                      isTheaterMode
                        ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                        : 'bg-white/10 hover:bg-white/20 border-transparent text-white'
                    }`}
                    title={isTheaterMode ? 'Salir de modo teatro (T)' : 'Modo teatro (T)'}
                    aria-label={isTheaterMode ? 'Salir de modo teatro' : 'Modo teatro'}
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* BOTÓN ÚNICO DE PANTALLA COMPLETA */}
                <button
                  onClick={toggleFullscreen}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-90 ${
                    isFullscreen
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                      : 'bg-white/10 hover:bg-white/20 border-transparent text-white'
                  }`}
                  title={isFullscreen ? 'Salir de pantalla completa (F / Esc)' : 'Pantalla completa (F)'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL GUÍA DE ATAJOS DE TECLADO DESKTOP */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
};
