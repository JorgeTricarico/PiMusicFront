import React, { useState } from 'react';
import {
  X,
  Download,
  Wifi,
  Clock,
  HardDrive,
  CheckCircle2,
  Film,
  Music2,
  ShieldCheck,
  Zap,
  Loader2
} from 'lucide-react';
import { getDownloadEstimate } from '../utils/downloadMetrics';

export interface DownloadTarget {
  url: string;
  videoId: string;
  title: string;
  uploader: string;
  thumbnail: string;
  duration?: string;
  type: 'video' | 'audio';
  quality: string;
  badge: string;
  approxSize: string;
}

interface DownloadConfirmModalProps {
  target: DownloadTarget;
  onClose: () => void;
  onConfirm: () => void;
}

export const DownloadConfirmModal: React.FC<DownloadConfirmModalProps> = ({
  target,
  onClose,
  onConfirm
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Cálculo de métricas y estimación de descarga
  const estimate = getDownloadEstimate(target.approxSize);

  const isAudio = target.type === 'audio';
  const formatLabel = isAudio
    ? `Audio ${target.quality.toUpperCase().replace('_', ' ')} • ${target.badge}`
    : `Video MP4 • ${target.quality} (${target.badge})`;

  const handleStartDownload = () => {
    setIsProcessing(true);
    // Ejecutar la confirmación
    onConfirm();
    // Cerrar después de una breve animación de feedback
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, 450);
  };

  const thumbUrl =
    target.thumbnail ||
    (target.videoId ? `https://i.ytimg.com/vi/${target.videoId}/hqdefault.jpg` : '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-download-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente decorativo */}
        <div className="relative p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
                isAudio
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="modal-download-title" className="font-bold text-sm sm:text-base text-white">
                Confirmar Descarga al Dispositivo
              </h3>
              <p className="text-[11px] text-slate-400">Verifica los detalles antes de iniciar la transferencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Cancelar y cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Tarjeta de Resumen del Medio (Miniatura + Título) */}
          <div className="flex gap-3.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 items-center">
            <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
              <img
                src={thumbUrl}
                alt={target.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${target.videoId}/hqdefault.jpg`;
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-[10px] font-mono text-slate-200">
                {target.duration || '0:00'}
              </span>
              <div className="absolute top-1 left-1 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                {isAudio ? <Music2 className="w-3 h-3 text-emerald-400" /> : <Film className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block mb-0.5">
                {target.uploader || 'YouTube'}
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug">
                {target.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isAudio
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {formatLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Métricas y Estimaciones */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tamaño Estimado */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Tamaño Estimado</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-white font-mono">
                {target.approxSize || estimate.formattedSize}
              </span>
              <span className="text-[10px] text-slate-500">Espacio en tu dispositivo</span>
            </div>

            {/* Tiempo Estimado de Descarga */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Tiempo Estimado</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-rose-300">
                {estimate.formattedTime}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                <Wifi className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{estimate.speedDescription}</span>
              </span>
            </div>
          </div>

          {/* Tarjeta de Ventajas de Red Local */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800/90 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Descarga Directa & Privada</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Sin ventanas emergentes ni redirecciones invasivas.</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span>Procesamiento acelerado por hardware en tu Raspberry Pi.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Compatible con la galería y reproductor de tu teléfono o PC.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer con Botones de Acción Táctiles (Mobile First) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleStartDownload}
            disabled={isProcessing}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg active:scale-95 transition-all min-h-[42px] ${
              isAudio
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando descarga...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Iniciar Descarga</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
