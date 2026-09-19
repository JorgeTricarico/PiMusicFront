import React, { useEffect, useState, useRef } from 'react';
import { X, Loader2, Music2, Film, Download, Maximize, Minimize, Smartphone } from 'lucide-react';
import type { StreamPreviewResponse } from '../api/client';
import { getStreamPreview, getDownloadUrl } from '../api/client';

interface MediaPlayerModalProps {
  videoId: string;
  title: string;
  initialType?: 'audio' | 'video';
  onClose: () => void;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({
  videoId,
  title,
  initialType = 'audio',
  onClose,
}) => {
  const [type, setType] = useState<'audio' | 'video'>(initialType);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<StreamPreviewResponse | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDevicePortrait, setIsDevicePortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth && window.innerWidth < 850;
    }
    return false;
  });
  const [forceLandscape, setForceLandscape] = useState<boolean>(true);

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleFullscreen = async () => {
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIOS && (videoRef.current as any)?.webkitEnterFullscreen && type === 'video') {
      try {
        (videoRef.current as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      } catch (e) {
        console.warn('iOS webkitEnterFullscreen fallo:', e);
      }
    }

    const doc = document as any;
    const isCurrentlyFs =
      !!doc.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.mozFullScreenElement ||
      isFullscreen;

    if (!isCurrentlyFs) {
      setForceLandscape(true);
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);

        if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch {
            try {
              await (screen.orientation as any).lock('landscape-primary');
            } catch {}
          }
        }
      } catch {
        setIsFullscreen(true);
      }
    } else {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).unlock) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }
      } catch {}
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStream = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStreamPreview(videoId, type);
        if (isMounted) {
          setStreamData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error al obtener la transmisión de audio/video');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadStream();
    return () => {
      isMounted = false;
    };
  }, [videoId, type]);

  const directDownloadUrl = getDownloadUrl(
    `https://www.youtube.com/watch?v=${videoId}`,
    type,
    type === 'audio' ? 'mp3_320' : '720p'
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0 bg-black overflow-hidden' : 'p-4 bg-black/80 backdrop-blur-md'} animate-fadeIn`}>
      <div
        ref={containerRef}
        className={`bg-slate-900 flex flex-col transition-all ${
          isFullscreen
            ? isDevicePortrait && forceLandscape
              ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vh] h-[100vw] rotate-90 origin-center z-[9999] rounded-none border-none overflow-hidden'
              : 'w-screen h-screen max-w-none max-h-none rounded-none border-none z-50 overflow-hidden'
            : 'relative w-full max-w-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Reproductor de Vista Previa
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Audio / Video */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setType('audio')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  type === 'audio' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>Audio</span>
              </button>
              <button
                onClick={() => setType('video')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  type === 'video' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-colors ${
                isFullscreen
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
              }`}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {isFullscreen && isDevicePortrait && (
              <button
                onClick={() => setForceLandscape(!forceLandscape)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  forceLandscape
                    ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
                title={forceLandscape ? 'Rotación horizontal activa (Toca para vertical)' : 'Pantalla vertical (Toca para horizontal)'}
              >
                <Smartphone className={`w-4 h-4 ${forceLandscape ? 'rotate-90 text-amber-400' : ''} transition-transform`} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[260px] bg-slate-950/80">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-xs text-slate-400">Cargando stream de YouTube...</p>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-rose-400 text-sm">
              <p>{error}</p>
            </div>
          ) : streamData ? (
            <div className="w-full flex flex-col items-center gap-4">
              {type === 'video' ? (
                <video
                  ref={videoRef}
                  src={streamData.stream_url}
                  controls
                  autoPlay
                  className={`w-full rounded-xl bg-black shadow-lg ${
                    isFullscreen ? 'max-h-none h-full' : 'max-h-[360px]'
                  }`}
                  onDoubleClick={toggleFullscreen}
                />
              ) : (
                <div className="w-full flex flex-col items-center gap-6 py-4">
                  {/* Vinyl / Cover Art Graphic */}
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-gradient-to-tr from-rose-950 via-slate-900 to-indigo-950 flex items-center justify-center">
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={title}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                      <Music2 className="w-10 h-10 text-rose-400 animate-pulse" />
                    </div>
                  </div>

                  {/* HTML5 Native Audio element */}
                  <audio
                    ref={audioRef}
                    src={streamData.stream_url}
                    controls
                    autoPlay
                    className="w-full max-w-md accent-rose-500"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer info & Direct Download */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="min-w-0 text-center sm:text-left">
            <h4 className="font-semibold text-sm text-white truncate max-w-md">
              {title}
            </h4>
            <span className="text-xs text-slate-500 font-mono">ID: {videoId}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={directDownloadUrl}
              download
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar {type === 'audio' ? 'MP3' : 'MP4'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
