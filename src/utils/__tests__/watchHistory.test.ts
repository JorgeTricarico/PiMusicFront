import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveWatchProgress,
  getWatchProgress,
  getWatchHistory,
  removeWatchProgress,
  clearWatchHistory,
  formatDuration,
  formatRemainingTime,
  WATCH_HISTORY_KEY,
  MAX_WATCH_HISTORY_ITEMS,
  WatchProgress
} from '../watchHistory';

describe('watchHistory persistence module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveWatchProgress & getWatchProgress', () => {
    it('no debe guardar progreso si currentTime < 5 segundos', () => {
      const progress: WatchProgress = {
        videoId: 'video-short',
        title: 'Video Corto',
        currentTime: 4,
        duration: 300,
        quality: '720p',
        type: 'video',
        updatedAt: Date.now()
      };

      saveWatchProgress(progress);
      expect(getWatchProgress('video-short')).toBeNull();
      expect(localStorage.getItem(WATCH_HISTORY_KEY)).toBeNull();
    });

    it('debe guardar progreso si currentTime >= 5 y currentTime <= duration - 15', () => {
      const progress: WatchProgress = {
        videoId: 'video-valid',
        title: 'Video Válido',
        channel: 'Canal Demo',
        currentTime: 45,
        duration: 200,
        quality: '480p',
        type: 'video',
        updatedAt: 1000
      };

      saveWatchProgress(progress);
      const saved = getWatchProgress('video-valid');

      expect(saved).not.toBeNull();
      expect(saved?.videoId).toBe('video-valid');
      expect(saved?.currentTime).toBe(45);
      expect(saved?.duration).toBe(200);
      expect(saved?.channel).toBe('Canal Demo');
      expect(saved?.completed).toBe(false);
    });

    it('debe marcar como completado si currentTime > duration - 15', () => {
      // Primero guardamos en progreso válido
      saveWatchProgress({
        videoId: 'video-end',
        title: 'Video por Terminar',
        currentTime: 50,
        duration: 100,
        quality: '720p',
        type: 'video',
        updatedAt: 1000
      });

      expect(getWatchProgress('video-end')).not.toBeNull();

      // Ahora el usuario llega casi al final (> 100 - 15 = 85s, ej. 90s)
      saveWatchProgress({
        videoId: 'video-end',
        title: 'Video por Terminar',
        currentTime: 90,
        duration: 100,
        quality: '720p',
        type: 'video',
        updatedAt: 2000
      });

      // getWatchProgress debe retornar null porque ya se completó
      expect(getWatchProgress('video-end')).toBeNull();

      // getWatchHistory tampoco debe incluirlo
      const history = getWatchHistory();
      expect(history.find((v) => v.videoId === 'video-end')).toBeUndefined();
    });

    it('actualiza el progreso existente y lo posiciona al inicio', () => {
      saveWatchProgress({
        videoId: 'v1',
        title: 'Video 1',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 100
      });

      saveWatchProgress({
        videoId: 'v2',
        title: 'Video 2',
        currentTime: 20,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 200
      });

      // Actualizar v1
      saveWatchProgress({
        videoId: 'v1',
        title: 'Video 1',
        currentTime: 50,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 300
      });

      const history = getWatchHistory();
      expect(history).toHaveLength(2);
      expect(history[0].videoId).toBe('v1');
      expect(history[0].currentTime).toBe(50);
      expect(history[1].videoId).toBe('v2');
    });

    it(`no debe almacenar más de ${MAX_WATCH_HISTORY_ITEMS} videos`, () => {
      for (let i = 1; i <= 25; i++) {
        saveWatchProgress({
          videoId: `vid-${i}`,
          title: `Video ${i}`,
          currentTime: 10,
          duration: 100,
          quality: '480p',
          type: 'video',
          updatedAt: i * 10
        });
      }

      const history = getWatchHistory();
      expect(history.length).toBe(MAX_WATCH_HISTORY_ITEMS);
      // El más reciente debe ser el 25
      expect(history[0].videoId).toBe('vid-25');
      // El 1 ya debe haber sido descartado
      expect(history.find((v) => v.videoId === 'vid-1')).toBeUndefined();
    });
  });

  describe('getWatchHistory', () => {
    it('retorna lista vacía si no hay registros o localStorage está vacío', () => {
      expect(getWatchHistory()).toEqual([]);
    });

    it('maneja JSON corrupto en localStorage sin arrojar error', () => {
      localStorage.setItem(WATCH_HISTORY_KEY, '{invalidJson:::');
      expect(getWatchHistory()).toEqual([]);
    });

    it('ordena los videos por updatedAt descendente', () => {
      saveWatchProgress({
        videoId: 'vA',
        title: 'Video A',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 500
      });
      saveWatchProgress({
        videoId: 'vB',
        title: 'Video B',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 1500
      });
      saveWatchProgress({
        videoId: 'vC',
        title: 'Video C',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 1000
      });

      const history = getWatchHistory();
      expect(history.map((item) => item.videoId)).toEqual(['vB', 'vC', 'vA']);
    });
  });

  describe('removeWatchProgress & clearWatchHistory', () => {
    it('elimina un video específico del progreso guardado', () => {
      saveWatchProgress({
        videoId: 'v1',
        title: 'Video 1',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 100
      });
      saveWatchProgress({
        videoId: 'v2',
        title: 'Video 2',
        currentTime: 15,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 200
      });

      removeWatchProgress('v1');

      expect(getWatchProgress('v1')).toBeNull();
      expect(getWatchProgress('v2')).not.toBeNull();
      expect(getWatchHistory()).toHaveLength(1);
    });

    it('borra todo el historial con clearWatchHistory', () => {
      saveWatchProgress({
        videoId: 'v1',
        title: 'Video 1',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 100
      });

      clearWatchHistory();

      expect(getWatchHistory()).toHaveLength(0);
      expect(getWatchProgress('v1')).toBeNull();
    });

    it('dispara el evento watchHistoryUpdated al guardar, remover o borrar', () => {
      const listener = vi.fn();
      window.addEventListener('watchHistoryUpdated', listener);

      saveWatchProgress({
        videoId: 'v1',
        title: 'Video 1',
        currentTime: 10,
        duration: 100,
        quality: '480p',
        type: 'video',
        updatedAt: 100
      });
      expect(listener).toHaveBeenCalledTimes(1);

      removeWatchProgress('v1');
      expect(listener).toHaveBeenCalledTimes(2);

      clearWatchHistory();
      expect(listener).toHaveBeenCalledTimes(3);

      window.removeEventListener('watchHistoryUpdated', listener);
    });
  });

  describe('formatDuration', () => {
    it('formatea segundos a mm:ss', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(599)).toBe('09:59');
    });

    it('formatea horas a hh:mm:ss', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3665)).toBe('1:01:05');
      expect(formatDuration(7200)).toBe('2:00:00');
    });

    it('retorna 00:00 para valores inválidos o negativos', () => {
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(NaN)).toBe('00:00');
    });
  });

  describe('formatRemainingTime', () => {
    it('muestra "Menos de 1 min" para 0 o negativos', () => {
      expect(formatRemainingTime(0)).toBe('Menos de 1 min');
      expect(formatRemainingTime(-5)).toBe('Menos de 1 min');
    });

    it('muestra "Te quedan X min" para menos de 60 minutos', () => {
      expect(formatRemainingTime(60)).toBe('Te quedan 1 min');
      expect(formatRemainingTime(900)).toBe('Te quedan 15 min');
      expect(formatRemainingTime(1800)).toBe('Te quedan 30 min');
    });

    it('muestra horas y minutos para duraciones largas', () => {
      expect(formatRemainingTime(3600)).toBe('Te quedan 1 h');
      expect(formatRemainingTime(4500)).toBe('Te quedan 1 h 15 min');
    });
  });
});
