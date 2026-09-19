import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isMediaSessionSupported,
  generateArtworkList,
  updateMediaSessionMetadata,
  setMediaSessionActionHandlers,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
  clearMediaSessionActionHandlers,
  clearMediaSession,
} from '../mediaSession';

describe('MediaSession Utility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof navigator !== 'undefined' && navigator.mediaSession) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  });

  describe('generateArtworkList', () => {
    it('debe generar carátulas con resoluciones 96, 128, 256 y 512 para un videoId de YouTube', () => {
      const artworks = generateArtworkList(undefined, 'dQw4w9WgXcQ');
      expect(artworks).toHaveLength(4);

      const sizes = artworks.map((a) => a.sizes);
      expect(sizes).toContain('96x96');
      expect(sizes).toContain('128x128');
      expect(sizes).toContain('256x256');
      expect(sizes).toContain('512x512');

      expect(artworks[0].src).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg');
      expect(artworks[3].src).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
    });

    it('debe generar carátulas de 96, 128, 256 y 512 si se provee una URL de carátula directa', () => {
      const customUrl = 'https://example.com/cover.jpg';
      const artworks = generateArtworkList(customUrl, undefined);
      expect(artworks).toHaveLength(4);

      const sizes = artworks.map((a) => a.sizes);
      expect(sizes).toEqual(['96x96', '128x128', '256x256', '512x512']);
      expect(artworks.every((a) => a.src === customUrl)).toBe(true);
    });

    it('debe retornar lista vacía si es un archivo local sin artworkUrl', () => {
      const artworks = generateArtworkList(undefined, 'local_song.mp3');
      expect(artworks).toEqual([]);
    });
  });

  describe('updateMediaSessionMetadata', () => {
    it('debe actualizar los metadatos con título, canal y carátulas HD', () => {
      updateMediaSessionMetadata({
        title: 'Bohemian Rhapsody',
        channel: 'Queen Official',
        videoId: 'fJ9rUzIMcZQ',
      });

      expect(navigator.mediaSession.metadata).not.toBeNull();
      expect(navigator.mediaSession.metadata?.title).toBe('Bohemian Rhapsody');
      expect(navigator.mediaSession.metadata?.artist).toBe('Queen Official');
      expect(navigator.mediaSession.metadata?.artwork).toHaveLength(4);
    });

    it('debe priorizar channel sobre artist si ambos están presentes', () => {
      updateMediaSessionMetadata({
        title: 'Song Title',
        channel: 'Channel Name',
        artist: 'Artist Name',
      });

      expect(navigator.mediaSession.metadata?.artist).toBe('Channel Name');
    });

    it('debe usar artist si channel no está presente', () => {
      updateMediaSessionMetadata({
        title: 'Song Title',
        artist: 'Solo Artist',
      });

      expect(navigator.mediaSession.metadata?.artist).toBe('Solo Artist');
    });
  });

  describe('setMediaSessionActionHandlers', () => {
    it('debe registrar todos los manejadores de hardware (play, pause, seekbackward, seekforward, previoustrack, nexttrack, seekto)', () => {
      const handlers = {
        play: vi.fn(),
        pause: vi.fn(),
        seekbackward: vi.fn(),
        seekforward: vi.fn(),
        previoustrack: vi.fn(),
        nexttrack: vi.fn(),
        seekto: vi.fn(),
      };

      setMediaSessionActionHandlers(handlers);

      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekbackward', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekforward', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('previoustrack', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekto', expect.any(Function));

      // Probar invocación de handlers
      const registeredHandlers = (navigator.mediaSession as any)._handlers as Map<string, Function>;
      registeredHandlers.get('play')?.();
      expect(handlers.play).toHaveBeenCalledTimes(1);

      registeredHandlers.get('seekbackward')?.({ seekOffset: 15 });
      expect(handlers.seekbackward).toHaveBeenCalledWith({ seekOffset: 15 });

      registeredHandlers.get('seekto')?.({ seekTime: 42 });
      expect(handlers.seekto).toHaveBeenCalledWith({ seekTime: 42 });
    });
  });

  describe('updateMediaSessionPlaybackState', () => {
    it('debe cambiar el estado a playing, paused o none', () => {
      updateMediaSessionPlaybackState('playing');
      expect(navigator.mediaSession.playbackState).toBe('playing');

      updateMediaSessionPlaybackState('paused');
      expect(navigator.mediaSession.playbackState).toBe('paused');

      updateMediaSessionPlaybackState('none');
      expect(navigator.mediaSession.playbackState).toBe('none');
    });
  });

  describe('updateMediaSessionPositionState', () => {
    it('debe llamar a setPositionState con valores válidos', () => {
      updateMediaSessionPositionState({
        duration: 180,
        playbackRate: 1.25,
        position: 45,
      });

      expect(navigator.mediaSession.setPositionState).toHaveBeenCalledWith({
        duration: 180,
        playbackRate: 1.25,
        position: 45,
      });
    });

    it('no debe llamar a setPositionState si la duración o posición no son números finitos válidos', () => {
      updateMediaSessionPositionState({
        duration: 0,
        position: 10,
      });
      expect(navigator.mediaSession.setPositionState).not.toHaveBeenCalled();

      updateMediaSessionPositionState({
        duration: NaN,
        position: 10,
      });
      expect(navigator.mediaSession.setPositionState).not.toHaveBeenCalled();
    });
  });

  describe('clearMediaSession & clearMediaSessionActionHandlers', () => {
    it('debe remover los action handlers asignándolos a null', () => {
      clearMediaSessionActionHandlers();
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', null);
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', null);
    });

    it('debe limpiar metadatos y estado al invocar clearMediaSession', () => {
      updateMediaSessionMetadata({ title: 'Canción' });
      updateMediaSessionPlaybackState('playing');

      clearMediaSession();

      expect(navigator.mediaSession.metadata).toBeNull();
      expect(navigator.mediaSession.playbackState).toBe('none');
    });
  });

  describe('isMediaSessionSupported', () => {
    it('debe retornar true cuando navigator.mediaSession está presente', () => {
      expect(isMediaSessionSupported()).toBe(true);
    });
  });
});
