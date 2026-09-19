import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchDownloader } from '../SearchDownloader';
import { StreamPlayerModal } from '../StreamPlayerModal';
import { MiniPlayer } from '../MiniPlayer';
import { ToastProvider } from '../../context/ToastContext';
import * as client from '../../api/client';
import type { QualityId } from '../StreamPlayerModal';

vi.mock('../../api/client', () => ({
  searchYouTube: vi.fn(),
  getVideoInfo: vi.fn(),
  saveToServer: vi.fn(),
  getStreamMediaUrl: vi.fn((videoId, type, quality) => `/api/stream_media/${videoId}?type=${type}&quality=${quality}`),
  getDownloadUrl: vi.fn(() => '/mock/download/url'),
}));

// Componente Wrapper simulando el flujo de usuario en App
const TestFlowApp: React.FC = () => {
  const [streamTrack, setStreamTrack] = useState<{
    videoId: string;
    title: string;
    initialType?: 'audio' | 'video';
    initialQuality?: QualityId;
    initialTime?: number;
    duration?: number;
  } | null>(null);

  const [miniTrack, setMiniTrack] = useState<any | null>(null);

  const handlePlayPreview = (
    videoId: string,
    title: string,
    type: 'audio' | 'video',
    quality?: QualityId,
    _streamUrl?: string,
    duration?: number
  ) => {
    setMiniTrack(null);
    setStreamTrack({
      videoId,
      title,
      initialType: type,
      initialQuality: quality || (type === 'video' ? '480p' : 'audio'),
      duration,
    });
  };

  const handleMinimize = (state: {
    videoId: string;
    title: string;
    currentTime: number;
    quality: QualityId;
    isPlaying: boolean;
  }) => {
    setStreamTrack(null);
    setMiniTrack({
      videoId: state.videoId,
      title: state.title,
      currentTime: state.currentTime,
      quality: state.quality,
      type: state.quality === 'audio' ? 'audio' : 'video',
      isPlaying: state.isPlaying,
    });
  };

  const handleExpand = (currentTime: number, quality: QualityId) => {
    if (!miniTrack) return;
    const vid = miniTrack.videoId;
    const title = miniTrack.title;
    setMiniTrack(null);
    setStreamTrack({
      videoId: vid,
      title,
      initialQuality: quality,
      initialType: quality === 'audio' ? 'audio' : 'video',
      initialTime: currentTime,
    });
  };

  return (
    <ToastProvider>
      <div data-testid="app-container">
        {/* En modo no-fullscreen el reproductor está integrado arriba sin tapar con pantalla negra */}
        {streamTrack && (
          <div data-testid="integrated-player-section">
            <StreamPlayerModal
              track={streamTrack}
              onClose={() => setStreamTrack(null)}
              onMinimize={handleMinimize}
            />
          </div>
        )}

        <div data-testid="page-content">
          <SearchDownloader onPlayPreview={handlePlayPreview} />
        </div>

        {miniTrack && (
          <MiniPlayer
            track={miniTrack}
            onClose={() => setMiniTrack(null)}
            onExpand={handleExpand}
          />
        )}
      </div>
    </ToastProvider>
  );
};

describe('Player User Flow Integration Tests', () => {
  it('permite buscar, preseleccionar 720p, reproducir con spinner de carga, y minimizar a MiniPlayer', async () => {
    (client.searchYouTube as any).mockResolvedValue([
      {
        id: 'flowTest1',
        title: 'Cancion En Vivo',
        uploader: 'Canal Oficial',
        duration: '05:00',
        duration_seconds: 300,
        thumbnail: 'https://i.ytimg.com/vi/flowTest1/hqdefault.jpg',
      },
    ]);

    render(<TestFlowApp />);

    // 1. Buscar
    const searchInput = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.change(searchInput, { target: { value: 'Cancion' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Cancion En Vivo')[0]).toBeInTheDocument();
    });

    // 2. Preseleccionar 720p antes de dar play (usamos la píldora global o de la tarjeta)
    const btn720 = screen.getAllByRole('button', { name: '720p' })[0];
    fireEvent.click(btn720);

    // 3. Darle Play al botón "Ver 720p"
    const playBtn = screen.getAllByRole('button', { name: /Ver 720p/i })[0];
    fireEvent.click(playBtn);

    // 4. Verificar que se abrió el reproductor integrado y la página sigue visible abajo
    expect(screen.getByTestId('integrated-player-section')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();

    // 5. Verificar que mientras buferiza se muestra el spinner y NO el botón de Play
    expect(screen.getByTitle('Cargando video...')).toBeInTheDocument();
    expect(screen.queryByTitle('Reproducir')).not.toBeInTheDocument();

    // 6. Simular que el video empieza a reproducir
    const videoEl = document.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl?.src).toContain('quality=720p');
    fireEvent.playing(videoEl!);

    // Spinner desaparece y aparece botón de pausar
    expect(screen.queryByTitle('Cargando video...')).not.toBeInTheDocument();
    expect(screen.getByTitle('Pausar')).toBeInTheDocument();

    // 7. Minimizar el reproductor con el botón de chevron
    const minimizeBtn = screen.getByTitle('Minimizar reproductor');
    fireEvent.click(minimizeBtn);

    // El reproductor integrado se cierra y aparece el MiniPlayer flotante
    expect(screen.queryByTestId('integrated-player-section')).not.toBeInTheDocument();
    expect(screen.getAllByText('720p')[0]).toBeInTheDocument();
    expect(screen.getByTitle(/Expandir reproductor avanzado/i)).toBeInTheDocument();
  });
});
