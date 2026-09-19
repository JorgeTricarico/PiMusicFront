import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { QueueProvider, useQueue } from '../QueueContext';
import type { StreamPlayerTrack } from '../../components/StreamPlayerModal';

const track1: StreamPlayerTrack = {
  videoId: 'video1',
  title: 'Canción Uno',
  duration: 180,
  initialQuality: '480p',
  initialType: 'video',
};

const track2: StreamPlayerTrack = {
  videoId: 'video2',
  title: 'Canción Dos',
  duration: 210,
  initialQuality: 'audio',
  initialType: 'audio',
};

const track3: StreamPlayerTrack = {
  videoId: 'video3',
  title: 'Canción Tres',
  duration: 195,
  initialQuality: '720p',
  initialType: 'video',
};

describe('QueueContext Tests', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueueProvider>{children}</QueueProvider>
  );

  it('debe inicializarse con cola vacía y currentIndex en -1', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    expect(result.current.queue).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.canSkipNext).toBe(false);
    expect(result.current.canSkipPrev).toBe(false);
  });

  it('debe agregar pistas con addToQueue y ajustar currentIndex si estaba vacía', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
    });

    expect(result.current.queue.length).toBe(1);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentTrack?.title).toBe('Canción Uno');
    expect(result.current.canSkipNext).toBe(false);

    act(() => {
      result.current.addToQueue(track2);
    });

    expect(result.current.queue.length).toBe(2);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canSkipNext).toBe(true);
    expect(result.current.queue[1].videoId).toBe('video2');
  });

  it('debe insertar pista inmediatamente siguiente con playNext', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track3);
    });

    expect(result.current.queue.map((t) => t.videoId)).toEqual(['video1', 'video3']);

    act(() => {
      result.current.playNext(track2);
    });

    // track2 debe haberse insertado después de track1 (índice 1)
    expect(result.current.queue.map((t) => t.videoId)).toEqual(['video1', 'video2', 'video3']);
  });

  it('playNext con cola vacía debe agregar la pista como primera', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.playNext(track1);
    });

    expect(result.current.queue.length).toBe(1);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentTrack?.videoId).toBe('video1');
  });

  it('debe avanzar a la siguiente pista con skipToNext y regresar con skipToPrev', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track2);
    });

    let nextTrack: StreamPlayerTrack | null = null;
    act(() => {
      nextTrack = result.current.skipToNext();
    });

    expect(nextTrack?.videoId).toBe('video2');
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.canSkipPrev).toBe(true);
    expect(result.current.canSkipNext).toBe(false);

    // Intentar avanzar cuando ya está en la última pista debe retornar null
    let beyondTrack: StreamPlayerTrack | null = null;
    act(() => {
      beyondTrack = result.current.skipToNext();
    });
    expect(beyondTrack).toBeNull();
    expect(result.current.currentIndex).toBe(1);

    // Regresar con skipToPrev
    let prevTrack: StreamPlayerTrack | null = null;
    act(() => {
      prevTrack = result.current.skipToPrev();
    });

    expect(prevTrack?.videoId).toBe('video1');
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canSkipPrev).toBe(false);

    // Intentar retroceder en la primera pista debe retornar null
    let beforeTrack: StreamPlayerTrack | null = null;
    act(() => {
      beforeTrack = result.current.skipToPrev();
    });
    expect(beforeTrack).toBeNull();
    expect(result.current.currentIndex).toBe(0);
  });

  it('debe soportar autoplay continuo con handleTrackEnded()', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track2);
      result.current.addToQueue(track3);
    });

    expect(result.current.currentIndex).toBe(0);

    // Finaliza track 1 -> reproduce track 2
    let next: StreamPlayerTrack | null = null;
    act(() => {
      next = result.current.handleTrackEnded();
    });

    expect(next?.videoId).toBe('video2');
    expect(result.current.currentIndex).toBe(1);

    // Finaliza track 2 -> reproduce track 3
    act(() => {
      next = result.current.handleTrackEnded();
    });

    expect(next?.videoId).toBe('video3');
    expect(result.current.currentIndex).toBe(2);

    // Finaliza track 3 -> fin de la cola, retorna null
    act(() => {
      next = result.current.handleTrackEnded();
    });

    expect(next).toBeNull();
    expect(result.current.currentIndex).toBe(2);
  });

  it('debe eliminar elementos con removeFromQueue y ajustar índices correctamente', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track2);
      result.current.addToQueue(track3);
    });

    // Mover a la pista 1 (track2)
    act(() => {
      result.current.skipToNext();
    });
    expect(result.current.currentIndex).toBe(1);

    // Eliminar la pista 0 (track1 antes del currentIndex)
    act(() => {
      result.current.removeFromQueue(0);
    });

    expect(result.current.queue.length).toBe(2);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentTrack?.videoId).toBe('video2');

    // Eliminar la pista 1 (track3 después del currentIndex)
    act(() => {
      result.current.removeFromQueue(1);
    });

    expect(result.current.queue.length).toBe(1);
    expect(result.current.currentIndex).toBe(0);

    // Eliminar la única pista restante
    act(() => {
      result.current.removeFromQueue(0);
    });

    expect(result.current.queue.length).toBe(0);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentTrack).toBeNull();
  });

  it('debe vaciar la cola con clearQueue', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track2);
    });

    expect(result.current.queue.length).toBe(2);

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.queue).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentTrack).toBeNull();
  });

  it('playTrack debe saltar si la pista ya existe o agregarla si no existe', () => {
    const { result } = renderHook(() => useQueue(), { wrapper });

    act(() => {
      result.current.addToQueue(track1);
      result.current.addToQueue(track2);
    });

    expect(result.current.currentIndex).toBe(0);

    // playTrack con track2 que ya está en cola
    act(() => {
      result.current.playTrack(track2);
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentTrack?.videoId).toBe('video2');

    // playTrack con track3 que es nueva
    act(() => {
      result.current.playTrack(track3);
    });

    expect(result.current.queue.length).toBe(3);
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentTrack?.videoId).toBe('video3');
  });
});
