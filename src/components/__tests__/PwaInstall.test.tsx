import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PwaInstallBanner } from '../PwaInstallBanner';

describe('PwaInstallBanner Component Tests', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const createBeforeInstallPromptEvent = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as any;
    event.platforms = ['web', 'android'];
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome, platform: 'web' });
    return event;
  };

  it('no muestra el banner inicialmente antes de recibir beforeinstallprompt', () => {
    render(<PwaInstallBanner />);
    expect(screen.queryByRole('region', { name: /Instalación de aplicación/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Instalar PiMusic/i)).not.toBeInTheDocument();
  });

  it('muestra el banner cuando se dispara beforeinstallprompt', () => {
    render(<PwaInstallBanner />);

    const promptEvent = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByRole('region', { name: /Instalación de aplicación/i })).toBeInTheDocument();
    expect(screen.getByText('Instalar PiMusic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Instalar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cerrar banner de instalación/i)).toBeInTheDocument();
  });

  it('llama a prompt() y oculta el banner al aceptar la instalación', async () => {
    render(<PwaInstallBanner />);

    const promptEvent = createBeforeInstallPromptEvent('accepted');
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    const installBtn = screen.getByRole('button', { name: /Instalar/i });

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: /Instalación de aplicación/i })).not.toBeInTheDocument();
  });

  it('permite descartar el banner con el botón de cerrar', () => {
    render(<PwaInstallBanner />);

    const promptEvent = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByRole('region', { name: /Instalación de aplicación/i })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Cerrar banner de instalación/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('region', { name: /Instalación de aplicación/i })).not.toBeInTheDocument();
  });

  it('no muestra el banner si la app ya se ejecuta en modo standalone', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PwaInstallBanner />);

    const promptEvent = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.queryByRole('region', { name: /Instalación de aplicación/i })).not.toBeInTheDocument();
  });

  it('oculta el banner cuando se dispara el evento appinstalled', () => {
    render(<PwaInstallBanner />);

    const promptEvent = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByRole('region', { name: /Instalación de aplicación/i })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.queryByRole('region', { name: /Instalación de aplicación/i })).not.toBeInTheDocument();
  });
});
