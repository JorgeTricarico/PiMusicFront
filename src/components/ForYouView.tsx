import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Download,
  HardDrive,
  RefreshCw,
  Search,
  User,
  ShieldCheck,
  ChevronRight,
  ListPlus
} from 'lucide-react';
import type {
  RecommendationFeedResponse,
  RecommendationItem,
  RecommendationHero
} from '../api/client';
import { getRecommendationsFeed, recordHistory } from '../api/client';
import type { DownloadTarget } from './DownloadConfirmModal';
import type { SaveServerTarget } from './SaveServerConfirmModal';
import type { QualityId } from './StreamPlayerModal';
import { useToast } from '../context/ToastContext';
import { useQueue } from '../context/QueueContext';
import { parseDuration } from '../utils/watchHistory';

interface ForYouViewProps {
  onPlayMedia: (track: {
    id: string;
    title: string;
    type: 'audio' | 'video';
    quality?: QualityId;
    duration?: number;
  }) => void;
  onOpenDownloadConfirm: (target: DownloadTarget) => void;
  onOpenSaveConfirm: (target: SaveServerTarget) => void;
  onOpenAccountModal: () => void;
  onNavigateToSearch: () => void;
}

export const ForYouView: React.FC<ForYouViewProps> = ({
  onPlayMedia,
  onOpenDownloadConfirm,
  onOpenSaveConfirm,
  onOpenAccountModal,
  onNavigateToSearch
}) => {
  const [feed, setFeed] = useState<RecommendationFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Saludo según la hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const fetchFeed = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getRecommendationsFeed();
      setFeed(data);
    } catch (err) {
      console.warn('Error cargando recomendaciones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handlePlayItem = (item: RecommendationItem | RecommendationHero) => {
    const durSecs = parseDuration(item.duration);

    // Registrar en el historial para afinar el algoritmo
    recordHistory({
      videoId: item.videoId,
      title: item.title,
      artist: item.uploader,
      thumbnail: item.thumbnail,
      duration: item.duration || (durSecs > 0 ? durSecs : undefined)
    });

    onPlayMedia({
      id: item.videoId,
      title: item.title,
      type: 'video', // 480p de video por defecto
      quality: '480p',
      duration: durSecs > 0 ? durSecs : undefined
    });
  };

  const handleDownloadClick = (item: RecommendationItem | RecommendationHero, e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDownloadConfirm({
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      videoId: item.videoId,
      title: item.title,
      uploader: item.uploader,
      thumbnail: item.thumbnail,
      duration: item.duration,
      type: 'video',
      quality: '480p',
      badge: '480p',
      approxSize: '~25 MB'
    });
  };

  const handleSavePiClick = (item: RecommendationItem | RecommendationHero, e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSaveConfirm({
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      videoId: item.videoId,
      title: item.title,
      uploader: item.uploader,
      thumbnail: item.thumbnail,
      duration: item.duration,
      type: 'video',
      quality: '480p',
      badge: '480p',
      approxSize: '~25 MB'
    });
  };

  const { toast } = useToast();
  const { addToQueue } = useQueue();

  const handleAddToQueue = (item: RecommendationItem | RecommendationHero, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue({
      videoId: item.videoId,
      title: item.title,
      initialQuality: '480p',
      initialType: 'video',
    });
    toast.success('Añadido a la cola', `"${item.title}" está en la lista de reproducción.`);
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-16 animate-fadeIn">
      {/* ======================================================== */}
      {/* CABECERA: Saludo + Perfil / Vincular + Botón Refrescar   */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Descubre tu música y videos recomendados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Refrescar Feed */}
          <button
            onClick={() => fetchFeed(true)}
            disabled={refreshing || loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors active:scale-95 disabled:opacity-50"
            title="Actualizar recomendaciones"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-500' : ''}`} />
          </button>

          {/* Badge o Avatar de Cuenta */}
          <button
            onClick={onOpenAccountModal}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              feed?.account.linked
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            {feed?.account.linked ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline font-medium">YouTube Vinculado</span>
                <User className="w-4 h-4 text-emerald-400" />
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Modo Privado</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* HERO SECTION: Tarjeta Destacada ("Mix del Día")          */}
      {/* ======================================================== */}
      {feed?.hero && !loading && (
        <div
          onClick={() => handlePlayItem(feed.hero!)}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 shadow-2xl p-4 sm:p-6 cursor-pointer group hover:border-rose-500/40 transition-all active:scale-[0.99]"
        >
          {/* Fondo difuminado decorativo con la miniatura */}
          <div
            className="absolute -inset-10 opacity-20 filter blur-3xl pointer-events-none"
            style={{
              backgroundImage: `url(${feed.hero.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            {/* Miniatura con botón de Play */}
            <div className="relative w-full sm:w-56 md:w-64 aspect-video rounded-2xl overflow-hidden bg-slate-950 flex-shrink-0 shadow-lg border border-slate-800">
              <img
                src={feed.hero.thumbnail}
                alt={feed.hero.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/80 text-[11px] font-mono text-white">
                {feed.hero.duration}
              </span>
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 fill-white translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Información del Hero */}
            <div className="flex-1 flex flex-col justify-between w-full">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {feed.hero.reason}
                </span>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white line-clamp-2 leading-snug group-hover:text-rose-300 transition-colors">
                  {feed.hero.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {feed.hero.uploader}
                </p>
              </div>

              {/* Botones de Acción Rápida */}
              <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayItem(feed.hero!);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Escuchar Ahora</span>
                </button>

                <button
                  onClick={(e) => handleAddToQueue(feed.hero!, e)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
                  title="Añadir a la cola"
                >
                  <ListPlus className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold">+ Cola</span>
                </button>

                <button
                  onClick={(e) => handleDownloadClick(feed.hero!, e)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
                  title="Descargar al celular"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => handleSavePiClick(feed.hero!, e)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-all active:scale-95"
                  title="Guardar en Raspberry Pi"
                >
                  <HardDrive className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SKELETON LOADER AL CARGAR                                */}
      {/* ======================================================== */}
      {loading && (
        <div className="flex flex-col gap-6">
          <div className="w-full h-48 rounded-3xl bg-slate-900/60 animate-pulse border border-slate-800" />
          <div className="flex flex-col gap-3">
            <div className="w-48 h-6 rounded-lg bg-slate-900 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-video rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CARRUSELES HORIZONTALES: Mixes, Tendencias, Recomendados */}
      {/* ======================================================== */}
      {!loading && feed?.sections && (
        <div className="flex flex-col gap-7 sm:gap-9">
          {feed.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-3.5">
              {/* Título de la Sección */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {section.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {section.subtitle}
                  </p>
                </div>
              </div>

              {/* Carrusel Deslizable Horizontal */}
              <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                {section.items.map((item) => (
                  <div
                    key={item.videoId}
                    onClick={() => handlePlayItem(item)}
                    className="flex-shrink-0 w-44 sm:w-52 md:w-56 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-3 flex flex-col justify-between cursor-pointer group hover:border-rose-500/40 hover:bg-slate-900 transition-all snap-start active:scale-[0.98]"
                  >
                    {/* Miniatura */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-[10px] font-mono text-slate-200">
                        {item.duration}
                      </span>
                      {/* Botón flotante Play */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-white translate-x-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mt-2.5 min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-rose-300 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-1">
                          {item.uploader}
                        </p>
                      </div>

                      {/* Botones Rápidos en la Tarjeta */}
                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={(e) => handleAddToQueue(item, e)}
                          className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                          title="Añadir a la cola"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[10px] font-bold text-slate-300">+ Cola</span>
                        </button>
                        <button
                          onClick={(e) => handleDownloadClick(item, e)}
                          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Descargar al dispositivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleSavePiClick(item, e)}
                          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Guardar en Raspberry Pi"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* BANNER DE INVITACIÓN AL BUSCADOR                         */}
      {/* ======================================================== */}
      {!loading && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                ¿Buscas una canción o artista específico?
              </h4>
              <p className="text-xs text-slate-400">
                Usa el buscador integrado para explorar millones de canciones en YouTube
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToSearch}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Ir al Buscador</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
