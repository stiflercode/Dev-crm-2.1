import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  init: () => void;
}

const STORAGE_KEY = '1930-crm-theme';

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false, // default — light mode is primary client-facing theme

  init() {
    // Read saved preference; fall back to light
    const saved = localStorage.getItem(STORAGE_KEY);
    const dark = saved !== null ? saved === 'dark' : false;
    applyTheme(dark);
    set({ isDark: dark });
  },

  toggle() {
    const next = !get().isDark;
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    set({ isDark: next });
  },
}));
