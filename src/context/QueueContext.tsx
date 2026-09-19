import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { StreamPlayerTrack } from '../components/StreamPlayerModal';

export interface QueueContextValue {
  queue: StreamPlayerTrack[];
  currentIndex: number;
  currentTrack: StreamPlayerTrack | null;
  addToQueue: (track: StreamPlayerTrack) => void;
  playNext: (track: StreamPlayerTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  skipToNext: () => StreamPlayerTrack | null;
  skipToPrev: () => StreamPlayerTrack | null;
  handleTrackEnded: () => StreamPlayerTrack | null;
  setCurrentIndex: (index: number) => void;
  playTrack: (track: StreamPlayerTrack) => void;
  canSkipNext: boolean;
  canSkipPrev: boolean;
}

const defaultQueueContext: QueueContextValue = {
  queue: [],
  currentIndex: -1,
  currentTrack: null,
  addToQueue: () => {},
  playNext: () => {},
  removeFromQueue: () => {},
  clearQueue: () => {},
  skipToNext: () => null,
  skipToPrev: () => null,
  handleTrackEnded: () => null,
  setCurrentIndex: () => {},
  playTrack: () => {},
  canSkipNext: false,
  canSkipPrev: false,
};

export const QueueContext = createContext<QueueContextValue>(defaultQueueContext);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<StreamPlayerTrack[]>([]);
  const [currentIndex, setCurrentIndexState] = useState<number>(-1);

  const queueRef = useRef<StreamPlayerTrack[]>(queue);
  const currentIndexRef = useRef<number>(currentIndex);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const addToQueue = useCallback((track: StreamPlayerTrack) => {
    setQueue((prev) => {
      const nextQueue = [...prev, track];
      queueRef.current = nextQueue;
      if (currentIndexRef.current === -1) {
        currentIndexRef.current = 0;
        setCurrentIndexState(0);
      }
      return nextQueue;
    });
  }, []);

  const playNext = useCallback((track: StreamPlayerTrack) => {
    setQueue((prev) => {
      const curIdx = currentIndexRef.current;
      if (curIdx === -1 || prev.length === 0) {
        const nextQueue = [track];
        queueRef.current = nextQueue;
        currentIndexRef.current = 0;
        setCurrentIndexState(0);
        return nextQueue;
      }
      const nextQueue = [...prev];
      nextQueue.splice(curIdx + 1, 0, track);
      queueRef.current = nextQueue;
      return nextQueue;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const nextQueue = prev.filter((_, i) => i !== index);
      queueRef.current = nextQueue;

      setCurrentIndexState((prevIdx) => {
        let newIdx = prevIdx;
        if (nextQueue.length === 0) {
          newIdx = -1;
        } else if (index < prevIdx) {
          newIdx = prevIdx - 1;
        } else if (index === prevIdx) {
          if (prevIdx >= nextQueue.length) {
            newIdx = nextQueue.length - 1;
          }
        }
        currentIndexRef.current = newIdx;
        return newIdx;
      });

      return nextQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    currentIndexRef.current = -1;
    setQueue([]);
    setCurrentIndexState(-1);
  }, []);

  const skipToNext = useCallback((): StreamPlayerTrack | null => {
    const currentQ = queueRef.current;
    const curIdx = currentIndexRef.current;
    if (curIdx >= 0 && curIdx < currentQ.length - 1) {
      const nextIdx = curIdx + 1;
      currentIndexRef.current = nextIdx;
      setCurrentIndexState(nextIdx);
      return currentQ[nextIdx];
    }
    return null;
  }, []);

  const skipToPrev = useCallback((): StreamPlayerTrack | null => {
    const currentQ = queueRef.current;
    const curIdx = currentIndexRef.current;
    if (curIdx > 0 && curIdx < currentQ.length) {
      const prevIdx = curIdx - 1;
      currentIndexRef.current = prevIdx;
      setCurrentIndexState(prevIdx);
      return currentQ[prevIdx];
    }
    return null;
  }, []);

  const handleTrackEnded = useCallback((): StreamPlayerTrack | null => {
    return skipToNext();
  }, [skipToNext]);

  const setCurrentIndex = useCallback((index: number) => {
    if (index >= -1 && index < queueRef.current.length) {
      currentIndexRef.current = index;
      setCurrentIndexState(index);
    }
  }, []);

  const playTrack = useCallback((track: StreamPlayerTrack) => {
    setQueue((prev) => {
      const existingIndex = prev.findIndex((t) => t.videoId === track.videoId);
      if (existingIndex !== -1) {
        currentIndexRef.current = existingIndex;
        setCurrentIndexState(existingIndex);
        return prev;
      } else {
        const nextQueue = [...prev, track];
        queueRef.current = nextQueue;
        const newIdx = nextQueue.length - 1;
        currentIndexRef.current = newIdx;
        setCurrentIndexState(newIdx);
        return nextQueue;
      }
    });
  }, []);

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const canSkipNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const canSkipPrev = currentIndex > 0;

  return (
    <QueueContext.Provider
      value={{
        queue,
        currentIndex,
        currentTrack,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        skipToNext,
        skipToPrev,
        handleTrackEnded,
        setCurrentIndex,
        playTrack,
        canSkipNext,
        canSkipPrev,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export function useQueue(): QueueContextValue {
  const context = useContext(QueueContext);
  return context || defaultQueueContext;
}
