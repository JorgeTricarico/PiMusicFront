import React, { useState } from 'react';
import {
  Play,
  Download,
  HardDrive,
  Film,
  Music2,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';
import type { VideoInfoResponse } from '../api/client';
import { saveToServer } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useDownloads } from '../context/DownloadContext';
import { DownloadConfirmModal } from './DownloadConfirmModal';
import type { DownloadTarget } from './DownloadConfirmModal';
import { SaveServerConfirmModal } from './SaveServerConfirmModal';
import type { SaveServerTarget } from './SaveServerConfirmModal';
import { getDownloadEstimate } from '../utils/downloadMetrics';

import type { QualityId } from './StreamPlayerModal';

interface FormatCardProps {
  info: VideoInfoResponse;
  onPlayPreview: (
    videoId: string,
    title: string,
    type: 'audio' | 'video',
    quality?: QualityId,
    streamUrl?: string,
    duration?: number
  ) => void;
}

export const FormatCard: React.FC<FormatCardProps> = ({ info, onPlayPreview }) => {
  const [activeType, setActiveType] = useState<'video' | 'audio'>('video');
  const [selectedPreviewQuality, setSelectedPreviewQuality] = useState<QualityId>('480p');
  const [savingQuality, setSavingQuality] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Modales de confirmación
  const [downloadModalTarget, setDownloadModalTarget] = useState<DownloadTarget | null>(null);
  const [saveModalTarget, setSaveModalTarget] = useState<SaveServerTarget | null>(null);

  const { toast } = useToast();
  const { startDownload, activeDownloads } = useDownloads();

  // Flujo interactivo con feedback y progreso real para descargas al dispositivo
  const handleDownload = (quality: string, type: 'video' | 'audio', badge: string, approxSize: string = '') => {
    toast.info(
      'Iniciando transferencia...',
      `Descargando ${type === 'audio' ? 'Audio MP3' : 'Video MP4'}. Verás el porcentaje y velocidad en la tarjeta de progreso.`,
      3500
    );

    startDownload({
      url: info.url,
      videoId: info.id,
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      type,
      quality,
      badge,
      approxSize: approxSize || '25 MB'
    });
  };

  // Guardado en disco local de la Raspberry Pi con Toasts
  const handleSaveToServer = async (quality: string, type: 'video' | 'audio') => {
    try {
      setSavingQuality(quality);
      toast.info(
        'Guardando en Raspberry Pi...',
        `Iniciando descarga en segundo plano para ${type === 'audio' ? 'MP3' : 'MP4'}.`
      );

      await saveToServer(info.url, type, quality, info.title);
      setSavedSuccess(quality);

      toast.success(
        '¡Música guardada en Raspberry Pi!',
        'El archivo se almacenó exitosamente en ~/pi-music-cache.'
      );
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch (err: any) {
      toast.error('Error al guardar en el servidor', err.message || 'Verifica la conexión con la Raspberry Pi');
    } finally {
      setSavingQuality(null);
    }
  };

  // Abre el modal de confirmación antes de descargar al dispositivo
  const handlePromptDownload = (quality: string, type: 'video' | 'audio', badge: string, approxSize: string) => {
    setDownloadModalTarget({
      url: info.url,
      videoId: info.id,
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      type,
      quality,
      badge,
      approxSize
    });
  };

  // Abre el modal de confirmación antes de guardar en la Raspberry Pi
  const handlePromptSaveServer = (quality: string, type: 'video' | 'audio', badge: string, approxSize: string) => {
    setSaveModalTarget({
      url: info.url,
      videoId: info.id,
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      type,
      quality,
      badge,
      approxSize
    });
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm transition-all animate-fadeIn">
      {/* Top Banner with Thumbnail & Metadata */}
      <div className="flex flex-col md:flex-row gap-6 p-4 sm:p-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-800/30 to-transparent">
        {/* Thumbnail + Play Overlay */}
        <div className="relative group w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 shadow-lg border border-slate-800">
          <img
            src={info.thumbnail || (info.id ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : '')}
            alt={info.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
            }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <button
              onClick={() => {
                const isAudio = selectedPreviewQuality === 'audio';
                onPlayPreview(
                  info.id,
                  info.title,
                  isAudio ? 'audio' : 'video',
                  selectedPreviewQuality,
                  undefined,
                  info.duration_seconds
                );
              }}
              className="w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 hover:scale-110 active:scale-95 transition-all"
              title={`Reproducir en ${selectedPreviewQuality === 'audio' ? 'MP3' : selectedPreviewQuality}`}
            >
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </button>
          </div>
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-xs font-medium text-slate-200">
            {info.duration}
          </span>
          {/* Badge de calidad preseleccionada */}
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/85 text-[10px] font-bold text-rose-300 border border-rose-500/30">
            {selectedPreviewQuality === 'audio' ? 'MP3' : selectedPreviewQuality}
          </span>
        </div>

        {/* Video Info */}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                YouTube
              </span>
              <span className="text-xs text-slate-400 truncate font-medium">
                {info.uploader}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white line-clamp-2 leading-snug">
              {info.title}
            </h2>

            {/* Selector de Calidad Previa */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Elegir calidad:
              </span>
              {(['480p', '720p', '1080p', '360p', 'audio'] as QualityId[]).map((q) => {
                const isSelected = selectedPreviewQuality === q;
                const label = q === 'audio' ? 'MP3' : q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedPreviewQuality(q)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {label}
                    {q === '480p' && !isSelected && ' ★'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-800/60">
            <button
              onClick={() => {
                const isAudio = selectedPreviewQuality === 'audio';
                onPlayPreview(
                  info.id,
                  info.title,
                  isAudio ? 'audio' : 'video',
                  selectedPreviewQuality,
                  undefined,
                  info.duration_seconds
                );
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95"
            >
              {selectedPreviewQuality === 'audio' ? (
                <Music2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Film className="w-4 h-4" />
              )}
              <span>
                {selectedPreviewQuality === 'audio'
                  ? 'Escuchar Audio (MP3)'
                  : (selectedPreviewQuality === '480p'
                      ? 'Ver Video (480p Móvil)'
                      : `Ver Video (${selectedPreviewQuality})`)}
              </span>
            </button>
            <button
              onClick={() => onPlayPreview(info.id, info.title, 'audio', 'audio', undefined, info.duration_seconds)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            >
              <Music2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solo MP3</span>
            </button>
            <a
              href={info.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors ml-auto py-1"
            >
              <span>YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Format Selector Tabs */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto gap-1">
            <button
              onClick={() => setActiveType('video')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all min-h-[40px] ${
                activeType === 'video'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-4 h-4 flex-shrink-0" />
              <span>Video (MP4)</span>
            </button>
            <button
              onClick={() => setActiveType('audio')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all min-h-[40px] ${
                activeType === 'audio'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music2 className="w-4 h-4 flex-shrink-0" />
              <span>Audio (MP3)</span>
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[11px] sm:text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Descarga directa o almacena en la Raspberry Pi</span>
          </div>
        </div>

        {/* Formats Grid con Feedback de Descarga */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {activeType === 'video' ? (
            info.video_options.map((opt) => {
              const isDownloading = activeDownloads.some(
                (d) => d.videoId === info.id && d.quality === opt.quality && d.status === 'downloading'
              );
              const isSaving = savingQuality === opt.quality;
              const isSaved = savedSuccess === opt.quality;
              const estimate = getDownloadEstimate(opt.approx_size);

              return (
                <div
                  key={opt.quality}
                  className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-950/60 border transition-all group ${
                    opt.quality === '480p'
                      ? 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/10'
                      : 'border-slate-800/90 hover:border-rose-500/40'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base tracking-wide">
                        {opt.quality}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-rose-400 border border-slate-700">
                        {opt.badge}
                      </span>
                      {opt.quality === '480p' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Recomendada Móvil (Ahorro Datos)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {opt.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-1 flex-wrap">
                      <span>Tamaño: {opt.approx_size}</span>
                      <span>•</span>
                      <span className="text-slate-400 flex items-center gap-1 font-sans">
                        <Clock className="w-3 h-3 text-rose-400 flex-shrink-0" />
                        <span>{estimate.formattedTime}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Botón Ver Stream sin publicidad */}
                    <button
                      onClick={() => onPlayPreview(info.id, info.title, 'video', opt.quality as QualityId, undefined, info.duration_seconds)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 min-h-[42px]"
                      title={`Reproducir ${opt.quality} en streaming directo sin publicidad`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
                      <span className="hidden sm:inline">Ver Stream</span>
                    </button>
                    {/* Botón Descargar con modal de confirmación */}
                    <button
                      onClick={() => handlePromptDownload(opt.quality, 'video', opt.badge, opt.approx_size)}
                      disabled={isDownloading}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95 min-h-[42px] ${
                        isDownloading
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50 cursor-wait'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                      }`}
                      title="Descargar archivo en este dispositivo"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
                          <span>Preparando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Descargar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Guardar en Servidor con modal de confirmación */}
                    <button
                      onClick={() => handlePromptSaveServer(opt.quality, 'video', opt.badge, opt.approx_size)}
                      disabled={isSaving || isDownloading}
                      className={`p-2.5 rounded-xl border transition-all min-h-[42px] min-w-[42px] flex items-center justify-center ${
                        isSaved
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      }`}
                      title="Guardar en el disco de la Raspberry Pi"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      ) : isSaved ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <HardDrive className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            info.audio_options.map((opt) => {
              const isDownloading = activeDownloads.some(
                (d) => d.videoId === info.id && d.quality === opt.quality && d.status === 'downloading'
              );
              const isSaving = savingQuality === opt.quality;
              const isSaved = savedSuccess === opt.quality;
              const estimate = getDownloadEstimate(opt.approx_size);

              return (
                <div
                  key={opt.quality}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-emerald-500/40 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base tracking-wide uppercase">
                        {opt.ext}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-emerald-400 border border-slate-700">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {opt.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-1 flex-wrap">
                      <span>Tamaño: {opt.approx_size}</span>
                      <span>•</span>
                      <span className="text-slate-400 flex items-center gap-1 font-sans">
                        <Clock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{estimate.formattedTime}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Botón Escuchar Stream de Audio */}
                    <button
                      onClick={() => onPlayPreview(info.id, info.title, 'audio', 'audio', undefined, info.duration_seconds)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 min-h-[42px]"
                      title="Escuchar stream de audio directo"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                      <span className="hidden sm:inline">Escuchar</span>
                    </button>
                    {/* Botón Descargar Audio con modal de confirmación */}
                    <button
                      onClick={() => handlePromptDownload(opt.quality, 'audio', opt.badge, opt.approx_size)}
                      disabled={isDownloading}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95 min-h-[42px] ${
                        isDownloading
                          ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 cursor-wait'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                      }`}
                      title="Descargar audio MP3 en este dispositivo"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                          <span>Preparando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Descargar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Guardar en Servidor con modal de confirmación */}
                    <button
                      onClick={() => handlePromptSaveServer(opt.quality, 'audio', opt.badge, opt.approx_size)}
                      disabled={isSaving || isDownloading}
                      className={`p-2.5 rounded-xl border transition-all min-h-[42px] min-w-[42px] flex items-center justify-center ${
                        isSaved
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      }`}
                      title="Guardar en el disco de la Raspberry Pi"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : isSaved ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <HardDrive className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Descarga Directa al Dispositivo */}
      {downloadModalTarget && (
        <DownloadConfirmModal
          target={downloadModalTarget}
          onClose={() => setDownloadModalTarget(null)}
          onConfirm={() => {
            handleDownload(
              downloadModalTarget.quality,
              downloadModalTarget.type,
              downloadModalTarget.badge,
              downloadModalTarget.approxSize
            );
          }}
        />
      )}

      {/* Modal de Confirmación para Guardar en Raspberry Pi */}
      {saveModalTarget && (
        <SaveServerConfirmModal
          target={saveModalTarget}
          onClose={() => setSaveModalTarget(null)}
          onConfirm={async () => {
            await handleSaveToServer(
              saveModalTarget.quality,
              saveModalTarget.type
            );
          }}
        />
      )}
    </div>
  );
};
