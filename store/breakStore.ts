import { create } from 'zustand';

export type BreakType = 'LUNCH' | 'TEA' | 'BIO' | 'TRAINING' | 'FEEDBACK_QUERY';

export const BREAK_CAPS: Record<BreakType, number | null> = {
  LUNCH: 30 * 60,          // 30 minutes in seconds
  TEA: 15 * 60,            // 15 minutes
  BIO: 15 * 60,            // 15 minutes
  TRAINING: null,          // uncapped
  FEEDBACK_QUERY: null,    // uncapped
};

export const BREAK_LABELS: Record<BreakType, string> = {
  LUNCH: 'Lunch Break',
  TEA: 'Tea Break',
  BIO: 'Bio Break',
  TRAINING: 'Training',
  FEEDBACK_QUERY: 'Feedback / Query',
};

export const DAILY_CAPPED_LIMIT = 60 * 60; // 60 minutes total capped breaks per shift

interface BreakStore {
  isOnBreak: boolean;
  breakType: BreakType | null;
  breakId: string | null;
  breakStartTime: Date | null;
  breakElapsedSeconds: number;
  isScreenLocked: boolean;
  isUnlocking: boolean;
  unlockError: string | null;
  dailyCappedUsedSeconds: number;

  // Actions
  startBreak: (breakType: BreakType, breakId: string) => void;
  endBreak: () => void;
  lockScreen: () => void;
  setUnlocking: (value: boolean) => void;
  setUnlockError: (error: string | null) => void;
  tickBreakDuration: () => void;
  updateDailyCapped: (seconds: number) => void;
}

export const useBreakStore = create<BreakStore>((set, get) => ({
  isOnBreak: false,
  breakType: null,
  breakId: null,
  breakStartTime: null,
  breakElapsedSeconds: 0,
  isScreenLocked: false,
  isUnlocking: false,
  unlockError: null,
  dailyCappedUsedSeconds: 0,

  startBreak: (breakType: BreakType, breakId: string) =>
    set({
      isOnBreak: true,
      breakType,
      breakId,
      breakStartTime: new Date(),
      breakElapsedSeconds: 0,
      isScreenLocked: true,
      unlockError: null,
    }),

  endBreak: () =>
    set({
      isOnBreak: false,
      breakType: null,
      breakId: null,
      breakStartTime: null,
      breakElapsedSeconds: 0,
      isScreenLocked: false,
      isUnlocking: false,
      unlockError: null,
    }),

  lockScreen: () => set({ isScreenLocked: true }),

  setUnlocking: (value: boolean) => set({ isUnlocking: value }),

  setUnlockError: (error: string | null) => set({ unlockError: error }),

  tickBreakDuration: () => {
    const { isOnBreak } = get();
    if (isOnBreak) {
      set((s) => ({ breakElapsedSeconds: s.breakElapsedSeconds + 1 }));
    }
  },

  updateDailyCapped: (seconds: number) =>
    set((s) => ({ dailyCappedUsedSeconds: s.dailyCappedUsedSeconds + seconds })),
}));
