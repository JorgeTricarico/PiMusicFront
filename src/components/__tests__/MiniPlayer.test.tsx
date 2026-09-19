import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MiniPlayer, PlayerTrack } from '../MiniPlayer';

const mockTrack: PlayerTrack = {
  videoId: 'xyz789',
  title: 'Mi Cancion Favorita',
  type: 'video',
  quality: '480p',
  currentTime: 30,
  duration: 180,
  isPlaying: true,
};

describe('MiniPlayer Component Tests', () => {
  it('debe renderizar el título de la canción y la calidad 480p', () => {
    render(<MiniPlayer track={mockTrack} onClose={vi.fn()} onExpand={vi.fn()} />);

    expect(screen.getByText('Mi Cancion Favorita')).toBeInTheDocument();
    expect(screen.getByText('480p')).toBeInTheDocument();
  });

  it('debe llamar a onExpand al pulsar el botón de expandir', () => {
    const onExpand = vi.fn();
    render(<MiniPlayer track={mockTrack} onClose={vi.fn()} onExpand={onExpand} />);

    const expandBtn = screen.getByTitle(/Expandir reproductor/i);
    fireEvent.click(expandBtn);

    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith(30, '480p', true);
  });

  it('debe llamar a onClose al pulsar el botón cerrar', () => {
    const onClose = vi.fn();
    render(<MiniPlayer track={mockTrack} onClose={onClose} onExpand={vi.fn()} />);

    const closeBtn = screen.getByTitle(/Cerrar reproductor/i);
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
