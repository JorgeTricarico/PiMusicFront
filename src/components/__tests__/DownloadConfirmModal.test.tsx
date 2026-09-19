import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadConfirmModal, DownloadTarget } from '../DownloadConfirmModal';

const mockVideoTarget: DownloadTarget = {
  url: 'https://www.youtube.com/watch?v=video123',
  videoId: 'video123',
  title: 'Canción Épica en Video',
  uploader: 'Artista Principal',
  thumbnail: 'https://i.ytimg.com/vi/video123/hqdefault.jpg',
  duration: '4:15',
  type: 'video',
  quality: '480p',
  badge: 'SD',
  approxSize: '25 MB'
};

const mockAudioTarget: DownloadTarget = {
  ...mockVideoTarget,
  type: 'audio',
  quality: 'mp3_320',
  badge: 'Alta Calidad',
  approxSize: '10 MB'
};

describe('DownloadConfirmModal Integration Tests', () => {
  it('debe renderizar la información de descarga de video correctamente', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<DownloadConfirmModal target={mockVideoTarget} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Confirmar Descarga al Dispositivo')).toBeInTheDocument();
    expect(screen.getByText('Canción Épica en Video')).toBeInTheDocument();
    expect(screen.getByText('Artista Principal')).toBeInTheDocument();
    expect(screen.getByText(/Video MP4 • 480p/i)).toBeInTheDocument();
    expect(screen.getByText('25 MB')).toBeInTheDocument();
  });

  it('debe renderizar el badge de Audio cuando target.type sea audio', () => {
    render(<DownloadConfirmModal target={mockAudioTarget} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Audio MP3 320 • Alta Calidad/i)).toBeInTheDocument();
  });

  it('debe llamar a onClose al presionar el botón Cancelar o la X', () => {
    const onClose = vi.fn();
    render(<DownloadConfirmModal target={mockVideoTarget} onClose={onClose} onConfirm={vi.fn()} />);

    const cancelBtn = screen.getByRole('button', { name: /^cancelar$/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeIconBtn = screen.getByTitle('Cancelar y cerrar');
    fireEvent.click(closeIconBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('debe ejecutar onConfirm y mostrar estado de carga al presionar "Iniciar Descarga"', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DownloadConfirmModal target={mockVideoTarget} onClose={onClose} onConfirm={onConfirm} />);

    const startBtn = screen.getByRole('button', { name: /iniciar descarga/i });
    fireEvent.click(startBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Iniciando descarga...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });
});
