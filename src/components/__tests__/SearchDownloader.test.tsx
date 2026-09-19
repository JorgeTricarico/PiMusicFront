import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchDownloader } from '../SearchDownloader';
import { ToastProvider } from '../../context/ToastContext';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  searchYouTube: vi.fn(),
  getVideoInfo: vi.fn(),
  saveToServer: vi.fn(),
  getStreamMediaUrl: vi.fn(() => '/mock/stream/url'),
  getDownloadUrl: vi.fn(() => '/mock/download/url'),
}));

const mockResults: client.SearchResultItem[] = [
  {
    id: 'vid123',
    title: 'Cancion de Prueba',
    uploader: 'Artista Demo',
    duration: '03:45',
    duration_seconds: 225,
    thumbnail: 'https://i.ytimg.com/vi/vid123/hqdefault.jpg'
  },
  {
    id: 'vid456',
    title: 'Otra Cancion Rock',
    uploader: 'Banda Rock',
    duration: '04:10',
    duration_seconds: 250,
    thumbnail: 'https://i.ytimg.com/vi/vid456/hqdefault.jpg'
  }
];

const renderSearch = (onPlayPreview = vi.fn()) => {
  return render(
    <ToastProvider>
      <SearchDownloader onPlayPreview={onPlayPreview} />
    </ToastProvider>
  );
};

describe('SearchDownloader Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (client.searchYouTube as any).mockResolvedValue(mockResults);
  });

  it('debe realizar la búsqueda y mostrar los resultados con 480p por defecto', async () => {
    const onPlayPreview = vi.fn();
    renderSearch(onPlayPreview);

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    const searchBtn = screen.getByRole('button', { name: /Buscar/i });

    fireEvent.change(input, { target: { value: 'Cancion' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Resultados (2)')).toBeInTheDocument();
    });

    // Debe mostrar la opción de calidad 480p como recomendada por defecto
    const preselectionButtons = screen.getAllByRole('button', { name: /Ver 480p/i });
    expect(preselectionButtons.length).toBeGreaterThan(0);
  });

  it('debe reproducir en 480p (video) por defecto al pulsar Play', async () => {
    const onPlayPreview = vi.fn();
    renderSearch(onPlayPreview);

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.change(input, { target: { value: 'Cancion' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Cancion de Prueba')[0]).toBeInTheDocument();
    });

    // Pulsar el botón de reproducir 480p
    const playBtn = screen.getAllByRole('button', { name: /Ver 480p/i })[0];
    fireEvent.click(playBtn);

    expect(onPlayPreview).toHaveBeenCalledWith(
      'vid123',
      'Cancion de Prueba',
      'video',
      '480p',
      undefined,
      225
    );
  });

  it('debe permitir seleccionar 720p antes de darle a Play y reproducir en 720p', async () => {
    const onPlayPreview = vi.fn();
    renderSearch(onPlayPreview);

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.change(input, { target: { value: 'Cancion' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Cancion de Prueba')[0]).toBeInTheDocument();
    });

    // Seleccionar píldora 720p en la tarjeta
    const pill720p = screen.getAllByRole('button', { name: '720p' })[0];
    fireEvent.click(pill720p);

    // Ahora el botón debe decir "Ver 720p"
    const play720Btn = screen.getAllByRole('button', { name: /Ver 720p/i })[0];
    fireEvent.click(play720Btn);

    expect(onPlayPreview).toHaveBeenCalledWith(
      'vid123',
      'Cancion de Prueba',
      'video',
      '720p',
      undefined,
      225
    );
  });

  it('debe permitir seleccionar MP3 antes de darle a Play y reproducir en audio', async () => {
    const onPlayPreview = vi.fn();
    renderSearch(onPlayPreview);

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.change(input, { target: { value: 'Cancion' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Cancion de Prueba')[0]).toBeInTheDocument();
    });

    // Seleccionar píldora MP3 en la tarjeta
    const pillMP3 = screen.getAllByRole('button', { name: 'MP3' })[0];
    fireEvent.click(pillMP3);

    // Ahora el botón debe decir "Oír MP3"
    const playAudioBtn = screen.getAllByRole('button', { name: /Oír MP3/i })[0];
    fireEvent.click(playAudioBtn);

    expect(onPlayPreview).toHaveBeenCalledWith(
      'vid123',
      'Cancion de Prueba',
      'audio',
      'audio',
      undefined,
      225
    );
  });
});
