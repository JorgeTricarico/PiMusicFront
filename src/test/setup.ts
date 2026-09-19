import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Limpieza automática del DOM después de cada prueba
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

// Polyfill para matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill para ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Polyfill para HTMLMediaElement (Audio y Video en JSDOM)
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'canPlayType', {
  configurable: true,
  value: vi.fn().mockReturnValue('maybe'),
});

// Polyfill para MediaMetadata y MediaSession API
class MockMediaMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: Array<{ src: string; sizes?: string; type?: string }>;
  constructor(init?: {
    title?: string;
    artist?: string;
    album?: string;
    artwork?: Array<{ src: string; sizes?: string; type?: string }>;
  }) {
    this.title = init?.title || '';
    this.artist = init?.artist || '';
    this.album = init?.album || '';
    this.artwork = init?.artwork || [];
  }
}

(globalThis as any).MediaMetadata = MockMediaMetadata;
(window as any).MediaMetadata = MockMediaMetadata;

const mockHandlers = new Map<string, Function | null>();
const mockMediaSession = {
  metadata: null as any,
  playbackState: 'none' as MediaSessionPlaybackState,
  setActionHandler: vi.fn((action: string, handler: Function | null) => {
    mockHandlers.set(action, handler);
  }),
  setPositionState: vi.fn(),
  _handlers: mockHandlers,
};

Object.defineProperty(navigator, 'mediaSession', {
  writable: true,
  configurable: true,
  value: mockMediaSession,
});

