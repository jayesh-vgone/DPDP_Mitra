'use client';

import type { CSSProperties } from 'react';

/**
 * Composable skeleton-loading primitives.
 *
 * These are intentionally small and unopinionated building blocks — compose
 * them into layout-specific skeletons (see DashboardSkeleton, ChatHistorySkeleton,
 * etc.) rather than adding a new one-off component per screen.
 *
 * Fill colour comes from the themed `--skeleton` token (globals.css), so light
 * and dark switch automatically. The pulse is gated behind `motion-safe:` — for
 * users with `prefers-reduced-motion: reduce` the block renders static (just the
 * neutral fill, no animation).
 */

// Shared base: themed fill + reduced-motion-aware pulse.
const SKELETON_BASE = 'bg-[var(--skeleton)] motion-safe:animate-pulse';

type Dimension = string | number;

interface CommonProps {
  className?: string;
  style?: CSSProperties;
}

export function SkeletonBlock({
  width,
  height,
  rounded = 'rounded-lg',
  className = '',
  style,
}: CommonProps & {
  width?: Dimension;
  height?: Dimension;
  /** Tailwind rounding utility, e.g. 'rounded-lg', 'rounded-2xl', 'rounded-none'. */
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${SKELETON_BASE} ${rounded} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonText({
  width = '100%',
  height = '0.875rem',
  className = '',
  style,
}: CommonProps & { width?: Dimension; height?: Dimension }) {
  return (
    <div
      aria-hidden="true"
      className={`${SKELETON_BASE} rounded ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonCircle({
  size,
  className = '',
  style,
}: CommonProps & { size: Dimension }) {
  return (
    <div
      aria-hidden="true"
      className={`${SKELETON_BASE} rounded-full ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}
