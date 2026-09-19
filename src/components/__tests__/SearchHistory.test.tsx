import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchDownloader, SEARCH_HISTORY_KEY, THEME_CHIPS } from '../SearchDownloader';
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
    id: 'vid1',
    title: 'Cancion Viral 2026',
    uploader: 'Artista 1',
    duration: '03:30',
    duration_seconds: 210,
    thumbnail: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
  },
];

const renderSearchDownloader = (onPlayPreview = vi.fn()) => {
  return render(
    <ToastProvider>
      <SearchDownloader onPlayPreview={onPlayPreview} />
    </ToastProvider>
  );
};

describe('SearchHistory & Touch Theme Chips Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (client.searchYouTube as any).mockResolvedValue(mockResults);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe desplegar el panel flotante de historial al enfocar el input si hay búsquedas previas', async () => {
    const previousHistory = ['Coldplay', 'Queen', 'Soda Stereo'];
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(previousHistory));

    renderSearchDownloader();

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);

    // Inicialmente no debe mostrarse el panel flotante
    expect(screen.queryByRole('region', { name: /Búsquedas recientes/i })).not.toBeInTheDocument();

    // Al enfocar el input
    fireEvent.focus(input);

    expect(screen.getByRole('region', { name: /Búsquedas recientes/i })).toBeInTheDocument();
    expect(screen.getByText('Coldplay')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
    expect(screen.getByText('Soda Stereo')).toBeInTheDocument();
  });

  it('permite ejecutar una búsqueda con 1 toque al pulsar un término del historial', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['Gustavo Cerati']));

    renderSearchDownloader();

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.focus(input);

    const historyItem = screen.getByText('Gustavo Cerati');
    fireEvent.click(historyItem);

    await waitFor(() => {
      expect(client.searchYouTube).toHaveBeenCalledWith('Gustavo Cerati', 16);
    });

    expect(input).toHaveValue('Gustavo Cerati');
  });

  it('permite eliminar un término individual con su icono de X', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['Termino Uno', 'Termino Dos']));

    renderSearchDownloader();

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.focus(input);

    expect(screen.getByText('Termino Uno')).toBeInTheDocument();
    expect(screen.getByText('Termino Dos')).toBeInTheDocument();

    const deleteBtn = screen.getByLabelText('Eliminar Termino Uno del historial');
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('Termino Uno')).not.toBeInTheDocument();
    expect(screen.getByText('Termino Dos')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    expect(saved).toEqual(['Termino Dos']);
  });

  it('permite borrar todo el historial con el botón "Borrar todo el historial"', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['Rock', 'Pop', 'Jazz']));

    renderSearchDownloader();

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    fireEvent.focus(input);

    const clearAllBtn = screen.getByRole('button', { name: /Borrar todo el historial/i });
    fireEvent.click(clearAllBtn);

    expect(screen.queryByText('Rock')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Búsquedas recientes/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(SEARCH_HISTORY_KEY)).toBeNull();
  });

  it('guarda nuevas búsquedas en localStorage limitando a 8 elementos y sin duplicados', async () => {
    const existing = ['1', '2', '3', '4', '5', '6', '7', '8'];
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(existing));

    renderSearchDownloader();

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    const searchBtn = screen.getByRole('button', { name: /Buscar/i });

    // Buscar término nuevo '9'
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(client.searchYouTube).toHaveBeenCalledWith('9', 16);
    });

    const savedAfterNew = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    expect(savedAfterNew.length).toBe(8);
    expect(savedAfterNew[0]).toBe('9');
    expect(savedAfterNew).not.toContain('8'); // el más viejo fue descartado

    // Buscar término existente para verificar deduplicación y reposicionamiento al frente
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(client.searchYouTube).toHaveBeenCalledWith('4', 16);
    });

    const savedAfterDedup = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    expect(savedAfterDedup.length).toBe(8);
    expect(savedAfterDedup[0]).toBe('4');
    expect(savedAfterDedup.filter((x: string) => x === '4').length).toBe(1);
  });

  it('muestra todos los chips temáticos y al tocar uno autocompleta y ejecuta la búsqueda', async () => {
    renderSearchDownloader();

    // Verificar presencia de todos los chips requeridos
    const expectedChips = [
      '🔥 Tendencias',
      '🎸 Acústico',
      '🎵 En Vivo',
      '🎧 Lo-Fi',
      '📻 Cumbia & Cuarteto',
      '🎙️ Podcasts',
      '⚡ Remix',
    ];

    expectedChips.forEach((chip) => {
      expect(screen.getByRole('button', { name: chip })).toBeInTheDocument();
    });

    // Al hacer click en "🎧 Lo-Fi"
    const lofiChip = screen.getByRole('button', { name: '🎧 Lo-Fi' });
    fireEvent.click(lofiChip);

    await waitFor(() => {
      expect(client.searchYouTube).toHaveBeenCalledWith('🎧 Lo-Fi', 16);
    });

    const input = screen.getByPlaceholderText(/Escribe la canción o artista/i);
    expect(input).toHaveValue('🎧 Lo-Fi');

    // Debe haberse guardado en el historial
    const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    expect(saved[0]).toBe('🎧 Lo-Fi');
  });
});
