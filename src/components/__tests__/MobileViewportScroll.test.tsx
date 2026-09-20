import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../../App';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  getTelemetry: vi.fn().mockResolvedValue({ status: 'ok', cpu_usage: 10, memory_usage: 20 }),
  searchYouTube: vi.fn(),
  getVideoInfo: vi.fn(),
  saveToServer: vi.fn(),
  getStreamMediaUrl: vi.fn((videoId, type, quality) => `/api/stream_media/${videoId}?type=${type}&quality=${quality}`),
  getDownloadUrl: vi.fn(() => '/mock/download/url'),
  getRecommendationsFeed: vi.fn().mockResolvedValue({
    hero: { id: 'hero1', title: 'Hero Track', uploader: 'Hero Artist', type: 'video' },
    sections: []
  }),
  recordHistory: vi.fn(),
}));

describe('Mobile Viewport & Layout Auto-Scroll Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('debe hacer scroll hacia arriba y enfocar la sección del reproductor al pulsar Play desde los resultados', async () => {
    (client.searchYouTube as any).mockResolvedValue([
      {
        id: 'mobileVid1',
        title: 'Video en Posicion Inferior',
        uploader: 'Canal Musical',
        duration: '03:30',
        duration_seconds: 210,
        thumbnail: 'https://i.ytimg.com/vi/mobileVid1/hqdefault.jpg'
      }
    ]);

    render(<App />);

    // Cambiar a pestaña de búsqueda
    const searchTabs = screen.getAllByRole('button', { name: /buscador/i });
    fireEvent.click(searchTabs[0]);

    // Simular búsqueda
    const searchInput = screen.getByPlaceholderText(/Escribe la canción o artista/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Posicion Inferior' } });
    expect(searchInput.value).toBe('Posicion Inferior');

    const form = searchInput.closest('form')!;
    fireEvent.submit(form);

    expect(client.searchYouTube).toHaveBeenCalledWith('Posicion Inferior', 16);

    await waitFor(() => {
      expect(screen.getAllByText('Video en Posicion Inferior')[0]).toBeInTheDocument();
    });

    // Inicialmente no hay reproductor montado
    expect(screen.queryByTestId('player-section')).not.toBeInTheDocument();

    // Darle Play al video
    const playBtn = screen.getAllByRole('button', { name: /Ver 480p/i })[0];
    fireEvent.click(playBtn);

    // 1. Verificar que window.scrollTo se llamó con { top: 0, behavior: 'smooth' }
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // 2. Verificar que la sección del reproductor se montó en el DOM
    await waitFor(() => {
      const playerSection = screen.getByTestId('player-section');
      expect(playerSection).toBeInTheDocument();
      expect(playerSection).toHaveAttribute('tabIndex', '-1');
      expect(playerSection.className).toContain('scroll-mt-14');
    });

    // 3. Verificar que scrollIntoView fue llamado sobre la sección del reproductor
    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth', block: 'start' })
      );
    });
  });

  it('en móvil (< md), la sección del reproductor tiene padding optimizado y clases de protagonismo visual', async () => {
    (client.searchYouTube as any).mockResolvedValue([
      {
        id: 'mobileVid2',
        title: 'Segundo Video Prueba',
        uploader: 'Artista Demo',
        duration: '04:00',
        duration_seconds: 240,
        thumbnail: 'https://i.ytimg.com/vi/mobileVid2/hqdefault.jpg'
      }
    ]);

    render(<App />);

    const searchTabs = screen.getAllByRole('button', { name: /buscador/i });
    fireEvent.click(searchTabs[0]);

    const searchInput = screen.getByPlaceholderText(/Escribe la canción o artista/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Segundo' } });
    expect(searchInput.value).toBe('Segundo');

    const form = searchInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getAllByText('Segundo Video Prueba')[0]).toBeInTheDocument();
    });

    const playBtn = screen.getAllByRole('button', { name: /Ver 480p/i })[0];
    await act(async () => {
      fireEvent.click(playBtn);
    });

    await waitFor(() => {
      const section = screen.getByTestId('player-section');
      // Verificamos clases mobile-first: py-1.5 px-1 para ocupar máximo ancho en móvil sin desbordar
      expect(section.className).toContain('py-1.5');
      expect(section.className).toContain('px-1');
      expect(section.className).toContain('animate-fadeIn');
      expect(section.className).toContain('bg-slate-950/95');
    });
  });
});
