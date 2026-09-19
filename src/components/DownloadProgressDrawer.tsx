import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Wifi,
  Film,
  Music2
} from 'lucide-react';
import { useDownloads } from '../context/DownloadContext';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export const DownloadProgressDrawer: React.FC = () => {
  const { activeDownloads, cancelDownload, clearCompleted } = useDownloads();

  if (activeDownloads.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Descargas en progreso"
      className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto animate-slideUp"
    >
      {activeDownloads.map((dl) => {
        const isAudio = dl.type === 'audio';
        const isDone = dl.status === 'completed';
        const isError = dl.status === 'error';
        const isCancelled = dl.status === 'cancelled';

        return (
          <div
            key={dl.id}
            className={`relative rounded-2xl p-3.5 sm:p-4 shadow-2xl border backdrop-blur-xl transition-all duration-300 ${
              isDone
                ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/10'
                : isError
                ? 'bg-slate-900/95 border-rose-500/50 shadow-rose-500/10'
                : 'bg-slate-900/95 border-slate-700/80 shadow-rose-500/10'
            }`}
          >
            {/* Header del item */}
            <div className="flex items-center gap-3">
              {/* Thumbnail o icono */}
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                {dl.thumbnail ? (
                  <img src={dl.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    {isAudio ? <Music2 className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 text-[8px] font-bold px-1 rounded-tl ${
                    isAudio ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {dl.badge || dl.quality}
                </span>
              </div>

              {/* Título y Estado */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-white truncate" title={dl.title}>
                  {dl.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  {isDone ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ¡Descargado al dispositivo!
                    </span>
                  ) : isError ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {dl.error || 'Error de transferencia'}
                    </span>
                  ) : isCancelled ? (
                    <span className="text-slate-400">Descarga cancelada</span>
                  ) : (
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{dl.percent}%</span>
                      <span>•</span>
                      <span>{formatBytes(dl.receivedBytes)} de {formatBytes(dl.totalBytes)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Cerrar o Cancelar */}
              <button
                onClick={() => (isDone || isError || isCancelled ? clearCompleted(dl.id) : cancelDownload(dl.id))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors flex-shrink-0"
                title={isDone ? 'Cerrar' : 'Cancelar descarga'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Barra de Progreso Gráfica y Métricas en Vivo */}
            {!isDone && !isError && !isCancelled && (
              <div className="mt-3">
                {/* Barra */}
                <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 transition-all duration-300 relative rounded-full"
                    style={{ width: `${Math.max(3, dl.percent)}%` }}
                  >
                    <span className="absolute right-0 top-0 bottom-0 w-2 bg-white/70 animate-pulse rounded-full" />
                  </div>
                </div>

                {/* Métricas: Velocidad y Tiempo Restante ETA */}
                <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>{dl.speedMBps.toFixed(1)} MB/s</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>
                      {dl.etaSeconds > 0
                        ? `Quedan ~${dl.etaSeconds} seg`
                        : 'Calculando tiempo...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
