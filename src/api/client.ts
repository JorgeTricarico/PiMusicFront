// Configuración y Cliente API para PiMusic

const STORAGE_KEY = 'pimusic_backend_url';

export function getBackendUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Limpiar automáticamente IPs obsoletas que ya no corresponden
      if (saved.includes('192.168.0.110')) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        return saved.replace(/\/$/, '');
      }
    }
  } catch {
    // Ignorar restricciones en navegadores privados
  }

  // Si hay variable de entorno configurada en tiempo de compilación o ejecución
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : '').trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Por defecto usa la misma raíz / proxy relativo
  return '';
}

export function setBackendUrl(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/$/, ''));
    }
  } catch {}
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  duration: string;
  duration_seconds: number;
  uploader: string;
  thumbnail: string;
  view_count?: number;
}

export interface VideoOption {
  quality: string;
  height: number;
  ext: string;
  badge: string;
  description: string;
  approx_size: string;
}

export interface AudioOption {
  quality: string;
  ext: string;
  badge: string;
  description: string;
  approx_size: string;
}

export interface VideoInfoResponse {
  id: string;
  title: string;
  uploader: string;
  duration: string;
  duration_seconds: number;
  thumbnail: string;
  views: number;
  url: string;
  video_options: VideoOption[];
  audio_options: AudioOption[];
}

export interface StreamPreviewResponse {
  video_id: string;
  title: string;
  stream_url: string;
  type: 'audio' | 'video';
}

export interface TelemetryResponse {
  model: string;
  cpu: string;
  temp: string;
  ram: string;
  disk: string;
  disk_free_gb?: number;
  disk_total_gb?: number;
  disk_used_gb?: number;
}

export interface LibraryItem {
  filename: string;
  title: string;
  ext: string;
  size_bytes: number;
  size_formatted: string;
  mtime: number;
  created_at_str: string;
  type: 'video' | 'audio';
  stream_url: string;
  download_url: string;
  id?: string;
  modified_at?: number;
  date_formatted?: string;
}

export interface LibraryStats {
  total_files: number;
  used_bytes: number;
  used_formatted: string;
  disk_total_gb: number;
  disk_free_gb: number;
  disk_free_formatted: string;
  disk_used_percent: number;
  disk_free_percent?: number;
}

export interface LibraryResponse {
  files: LibraryItem[];
  total_files: number;
  total_size_bytes: number;
  total_size_formatted: string;
  free_disk_percent: number;
  free_disk_formatted: string;
  stats?: LibraryStats;
}

export async function searchYouTube(query: string, limit: number = 15): Promise<SearchResultItem[]> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error en búsqueda' }));
    throw new Error(err.detail || 'Fallo al buscar en YouTube');
  }
  return res.json();
}

export async function getVideoInfo(url: string): Promise<VideoInfoResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/info?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error analizando URL' }));
    throw new Error(err.detail || 'No se pudo obtener información del video');
  }
  return res.json();
}

export function getStreamMediaUrl(
  videoId: string,
  type: 'audio' | 'video' = 'video',
  quality: string = '480p',
  start?: number
): string {
  const baseUrl = getBackendUrl();
  const cleanQuality = quality === 'audio' ? 'm4a' : quality;
  let url = `${baseUrl}/api/stream_media/${videoId}?type=${type}&quality=${encodeURIComponent(cleanQuality)}`;
  if (start && start > 0) {
    url += `&start=${Math.floor(start)}`;
  }
  return url;
}

export async function getStreamPreview(videoId: string, type: 'audio' | 'video' = 'audio'): Promise<StreamPreviewResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/stream/${videoId}?type=${type}`);
  if (!res.ok) {
    throw new Error('No se pudo obtener el flujo de reproducción previa');
  }
  return res.json();
}

export function getDownloadUrl(url: string, type: 'audio' | 'video', quality: string): string {
  const baseUrl = getBackendUrl();
  return `${baseUrl}/api/download?url=${encodeURIComponent(url)}&type=${type}&quality=${encodeURIComponent(quality)}`;
}

export async function saveToServer(url: string, formatType: 'audio' | 'video', quality: string, title?: string): Promise<{ status: string; message: string }> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/save-server`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      format_type: formatType,
      quality,
      title
    })
  });
  if (!res.ok) {
    throw new Error('Error al solicitar guardado en el servidor');
  }
  return res.json();
}

export async function getTelemetry(): Promise<TelemetryResponse | null> {
  try {
    const baseUrl = getBackendUrl();
    const res = await fetch(`${baseUrl}/api/telemetry`);
    if (res.ok) return res.json();
  } catch {
    // Ignorar si el backend no está disponible aún
  }
  return null;
}

export async function getLibrary(): Promise<LibraryResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/library`);
  if (!res.ok) {
    throw new Error('No se pudo cargar la biblioteca de la Raspberry Pi');
  }
  return res.json();
}

export async function deleteLibraryItem(filename: string): Promise<{ status: string; filename: string }> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/library/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al eliminar archivo' }));
    throw new Error(err.detail || 'Fallo al eliminar archivo');
  }
  return res.json();
}

export function getLibraryStreamUrl(filename: string): string {
  const baseUrl = getBackendUrl();
  return `${baseUrl}/api/library/stream/${encodeURIComponent(filename)}`;
}

export function getLibraryDownloadUrl(filename: string): string {
  const baseUrl = getBackendUrl();
  return `${baseUrl}/api/library/download/${encodeURIComponent(filename)}`;
}

// ==========================================
// RECOMENDACIONES HÍBRIDAS & AUTH YOUTUBE
// ==========================================

export interface RecommendationItem {
  videoId: string;
  title: string;
  uploader: string;
  thumbnail: string;
  duration: string;
  badge: string;
}

export interface RecommendationHero {
  videoId: string;
  title: string;
  uploader: string;
  thumbnail: string;
  duration: string;
  reason: string;
}

export interface RecommendationSection {
  id: string;
  title: string;
  subtitle: string;
  items: RecommendationItem[];
}

export interface RecommendationFeedResponse {
  account: {
    linked: boolean;
    name: string | null;
    avatar: string | null;
  };
  hero: RecommendationHero | null;
  sections: RecommendationSection[];
  updated_at: string;
}

export interface AuthStatusResponse {
  linked: boolean;
  method: 'oauth' | 'cookies' | 'none';
  name: string | null;
  avatar: string | null;
}

export interface DeviceCodeResponse {
  status: 'ready' | 'config_needed' | 'error';
  message?: string;
  device_code?: string;
  user_code?: string;
  verification_url?: string;
  expires_in?: number;
  interval?: number;
}

export async function getRecommendationsFeed(): Promise<RecommendationFeedResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/recommendations/feed`);
  if (!res.ok) {
    throw new Error('Error al obtener recomendaciones');
  }
  return res.json();
}

export async function recordHistory(item: {
  videoId: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  duration?: string;
}): Promise<void> {
  try {
    const baseUrl = getBackendUrl();
    await fetch(`${baseUrl}/api/history/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.warn('No se pudo registrar historial:', err);
  }
}

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/auth/status`);
  if (!res.ok) {
    return { linked: false, method: 'none', name: null, avatar: null };
  }
  return res.json();
}

export async function requestDeviceCode(clientId?: string): Promise<DeviceCodeResponse> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/auth/device-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId || '' }),
  });
  return res.json();
}

export async function pollDeviceCode(deviceCode: string, clientId?: string): Promise<{ status: string; message?: string }> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/auth/device-poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode, client_id: clientId || '' }),
  });
  return res.json();
}

export async function uploadSessionCookies(cookiesText: string): Promise<{ status: string; message: string }> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/auth/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies_text: cookiesText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al subir archivo de sesión' }));
    throw new Error(err.detail || 'Fallo al guardar sesión');
  }
  return res.json();
}

export async function logoutAccount(): Promise<void> {
  const baseUrl = getBackendUrl();
  await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
}

// ==========================================
// REGISTROS Y DIAGNÓSTICO DEL SISTEMA (UI APP)
// ==========================================

export interface SystemLogsResponse {
  logs: string[];
  total_lines: number;
  error_count: number;
  warning_count: number;
  file_size: string;
  file_path: string;
}

export async function getSystemLogs(lines: number = 150, level?: string): Promise<SystemLogsResponse> {
  const baseUrl = getBackendUrl();
  let url = `${baseUrl}/api/logs?lines=${lines}`;
  if (level && level !== 'ALL') {
    url += `&level=${encodeURIComponent(level)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('No se pudieron obtener los registros del servidor');
  }
  return res.json();
}

export async function clearSystemLogs(): Promise<{ status: string; message: string }> {
  const baseUrl = getBackendUrl();
  const res = await fetch(`${baseUrl}/api/logs`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error('No se pudieron limpiar los registros del servidor');
  }
  return res.json();
}

