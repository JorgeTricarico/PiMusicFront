import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamPlayerModal, StreamPlayerTrack } from '../StreamPlayerModal';
import { ToastProvider } from '../../context/ToastContext';

const mockTrack: StreamPlayerTrack = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  initialQuality: '480p',
  initialType: 'video',
  initialTime: 0
};

const renderModal = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );
};

describe('StreamPlayerModal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el título del track y el elemento de video en 480p por defecto', () => {
    const onClose = vi.fn();
    renderModal(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement?.src).toContain('/api/stream_media/dQw4w9WgXcQ?type=video&quality=480p');
  });

  it('debe permitir cambiar la calidad de reproducción desde el menú selector', () => {
    renderModal(<StreamPlayerModal track={mockTrack} onClose={vi.fn()} />);

    // Abrir menú de calidades
    const qualityButton = screen.getByTitle('Elegir calidad de streaming');
    fireEvent.click(qualityButton);

    // Debe mostrar las opciones
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('Solo Audio')).toBeInTheDocument();

    // Seleccionar "Solo Audio"
    const audioOption = screen.getByText('Solo Audio');
    fireEvent.click(audioOption);

    // Debe conmutar a etiqueta de audio o stream con quality=audio
    const media = document.querySelector('audio, video');
    expect(media?.src).toContain('/api/stream_media/dQw4w9WgXcQ?type=audio&quality=m4a');
  });

  it('debe ejecutar onClose al pulsar el botón de cerrar', () => {
    const onClose = vi.fn();
    renderModal(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

    const closeBtn = screen.getByTitle('Cerrar reproductor');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('debe ejecutar onMinimize conservando el estado actual de reproducción', () => {
    const onClose = vi.fn();
    const onMinimize = vi.fn();

    renderModal(
      <StreamPlayerModal
        track={mockTrack}
        onClose={onClose}
        onMinimize={onMinimize}
      />
    );

    const minimizeBtn = screen.getByTitle('Minimizar reproductor');
    fireEvent.click(minimizeBtn);

    expect(onMinimize).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: mockTrack.videoId,
        title: mockTrack.title,
        quality: '480p'
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('debe usar streamUrl directo si se pasa una pista local de la Raspberry Pi', () => {
    const localTrack: StreamPlayerTrack = {
      videoId: 'local_cancion.mp3',
      title: 'Canción Local Pi',
      initialQuality: 'audio',
      initialType: 'audio',
      streamUrl: '/api/library/stream/cancion.mp3'
    };

    renderModal(<StreamPlayerModal track={localTrack} onClose={vi.fn()} />);

    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement?.src).toContain('/api/library/stream/cancion.mp3');
  });

  it('debe permitir adelantar fuera del búfer solicitando el stream con parámetro start', () => {
    const trackWithDuration: StreamPlayerTrack = {
      ...mockTrack,
      duration: 300,
    };

    renderModal(<StreamPlayerModal track={trackWithDuration} onClose={vi.fn()} />);

    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement?.src).not.toContain('&start=');

    // Botón adelantar 10s
    const skipFwdBtn = screen.getByTitle('Adelantar 10s');
    fireEvent.click(skipFwdBtn);

    // Al adelantar fuera del búfer, el stream src se actualiza con start=10
    expect(videoElement?.src).toContain('&start=10');
  });

  it('debe mostrar el spinner de carga en el centro y NO mostrar el botón de play mientras está buferizando', () => {
    renderModal(<StreamPlayerModal track={mockTrack} onClose={vi.fn()} />);

    // Durante el estado inicial de buffering (isBuffering = true):
    expect(screen.getByTitle('Cargando video...')).toBeInTheDocument();
    expect(screen.queryByTitle('Reproducir')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Pausar')).not.toBeInTheDocument();
    expect(screen.getByText(/Cargando 480p/i)).toBeInTheDocument();
  });

  it('debe mostrar el botón de play/pause cuando el video dispara el evento de reproducción', () => {
    renderModal(<StreamPlayerModal track={mockTrack} onClose={vi.fn()} />);

    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();

    // Simular que el video comienza a reproducirse (evento onPlaying)
    fireEvent.playing(videoElement!);

    // Ahora no debe estar el spinner y debe aparecer el botón de pausar
    expect(screen.queryByTitle('Cargando video...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Pausar')).toBeInTheDocument();
  });

  it('no debe oscurecer la página con fondo negro opaco en modo sin fullscreen', () => {
    const { container } = renderModal(<StreamPlayerModal track={mockTrack} onClose={vi.fn()} />);

    // El contenedor principal en modo sin fullscreen no debe tener bg-black/90 ni fixed inset-0
    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).not.toContain('bg-black/90');
    expect(rootWrapper.className).toContain('w-full');
  });
});
