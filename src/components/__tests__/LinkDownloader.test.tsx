import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LinkDownloader } from '../LinkDownloader';
import { ToastProvider } from '../../context/ToastContext';
import { DownloadProvider } from '../../context/DownloadContext';
import * as apiClient from '../../api/client';

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client');
  return {
    ...actual,
    getVideoInfo: vi.fn(),
  };
});

describe('LinkDownloader Component Tests', () => {
  const originalClipboard = navigator.clipboard;
  const mockOnPlayPreview = vi.fn();

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

  const renderComponent = (initialUrl = '') => {
    return render(
      <ToastProvider>
        <DownloadProvider>
          <LinkDownloader onPlayPreview={mockOnPlayPreview} initialUrl={initialUrl} />
        </DownloadProvider>
      </ToastProvider>
    );
  };

  it('debe permitir escribir y analizar un enlace de YouTube manualmente', async () => {
    const mockInfo = {
      id: 'test123',
      title: 'Video de Prueba',
      uploader: 'Canal Test',
      duration: '4:20',
      duration_seconds: 260,
      video_options: [],
      audio_options: [],
    };
    vi.mocked(apiClient.getVideoInfo).mockResolvedValueOnce(mockInfo as any);

    renderComponent();

    const input = screen.getByPlaceholderText(/Pega el enlace de YouTube/i);
    fireEvent.change(input, { target: { value: 'https://youtu.be/test123' } });

    const submitBtns = screen.getAllByRole('button', { name: /Analizar/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(apiClient.getVideoInfo).toHaveBeenCalledWith('https://youtu.be/test123');
    });
  });

  it('debe leer el portapapeles y auto-analizar al pulsar el botón Pegar cuando la API está disponible', async () => {
    const mockReadText = vi.fn().mockResolvedValue('https://www.youtube.com/watch?v=clip123');
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: mockReadText },
      configurable: true,
      writable: true,
    });

    const mockInfo = {
      id: 'clip123',
      title: 'Video Portapapeles',
      uploader: 'Canal Clip',
      duration: '2:15',
      duration_seconds: 135,
      video_options: [],
      audio_options: [],
    };
    vi.mocked(apiClient.getVideoInfo).mockResolvedValueOnce(mockInfo as any);

    renderComponent();

    const pasteBtn = screen.getByTitle(/Pegar enlace copiado de YouTube/i);
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(mockReadText).toHaveBeenCalled();
      expect(apiClient.getVideoInfo).toHaveBeenCalledWith('https://www.youtube.com/watch?v=clip123');
    });
  });

  it('debe enfocar el input y mostrar mensaje informativo si navigator.clipboard falla o es HTTP', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      configurable: true,
      writable: true,
    });

    renderComponent();

    const input = screen.getByPlaceholderText(/Pega el enlace de YouTube/i);
    const focusSpy = vi.spyOn(input, 'focus');

    const pasteBtn = screen.getByTitle(/Pegar enlace copiado de YouTube/i);
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  it('debe detectar el evento nativo onPaste en el input y disparar el análisis inmediatamente', async () => {
    const mockInfo = {
      id: 'nativePaste123',
      title: 'Video Pegado Nativo',
      uploader: 'Canal Nativo',
      duration: '1:00',
      duration_seconds: 60,
      video_options: [],
      audio_options: [],
    };
    vi.mocked(apiClient.getVideoInfo).mockResolvedValueOnce(mockInfo as any);

    renderComponent();

    const input = screen.getByPlaceholderText(/Pega el enlace de YouTube/i);

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'https://youtu.be/nativePaste123',
      },
    });

    await waitFor(() => {
      expect(apiClient.getVideoInfo).toHaveBeenCalledWith('https://youtu.be/nativePaste123');
    });
  });
});
