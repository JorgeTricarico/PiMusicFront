import React, { createContext, useContext, useState, useRef } from 'react';
import { getDownloadUrl } from '../api/client';
import type { DownloadTarget } from '../components/DownloadConfirmModal';

export interface ActiveDownload {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'audio';
  quality: string;
  badge: string;
  totalBytes: number;
  receivedBytes: number;
  percent: number;
  speedMBps: number;
  etaSeconds: number;
  status: 'starting' | 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  filename: string;
}

interface DownloadContextType {
  activeDownloads: ActiveDownload[];
  startDownload: (target: DownloadTarget) => Promise<void>;
  cancelDownload: (id: string) => void;
  clearCompleted: (id: string) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

// Helper para parsear tamaños como "~46 MB", "1.2 GB" a bytes
function parseApproxSizeBytes(sizeStr: string): number {
  if (!sizeStr) return 25 * 1024 * 1024; // 25 MB por defecto
  const clean = sizeStr.replace('~', '').trim().toUpperCase();
  const num = parseFloat(clean);
  if (isNaN(num)) return 25 * 1024 * 1024;

  if (clean.includes('GB')) return Math.round(num * 1024 * 1024 * 1024);
  if (clean.includes('MB')) return Math.round(num * 1024 * 1024);
  if (clean.includes('KB')) return Math.round(num * 1024);
  return Math.round(num * 1024 * 1024);
}

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDownloads, setActiveDownloads] = useState<ActiveDownload[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const cancelDownload = (id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setActiveDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' } : d))
    );
    // Eliminar de la lista tras 3 segundos
    setTimeout(() => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
    }, 3000);
  };

  const clearCompleted = (id: string) => {
    setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  const startDownload = async (target: DownloadTarget) => {
    const downloadId = `${target.videoId}_${target.quality}_${Date.now()}`;
    const expectedBytes = parseApproxSizeBytes(target.approxSize);
    const ext = target.type === 'audio' ? (target.quality.includes('m4a') ? 'm4a' : 'mp3') : 'mp4';
    const cleanTitle = target.title.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 70);
    const filename = `${cleanTitle}.${ext}`;

    const newDownload: ActiveDownload = {
      id: downloadId,
      videoId: target.videoId,
      title: target.title,
      thumbnail: target.thumbnail || (target.videoId ? `https://i.ytimg.com/vi/${target.videoId}/hqdefault.jpg` : ''),
      type: target.type,
      quality: target.quality,
      badge: target.badge,
      totalBytes: expectedBytes,
      receivedBytes: 0,
      percent: 0,
      speedMBps: 0,
      etaSeconds: 0,
      status: 'starting',
      filename
    };

    setActiveDownloads((prev) => [newDownload, ...prev]);

    const controller = new AbortController();
    abortControllersRef.current.set(downloadId, controller);

    try {
      const url = getDownloadUrl(target.url, target.type, target.quality);
      const response = await fetch(url, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Error en servidor (${response.status})`);
      }

      // Si el servidor envía Content-Length, usarlo
      const clHeader = response.headers.get('content-length');
      const totalBytes = clHeader ? parseInt(clHeader, 10) : expectedBytes;

      setActiveDownloads((prev) =>
        prev.map((d) => (d.id === downloadId ? { ...d, totalBytes, status: 'downloading' } : d))
      );

      if (!response.body) {
        throw new Error('Cuerpo de respuesta vacío');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastTime = performance.now();
      let lastReceived = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const now = performance.now();
        const deltaMs = now - lastTime;

        if (deltaMs >= 350) {
          const deltaSec = deltaMs / 1000;
          const currentSpeed = (receivedBytes - lastReceived) / deltaSec; // bytes/s
          const speedMBps = Math.max(0.1, currentSpeed / (1024 * 1024));
          const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
          const remainingBytes = Math.max(0, totalBytes - receivedBytes);
          const etaSeconds = Math.ceil(remainingBytes / Math.max(currentSpeed, 1024));

          setActiveDownloads((prev) =>
            prev.map((d) =>
              d.id === downloadId
                ? {
                    ...d,
                    receivedBytes,
                    percent,
                    speedMBps: Math.round(speedMBps * 10) / 10,
                    etaSeconds
                  }
                : d
            )
          );

          lastTime = now;
          lastReceived = receivedBytes;
        }
      }

      // Descarga completada: Ensamblar Blob y disparar guardado automático
      const mimeType = target.type === 'audio' ? (ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg') : 'video/mp4';
      const blob = new Blob(chunks as BlobPart[], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      setActiveDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId
            ? {
                ...d,
                receivedBytes: totalBytes,
                percent: 100,
                status: 'completed',
                etaSeconds: 0
              }
            : d
        )
      );

      // Auto limpiar descarga completada después de 8 segundos
      setTimeout(() => {
        setActiveDownloads((prev) => prev.filter((d) => d.id !== downloadId));
      }, 8000);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Cancelado por el usuario
        return;
      }
      setActiveDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId
            ? { ...d, status: 'error', error: err.message || 'Error de conexión' }
            : d
        )
      );
    } finally {
      abortControllersRef.current.delete(downloadId);
    }
  };

  return (
    <DownloadContext.Provider
      value={{
        activeDownloads,
        startDownload,
        cancelDownload,
        clearCompleted
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloads debe ser utilizado dentro de un DownloadProvider');
  }
  return context;
};
