'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  ClipboardCheck,
  FileText,
  ShieldAlert,
  Users,
  type LucideProps,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey } from '@/lib/translations';

type IconComponent = React.ComponentType<LucideProps>;

interface NavItem {
  labelKey: TranslationKey;
  icon: IconComponent;
  href: string;
  disabled: boolean;
}

const NAV_GROUPS: Array<{ sectionKey: TranslationKey; items: NavItem[] }> = [
  {
    sectionKey: 'navSectionMain',
    items: [
      { labelKey: 'navDashboard', icon: LayoutDashboard, href: '/dashboard', disabled: false },
      { labelKey: 'navChatCopilot', icon: MessageSquare, href: '/chat', disabled: false },
      { labelKey: 'navAssessment', icon: ClipboardCheck, href: '/assessment', disabled: false },
    ],
  },
  {
    sectionKey: 'navSectionCompliance',
    items: [
      { labelKey: 'navPolicies', icon: FileText, href: '#', disabled: true },
      { labelKey: 'navIncidents', icon: ShieldAlert, href: '#', disabled: true },
      { labelKey: 'navAdmin', icon: Users, href: '#', disabled: true },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { lang } = useLanguage();

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <aside className="w-60 bg-sidebar flex flex-col shrink-0 border-r border-line">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-violet))' }}
          >
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-ink font-bold text-xl leading-tight tracking-tight">
              EduPrivacy AI
            </h1>
            <p className="text-accent text-sm leading-tight mt-0.5 font-semibold">
              DPDP Copilot
            </p>
          </div>
        </div>
      </div>

      {/* Navigation — grouped */}
      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map(({ sectionKey, items }) => (
          <div key={sectionKey} className="space-y-0.5">
            <p className="px-3 pb-1.5 text-[0.65rem] font-semibold tracking-widest uppercase text-muted">
              {t(sectionKey, lang)}
            </p>
            {items.map(({ labelKey, icon: Icon, href, disabled }) => {
              const label = t(labelKey, lang);
              const isActive =
                !disabled &&
                (pathname === href || (href !== '/' && pathname.startsWith(href + '/')));

              if (disabled) {
                return (
                  <div
                    key={labelKey}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-not-allowed opacity-50"
                    aria-disabled="true"
                  >
                    <Icon size={19} className="text-muted shrink-0" />
                    <span className="text-muted text-[0.95rem] flex-1">{label}</span>
                    <span className="text-[0.6rem] bg-surface-2 text-muted px-1.5 py-0.5 rounded-full font-medium leading-none">
                      {t('navSoon', lang)}
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={labelKey}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink/70 hover:bg-accent-soft hover:text-accent'
                  }`}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="text-[0.95rem] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-line">
        <p className="text-[0.65rem] text-muted">{today}</p>
        <p className="text-[0.65rem] text-muted mt-0.5 font-medium">ENG IN</p>
      </div>
    </aside>
  );
}
