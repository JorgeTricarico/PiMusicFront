import React, { useState, useEffect } from 'react';
import { Link2, Clipboard, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { VideoInfoResponse } from '../api/client';
import { getVideoInfo } from '../api/client';
import { FormatCard } from './FormatCard';
import { useToast } from '../context/ToastContext';
import type { QualityId } from './StreamPlayerModal';

interface LinkDownloaderProps {
  onPlayPreview: (
    videoId: string,
    title: string,
    type: 'audio' | 'video',
    quality?: QualityId,
    streamUrl?: string,
    duration?: number
  ) => void;
  initialUrl?: string;
}

export const LinkDownloader: React.FC<LinkDownloaderProps> = ({ onPlayPreview, initialUrl = '' }) => {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfoResponse | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (initialUrl && initialUrl.trim()) {
      setUrl(initialUrl.trim());
      triggerAnalyze(initialUrl.trim());
    }
  }, [initialUrl]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        toast.info('Enlace pegado', 'Iniciando análisis del video...');
        triggerAnalyze(text.trim());
      }
    } catch {
      toast.warning('Permiso requerido', 'Pega el enlace manualmente en la casilla de texto.');
    }
  };

  const triggerAnalyze = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    toast.info('Analizando enlace...', 'Consultando calidades y opciones de audio en YouTube...', 3500);
    try {
      const info = await getVideoInfo(targetUrl.trim());
      setVideoInfo(info);
      toast.success('¡Video analizado!', info.title);
    } catch (err: any) {
      const msg = err.message || 'No se pudo analizar el enlace. Verifica que sea un enlace válido de YouTube.';
      setError(msg);
      toast.error('Error al analizar', msg);
      setVideoInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAnalyze(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8 py-8 px-4">
      {/* Hero Title */}
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
          Descargador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">YouTube Local</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400">
          Pega el enlace directo de un video o música de YouTube para ver las resoluciones disponibles (1080p, 720p, 480p, 360p) y audio MP3 sin límites ni publicidad.
        </p>
      </div>

      {/* Input Box (SaveFrom Style Mobile-First) */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <div className="relative flex items-center flex-1 bg-slate-900 rounded-2xl border-2 border-slate-800 focus-within:border-rose-500 shadow-2xl transition-all p-1.5 sm:p-2">
            <div className="pl-3 pr-2 text-slate-500 flex-shrink-0">
              <Link2 className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega el enlace de YouTube (ej. https://youtu.be/...)"
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 outline-none px-2 py-2 min-w-0"
            />

            <div className="flex items-center gap-1 pr-1 flex-shrink-0">
              {/* Botón Pegar Portapapeles - Visible en móvil y desktop */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-rose-400 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
                title="Pegar enlace copiado de YouTube"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Pegar</span>
              </button>

              {/* Botón Analizar en Desktop */}
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <span>Analizar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botón Analizar en Móvil (ancho completo táctil y accesible al pulgar) */}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="sm:hidden w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-base shadow-xl shadow-rose-600/25 active:scale-98 transition-all min-h-[48px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analizando enlace...</span>
              </>
            ) : (
              <>
                <span>Analizar y Descargar</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="w-full p-8 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
          </div>
          <p className="text-sm text-slate-400">Extrayendo formatos de video y audio desde YouTube...</p>
        </div>
      )}

      {/* Video Result Card */}
      {videoInfo && !loading && (
        <FormatCard info={videoInfo} onPlayPreview={onPlayPreview} />
      )}
    </div>
  );
};
