'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true on phone-width viewports. Defaults to the `< 640px` range (below
 * Tailwind's `sm` breakpoint) so it matches the mobile-first conventions in
 * globals.css. SSR-safe: starts `false` (desktop-first) and corrects on mount —
 * fine here because every consumer renders client-side after data loads.
 */
export function useIsMobile(query = '(max-width: 639px)'): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return isMobile;
}
