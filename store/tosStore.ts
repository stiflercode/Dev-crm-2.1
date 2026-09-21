import { create } from 'zustand';

interface TOSState {
  startTimestamp: number | null;
  setStart: (timestamp: number) => void;
  getElapsedSeconds: () => number;
}

export const useTOSStore = create<TOSState>((set, get) => ({
  startTimestamp: null,

  setStart(timestamp: number) {
    set({ startTimestamp: timestamp });
  },

  getElapsedSeconds() {
    const { startTimestamp } = get();
    if (!startTimestamp) return 0;
    return Math.floor((Date.now() - startTimestamp) / 1000);
  },
}));

export function formatTOS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
