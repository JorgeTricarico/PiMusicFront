import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBackendUrl,
  setBackendUrl,
  getStreamMediaUrl,
  getDownloadUrl,
  getLibraryStreamUrl,
  getLibraryDownloadUrl,
  searchYouTube,
  getVideoInfo,
  saveToServer,
  getTelemetry,
  deleteLibraryItem,
} from '../client';

describe('API Client Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getBackendUrl & setBackendUrl', () => {
    it('debe retornar cadena vacía si no hay configuración en localStorage', () => {
      expect(getBackendUrl()).toBe('');
    });

    it('debe guardar y devolver la URL configurada sin barra diagonal final', () => {
      setBackendUrl('http://192.168.1.100:5000/');
      expect(getBackendUrl()).toBe('http://192.168.1.100:5000');
    });

    it('debe depurar y eliminar automáticamente la IP obsoleta 192.168.0.110', () => {
      localStorage.setItem('pimusic_backend_url', 'http://192.168.0.110:5000');
      expect(getBackendUrl()).toBe('');
      expect(localStorage.getItem('pimusic_backend_url')).toBeNull();
    });

    it('debe limpiar localStorage si se pasa una URL vacía a setBackendUrl', () => {
      setBackendUrl('http://192.168.1.50:5000');
      expect(getBackendUrl()).toBe('http://192.168.1.50:5000');
      setBackendUrl('   ');
      expect(getBackendUrl()).toBe('');
    });
  });

  describe('getStreamMediaUrl', () => {
    it('debe construir la URL con los parámetros por defecto (video y 480p)', () => {
      const url = getStreamMediaUrl('dQw4w9WgXcQ');
      expect(url).toBe('/api/stream_media/dQw4w9WgXcQ?type=video&quality=480p');
    });

    it('debe transformar quality="audio" a cleanQuality="m4a"', () => {
      const url = getStreamMediaUrl('dQw4w9WgXcQ', 'audio', 'audio');
      expect(url).toBe('/api/stream_media/dQw4w9WgXcQ?type=audio&quality=m4a');
    });

    it('debe anexar el parámetro start redondeado si start > 0', () => {
      const url = getStreamMediaUrl('dQw4w9WgXcQ', 'video', '720p', 45.8);
      expect(url).toBe('/api/stream_media/dQw4w9WgXcQ?type=video&quality=720p&start=45');
    });

    it('no debe anexar start si es 0 o negativo', () => {
      const url = getStreamMediaUrl('dQw4w9WgXcQ', 'video', '480p', 0);
      expect(url).not.toContain('&start=');
    });

    it('debe anteponer backendUrl si está configurado en localStorage', () => {
      setBackendUrl('http://raspberrypi.local:5000');
      const url = getStreamMediaUrl('abc12345678');
      expect(url).toBe('http://raspberrypi.local:5000/api/stream_media/abc12345678?type=video&quality=480p');
    });
  });

  describe('getDownloadUrl & Library URLs', () => {
    it('debe codificar componentes URL en getDownloadUrl', () => {
      const url = getDownloadUrl('https://youtube.com/watch?v=123&t=10', 'audio', 'mp3_320');
      expect(url).toBe('/api/download?url=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3D123%26t%3D10&type=audio&quality=mp3_320');
    });

    it('debe escapar correctamente nombres de archivo con espacios y caracteres especiales', () => {
      const streamUrl = getLibraryStreamUrl('canción rock & pop #1.mp3');
      const downloadUrl = getLibraryDownloadUrl('canción rock & pop #1.mp3');
      expect(streamUrl).toBe('/api/library/stream/canci%C3%B3n%20rock%20%26%20pop%20%231.mp3');
      expect(downloadUrl).toBe('/api/library/download/canci%C3%B3n%20rock%20%26%20pop%20%231.mp3');
    });
  });

  describe('Llamadas de red y manejo de errores (Fetch)', () => {
    it('searchYouTube: debe devolver resultados cuando la respuesta es ok', async () => {
      const mockResults = [{ id: '1', title: 'Song 1', duration: '3:20' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResults,
      });

      const res = await searchYouTube('queen bohemian', 10);
      expect(global.fetch).toHaveBeenCalledWith('/api/search?q=queen%20bohemian&limit=10');
      expect(res).toEqual(mockResults);
    });

    it('searchYouTube: debe capturar error HTTP y arrojar mensaje de detalle', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'YouTube limit exceeded' }),
      });

      await expect(searchYouTube('test')).rejects.toThrow('YouTube limit exceeded');
    });

    it('getVideoInfo: debe capturar error HTTP y fallbacks si JSON falla', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      await expect(getVideoInfo('https://youtu.be/invalid')).rejects.toThrow('Error analizando URL');
    });

    it('saveToServer: debe enviar payload JSON y headers correctos', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'queued', message: 'OK' }),
      });

      const res = await saveToServer('https://youtu.be/test', 'audio', 'mp3_320', 'Test Song');
      expect(global.fetch).toHaveBeenCalledWith('/api/save-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://youtu.be/test',
          format_type: 'audio',
          quality: 'mp3_320',
          title: 'Test Song'
        })
      });
      expect(res.status).toBe('queued');
    });

    it('getTelemetry: debe retornar null silenciosamente si ocurre un error de red', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      const res = await getTelemetry();
      expect(res).toBeNull();
    });

    it('deleteLibraryItem: debe enviar método DELETE y lanzar excepción si falla', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Archivo no encontrado' }),
      });

      await expect(deleteLibraryItem('missing.mp3')).rejects.toThrow('Archivo no encontrado');
    });
  });
});
