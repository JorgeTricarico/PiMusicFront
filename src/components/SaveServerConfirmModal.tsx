import React, { useEffect, useState } from 'react';
import {
  X,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Server,
  Film,
  Music2,
  Loader2,
  FolderDown,
  Info
} from 'lucide-react';
import { getTelemetry } from '../api/client';
import type { TelemetryResponse } from '../api/client';
import { parseSizeToMb } from '../utils/downloadMetrics';

export interface SaveServerTarget {
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

interface SaveServerConfirmModalProps {
  target: SaveServerTarget;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const SaveServerConfirmModal: React.FC<SaveServerConfirmModalProps> = ({
  target,
  onClose,
  onConfirm
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isAudio = target.type === 'audio';
  const formatLabel = isAudio
    ? `Audio ${target.quality.toUpperCase().replace('_', ' ')} • ${target.badge}`
    : `Video MP4 • ${target.quality} (${target.badge})`;

  const sizeMb = parseSizeToMb(target.approxSize);

  useEffect(() => {
    let isMounted = true;
    const fetchStorageInfo = async () => {
      try {
        const data = await getTelemetry();
        if (isMounted) {
          setTelemetry(data);
        }
      } catch (err) {
        console.warn('No se pudo obtener telemetría de disco:', err);
      } finally {
        if (isMounted) {
          setLoadingTelemetry(false);
        }
      }
    };

    fetchStorageInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Análisis de almacenamiento de la Raspberry Pi
  const diskFreeGb = telemetry?.disk_free_gb ?? 32.5;
  const diskTotalGb = telemetry?.disk_total_gb ?? 64.0;
  const diskPercentNumber = parseFloat(telemetry?.disk?.replace('%', '') || '45');
  const isDiskLow = diskFreeGb < 2.0 || diskPercentNumber > 88;
  const serverHost = telemetry?.model || 'Raspberry Pi 5';

  const thumbUrl =
    target.thumbnail ||
    (target.videoId ? `https://i.ytimg.com/vi/${target.videoId}/hqdefault.jpg` : '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-save-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg">
              <HardDrive className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="modal-save-title" className="font-bold text-sm sm:text-base text-white">
                Guardar en Raspberry Pi
              </h3>
              <p className="text-[11px] text-slate-400">
                Almacena medios permanentemente en tu servidor local
              </p>
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

        {/* Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Media Info */}
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
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-0.5">
                {target.uploader || 'YouTube'}
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug">
                {target.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {formatLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Destino y Ruta en el Servidor */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Server className="w-4 h-4 text-amber-400" />
                <span>Servidor de Destino</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {serverHost}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
              <FolderDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate">~/pi-music-cache</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Ubicación configurada en el servidor para tu biblioteca multimedia.
            </span>
          </div>

          {/* Comparativa de Espacio (Requerido vs Libre en Raspberry Pi) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                Estado del Almacenamiento
              </span>
              {loadingTelemetry ? (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando disco...
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-300">
                  {telemetry?.disk || `${diskPercentNumber}%`} usado
                </span>
              )}
            </div>

            {/* Barra Visual de Disco */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 ${
                  isDiskLow
                    ? 'bg-rose-500'
                    : diskPercentNumber > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(diskPercentNumber, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850">
              <div>
                <span className="text-[10px] text-slate-500 block">Espacio Requerido</span>
                <span className="text-sm font-bold text-white font-mono">
                  ~{sizeMb > 0 ? `${sizeMb} MB` : target.approxSize}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Espacio Disponible</span>
                <span className={`text-sm font-bold font-mono ${isDiskLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {diskFreeGb.toFixed(1)} GB libres de {diskTotalGb.toFixed(1)} GB
                </span>
              </div>
            </div>

            {/* Advertencia si el espacio es bajo */}
            {isDiskLow && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  El espacio libre en la Raspberry Pi es menor a 2 GB. Considera eliminar archivos antiguos desde la pestaña Biblioteca.
                </span>
              </div>
            )}
          </div>

          {/* Información Adicional */}
          <div className="flex items-start gap-2 text-[11px] text-slate-400 px-1">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p>
              Una vez guardado, podrás reproducirlo directamente en tu red local o descargarlo en cualquier momento a tu celular sin consumir internet.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/30 active:scale-95 transition-all min-h-[42px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando en Pi...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar Guardado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
