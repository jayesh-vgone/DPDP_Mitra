'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Download,
  ShieldAlert,
  ListTodo,
  CalendarClock,
  Gauge,
  SearchCheck,
} from 'lucide-react';
import {
  getAssessmentScores,
  getActionItems,
  downloadAssessmentReport,
  getInternalAuditStatus,
} from '@/lib/api';
import type { ScoresResponse, AttemptOut, ActionItem, InternalAuditStatus } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { t, RISK_CATEGORY_HI } from '@/lib/translations';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { CategoryTable } from '@/components/dashboard/CategoryTable';
import { ActionQueue } from '@/components/dashboard/ActionQueue';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

// Fixed review cadence used for the "Days to Deadline" stat. v1 ASSUMPTION
// (flagged in CLAUDE.md) — 90 days from the latest attempt; may become
// configurable later.
const REVIEW_CADENCE_DAYS = 90;

type Period = '3m' | '6m' | 'all';

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function shortMonth(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-line p-5 hover-lift">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accent ?? 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold text-ink leading-none">{value}</div>
      {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
    </div>
  );
}

// ── Overall Score card (donut + stat list) ─────────────────────────────────────
function OverallScoreCard({
  latest,
  nextReview,
}: {
  latest: AttemptOut;
  nextReview: Date;
}) {
  const { lang } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  const scores = Object.values(latest.category_scores);
  const high = scores.filter((s) => s <= 40).length;
  const med = scores.filter((s) => s > 40 && s <= 70).length;
  const low = scores.filter((s) => s > 70).length;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadAssessmentReport(latest.id);
    } catch (e) {
      console.error('Report download failed:', e);
    } finally {
      setDownloading(false);
    }
  }

  const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-line/60 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-semibold" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  return (
    // h-full so the card stretches to the grid row's height (set by the taller
    // Compliance-by-Category card). The donut block flexes to absorb any extra
    // height, centring between the header and the stat list — so there is no dead
    // whitespace at the bottom regardless of how tall the neighbouring card is.
    <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col h-full hover-lift hover-lift-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink text-base">{t('statOverallScore', lang)}</h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent disabled:opacity-50 transition"
        >
          <Download size={13} />
          {downloading ? t('dashboardDownloading', lang) : t('dashboardDownload', lang)}
        </button>
      </div>

      {/* Donut block absorbs the slack (flex-1) and stays vertically centred */}
      <div className="flex-1 flex items-center justify-center py-4">
        <ComplianceScore score={latest.overall_score} />
      </div>

      {/* Stat list stays pinned to the bottom, rows kept tightly spaced */}
      <div>
        <Row label={t('scoreHighRiskCount', lang)} value={String(high)} color="var(--risk-high)" />
        <Row label={t('scoreMedRiskCount', lang)} value={String(med)} color="var(--risk-med)" />
        <Row label={t('scoreLowRiskCount', lang)} value={String(low)} color="var(--risk-low)" />
        <Row label={t('scoreLastAssessed', lang)} value={formatDate(latest.created_at, lang)} />
        <Row label={t('scoreNextReview', lang)} value={formatDate(nextReview.toISOString(), lang)} />
      </div>
    </div>
  );
}

// ── Live dashboard ──────────────────────────────────────────────────────────────
function LiveDashboard({
  scores,
  actionItems,
  setActionItems,
}: {
  scores: ScoresResponse;
  actionItems: ActionItem[];
  setActionItems: (items: ActionItem[]) => void;
}) {
  const { lang } = useLanguage();
  const { institution } = useAuth();
  const [period, setPeriod] = useState<Period>('6m');

  const latest = scores.latest!;
  const previous = scores.history[1]?.category_scores ?? null;

  // Period-filtered history (ascending) for the Overall Score delta.
  const filtered = useMemo(() => {
    const asc = [...scores.history].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (period === 'all') return asc;
    const months = period === '3m' ? 3 : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const within = asc.filter((a) => new Date(a.created_at) >= cutoff);
    return within.length > 0 ? within : asc.slice(-1); // always include latest
  }, [scores.history, period]);

  const oldestInWindow = filtered[0];
  const hasDelta = filtered.length >= 2 && oldestInWindow.id !== latest.id;
  const delta = hasDelta ? Math.round(latest.overall_score - oldestInWindow.overall_score) : null;

  // Stat computations
  const highRiskCount = Object.values(latest.category_scores).filter((s) => s <= 40).length;
  const openActions = actionItems.filter((i) => i.status !== 'done');
  const openCategories = new Set(openActions.map((i) => i.category)).size;

  const nextReview = new Date(latest.created_at);
  nextReview.setDate(nextReview.getDate() + REVIEW_CADENCE_DAYS);
  const daysToDeadline = Math.max(
    0,
    Math.ceil((nextReview.getTime() - Date.now()) / 86_400_000),
  );

  // Header subtitle — real institution data, graceful fallback (omit null segments)
  const subtitleParts = [
    institution?.name,
    institution?.institution_subtype || institution?.board,
    institution?.location,
  ].filter(Boolean);

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">{t('dashOverviewTitle', lang)}</h1>
          {subtitleParts.length > 0 && (
            <p className="text-sm text-muted mt-1 truncate">{subtitleParts.join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label={t('dashFilterLabel', lang)}
            className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent"
          >
            <option value="3m">{t('dashFilter3', lang)}</option>
            <option value="6m">{t('dashFilter6', lang)}</option>
            <option value="all">{t('dashFilterAll', lang)}</option>
          </select>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition"
          >
            <ClipboardCheck size={16} />
            {t('dashRunAssessment', lang)}
          </Link>
        </div>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Gauge size={16} />}
          label={t('statOverallScore', lang)}
          value={Math.round(latest.overall_score)}
          sub={
            delta !== null ? (
              <span style={{ color: delta >= 0 ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                {delta >= 0 ? '+' : ''}{delta}{' '}
                {t('statSinceLabel', lang).replace('{month}', shortMonth(oldestInWindow.created_at, lang))}
              </span>
            ) : (
              t('statNoPrior', lang)
            )
          }
        />
        <StatCard
          icon={<ShieldAlert size={16} />}
          label={t('statHighRisk', lang)}
          value={highRiskCount}
          sub={t('statHighRiskSub', lang)}
          accent="rgba(220,38,38,0.12)"
        />
        <StatCard
          icon={<ListTodo size={16} />}
          label={t('statOpenActions', lang)}
          value={openActions.length}
          sub={t('statAcrossCategories', lang).replace('{n}', String(openCategories))}
        />
        <StatCard
          icon={<CalendarClock size={16} />}
          label={t('statDaysToDeadline', lang)}
          value={daysToDeadline}
          sub={`${t('statNextReview', lang)}: ${formatDate(nextReview.toISOString(), lang)}`}
        />
      </div>

      {/* Score card + category table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <OverallScoreCard latest={latest} nextReview={nextReview} />
        </div>
        <div className="lg:col-span-2">
          <CategoryTable latest={latest.category_scores} previous={previous} attemptId={latest.id} />
        </div>
      </div>

      {/* Action Queue */}
      <ActionQueue items={actionItems} onChange={setActionItems} />
    </div>
  );
}

// ── Overdue audit banner ──────────────────────────────────────────────────────
// Non-dismissible: always rendered when is_due=true and days_overdue > 0.
// Reappears on every dashboard load while the condition holds.
function AuditOverdueBanner({ auditStatus, lang }: { auditStatus: InternalAuditStatus; lang: string }) {
  if (!auditStatus.is_due || auditStatus.days_overdue === 0) return null;

  const catsText = auditStatus.target_categories
    .map((cat) => (lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat))
    .join(', ');

  const body = t('auditBannerBody', lang as 'en' | 'hi')
    .replace('{n}', String(auditStatus.days_overdue))
    .replace('{cats}', catsText || '—');

  return (
    <div className="mx-8 mt-6 flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30">
      <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
        <SearchCheck size={18} className="text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t('auditBannerTitle', lang as 'en' | 'hi')}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">{body}</p>
      </div>
      <Link
        href="/internal-audit"
        className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
      >
        {t('auditBannerCta', lang as 'en' | 'hi')}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [auditStatus, setAuditStatus] = useState<InternalAuditStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAssessmentScores().catch(() => ({ latest: null, history: [], current_scores: null, current_overall: null }) as ScoresResponse),
      getActionItems().catch(() => [] as ActionItem[]),
      getInternalAuditStatus().catch(() => null),
    ])
      .then(([s, a, audit]) => {
        setScores(s);
        setActionItems(a);
        setAuditStatus(audit);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-app">
      {loading && <DashboardSkeleton />}

      {!loading && !scores?.latest && (
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="bg-accent-soft p-5 rounded-2xl mb-6">
            <ClipboardCheck size={40} className="text-accent" />
          </div>
          <h3 className="text-xl font-bold text-ink mb-3">{t('dashboardBlankTitle', lang)}</h3>
          <p className="text-sm text-muted max-w-sm leading-relaxed mb-8">
            {t('dashboardBlankBody', lang)}
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-accent hover:bg-accent-hover transition"
          >
            <ClipboardCheck size={16} />
            {t('dashboardBlankCta', lang)}
          </Link>
        </div>
      )}

      {!loading && scores?.latest && (
        <>
          {auditStatus && <AuditOverdueBanner auditStatus={auditStatus} lang={lang} />}
          <LiveDashboard scores={scores} actionItems={actionItems} setActionItems={setActionItems} />
        </>
      )}
    </div>
  );
}
