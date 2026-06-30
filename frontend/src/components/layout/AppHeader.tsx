'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Sun, Moon, Search, Bell, ChevronRight, Menu } from 'lucide-react';
import { LanguageToggle } from '@/components/chat/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { t, type TranslationKey } from '@/lib/translations';

// Map the first path segment to a translated page label. The breadcrumb is
// derived from the route (not hardcoded per page) — a fixed "Compliance" root
// crumb plus the current page label.
const SEGMENT_LABEL_KEYS: Record<string, TranslationKey> = {
  dashboard: 'pageDashboard',
  chat: 'pageChatCopilot',
  assessment: 'navAssessment',
  profile: 'pageProfile',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const { user, institution, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  const pageKey = SEGMENT_LABEL_KEYS[firstSegment] ?? 'pageDashboard';
  const pageLabel = t(pageKey, lang);

  const displayName = user?.display_name ?? institution?.name ?? 'User';
  const initials = getInitials(displayName);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="bg-brand-green-dark border-b border-brand-green-dark px-6 py-3 flex items-center justify-between shrink-0">
      {/* Hamburger (mobile) + breadcrumb (route-derived) */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
          <span className="text-white/70">{t('breadcrumbRoot', lang)}</span>
          <ChevronRight size={14} className="text-white/50 shrink-0" />
          <span className="text-white font-semibold truncate">{pageLabel}</span>
        </nav>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search — VISUAL ONLY (no backend search wired up yet) */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-muted"
          title={t('searchComingSoon', lang)}
        >
          <Search size={14} />
          <input
            type="text"
            disabled
            placeholder={t('searchPlaceholder', lang)}
            className="bg-transparent text-xs text-ink placeholder:text-muted outline-none w-32 cursor-not-allowed"
            aria-label={t('searchPlaceholder', lang)}
          />
        </div>

        {/* Notifications — VISUAL ONLY (no real notifications wired up yet) */}
        <button
          type="button"
          title={t('notificationsComingSoon', lang)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition cursor-not-allowed"
          aria-label={t('notificationsComingSoon', lang)}
        >
          <Bell size={16} />
        </button>

        <LanguageToggle />

        <button
          onClick={toggleTheme}
          title={theme === 'light' ? t('themeToggleDark', lang) : t('themeToggleLight', lang)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <Link href="/profile" title={t('profileLink', lang)} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand-yellow group-hover:opacity-80 transition">
            <span className="text-brand-navy text-xs font-bold select-none">{initials}</span>
          </div>
          <span className="hidden sm:inline text-sm text-white font-medium group-hover:text-brand-yellow transition">
            {displayName}
          </span>
        </Link>

        <button
          onClick={handleLogout}
          title={t('logoutBtn', lang)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/85 hover:text-white hover:bg-white/10 transition"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('logoutBtn', lang)}</span>
        </button>
      </div>
    </header>
  );
}
