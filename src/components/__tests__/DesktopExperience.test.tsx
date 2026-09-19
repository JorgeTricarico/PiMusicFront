import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamPlayerModal, StreamPlayerTrack } from '../StreamPlayerModal';
import { SearchDownloader } from '../SearchDownloader';
import { ToastProvider } from '../../context/ToastContext';
import { QueueProvider } from '../../context/QueueContext';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  searchYouTube: vi.fn(),
  getVideoInfo: vi.fn(),
  saveToServer: vi.fn(),
  getStreamMediaUrl: vi.fn((id, type, q, start) => `/api/stream_media/${id}?type=${type}&quality=${q}${start ? `&start=${start}` : ''}`),
  getDownloadUrl: vi.fn(() => '/mock/download/url'),
}));

const mockTrack: StreamPlayerTrack = {
  videoId: 'desktop_test_vid',
  title: 'Canción de Prueba Desktop Experience',
  initialQuality: '480p',
  initialType: 'video',
  initialTime: 0,
  duration: 200, // 200 segundos
};

const renderPlayer = (track: StreamPlayerTrack = mockTrack, onClose = vi.fn()) => {
  return render(
    <ToastProvider>
      <QueueProvider>
        <StreamPlayerModal track={track} onClose={onClose} />
      </QueueProvider>
    </ToastProvider>
  );
};

const renderSearch = (onPlayPreview = vi.fn()) => {
  return render(
    <ToastProvider>
      <QueueProvider>
        <SearchDownloader onPlayPreview={onPlayPreview} />
      </QueueProvider>
    </ToastProvider>
  );
};

describe('DesktopExperience - Atajos de Teclado, Modo Teatro y Control por Ratón', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Atajos de Teclado Estilo YouTube en StreamPlayerModal', () => {
    it('debe alternar Play/Pause con la tecla k y la tecla Espacio', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();

      // Inicialmente en buffer
      fireEvent.playing(videoElement);
      expect(screen.getByTitle('Pausar')).toBeInTheDocument();

      // Pulsar 'k' debe pausar
      fireEvent.keyDown(window, { key: 'k' });
      expect(videoElement.pause).toHaveBeenCalled();
      expect(screen.getByTitle('Reproducir')).toBeInTheDocument();

      // Pulsar ' ' (Espacio) debe volver a reproducir
      fireEvent.keyDown(window, { key: ' ' });
      expect(videoElement.play).toHaveBeenCalled();
    });

    it('debe alternar Mute con la tecla m / M', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;

      // Por defecto no está muteado
      expect(videoElement.muted).toBe(false);

      // Presionar 'm' para silenciar
      fireEvent.keyDown(window, { key: 'm' });
      expect(videoElement.muted).toBe(true);

      // Presionar 'M' para restaurar sonido
      fireEvent.keyDown(window, { key: 'M' });
      expect(videoElement.muted).toBe(false);
    });

    it('debe retroceder y adelantar 10s con teclas j, l y flechas izquierda/derecha', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;

      // Presionar 'l' o 'ArrowRight' adelanta 10s (genera start=10 al salir de buffer)
      fireEvent.keyDown(window, { key: 'l' });
      expect(videoElement.src).toContain('start=10');

      // Adelantar 10s más con ArrowRight -> start=20
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(videoElement.src).toContain('start=20');

      // Retroceder 10s con 'j' -> start=10
      fireEvent.keyDown(window, { key: 'j' });
      expect(videoElement.src).toContain('start=10');

      // Retroceder 10s con ArrowLeft -> start=0 (o sin parámetro start)
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(videoElement.src).not.toContain('start=10');
    });

    it('debe subir y bajar el volumen en 5% con ArrowUp y ArrowDown', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement.volume).toBe(1);

      // ArrowDown disminuye en 5% -> 0.95
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(videoElement.volume).toBeCloseTo(0.95, 2);

      // ArrowUp incrementa en 5% -> 1.0
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(videoElement.volume).toBeCloseTo(1, 2);
    });

    it('debe saltar al porcentaje correspondiente del video con teclas numéricas 0 a 9', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;

      // Duración mock: 200 segundos
      // Presionar tecla '5' debe saltar al 50% = 100 segundos
      fireEvent.keyDown(window, { key: '5' });
      expect(videoElement.src).toContain('start=100');

      // Presionar tecla '2' debe saltar al 20% = 40 segundos
      fireEvent.keyDown(window, { key: '2' });
      expect(videoElement.src).toContain('start=40');

      // Presionar tecla '0' debe saltar al 0%
      fireEvent.keyDown(window, { key: '0' });
      expect(videoElement.src).not.toContain('start=40');
    });

    it('debe alternar Modo Teatro (ancho regular vs cinematográfico) con la tecla t / T y el botón de toolbar', () => {
      renderPlayer();
      const playerContainer = screen.getByTestId('player-container');

      // Inicialmente en vista estándar: max-w-4xl
      expect(playerContainer.className).toContain('max-w-4xl');
      expect(playerContainer.className).not.toContain('max-w-7xl');

      // Presionar tecla 't' activa Modo Teatro -> max-w-7xl
      fireEvent.keyDown(window, { key: 't' });
      expect(playerContainer.className).toContain('max-w-7xl');
      expect(playerContainer.className).not.toContain('max-w-4xl');

      // Presionar tecla 'T' desactiva Modo Teatro -> vuelve a max-w-4xl
      fireEvent.keyDown(window, { key: 'T' });
      expect(playerContainer.className).toContain('max-w-4xl');

      // Probar el botón interactivo de Modo Teatro
      const theaterBtn = screen.getByTestId('theater-mode-btn');
      fireEvent.click(theaterBtn);
      expect(playerContainer.className).toContain('max-w-7xl');

      fireEvent.click(theaterBtn);
      expect(playerContainer.className).toContain('max-w-4xl');
    });

    it('no debe disparar atajos si el foco está dentro de un campo input o textarea', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      videoElement.volume = 0.5;

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Disparar ArrowUp mientras se edita input no debe alterar volumen
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(videoElement.volume).toBe(0.5);

      document.body.removeChild(input);
    });
  });

  describe('Control de Volumen con la Rueda del Ratón (onWheel)', () => {
    it('debe disminuir el volumen al scrollear hacia abajo (deltaY > 0)', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement.volume).toBe(1);

      const playerContainer = screen.getByTestId('player-container');
      fireEvent.wheel(playerContainer, { deltaY: 100 });

      expect(videoElement.volume).toBeCloseTo(0.95, 2);
    });

    it('debe aumentar el volumen al scrollear hacia arriba (deltaY < 0)', () => {
      renderPlayer();
      const videoElement = document.querySelector('video') as HTMLVideoElement;

      const playerContainer = screen.getByTestId('player-container');
      // Bajar volumen primero
      fireEvent.wheel(playerContainer, { deltaY: 100 });
      expect(videoElement.volume).toBeCloseTo(0.95, 2);

      // Ahora subir volumen con deltaY < 0
      fireEvent.wheel(playerContainer, { deltaY: -100 });
      expect(videoElement.volume).toBeCloseTo(1, 2);
    });
  });

  describe('Modal de Atajos de Teclado Desktop', () => {
    it('debe abrir la guía visual de atajos al pulsar el botón Keyboard o la tecla ?', () => {
      renderPlayer();

      const shortcutsBtn = screen.getByTestId('keyboard-shortcuts-btn');
      fireEvent.click(shortcutsBtn);

      // Debe mostrar el modal con el título y las teclas
      expect(screen.getByRole('dialog', { name: /Atajos de teclado/i })).toBeInTheDocument();
      expect(screen.getByText('Estilo YouTube')).toBeInTheDocument();
      expect(screen.getByText('Reproducir / Pausar video o audio')).toBeInTheDocument();
      expect(screen.getByText('Alternar Modo Teatro (ancho expandido)')).toBeInTheDocument();

      // Cerrar con botón 'Entendido'
      fireEvent.click(screen.getByRole('button', { name: /Entendido/i }));
      expect(screen.queryByRole('dialog', { name: /Atajos de teclado/i })).not.toBeInTheDocument();

      // Abrir con tecla '?'
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByRole('dialog', { name: /Atajos de teclado/i })).toBeInTheDocument();

      // Cerrar con tecla 'Escape'
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /Atajos de teclado/i })).not.toBeInTheDocument();
    });
  });

  describe('SearchDownloader - Experiencia Desktop y Atajo /', () => {
    it('debe enfocar inmediatamente el input de búsqueda al presionar la tecla /', () => {
      renderSearch();

      const searchInput = screen.getByTestId('search-input');
      expect(document.activeElement).not.toBe(searchInput);

      // Presionar '/' a nivel global
      fireEvent.keyDown(window, { key: '/' });
      expect(document.activeElement).toBe(searchInput);
    });

    it('debe renderizar la cuadrícula optimizada para pantallas grandes con sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-7xl', async () => {
      const mockResults: client.SearchResultItem[] = [
        {
          id: 'v1',
          title: 'Track 1 HD',
          uploader: 'Artist 1',
          duration: '03:30',
          duration_seconds: 210,
          thumbnail: 'https://i.ytimg.com/vi/v1/hqdefault.jpg',
        },
        {
          id: 'v2',
          title: 'Track 2 Rock',
          uploader: 'Artist 2',
          duration: '04:15',
          duration_seconds: 255,
          thumbnail: 'https://i.ytimg.com/vi/v2/hqdefault.jpg',
        },
      ];
      (client.searchYouTube as any).mockResolvedValue(mockResults);

      renderSearch();
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'Rock' } });
      fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

      await waitFor(() => {
        expect(screen.getByText('Resultados (2)')).toBeInTheDocument();
      });

      // Localizar el contenedor de la cuadrícula desktop
      const desktopGrid = document.querySelector('.hidden.sm\\:grid');
      expect(desktopGrid).toBeInTheDocument();
      expect(desktopGrid?.className).toContain('sm:grid-cols-2');
      expect(desktopGrid?.className).toContain('md:grid-cols-3');
      expect(desktopGrid?.className).toContain('lg:grid-cols-4');
      expect(desktopGrid?.className).toContain('max-w-7xl');

      // Verificar badges visuales de desktop (MP3/480p y duración)
      const durationBadges = screen.getAllByText('03:30');
      expect(durationBadges.length).toBeGreaterThan(0);
    });
  });
});
