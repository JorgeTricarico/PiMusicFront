export interface WatchProgress {
  videoId: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  currentTime: number;
  duration: number;
  quality: string;
  type: 'video' | 'audio';
  updatedAt: number;
  completed?: boolean;
}

export const WATCH_HISTORY_KEY = 'pimusic_watch_history';
export const MAX_WATCH_HISTORY_ITEMS = 20;

function safeGetStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

function notifyHistoryChange(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('watchHistoryUpdated'));
    } catch {
      // Ignorar entornos sin CustomEvent
    }
  }
}

function readRawHistory(storage: Storage): WatchProgress[] {
  try {
    const raw = storage.getItem(WATCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Si hay datos corruptos, ignorar
  }
  return [];
}

/**
 * Guarda el progreso de reproducción en localStorage.
 * Solo guarda si currentTime >= 5 y currentTime <= duration - 15.
 * Si currentTime > duration - 15, marca el video como completado.
 */
export function saveWatchProgress(progress: WatchProgress): void {
  const storage = safeGetStorage();
  if (!storage || !progress.videoId) return;

  const { currentTime, duration } = progress;

  // Si no hay duración definida o válida, y el tiempo es menor a 5, descartar
  if (currentTime < 5) {
    return;
  }

  const rawList = readRawHistory(storage);

  // Si currentTime supera duration - 15 (y duration > 15), marcar como completado
  if (duration > 0 && currentTime > duration - 15) {
    const existingIndex = rawList.findIndex((item) => item.videoId === progress.videoId);
    if (existingIndex >= 0) {
      rawList[existingIndex] = {
        ...rawList[existingIndex],
        ...progress,
        completed: true,
        updatedAt: progress.updatedAt || Date.now(),
      };
      try {
        storage.setItem(WATCH_HISTORY_KEY, JSON.stringify(rawList.slice(0, MAX_WATCH_HISTORY_ITEMS)));
        notifyHistoryChange();
      } catch {
        // Ignorar excepciones de cuota de storage
      }
    }
    return;
  }

  // Verificar rango de persistencia válido: currentTime >= 5 && currentTime <= duration - 15
  if (duration > 0 && currentTime > duration - 15) {
    return;
  }

  const filtered = rawList.filter((item) => item.videoId !== progress.videoId);
  const updatedEntry: WatchProgress = {
    ...progress,
    completed: false,
    updatedAt: progress.updatedAt || Date.now(),
  };

  const updatedList = [updatedEntry, ...filtered].slice(0, MAX_WATCH_HISTORY_ITEMS);

  try {
    storage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updatedList));
    notifyHistoryChange();
  } catch {
    // Ignorar excepciones de cuota de storage
  }
}

/**
 * Obtiene el progreso de reproducción guardado para un video.
 * Retorna null si no existe o si ya fue marcado como completado.
 */
export function getWatchProgress(videoId: string): WatchProgress | null {
  const storage = safeGetStorage();
  if (!storage || !videoId) return null;

  const rawList = readRawHistory(storage);
  const item = rawList.find((entry) => entry.videoId === videoId);

  if (!item || item.completed) {
    return null;
  }

  return item;
}

/**
 * Devuelve los videos no completados ordenados por updatedAt descendente.
 */
export function getWatchHistory(): WatchProgress[] {
  const storage = safeGetStorage();
  if (!storage) return [];

  const rawList = readRawHistory(storage);
  return rawList
    .filter((entry) => !entry.completed)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Elimina el progreso guardado de un video específico.
 */
export function removeWatchProgress(videoId: string): void {
  const storage = safeGetStorage();
  if (!storage || !videoId) return;

  const rawList = readRawHistory(storage);
  const filtered = rawList.filter((entry) => entry.videoId !== videoId);

  try {
    storage.setItem(WATCH_HISTORY_KEY, JSON.stringify(filtered));
    notifyHistoryChange();
  } catch {
    // Ignorar excepciones
  }
}

/**
 * Limpia todo el historial de reproducción guardado.
 */
export function clearWatchHistory(): void {
  const storage = safeGetStorage();
  if (!storage) return;

  try {
    storage.removeItem(WATCH_HISTORY_KEY);
    notifyHistoryChange();
  } catch {
    // Ignorar excepciones
  }
}

/**
 * Formatea segundos en mm:ss o hh:mm:ss.
 */
export function formatDuration(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '00:00';
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  const remS = s % 60;

  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
  }
  return `${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
}

/**
 * Formatea el tiempo restante para visualización amigable en tarjetas (ej. "Te quedan 15 min").
 */
export function formatRemainingTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return 'Menos de 1 min';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `Te quedan ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `Te quedan ${hours} h`;
  }
  return `Te quedan ${hours} h ${remainingMins} min`;
}
