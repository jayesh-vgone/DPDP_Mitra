'use client';

import { usePathname } from 'next/navigation';
import { institution } from '@/lib/mockData';
import { LanguageToggle } from '@/components/chat/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey } from '@/lib/translations';

const PAGE_TITLE_KEYS: Record<string, TranslationKey> = {
  '/dashboard': 'pageDashboard',
  '/chat': 'pageChatCopilot',
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
  const { lang } = useLanguage();
  const titleKey = PAGE_TITLE_KEYS[pathname] ?? 'pageDashboard';
  const title = t(titleKey, lang);
  const initials = getInitials(institution.name);

  return (
    <header className="bg-white border-b-2 border-[#FF9933] px-6 py-3.5 flex items-center justify-between shrink-0">
      <h2 className="text-[#0A0F2C] font-bold text-base">{title}</h2>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
        >
          <span className="text-white text-xs font-bold select-none">{initials}</span>
        </div>
        <span className="text-base text-[#111827] font-medium">{institution.name}</span>
      </div>
    </header>
  );
}
