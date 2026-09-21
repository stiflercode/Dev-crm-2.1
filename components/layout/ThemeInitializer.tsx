'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

/**
 * Reads the saved theme preference from localStorage and applies
 * the `dark` class to <html> before first paint — preventing flash.
 * Must be rendered inside <body> in the root layout.
 */
export function ThemeInitializer() {
  const init = useThemeStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
