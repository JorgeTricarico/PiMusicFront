import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamPlayerModal, StreamPlayerTrack } from '../StreamPlayerModal';
import { MiniPlayer, PlayerTrack } from '../MiniPlayer';
import { ToastProvider } from '../../context/ToastContext';

const mockTrack: StreamPlayerTrack = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  channel: 'Rick Astley Official',
  initialQuality: '480p',
  initialType: 'video',
  initialTime: 50,
  duration: 212,
};

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const triggerTap = (element: Element, clientX: number, clientY: number = 200) => {
  act(() => {
    fireEvent.touchStart(element, {
      touches: [{ clientX, clientY }],
    });
    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX, clientY }],
    });
  });
};

const triggerDoubleTap = (element: Element, clientX: number, clientY: number = 200) => {
  triggerTap(element, clientX, clientY);
  triggerTap(element, clientX, clientY);
};

const triggerSwipe = (
  element: Element,
  startY: number,
  endY: number,
  startX: number = 500,
  endX: number = 500
) => {
  act(() => {
    fireEvent.touchStart(element, {
      touches: [{ clientX: startX, clientY: startY }],
    });
    fireEvent.touchMove(element, {
      touches: [{ clientX: endX, clientY: endY }],
    });
    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: endX, clientY: endY }],
    });
  });
};

describe('TouchGestures and MediaSession Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Doble Toque Táctil Lateral (Double-Tap to Seek)', () => {
    it('toque en tercio izquierdo (< 40% del ancho) retrocede 10s y muestra animación con icono RotateCcw y texto "-10s"', async () => {
      const onClose = vi.fn();
      renderWithToast(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

      const container = screen.getByTestId('player-container');
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 500,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 500,
      } as DOMRect);

      // Doble toque en X = 200 (20% del ancho, < 40%)
      triggerDoubleTap(container, 200);

      // Debe mostrar la animación visual lateral izquierda con texto "-10s"
      const feedbackLeft = screen.getByTestId('double-tap-feedback-left');
      expect(feedbackLeft).toBeInTheDocument();
      expect(screen.getByText('-10s')).toBeInTheDocument();

      // Debe desaparecer tras 600ms
      await waitFor(() => {
        expect(screen.queryByTestId('double-tap-feedback-left')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('toque en tercio derecho (> 60% del ancho) adelanta 10s y muestra animación con icono RotateCw y texto "+10s"', async () => {
      const onClose = vi.fn();
      renderWithToast(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

      const container = screen.getByTestId('player-container');
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 500,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 500,
      } as DOMRect);

      // Doble toque en X = 800 (80% del ancho, > 60%)
      triggerDoubleTap(container, 800);

      // Debe mostrar la animación visual lateral derecha con texto "+10s"
      const feedbackRight = screen.getByTestId('double-tap-feedback-right');
      expect(feedbackRight).toBeInTheDocument();
      expect(screen.getByText('+10s')).toBeInTheDocument();

      // Debe desaparecer tras 600ms
      await waitFor(() => {
        expect(screen.queryByTestId('double-tap-feedback-right')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('toque en tercio central (40%-60%) alterna controles o play/pause', async () => {
      const onClose = vi.fn();
      renderWithToast(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

      const container = screen.getByTestId('player-container');
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 500,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 500,
      } as DOMRect);

      const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');

      // Toque en el centro (X = 500, 50% del ancho)
      await act(async () => {
        triggerTap(container, 500);
      });

      expect(playSpy).toHaveBeenCalled();
    });
  });

  describe('Gesto Swipe Down (Deslizar hacia abajo para minimizar) y Tirador Visual', () => {
    it('al deslizar hacia abajo más de 110px verticalmente gatilla onMinimize y onClose hacia el MiniPlayer', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const container = screen.getByTestId('player-container');

      // Deslizar de Y=100 a Y=220 (deltaY = 120px > 110px, verticalmente puro deltaX = 0)
      triggerSwipe(container, 100, 220);

      expect(onMinimize).toHaveBeenCalledTimes(1);
      expect(onMinimize).toHaveBeenCalledWith(
        expect.objectContaining({
          videoId: mockTrack.videoId,
          title: mockTrack.title,
        })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('un desplazamiento hacia abajo menor a 110px NO debe minimizar el reproductor', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const container = screen.getByTestId('player-container');

      // Deslizar 85px (de Y=100 a Y=185, deltaY = 85px < 110px)
      triggerSwipe(container, 100, 185);

      expect(onMinimize).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('un deslizamiento iniciado en la zona de exclusión superior (clientY < 75) NO debe minimizar (protección barra de notificaciones Android)', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const container = screen.getByTestId('player-container');

      // Deslizar desde Y=40 (< 75px) hasta Y=200 (deltaY = 160px > 110px)
      triggerSwipe(container, 40, 200);

      expect(onMinimize).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('un deslizamiento diagonal donde deltaY <= deltaX * 1.5 NO debe minimizar el reproductor', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const container = screen.getByTestId('player-container');

      // Deslizar con deltaY = 120 (100 a 220) pero deltaX = 100 (500 a 600).
      // deltaX * 1.5 = 150 > 120 -> no cumple deltaY > deltaX * 1.5
      triggerSwipe(container, 100, 220, 500, 600);

      expect(onMinimize).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('el tirador táctil visual (drag handle) permite arrastrar hacia abajo para minimizar', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const dragHandle = screen.getByTestId('drag-handle');
      expect(dragHandle).toBeInTheDocument();

      // Arrastrar desde el tirador hacia abajo
      triggerSwipe(dragHandle, 20, 160);

      expect(onMinimize).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('hacer clic o presionar en el tirador táctil (drag handle) minimiza el reproductor', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const dragHandle = screen.getByTestId('drag-handle');
      fireEvent.click(dragHandle);

      expect(onMinimize).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('el botón ChevronDown en la esquina superior izquierda sigue visible, accesible y funcional para minimizar', () => {
      const onClose = vi.fn();
      const onMinimize = vi.fn();
      renderWithToast(
        <StreamPlayerModal
          track={mockTrack}
          onClose={onClose}
          onMinimize={onMinimize}
        />
      );

      const minimizeBtn = screen.getByTitle('Minimizar reproductor');
      expect(minimizeBtn).toBeInTheDocument();
      fireEvent.click(minimizeBtn);

      expect(onMinimize).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Botón de Ajuste de Relación de Aspecto (18:9 / 20:9)', () => {
    it('alterna entre "Ajustar" (object-contain) y "Llenar pantalla" (object-cover)', () => {
      const onClose = vi.fn();
      renderWithToast(<StreamPlayerModal track={mockTrack} onClose={onClose} />);

      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveClass('object-contain');

      const aspectBtn = screen.getByTestId('aspect-ratio-btn');
      expect(aspectBtn).toHaveTextContent('Ajustar');

      // Primer clic: conmutar a Llenar pantalla (object-cover)
      act(() => {
        fireEvent.click(aspectBtn);
      });
      expect(videoElement).toHaveClass('object-cover');
      expect(aspectBtn).toHaveTextContent('Llenar pantalla');

      // Segundo clic: conmutar de vuelta a Ajustar (object-contain)
      act(() => {
        fireEvent.click(aspectBtn);
      });
      expect(videoElement).toHaveClass('object-contain');
      expect(aspectBtn).toHaveTextContent('Ajustar');
    });
  });

  describe('Conexión con MediaSession API en StreamPlayerModal y MiniPlayer', () => {
    it('StreamPlayerModal debe actualizar metadatos con carátulas HD y registrar action handlers', () => {
      renderWithToast(<StreamPlayerModal track={mockTrack} onClose={vi.fn()} />);

      expect(navigator.mediaSession.metadata).not.toBeNull();
      expect(navigator.mediaSession.metadata?.title).toBe('Never Gonna Give You Up');
      expect(navigator.mediaSession.metadata?.artist).toBe('Rick Astley Official');
      expect(navigator.mediaSession.metadata?.artwork.length).toBe(4);

      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekbackward', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekforward', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekto', expect.any(Function));
    });

    it('MiniPlayer debe conectar MediaSession con metadatos y handlers de hardware', () => {
      const miniTrack: PlayerTrack = {
        videoId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        channel: 'Rick Astley Official',
        type: 'video',
        duration: 212,
        currentTime: 45,
      };

      renderWithToast(<MiniPlayer track={miniTrack} onClose={vi.fn()} />);

      expect(navigator.mediaSession.metadata?.title).toBe('Never Gonna Give You Up');
      expect(navigator.mediaSession.metadata?.artist).toBe('Rick Astley Official');
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
      expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    });
  });
});
