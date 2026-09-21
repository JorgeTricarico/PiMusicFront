import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ForYouView } from './components/ForYouView';
import { LinkDownloader } from './components/LinkDownloader';
import { SearchDownloader } from './components/SearchDownloader';
import { MiniPlayer } from './components/MiniPlayer';
import type { PlayerTrack } from './components/MiniPlayer';
import { StreamPlayerModal } from './components/StreamPlayerModal';
import type { StreamPlayerTrack, QualityId } from './components/StreamPlayerModal';
import { SettingsModal } from './components/SettingsModal';
import { AccountLinkModal } from './components/AccountLinkModal';
import { LibraryManager } from './components/LibraryManager';
import { ToastProvider, useToast } from './context/ToastContext';
import { DownloadProvider, useDownloads } from './context/DownloadContext';
import { QueueProvider, useQueue } from './context/QueueContext';
import { DownloadProgressDrawer } from './components/DownloadProgressDrawer';
import { DownloadConfirmModal } from './components/DownloadConfirmModal';
import type { DownloadTarget } from './components/DownloadConfirmModal';
import { SaveServerConfirmModal } from './components/SaveServerConfirmModal';
import type { SaveServerTarget } from './components/SaveServerConfirmModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ClipboardBanner } from './components/ClipboardBanner';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { getTelemetry, saveToServer } from './api/client';
import { parseDuration } from './utils/watchHistory';
import { Globe } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'link' | 'search' | 'foryou' | 'library'>('link');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Referencia a la sección del reproductor para auto-scroll y protagonismo visual en móvil (< md)
  const playerSectionRef = useRef<HTMLElement | null>(null);

  // Modales de confirmación para descargas desde la vista "Para ti"
  const [foryouDownloadTarget, setForyouDownloadTarget] = useState<DownloadTarget | null>(null);
  const [foryouSaveTarget, setForyouSaveTarget] = useState<SaveServerTarget | null>(null);

  // Estado para el modal de streaming avanzado en vivo
  const [streamTrack, setStreamTrack] = useState<StreamPlayerTrack | null>(null);

  // Estado para el reproductor flotante persistente (minimizado)
  const [activePlayer, setActivePlayer] = useState<PlayerTrack | null>(null);

  // Estado para URL detectada en portapapeles
  const [clipboardUrl, setClipboardUrl] = useState<string>('');

  // Atajo global desktop para búsqueda con '/' y ayuda con '?'
  useEffect(() => {
    const handleGlobalKeySlash = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
            (activeEl as HTMLElement).isContentEditable);
        if (!isEditing) {
          e.preventDefault();
          if (activeTab !== 'search') {
            setActiveTab('search');
          }
          setTimeout(() => {
            const input = document.getElementById('search-input') as HTMLInputElement | null;
            if (input) {
              input.focus();
              input.select();
            }
          }, 50);
        }
      } else if (e.key === '?') {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
            (activeEl as HTMLElement).isContentEditable);
        if (!isEditing && !streamTrack) {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeySlash);
    return () => window.removeEventListener('keydown', handleGlobalKeySlash);
  }, [activeTab, streamTrack]);

  const { startDownload } = useDownloads();
  const { toast } = useToast();
  const { playTrack } = useQueue();

  // Verificar conectividad al inicio
  useEffect(() => {
    const checkServer = async () => {
      const data = await getTelemetry();
      setIsBackendConnected(!!data);
    };
    checkServer();
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClipboardAnalyze = (url: string) => {
    setClipboardUrl(url);
    setActiveTab('link');
  };

  // Al pulsar Ver / Previa, abrir directamente el reproductor avanzado de streaming
  const handlePlayPreview = (
    videoId: string,
    title: string,
    type: 'audio' | 'video',
    quality?: QualityId,
    streamUrl?: string,
    duration?: number | string
  ) => {
    setActivePlayer(null);
    const parsedDur = parseDuration(duration);
    const newTrack: StreamPlayerTrack = {
      videoId,
      title,
      duration: parsedDur > 0 ? parsedDur : undefined,
      initialType: type,
      initialQuality: quality || (type === 'video' ? '480p' : 'audio'),
      streamUrl,
    };
    setStreamTrack(newTrack);
    playTrack(newTrack);

    // Scroll suave inmediato hacia la cima para asegurar que en móvil (< md)
    // el usuario vea el reproductor montado y no quede desplazado hacia abajo fuera de la vista
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Auto-scroll suave y enfoque en la sección del reproductor cuando streamTrack cambia
  // Garantiza que en pantallas móviles (< md) el reproductor sea el protagonista visual inmediato
  useEffect(() => {
    if (streamTrack) {
      const scrollToPlayer = () => {
        if (playerSectionRef.current && typeof playerSectionRef.current.scrollIntoView === 'function') {
          playerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (typeof playerSectionRef.current.focus === 'function') {
            playerSectionRef.current.focus({ preventScroll: true });
          }
        } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };

      const rafId = requestAnimationFrame(scrollToPlayer);
      return () => cancelAnimationFrame(rafId);
    }
  }, [streamTrack?.videoId, Boolean(streamTrack)]);

  // Al minimizar el modal, transferir la reproducción al mini-reproductor flotante
  const handleMinimizeStream = (state: {
    videoId: string;
    title: string;
    currentTime: number;
    quality: QualityId;
    isPlaying: boolean;
  }) => {
    const currentDur = streamTrack?.duration ? parseDuration(streamTrack.duration) : undefined;
    setStreamTrack(null);
    setActivePlayer({
      videoId: state.videoId,
      title: state.title,
      duration: currentDur,
      type: state.quality === 'audio' ? 'audio' : 'video',
      quality: state.quality,
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      streamUrl: streamTrack?.streamUrl,
    });
  };

  // Al expandir desde el mini-reproductor, reabrir el StreamPlayerModal con el tiempo actual
  const handleExpandMiniPlayer = (
    currentTime: number,
    quality: QualityId,
    _isPlaying: boolean
  ) => {
    if (!activePlayer) return;
    const currentVid = activePlayer.videoId;
    const currentTitle = activePlayer.title;
    const currentStreamUrl = activePlayer.streamUrl;
    const currentDuration = activePlayer.duration;

    setActivePlayer(null);
    setStreamTrack({
      videoId: currentVid,
      title: currentTitle,
      duration: currentDuration,
      initialQuality: quality,
      initialType: quality === 'audio' ? 'audio' : 'video',
      initialTime: currentTime,
      streamUrl: currentStreamUrl,
    });
  };

  const handleChangePlayerType = (type: 'audio' | 'video') => {
    if (activePlayer) {
      setActivePlayer({
        ...activePlayer,
        type,
        quality: type === 'audio' ? 'audio' : '480p',
      });
    }
  };

  const handleConfirmSaveToServer = async () => {
    if (!foryouSaveTarget) return;
    try {
      await saveToServer(
        foryouSaveTarget.url,
        foryouSaveTarget.type,
        foryouSaveTarget.quality
      );
      toast.success(
        'Guardado en Raspberry Pi',
        `"${foryouSaveTarget.title}" se almacenó en tu biblioteca local.`
      );
    } catch {
      toast.error('Error', 'No se pudo guardar el archivo en la Raspberry Pi.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white pb-24 md:pb-8">
      {/* Cabecera */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* REPRODUCTOR INTEGRADO ESTILO YOUTUBE (VISIBLE JUNTO A LA PÁGINA) */}
      {streamTrack && (
        <section
          ref={playerSectionRef}
          tabIndex={-1}
          aria-label="Reproductor de streaming"
          data-testid="player-section"
          className="w-full bg-slate-950/95 border-b border-slate-800/80 py-1.5 sm:py-4 px-1 sm:px-4 animate-fadeIn scroll-mt-14 sm:scroll-mt-16 focus:outline-none"
        >
          <div className="w-full max-w-7xl mx-auto flex justify-center">
            <StreamPlayerModal
              track={streamTrack}
              onClose={() => setStreamTrack(null)}
              onMinimize={handleMinimizeStream}
              onTrackChange={(newTrack) => setStreamTrack(newTrack)}
            />
          </div>
        </section>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-3 sm:px-6 pt-4 sm:pt-6">
        {activeTab === 'link' ? (
          <LinkDownloader initialUrl={clipboardUrl} onPlayPreview={handlePlayPreview} />
        ) : activeTab === 'search' ? (
          <SearchDownloader onPlayPreview={handlePlayPreview} />
        ) : activeTab === 'foryou' ? (
          <ForYouView
            onPlayMedia={(track) => handlePlayPreview(track.id, track.title, track.type, track.quality, undefined, track.duration)}
            onOpenDownloadConfirm={(target) => setForyouDownloadTarget(target)}
            onOpenSaveConfirm={(target) => setForyouSaveTarget(target)}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        ) : (
          <LibraryManager
            onPlayMedia={(track) => {
              setStreamTrack(null);
              setActivePlayer({
                videoId: track.id,
                title: track.title,
                type: track.type,
                streamUrl: track.streamUrl,
                isPlaying: true,
              });
              playTrack({
                videoId: track.id,
                title: track.title,
                initialType: track.type,
                initialQuality: track.type === 'audio' ? 'audio' : '480p',
                streamUrl: track.streamUrl,
              });
            }}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}
      </main>

      {/* Footer (Desktop) */}
      <footer className="w-full border-t border-slate-900 py-6 bg-slate-950/80 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PiMusic App • Experiencia Local & Streamer © 2026</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Red Local Privada</span>
            </span>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Configurar Servidor
            </button>
          </div>
        </div>
      </footer>

      {/* MINI-PLAYER FLOTANTE PERSISTENTE */}
      {activePlayer && !streamTrack && (
        <MiniPlayer
          track={activePlayer}
          onClose={() => setActivePlayer(null)}
          onExpand={handleExpandMiniPlayer}
          onChangeType={handleChangePlayerType}
          onTrackChange={(newTrack) => setActivePlayer(newTrack)}
        />
      )}

      {/* Bottom Navigation Bar para Móviles (Thumb Zone) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Modal de Configuración y Telemetría */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onConnectionChange={(connected) => setIsBackendConnected(connected)}
        />
      )}

      {/* Modal de Cuenta y Recomendaciones de YouTube */}
      {isAccountModalOpen && (
        <AccountLinkModal
          onClose={() => setIsAccountModalOpen(false)}
          onAuthChange={() => {}}
        />
      )}

      {/* Modal de Confirmación de Descarga desde "Para ti" */}
      {foryouDownloadTarget && (
        <DownloadConfirmModal
          target={foryouDownloadTarget}
          onClose={() => setForyouDownloadTarget(null)}
          onConfirm={() => {
            startDownload(foryouDownloadTarget);
          }}
        />
      )}

      {/* Modal de Confirmación de Guardado en Pi desde "Para ti" */}
      {foryouSaveTarget && (
        <SaveServerConfirmModal
          target={foryouSaveTarget}
          onClose={() => setForyouSaveTarget(null)}
          onConfirm={handleConfirmSaveToServer}
        />
      )}

      {/* GESTOR DE DESCARGAS EN VIVO (BARRA DE PROGRESO REAL, % Y TIEMPO RESTANTE) */}
      <DownloadProgressDrawer />

      {/* BANNER FLOTANTE DE INSTALACIÓN PWA */}
      <PwaInstallBanner />

      {/* BANNER DE DETECCIÓN DE ENLACES EN PORTAPAPELES */}
      <ClipboardBanner onAnalyze={handleClipboardAnalyze} />

      {/* GUÍA VISUAL DE ATAJOS DE TECLADO DESKTOP */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <DownloadProvider>
        <QueueProvider>
          <AppContent />
        </QueueProvider>
      </DownloadProvider>
    </ToastProvider>
  );
}

export default App;
