'use client';

import { ArrowUpRight } from 'lucide-react';
import type { AttemptOut } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

const W = 380;
const H = 160;
const PAD = { top: 20, right: 20, bottom: 30, left: 35 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const MIN_VAL = 0;
const MAX_VAL = 100;
const Y_TICKS = [0, 25, 50, 75, 100];

function xAt(i: number, total: number): number {
  if (total <= 1) return PAD.left + CHART_W / 2;
  return PAD.left + (i / (total - 1)) * CHART_W;
}

function yAt(v: number): number {
  return PAD.top + CHART_H - ((v - MIN_VAL) / (MAX_VAL - MIN_VAL)) * CHART_H;
}

function formatMonthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function ScoreTrend({ history }: { history: AttemptOut[] }) {
  const { lang } = useLanguage();

  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const pts = sorted.map((a, i) => ({
    x: xAt(i, sorted.length),
    y: yAt(a.overall_score),
    label: formatMonthLabel(a.created_at),
    score: a.overall_score,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    pts.length > 1
      ? [
          ...pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
          `L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + CHART_H).toFixed(1)}`,
          `L ${pts[0].x.toFixed(1)} ${(PAD.top + CHART_H).toFixed(1)}`,
          'Z',
        ].join(' ')
      : '';

  const delta =
    sorted.length >= 2
      ? Math.round(sorted[sorted.length - 1].overall_score - sorted[0].overall_score)
      : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0A0F2C] text-base">{t('dashboardTrendTitle', lang)}</h3>
        {delta !== null && (
          <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: delta >= 0 ? '#138808' : '#DC2626' }}>
            <ArrowUpRight size={16} />
            {delta >= 0 ? '+' : ''}{delta} {t('dashboardSinceFirst', lang)}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label="Compliance score trend chart"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9933" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#138808" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={yAt(tick)}
              x2={W - PAD.right} y2={yAt(tick)}
              stroke="#F3F4F6" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={yAt(tick)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="12" fill="#9CA3AF"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Line (only if multiple points) */}
        {pts.length > 1 && (
          <path
            d={linePath} fill="none"
            stroke="#FF9933" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Data point dots */}
        {pts.map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y} r="3.5"
            fill="white" stroke="#FF9933" strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {pts.map((p, i) => (
          <text
            key={i} x={p.x} y={H - 4}
            textAnchor="middle" fontSize="11" fill="#9CA3AF"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
