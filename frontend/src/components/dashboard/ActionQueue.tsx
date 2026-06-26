'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { ActionItem, ActionStatus, ActionPriorityLevel } from '@/lib/types';
import { createActionItem, updateActionItem, deleteActionItem } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { t, RISK_CATEGORY_HI } from '@/lib/translations';

const RISK_CATEGORIES = [
  'Consent Management',
  'Data Security',
  'Vendor / Data Processor Risk',
  'Data Retention',
  "Children's Data",
  'Breach Readiness',
  'Cross-Border Transfer',
  'Grievance Redressal',
] as const;

const STATUS_KEYS: Record<ActionStatus, 'aqStatusNotStarted' | 'aqStatusInProgress' | 'aqStatusDone'> = {
  not_started: 'aqStatusNotStarted',
  in_progress: 'aqStatusInProgress',
  done: 'aqStatusDone',
};

function priorityColor(level: string): string {
  return level === 'HIGH' ? 'var(--risk-high)' : 'var(--risk-med)';
}

export function ActionQueue({
  items,
  onChange,
}: {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
}) {
  const { lang } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add-task form state
  const [fCategory, setFCategory] = useState<string>(RISK_CATEGORIES[0]);
  const [fTask, setFTask] = useState('');
  const [fEffort, setFEffort] = useState('');
  const [fPriority, setFPriority] = useState<ActionPriorityLevel>('HIGH');
  const [saving, setSaving] = useState(false);

  function catLabel(cat: string): string {
    return lang === 'hi' ? RISK_CATEGORY_HI[cat] ?? cat : cat;
  }

  async function handleStatusChange(item: ActionItem, status: ActionStatus) {
    setBusyId(item.id);
    // Optimistic update so the dropdown reflects instantly without a reload.
    const optimistic = items.map((i) => (i.id === item.id ? { ...i, status } : i));
    onChange(optimistic);
    try {
      const updated = await updateActionItem(item.id, { status });
      onChange(optimistic.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      onChange(items); // revert on failure
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: ActionItem) {
    setBusyId(item.id);
    try {
      await deleteActionItem(item.id);
      onChange(items.filter((i) => i.id !== item.id));
    } catch {
      // leave list as-is on failure
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd() {
    if (!fTask.trim()) return;
    setSaving(true);
    try {
      const created = await createActionItem({
        category: fCategory,
        task_text: fTask.trim(),
        effort_estimate: fEffort.trim() || null,
        priority_level: fPriority,
      });
      onChange([...items, created]);
      setFTask('');
      setFEffort('');
      setFPriority('HIGH');
      setFCategory(RISK_CATEGORIES[0]);
      setShowForm(false);
    } catch {
      // keep form open on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-6 hover-lift hover-lift-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink text-base">{t('aqTitle', lang)}</h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition"
        >
          <Plus size={14} />
          {t('aqAddTask', lang)}
        </button>
      </div>

      {/* Add-task form */}
      {showForm && (
        <div className="mb-5 p-4 rounded-xl bg-surface-2 border border-line space-y-3">
          <p className="text-sm font-semibold text-ink">{t('aqAddTitle', lang)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">{t('aqFieldCategory', lang)}</span>
              <select
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent"
              >
                {RISK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{catLabel(c)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">{t('aqFieldPriority', lang)}</span>
              <select
                value={fPriority}
                onChange={(e) => setFPriority(e.target.value as ActionPriorityLevel)}
                className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent"
              >
                <option value="HIGH">{t('aqPriorityHigh', lang)}</option>
                <option value="MED">{t('aqPriorityMed', lang)}</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t('aqFieldTask', lang)}</span>
            <input
              value={fTask}
              onChange={(e) => setFTask(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t('aqFieldEffort', lang)}</span>
            <input
              value={fEffort}
              onChange={(e) => setFEffort(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent w-40"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || !fTask.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? t('aqSaving', lang) : t('aqSave', lang)}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-line text-sm font-medium text-muted hover:bg-surface transition"
            >
              {t('aqCancel', lang)}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">{t('aqEmpty', lang)}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-line">
                <th className="py-2 pr-3 font-medium">{t('aqColPriority', lang)}</th>
                <th className="py-2 pr-3 font-medium">{t('aqColTask', lang)}</th>
                <th className="py-2 pr-3 font-medium">{t('aqColCategory', lang)}</th>
                <th className="py-2 pr-3 font-medium">{t('aqColEffort', lang)}</th>
                <th className="py-2 pr-3 font-medium">{t('aqColStatus', lang)}</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-3 align-top">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.7rem] font-bold text-white whitespace-nowrap"
                      style={{ background: priorityColor(item.priority_level) }}
                    >
                      {item.priority} {item.priority_level === 'HIGH' ? t('aqPriorityHigh', lang) : t('aqPriorityMed', lang)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 align-top text-ink max-w-xs">
                    <span>{item.task_text}</span>
                    {item.is_custom && (
                      <span className="ml-2 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full bg-accent-soft text-accent align-middle">
                        {t('aqCustomBadge', lang)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-top text-muted whitespace-nowrap">{catLabel(item.category)}</td>
                  <td className="py-3 pr-3 align-top text-muted whitespace-nowrap">{item.effort_estimate ?? '—'}</td>
                  <td className="py-3 pr-3 align-top">
                    <select
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(e) => handleStatusChange(item, e.target.value as ActionStatus)}
                      className="px-2 py-1 rounded-lg border border-line bg-surface text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                    >
                      <option value="not_started">{t('aqStatusNotStarted', lang)}</option>
                      <option value="in_progress">{t('aqStatusInProgress', lang)}</option>
                      <option value="done">{t('aqStatusDone', lang)}</option>
                    </select>
                  </td>
                  <td className="py-3 align-top">
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={busyId === item.id}
                      title={t('aqDelete', lang)}
                      className="p-1.5 rounded-lg text-muted hover:text-risk-high hover:bg-surface-2 transition disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
