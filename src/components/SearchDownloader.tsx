import React, { useState, useRef, useEffect } from 'react';
import { Search, Play, Download, Loader2, AlertCircle, Film, Music2, SlidersHorizontal, History, X, ListPlus } from 'lucide-react';
import type { SearchResultItem, VideoInfoResponse } from '../api/client';
import { searchYouTube, getVideoInfo } from '../api/client';
import { FormatCard } from './FormatCard';
import { useToast } from '../context/ToastContext';
import { useQueue } from '../context/QueueContext';

import type { QualityId } from './StreamPlayerModal';

export const SEARCH_HISTORY_KEY = 'pimusic_search_history';
export const MAX_HISTORY_ITEMS = 8;
export const THEME_CHIPS = [
  '🔥 Tendencias',
  '🎸 Acústico',
  '🎵 En Vivo',
  '🎧 Lo-Fi',
  '📻 Cumbia & Cuarteto',
  '🎙️ Podcasts',
  '⚡ Remix',
];

interface SearchDownloaderProps {
  onPlayPreview: (
    videoId: string,
    title: string,
    type: 'audio' | 'video',
    quality?: QualityId,
    streamUrl?: string,
    duration?: number
  ) => void;
}

export const SearchDownloader: React.FC<SearchDownloaderProps> = ({ onPlayPreview }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfoResponse | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Historial de búsquedas recientes persistente en localStorage
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_HISTORY_ITEMS);
        }
      }
    } catch {
      // Ignorar fallos de parsing o storage
    }
    return [];
  });
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atajo global desktop: presionar '/' enfoca inmediatamente el input de búsqueda
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
            (activeEl as HTMLElement).isContentEditable);
        if (!isEditing) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignorar fallos de storage
      }
      return updated;
    });
  };

  const removeFromHistory = (termToRemove: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignorar fallos de storage
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignorar fallos de storage
    }
  };

  // Calidad preseleccionada: por defecto 480p (video móvil recomendado)
  const [preferredQuality, setPreferredQuality] = useState<QualityId>('480p');
  const [selectedQualities, setSelectedQualities] = useState<Record<string, QualityId>>({});

  const getItemQuality = (id: string): QualityId => selectedQualities[id] || preferredQuality;
  const setItemQuality = (id: string, q: QualityId) => {
    setSelectedQualities((prev) => ({ ...prev, [id]: q }));
  };

  const { toast } = useToast();
  const { addToQueue } = useQueue();

  // Estado para feedback visual inmediato al pulsar Reproducir
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlayItem = (item: SearchResultItem, overrideQuality?: QualityId) => {
    setPlayingId(item.id);
    const q = overrideQuality || getItemQuality(item.id);
    const type = q === 'audio' ? 'audio' : 'video';
    toast.info('Iniciando reproductor...', `"${item.title}" (${q === 'audio' ? 'MP3' : q})`, 1800);
    onPlayPreview(item.id, item.title, type, q, undefined, item.duration_seconds);
  };

  const handleAddToQueue = (item: SearchResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const q = getItemQuality(item.id);
    const type = q === 'audio' ? 'audio' : 'video';
    addToQueue({
      videoId: item.id,
      title: item.title,
      duration: item.duration_seconds,
      initialQuality: q,
      initialType: type,
    });
    toast.success('Añadido a la cola', `"${item.title}" está en la lista de reproducción.`);
  };

  const performSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setIsFocused(false);
    saveToHistory(trimmed);

    setLoading(true);
    setError(null);
    setSelectedVideo(null);
    toast.info('Buscando en YouTube...', `Término: "${trimmed}"`, 2000);

    try {
      const items = await searchYouTube(trimmed, 16);
      setResults(items);
      if (items.length === 0) {
        setError('No se encontraron resultados para la búsqueda.');
        toast.warning('Sin resultados', 'Prueba con otro nombre de canción o artista.');
      } else {
        toast.success('Resultados encontrados', `Se cargaron ${items.length} canciones.`);
      }
    } catch (err: any) {
      const msg = err.message || 'Error al realizar la búsqueda';
      setError(msg);
      toast.error('Error de búsqueda', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performSearch(query);
  };

  const handleSelectForDownload = async (item: SearchResultItem) => {
    setAnalyzingId(item.id);
    toast.info('Extrayendo formatos...', item.title, 3000);
    try {
      const info = await getVideoInfo(item.url || item.id);
      setSelectedVideo(info);
      toast.success('Formatos listos', 'Selecciona la resolución o calidad de audio.');
    } catch (err: any) {
      toast.error('Error analizando video', err.message || 'No se pudieron obtener los formatos.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const getThumbnailUrl = (item: SearchResultItem) => {
    if (item.thumbnail && item.thumbnail.startsWith('http')) {
      return item.thumbnail;
    }
    return item.id ? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` : '';
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 py-6 sm:py-8 px-3 sm:px-4 pb-20 sm:pb-8">
      {/* Search Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Buscador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">Música y Videos</span>
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
          Encuentra cualquier canción, artista o video de YouTube y descárgalo directamente en tu celular o PC.
        </p>
      </div>

      {/* Search Bar Mobile-First & Historial Flotante */}
      <div ref={searchContainerRef} className="relative w-full max-w-3xl mx-auto z-30">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative flex items-center w-full bg-slate-900 rounded-2xl border-2 border-slate-800 focus-within:border-rose-500 shadow-2xl transition-all p-1.5 sm:p-2">
            <div className="pl-3 pr-2 text-slate-500 flex-shrink-0">
              <Search className="w-5 h-5" />
            </div>

            <input
              ref={searchInputRef}
              id="search-input"
              data-testid="search-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onClick={() => setIsFocused(true)}
              placeholder="Escribe la canción o artista... (Presiona / para buscar)"
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 outline-none px-2 py-2 min-w-0"
            />

            {/* Badge visual discreto de atajo de teclado en Desktop */}
            <kbd
              onClick={() => searchInputRef.current?.focus()}
              title="Atajo: Presiona / en cualquier momento para enfocar el buscador"
              className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-400 bg-slate-800/80 border border-slate-700/80 rounded-lg mr-2 select-none cursor-pointer hover:border-slate-600 hover:text-slate-200 transition-colors"
            >
              /
            </kbd>

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsFocused(true);
                }}
                aria-label="Limpiar búsqueda"
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg mr-1 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex-shrink-0 min-h-[42px] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Buscando...</span>
                </>
              ) : (
                <span>Buscar</span>
              )}
            </button>
          </div>
        </form>

        {/* Panel Flotante de Búsquedas Recientes */}
        {isFocused && searchHistory.length > 0 && (
          <div
            role="region"
            aria-label="Búsquedas recientes"
            className="absolute left-0 right-0 top-full mt-2 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-3 animate-fadeIn"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-800/80 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <History className="w-3.5 h-3.5 text-rose-500" />
                Búsquedas recientes
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearHistory();
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors text-[11px] font-medium cursor-pointer"
              >
                Borrar todo el historial
              </button>
            </div>
            <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {searchHistory.map((item) => (
                <li
                  key={item}
                  className="group flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
                  onClick={() => performSearch(item)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 text-slate-300 group-hover:text-white text-xs sm:text-sm">
                    <History className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                  <button
                    type="button"
                    title={`Eliminar ${item} del historial`}
                    aria-label={`Eliminar ${item} del historial`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chips Temáticos Táctiles Horizontales con scroll suave */}
        <div className="w-full mt-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-2 pb-1 min-w-max">
            {THEME_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => performSearch(chip)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-rose-500/50 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal / Bottom Sheet para seleccionar formatos del video buscado */}
      {selectedVideo && (
        <div
          onClick={() => setSelectedVideo(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 pb-8 sm:pb-6 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Opciones de Descarga
              </span>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                Cerrar ✕
              </button>
            </div>
            <FormatCard
              info={selectedVideo}
              onPlayPreview={(videoId, title, type, quality) => {
                setSelectedVideo(null);
                onPlayPreview(videoId, title, type, quality);
              }}
            />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List / Grid */}
      {results.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pb-1 border-b border-slate-800/80">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Resultados ({results.length})
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Elige la resolución o MP3 antes de reproducir, o descarga directo.
              </p>
            </div>

            {/* Selector Global Rápido de Calidad Preferida */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                <span>Calidad:</span>
              </span>
              {[
                { id: '480p' as QualityId, label: '480p (Recomendada)' },
                { id: '720p' as QualityId, label: '720p' },
                { id: '1080p' as QualityId, label: '1080p' },
                { id: '360p' as QualityId, label: '360p' },
                { id: 'audio' as QualityId, label: 'MP3' },
              ].map((opt) => {
                const isSelected = preferredQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setPreferredQuality(opt.id);
                      setSelectedQualities({});
                      toast.info('Preselección actualizada', `Reproducción por defecto: ${opt.label}`, 2000);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* VISTA MÓVIL (Lista Horizontal optimizada para teléfonos < sm) */}
          <div className="flex flex-col gap-3 sm:hidden">
            {results.map((item) => {
              const isAnalyzing = analyzingId === item.id;
              const thumbUrl = getThumbnailUrl(item);
              const currentQ = getItemQuality(item.id);
              const isAudio = currentQ === 'audio';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 p-3 bg-slate-900/95 border rounded-2xl shadow-sm transition-all ${
                    playingId === item.id
                      ? 'border-rose-500 ring-1 ring-rose-500/50 shadow-rose-950/40'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Miniatura compacta 16:9 con duración y tap para play con calidad elegida */}
                    <div
                      onClick={() => handlePlayItem(item)}
                      className="relative w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-slate-950 cursor-pointer group"
                      title={`Reproducir en ${isAudio ? 'MP3' : currentQ}`}
                    >
                      <img
                        src={thumbUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
                        }}
                        className="w-full h-full object-cover group-active:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-rose-600/95 text-white flex items-center justify-center shadow">
                          <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                        </div>
                      </div>
                      {item.duration && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 text-[9px] font-mono text-slate-200">
                          {item.duration}
                        </span>
                      )}
                    </div>

                    {/* Metadatos (Título y Canal) */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs text-white line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.uploader}
                      </p>
                    </div>

                    {/* Botón táctil de Descarga */}
                    <button
                      onClick={() => handleSelectForDownload(item)}
                      disabled={isAnalyzing}
                      className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-rose-600/15 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 active:scale-95 transition-all flex-shrink-0"
                      title="Ver formatos y descargar"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="text-[9px] font-bold mt-0.5">Bajar</span>
                    </button>
                  </div>

                  {/* Selector táctil de Calidad antes de dar Play (Móvil) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-0.5">
                        Calidad:
                      </span>
                      {(['480p', '720p', '360p', 'audio'] as QualityId[]).map((q) => {
                        const isSelected = currentQ === q;
                        const label = q === 'audio' ? 'MP3' : q;
                        return (
                          <button
                            key={q}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemQuality(item.id, q);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                              isSelected
                                ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                                : 'bg-slate-800/90 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {label}
                            {q === '480p' && !isSelected && ' ★'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botón táctil + Cola y Play Directo */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => handleAddToQueue(item, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 shadow-sm active:scale-95 transition-all"
                        title="Añadir a la cola"
                      >
                        <ListPlus className="w-3.5 h-3.5 text-rose-400" />
                        <span>+ Cola</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayItem(item)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow active:scale-95 transition-all"
                      >
                        {isAudio ? (
                          <Music2 className="w-3.5 h-3.5" />
                        ) : (
                          <Film className="w-3.5 h-3.5" />
                        )}
                        <span>{isAudio ? 'Oír MP3' : `Ver ${currentQ}`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISTA TABLET / ESCRITORIO (Grid de Tarjetas >= sm optimizado para Desktop y Monitores) */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 max-w-7xl">
            {results.map((item) => {
              const isAnalyzing = analyzingId === item.id;
              const thumbUrl = getThumbnailUrl(item);
              const currentQ = getItemQuality(item.id);
              const isAudio = currentQ === 'audio';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col bg-slate-900 border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1.5 ${
                    playingId === item.id
                      ? 'border-rose-500 ring-1 ring-rose-500/50 shadow-rose-950/40'
                      : 'border-slate-800 hover:border-slate-600/80 hover:shadow-rose-950/20'
                  }`}
                >
                  {/* Card Thumbnail */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img
                      src={thumbUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Overlay al pasar el ratón (Hover Desktop) */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handlePlayItem(item)}
                        className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                        title={`Reproducir "${item.title}" en ${isAudio ? 'MP3' : currentQ}`}
                        aria-label={`Reproducir ${item.title}`}
                      >
                        <Play className="w-5 h-5 fill-white translate-x-0.5" />
                      </button>
                    </div>

                    {/* Badge de duración (Esquina inferior derecha) */}
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[11px] font-mono text-slate-200 shadow">
                        {item.duration}
                      </span>
                    )}

                    {/* Badge de calidad preseleccionada (Esquina superior izquierda) */}
                    <span
                      title={`Resolución preseleccionada: ${isAudio ? 'Audio MP3' : currentQ}`}
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-md text-[10px] font-bold text-rose-300 border border-rose-500/30 shadow-md"
                    >
                      {isAudio ? 'MP3' : currentQ}
                    </span>

                    {/* Badge informativo en hover (Esquina superior derecha) */}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-[10px] font-medium text-slate-300 border border-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                      {isAudio ? 'Audio Directo' : 'Video HD'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3
                        title={item.title}
                        className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors"
                      >
                        {item.title}
                      </h3>
                      <p
                        title={`Canal: ${item.uploader}`}
                        className="text-xs text-slate-400 mt-1 truncate"
                      >
                        {item.uploader}
                      </p>

                      {/* Selector de Calidad antes de dar Play */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                          Elegir resolución:
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(['480p', '720p', '1080p', '360p', 'audio'] as QualityId[]).map((q) => {
                            const isSelected = currentQ === q;
                            const label = q === 'audio' ? 'MP3' : q;
                            return (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setItemQuality(item.id, q)}
                                title={`Seleccionar calidad ${label} para reproducción`}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handlePlayItem(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors active:scale-95"
                        title={`Reproducir en ${isAudio ? 'MP3' : currentQ}`}
                      >
                        {isAudio ? (
                          <Music2 className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Film className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{isAudio ? 'Oír MP3' : `Ver ${currentQ}`}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleAddToQueue(item, e)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/70 text-xs font-semibold transition-colors active:scale-95"
                        title={`Añadir "${item.title}" a la cola de reproducción`}
                      >
                        <ListPlus className="w-3.5 h-3.5 text-rose-400" />
                        <span>+ Cola</span>
                      </button>
                      <button
                        onClick={() => handleSelectForDownload(item)}
                        disabled={isAnalyzing}
                        title={`Analizar formatos y descargar "${item.title}"`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Bajar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
