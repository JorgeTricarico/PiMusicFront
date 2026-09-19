import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Folder,
  Music2,
  Film,
  Play,
  Download,
  Trash2,
  HardDrive,
  RefreshCw,
  Search,
  AlertTriangle,
  FileText,
  Loader2,
  Calendar,
  Sparkles,
  X
} from 'lucide-react';
import type { LibraryItem, LibraryStats } from '../api/client';
import {
  getLibrary,
  deleteLibraryItem,
  getLibraryStreamUrl,
  getLibraryDownloadUrl
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { getDownloadEstimate } from '../utils/downloadMetrics';
import { DownloadConfirmModal } from './DownloadConfirmModal';
import type { DownloadTarget } from './DownloadConfirmModal';

interface LibraryManagerProps {
  onPlayMedia: (track: {
    id: string;
    title: string;
    type: 'audio' | 'video';
    streamUrl: string;
  }) => void;
  onNavigateToSearch?: () => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({
  onPlayMedia,
  onNavigateToSearch
}) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video'>('all');

  // Estado para modal de confirmación de eliminación
  const [itemToDelete, setItemToDelete] = useState<LibraryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estado para modal de confirmación de descarga al celular
  const [downloadTarget, setDownloadTarget] = useState<DownloadTarget | null>(null);

  const { toast } = useToast();

  const fetchLibrary = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getLibrary();
      setItems(data.files || []);
      setStats(data.stats || null);
      if (isManualRefresh) {
        toast.success('Biblioteca actualizada', `${data.files?.length || 0} archivos encontrados.`);
      }
    } catch (err: any) {
      console.warn('Error al cargar la biblioteca:', err);
      // Fallback amigable si la carpeta está vacía o el backend aún no inicializó archivos
      toast.info(
        'Biblioteca local',
        'No se encontraron archivos previos o la Raspberry Pi está inicializando.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Filtrado de archivos
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, searchQuery, filterType]);

  // Manejar reproducción
  const handlePlay = (item: LibraryItem) => {
    const streamUrl = getLibraryStreamUrl(item.filename);
    onPlayMedia({
      id: `local_${item.filename}`,
      title: item.title,
      type: item.type,
      streamUrl
    });
    toast.info('Reproduciendo desde Raspberry Pi', item.title, 2500);
  };

  // Preparar descarga al dispositivo con confirmación
  const handlePrepareDownload = (item: LibraryItem) => {
    const downloadUrl = getLibraryDownloadUrl(item.filename);
    setDownloadTarget({
      url: downloadUrl,
      videoId: item.id || item.filename,
      title: item.title,
      uploader: 'Raspberry Pi Local',
      thumbnail: '',
      type: item.type,
      quality: item.ext.toUpperCase(),
      badge: 'Red Local',
      approxSize: item.size_formatted
    });
  };

  // Ejecución de la descarga una vez confirmada en el modal
  const executeLocalDownload = () => {
    if (!downloadTarget) return;

    toast.info(
      'Descargando desde Raspberry Pi...',
      'Transferencia a velocidad máxima en red local.',
      3500
    );

    const link = document.createElement('a');
    link.href = downloadTarget.url;
    link.setAttribute('download', `${downloadTarget.title}.${downloadTarget.type === 'video' ? 'mp4' : 'mp3'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      toast.success(
        '¡Descarga completada!',
        'El archivo se guardó en tu dispositivo sin usar internet.'
      );
    }, 2500);
  };

  // Confirmar y eliminar archivo de la Pi
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteLibraryItem(itemToDelete.filename);
      toast.success('Archivo eliminado', `"${itemToDelete.title}" fue borrado de la Raspberry Pi.`);
      setItemToDelete(null);
      fetchLibrary();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message || 'No se pudo borrar el archivo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 py-6 sm:py-8 px-3 sm:px-4 pb-24 sm:pb-8">
      {/* Título de Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Almacenamiento Local
            </span>
            <span className="text-xs text-slate-400 font-mono">~/pi-music-cache</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Biblioteca en <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">Raspberry Pi</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Administra, reproduce y descarga a tu celular los medios guardados en el disco de tu Pi.
          </p>
        </div>

        <button
          onClick={() => fetchLibrary(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold shadow-sm transition-all active:scale-95 flex-shrink-0"
          title="Recargar archivos"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Barra Resumen Superior (Métricas de Almacenamiento) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Espacio Usado */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-500/20">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Espacio Usado por PiMusic</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats?.used_formatted || '0 MB'}
            </span>
          </div>
        </div>

        {/* Total de Archivos */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Total de Medios Guardados</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats?.total_files ?? items.length} {items.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>
        </div>

        {/* Espacio Libre en Disco */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Espacio Libre en Disco</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {stats?.disk_used_percent ? `${stats.disk_used_percent}% uso` : ''}
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-400 font-mono block">
              {stats?.disk_free_formatted || `${stats?.disk_free_gb || '32.0'} GB libres`}
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
        {/* Buscador de Archivos */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar archivos guardados..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Selector de Tipo (Todos / Música / Videos) */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setFilterType('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'audio'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Música</span>
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'video'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos</span>
          </button>
        </div>
      </div>

      {/* Lista de Archivos */}
      {loading ? (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs text-slate-400">Consultando almacenamiento de la Raspberry Pi...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Estado Vacío */
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-amber-400 flex items-center justify-center border border-slate-700">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-white">
              {searchQuery ? 'No se encontraron coincidencias' : 'Biblioteca Vacía en la Raspberry Pi'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              {searchQuery
                ? `No hay archivos que coincidan con "${searchQuery}".`
                : 'Aún no has guardado archivos en el disco de tu Raspberry Pi. Busca canciones o pega enlaces y utiliza el botón de guardar en el servidor para almacenarlas.'}
            </p>
          </div>
          {!searchQuery && onNavigateToSearch && (
            <button
              onClick={onNavigateToSearch}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/25 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Ir a Buscar Música</span>
            </button>
          )}
        </div>
      ) : (
        /* Grid de Tarjetas de Archivos */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const isAudio = item.type === 'audio';
            const estimate = getDownloadEstimate(item.size_formatted);

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md group"
              >
                <div className="flex items-start gap-3">
                  {/* Ícono de tipo */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow ${
                      isAudio
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isAudio ? <Music2 className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                  </div>

                  {/* Metadatos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase font-mono ${
                          isAudio
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.ext}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {item.size_formatted}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3" />
                        <span>{item.date_formatted}</span>
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Barra de Acciones por Archivo */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {/* Botón Reproducir */}
                    <button
                      onClick={() => handlePlay(item)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-xs font-semibold text-white transition-all active:scale-95"
                      title="Reproducir flujo de la Raspberry Pi"
                    >
                      <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
                      <span>Reproducir</span>
                    </button>

                    {/* Botón Descargar a mi celular (Máxima velocidad local) */}
                    <button
                      onClick={() => handlePrepareDownload(item)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold transition-all active:scale-95 truncate"
                      title={`Descargar a celular (${estimate.formattedTime})`}
                    >
                      <Download className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">A mi celular</span>
                    </button>
                  </div>

                  {/* Botón Borrar */}
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                    title="Eliminar de la Raspberry Pi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>¿Eliminar este archivo de la Raspberry Pi?</span>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1 text-xs">
              <span className="text-slate-400">Archivo seleccionado:</span>
              <span className="font-semibold text-white truncate">{itemToDelete.title}</span>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                <span>Formato: {itemToDelete.ext.toUpperCase()}</span>
                <span>•</span>
                <span>Tamaño: {itemToDelete.size_formatted}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Esta acción liberará {itemToDelete.size_formatted} de almacenamiento en la Raspberry Pi. No se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA DESCARGAR A CELULAR */}
      {downloadTarget && (
        <DownloadConfirmModal
          target={downloadTarget}
          onClose={() => setDownloadTarget(null)}
          onConfirm={executeLocalDownload}
        />
      )}
    </div>
  );
};
