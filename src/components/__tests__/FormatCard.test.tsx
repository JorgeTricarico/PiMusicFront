import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormatCard } from '../FormatCard';
import { ToastProvider } from '../../context/ToastContext';
import { DownloadProvider } from '../../context/DownloadContext';
import type { VideoInfoResponse } from '../../api/client';
import * as apiClient from '../../api/client';

const mockVideoInfo: VideoInfoResponse = {
  id: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  uploader: 'RickAstleyVEVO',
  duration: '3:33',
  duration_seconds: 213,
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  views: 1500000000,
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  video_options: [
    {
      quality: '720p',
      height: 720,
      ext: 'mp4',
      badge: 'HD',
      description: 'Video MP4 (720p)',
      approx_size: '~45 MB'
    },
    {
      quality: '480p',
      height: 480,
      ext: 'mp4',
      badge: 'SD',
      description: 'Video MP4 (480p)',
      approx_size: '~22 MB'
    }
  ],
  audio_options: [
    {
      quality: 'mp3_320',
      ext: 'mp3',
      badge: '320 kbps',
      description: 'Audio MP3 de alta fidelidad',
      approx_size: '~9 MB'
    }
  ]
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <DownloadProvider>
        {ui}
      </DownloadProvider>
    </ToastProvider>
  );
};

describe('FormatCard Integration Tests', () => {
  const onPlayPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar los metadatos principales del video', () => {
    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);

    expect(screen.getByText('Rick Astley - Never Gonna Give You Up')).toBeInTheDocument();
    expect(screen.getByText('RickAstleyVEVO')).toBeInTheDocument();
    expect(screen.getByText('3:33')).toBeInTheDocument();
  });

  it('debe destacar 480p como opción "Recomendada Móvil (Ahorro Datos)"', () => {
    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);
    expect(screen.getByText('Recomendada Móvil (Ahorro Datos)')).toBeInTheDocument();
  });

  it('debe permitir cambiar de pestaña entre Video (MP4) y Audio (MP3)', () => {
    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);

    // Por defecto está en video
    expect(screen.getAllByText('720p')[0]).toBeInTheDocument();
    expect(screen.getAllByText('480p')[0]).toBeInTheDocument();

    // Cambiar a Audio
    const audioTab = screen.getByRole('button', { name: /audio \(mp3\)/i });
    fireEvent.click(audioTab);

    expect(screen.getByText('320 kbps')).toBeInTheDocument();
    expect(screen.getByText('Audio MP3 de alta fidelidad')).toBeInTheDocument();
  });

  it('debe llamar a onPlayPreview con los argumentos correctos al pulsar "Ver Video"', () => {
    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);

    const streamBtn = screen.getByRole('button', { name: /ver video \(480p móvil\)/i });
    fireEvent.click(streamBtn);

    expect(onPlayPreview).toHaveBeenCalledWith(
      mockVideoInfo.id,
      mockVideoInfo.title,
      'video',
      '480p',
      undefined,
      mockVideoInfo.duration_seconds
    );
  });

  it('debe abrir el modal de confirmación al presionar "Descargar"', () => {
    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);

    const downloadBtns = screen.getAllByRole('button', { name: /^descargar$/i });
    fireEvent.click(downloadBtns[0]);

    expect(screen.getByText('Confirmar Descarga al Dispositivo')).toBeInTheDocument();
  });

  it('debe ejecutar saveToServer y mostrar toast al guardar en el servidor', async () => {
    vi.spyOn(apiClient, 'saveToServer').mockResolvedValue({ status: 'queued', message: 'OK' });

    renderWithProviders(<FormatCard info={mockVideoInfo} onPlayPreview={onPlayPreview} />);

    const saveServerBtns = screen.getAllByTitle('Guardar en el disco de la Raspberry Pi');
    fireEvent.click(saveServerBtns[0]);

    // Modal de confirmación de servidor
    const confirmBtn = screen.getByRole('button', { name: /confirmar guardado/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.saveToServer).toHaveBeenCalledWith(
        mockVideoInfo.url,
        'video',
        '720p',
        mockVideoInfo.title
      );
    });
  });
});
