/**
 * Utilidades tipadas para la MediaSession API del navegador (móvil y escritorio).
 * Permite control mediante notificaciones del sistema operativo, pantalla de bloqueo,
 * wearables (relojes inteligentes), controles de auriculares y teclas multimedia de hardware.
 */

export interface MediaArtworkImage {
  src: string;
  sizes?: string;
  type?: string;
}

export interface MediaSessionMetadataOptions {
  title: string;
  artist?: string;
  channel?: string;
  album?: string;
  artworkUrl?: string;
  videoId?: string;
  artwork?: MediaArtworkImage[];
}

export interface MediaSessionActionDetails {
  action: string;
  seekOffset?: number;
  seekTime?: number;
  fastSeek?: boolean;
}

export interface MediaSessionActionHandlers {
  play?: () => void;
  pause?: () => void;
  seekbackward?: (details?: MediaSessionActionDetails) => void;
  seekforward?: (details?: MediaSessionActionDetails) => void;
  previoustrack?: () => void;
  nexttrack?: () => void;
  seekto?: (details: MediaSessionActionDetails) => void;
  stop?: () => void;
  enterpictureinpicture?: () => void;
}

export interface MediaSessionPositionState {
  duration: number;
  playbackRate?: number;
  position: number;
}

/**
 * Comprueba si la MediaSession API está disponible en el entorno actual.
 */
export function isMediaSessionSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'mediaSession' in navigator &&
    Boolean(navigator.mediaSession)
  );
}

/**
 * Comprueba si Picture-in-Picture (PiP) está soportado en el navegador actual
 * (estándar W3C o WebKit/Safari).
 */
export function isPictureInPictureSupported(): boolean {
  if (typeof document !== 'undefined') {
    if ('pictureInPictureEnabled' in document && Boolean(document.pictureInPictureEnabled)) {
      return true;
    }
  }
  if (typeof HTMLVideoElement !== 'undefined') {
    const video = document.createElement('video');
    if (typeof (video as any).webkitSupportsPresentationMode === 'function') {
      return (video as any).webkitSupportsPresentationMode('picture-in-picture');
    }
  }
  return false;
}

/**
 * Comprueba si autoPictureInPicture es compatible con el navegador actual (Chrome en Android/Desktop).
 */
export function isAutoPictureInPictureSupported(): boolean {
  if (typeof HTMLVideoElement !== 'undefined') {
    return 'autoPictureInPicture' in HTMLVideoElement.prototype;
  }
  return false;
}

/**
 * Solicita entrar a Picture-in-Picture de forma segura soportando APIs W3C y WebKit/Safari.
 */
export async function requestPictureInPicture(
  videoElement: HTMLVideoElement
): Promise<PictureInPictureWindow | null> {
  if (!videoElement) return null;

  try {
    if (typeof videoElement.requestPictureInPicture === 'function') {
      return await videoElement.requestPictureInPicture();
    }
    if (
      typeof (videoElement as any).webkitSetPresentationMode === 'function' &&
      (videoElement as any).webkitSupportsPresentationMode?.('picture-in-picture')
    ) {
      (videoElement as any).webkitSetPresentationMode('picture-in-picture');
      return null;
    }
  } catch (err) {
    console.warn('Fallo al solicitar Picture-in-Picture:', err);
    throw err;
  }
  return null;
}

/**
 * Sale del modo Picture-in-Picture si está activo.
 */
export async function exitPictureInPicture(
  videoElement?: HTMLVideoElement | null
): Promise<void> {
  try {
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }
    if (
      videoElement &&
      typeof (videoElement as any).webkitSetPresentationMode === 'function'
    ) {
      (videoElement as any).webkitSetPresentationMode('inline');
    }
  } catch (err) {
    console.warn('Fallo al salir de Picture-in-Picture:', err);
    throw err;
  }
}

/**
 * Comprueba si el elemento de video está actualmente en modo Picture-in-Picture.
 */
export function isPictureInPictureActive(
  videoElement?: HTMLVideoElement | null
): boolean {
  if (typeof document !== 'undefined' && document.pictureInPictureElement) {
    if (!videoElement) return true;
    return document.pictureInPictureElement === videoElement;
  }
  if (
    videoElement &&
    (videoElement as any).webkitPresentationMode === 'picture-in-picture'
  ) {
    return true;
  }
  return false;
}

/**
 * Genera la lista de carátulas en alta resolución (96x96, 128x128, 256x256, 512x512)
 * para YouTube o URLs de carátulas personalizadas.
 */
export function generateArtworkList(
  artworkUrl?: string,
  videoId?: string
): MediaArtworkImage[] {
  // Si es un video de YouTube válido
  if (videoId && !videoId.startsWith('local_')) {
    return [
      { src: `https://i.ytimg.com/vi/${videoId}/default.jpg`, sizes: '96x96', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, sizes: '128x128', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, sizes: '256x256', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, sizes: '512x512', type: 'image/jpeg' },
    ];
  }

  // Si se provee una URL de carátula directa
  if (artworkUrl) {
    return [
      { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
      { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
      { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
      { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
    ];
  }

  return [];
}

/**
 * Actualiza los metadatos de la MediaSession (título, artista/canal, carátulas HD, álbum).
 */
export function updateMediaSessionMetadata(options: MediaSessionMetadataOptions): void {
  if (!isMediaSessionSupported()) return;

  const artwork =
    options.artwork && options.artwork.length > 0
      ? options.artwork
      : generateArtworkList(options.artworkUrl, options.videoId);

  const artist = options.channel || options.artist || 'PiMusic';
  const album = options.album || 'PiMusic';

  try {
    const MediaMetadataClass =
      (typeof window !== 'undefined' && (window as any).MediaMetadata) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).MediaMetadata);

    if (MediaMetadataClass) {
      navigator.mediaSession.metadata = new MediaMetadataClass({
        title: options.title,
        artist,
        album,
        artwork,
      });
    }
  } catch (err) {
    console.warn('Error al establecer MediaSession metadata:', err);
  }
}

/**
 * Conecta los manejadores de hardware (botones de play/pause, saltos ±10s, seekto, anterior/siguiente).
 */
export function setMediaSessionActionHandlers(handlers: MediaSessionActionHandlers): void {
  if (!isMediaSessionSupported()) return;

  const actions: Array<{
    action: MediaSessionAction | 'enterpictureinpicture';
    handler?: (details: any) => void;
  }> = [
    { action: 'play', handler: handlers.play },
    { action: 'pause', handler: handlers.pause },
    { action: 'seekbackward', handler: handlers.seekbackward },
    { action: 'seekforward', handler: handlers.seekforward },
    { action: 'previoustrack', handler: handlers.previoustrack },
    { action: 'nexttrack', handler: handlers.nexttrack },
    { action: 'seekto', handler: handlers.seekto },
    { action: 'stop', handler: handlers.stop },
    { action: 'enterpictureinpicture' as any, handler: handlers.enterpictureinpicture },
  ];

  for (const { action, handler } of actions) {
    try {
      if (handler) {
        navigator.mediaSession.setActionHandler(action as any, (details) => {
          handler(details);
        });
      } else {
        navigator.mediaSession.setActionHandler(action as any, null);
      }
    } catch {
      // Ignorar si el navegador no soporta una acción específica
    }
  }
}

/**
 * Actualiza el estado de reproducción en la MediaSession ('playing', 'paused', 'none').
 */
export function updateMediaSessionPlaybackState(
  state: 'none' | 'paused' | 'playing'
): void {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch (err) {
    console.warn('Error al actualizar playbackState de MediaSession:', err);
  }
}

/**
 * Informa al sistema la posición actual y duración para la barra de progreso en pantalla de bloqueo.
 */
export function updateMediaSessionPositionState(
  state: MediaSessionPositionState
): void {
  if (
    !isMediaSessionSupported() ||
    typeof navigator.mediaSession.setPositionState !== 'function'
  ) {
    return;
  }

  const { duration, playbackRate = 1.0, position } = state;

  if (
    Number.isFinite(duration) &&
    duration > 0 &&
    Number.isFinite(position) &&
    position >= 0
  ) {
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: playbackRate > 0 ? playbackRate : 1.0,
        position: Math.min(Math.max(0, position), duration),
      });
    } catch {
      // Si la posición o duración no cumplen con la especificación del navegador, ignorar
    }
  }
}

/**
 * Limpia todos los manejadores de hardware de la MediaSession.
 */
export function clearMediaSessionActionHandlers(): void {
  if (!isMediaSessionSupported()) return;

  const actions: Array<MediaSessionAction | 'enterpictureinpicture'> = [
    'play',
    'pause',
    'seekbackward',
    'seekforward',
    'previoustrack',
    'nexttrack',
    'seekto',
    'stop',
    'enterpictureinpicture' as any,
  ];

  for (const action of actions) {
    try {
      navigator.mediaSession.setActionHandler(action as any, null);
    } catch {}
  }
}

/**
 * Limpia por completo la MediaSession (manejadores, metadata y estado).
 */
export function clearMediaSession(): void {
  if (!isMediaSessionSupported()) return;

  clearMediaSessionActionHandlers();
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  } catch {}
}
