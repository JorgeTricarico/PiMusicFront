import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardBanner, isValidYouTubeUrl } from '../ClipboardBanner';

describe('ClipboardBanner Component Tests', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  describe('isValidYouTubeUrl utility', () => {
    it('debe validar enlaces estándar y cortos de YouTube', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(true);
    });

    it('debe rechazar cadenas que no sean enlaces válidos de YouTube', () => {
      expect(isValidYouTubeUrl('https://google.com')).toBe(false);
      expect(isValidYouTubeUrl('https://spotify.com/track/123')).toBe(false);
      expect(isValidYouTubeUrl('solo texto aleatorio')).toBe(false);
      expect(isValidYouTubeUrl('')).toBe(false);
      expect(isValidYouTubeUrl(null as any)).toBe(false);
    });
  });

  describe('Component Rendering and Interactivity', () => {
    it('no debe renderizar nada si el portapapeles está vacío o no contiene enlace de YouTube', async () => {
      const mockReadText = vi.fn().mockResolvedValue('texto no relacionado');
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      render(<ClipboardBanner onAnalyze={vi.fn()} />);

      await waitFor(() => {
        expect(mockReadText).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Enlace de YouTube detectado/i)).not.toBeInTheDocument();
    });

    it('debe mostrar el banner cuando el portapapeles tiene una URL de YouTube válida', async () => {
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const mockReadText = vi.fn().mockResolvedValue(ytUrl);
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      render(<ClipboardBanner onAnalyze={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Enlace de YouTube detectado/i)).toBeInTheDocument();
      });

      expect(screen.getByText(ytUrl)).toBeInTheDocument();
      expect(screen.getByText(/Analizar y Descargar con 1 Toque/i)).toBeInTheDocument();
    });

    it('al pulsar "Analizar y Descargar con 1 Toque", debe ejecutar onAnalyze y cerrar el banner', async () => {
      const ytUrl = 'https://youtu.be/dQw4w9WgXcQ';
      const mockReadText = vi.fn().mockResolvedValue(ytUrl);
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      const onAnalyze = vi.fn();
      render(<ClipboardBanner onAnalyze={onAnalyze} />);

      await waitFor(() => {
        expect(screen.getByText(/Analizar y Descargar con 1 Toque/i)).toBeInTheDocument();
      });

      const actionButton = screen.getByText(/Analizar y Descargar con 1 Toque/i);
      fireEvent.click(actionButton);

      expect(onAnalyze).toHaveBeenCalledTimes(1);
      expect(onAnalyze).toHaveBeenCalledWith(ytUrl);

      // Debe desaparecer el banner
      await waitFor(() => {
        expect(screen.queryByText(/Enlace de YouTube detectado/i)).not.toBeInTheDocument();
      });
    });

    it('al presionar el botón de cerrar (X), debe ocultar el banner sin invocar onAnalyze', async () => {
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const mockReadText = vi.fn().mockResolvedValue(ytUrl);
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      const onAnalyze = vi.fn();
      render(<ClipboardBanner onAnalyze={onAnalyze} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Cerrar notificación de enlace/i)).toBeInTheDocument();
      });

      const closeBtn = screen.getByLabelText(/Cerrar notificación de enlace/i);
      fireEvent.click(closeBtn);

      expect(onAnalyze).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByText(/Enlace de YouTube detectado/i)).not.toBeInTheDocument();
      });
    });

    it('debe detectar un nuevo enlace al disparar el evento focus en la ventana', async () => {
      let clipboardContent = '';
      const mockReadText = vi.fn().mockImplementation(() => Promise.resolve(clipboardContent));
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      render(<ClipboardBanner onAnalyze={vi.fn()} />);

      // Inicialmente vacío
      expect(screen.queryByText(/Enlace de YouTube detectado/i)).not.toBeInTheDocument();

      // El usuario copia un enlace de YouTube en otra app y regresa a PiMusic
      clipboardContent = 'https://www.youtube.com/watch?v=test12345';

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(screen.getByText('https://www.youtube.com/watch?v=test12345')).toBeInTheDocument();
      });
    });

    it('debe detectar enlace al cambiar la visibilidad de la página a visible', async () => {
      let clipboardContent = '';
      const mockReadText = vi.fn().mockImplementation(() => Promise.resolve(clipboardContent));
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        configurable: true,
        writable: true,
      });

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
        writable: true,
      });

      render(<ClipboardBanner onAnalyze={vi.fn()} />);

      clipboardContent = 'https://youtu.be/visible123';

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(screen.getByText('https://youtu.be/visible123')).toBeInTheDocument();
      });
    });
  });
});
