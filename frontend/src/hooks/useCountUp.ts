'use client';

import { useEffect, useRef, useState } from 'react';

// Ease-out cubic — fast start, gentle settle (no abrupt stop).
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Animates a numeric value from 0 up to `target` on mount, driven by
 * requestAnimationFrame so callers can use the returned value for BOTH a visual
 * fill (donut arc / bar width) and a synced count-up label in the same frame.
 *
 * - Runs once per mount; re-runs only if `target`/`duration` change (so unrelated
 *   re-renders — dropdowns, sibling state — never restart it).
 * - Respects `prefers-reduced-motion`: returns the final value immediately, with
 *   no animation.
 *
 * Used by both ComplianceScore (circular) and CategoryTable rows (horizontal) so
 * the two feel like one cohesive load animation.
 */
export function useCountUp(target: number, duration = 1000): number {
  // Lazily snap reduced-motion users straight to the target (these components
  // only ever mount client-side, after data loads — no SSR/hydration concern).
  const [value, setValue] = useState<number>(() =>
    prefersReducedMotion() ? target : 0,
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let startTs: number | null = null;
    const tick = (now: number) => {
      if (startTs === null) startTs = now;
      const progress = Math.min(1, (now - startTs) / duration);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target); // land exactly on the target
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
