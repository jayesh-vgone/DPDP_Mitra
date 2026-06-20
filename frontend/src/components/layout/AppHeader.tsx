'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Sun, Moon } from 'lucide-react';
import { LanguageToggle } from '@/components/chat/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { t, type TranslationKey } from '@/lib/translations';

const PAGE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/dashboard': 'pageDashboard',
  '/chat': 'pageChatCopilot',
  '/profile': 'pageProfile',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const { user, institution, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const titleKey = PAGE_TITLE_KEYS[pathname] ?? 'pageDashboard';
  const title = t(titleKey, lang);

  const displayName = user?.display_name ?? institution?.name ?? 'User';
  const initials = getInitials(displayName);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="bg-white dark:bg-[#0F1A3E] border-b-2 border-[#FF9933] px-6 py-3.5 flex items-center justify-between shrink-0">
      <h2 className="text-[#0A0F2C] dark:text-gray-100 font-bold text-base">{title}</h2>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? t('themeToggleDark', lang) : t('themeToggleLight', lang)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A2756] transition"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <Link
          href="/profile"
          title={t('profileLink', lang)}
          className="flex items-center gap-2 group"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 group-hover:opacity-80 transition"
            style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
          >
            <span className="text-white text-xs font-bold select-none">{initials}</span>
          </div>
          <span className="text-base text-[#111827] dark:text-gray-100 font-medium group-hover:text-[#FF9933] transition">{displayName}</span>
        </Link>
        <button
          onClick={handleLogout}
          title={t('logoutBtn', lang)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#0A0F2C] dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1A2756] transition"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('logoutBtn', lang)}</span>
        </button>
      </div>
    </header>
  );
}
