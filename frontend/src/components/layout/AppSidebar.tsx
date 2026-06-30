'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  ClipboardCheck,
  FileText,
  ShieldAlert,
  SearchCheck,
  Users,
  X,
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
      { labelKey: 'navInternalAudit', icon: SearchCheck, href: '/internal-audit', disabled: false },
      { labelKey: 'navAdmin', icon: Users, href: '#', disabled: true },
    ],
  },
];

export function AppSidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { lang } = useLanguage();

  return (
    <>
      {/* Mobile backdrop — only below lg, only when the drawer is open */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`w-60 bg-brand-green-dark flex flex-col shrink-0 border-r border-brand-green-dark
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          lg:static lg:z-auto lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl shadow-sm bg-brand-yellow">
              <ShieldCheck size={18} className="text-brand-navy" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight tracking-tight">
                EduPrivacy AI
              </h1>
              <p className="text-brand-yellow text-sm leading-tight mt-0.5 font-semibold">
                DPDP Copilot
              </p>
            </div>
          </div>
          {/* Close — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden w-9 h-9 -mr-1 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

      {/* Navigation — grouped */}
      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map(({ sectionKey, items }) => (
          <div key={sectionKey} className="space-y-0.5">
            <p className="px-3 pb-1.5 text-[0.65rem] font-semibold tracking-widest uppercase text-white/60">
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-not-allowed opacity-60"
                    aria-disabled="true"
                  >
                    <Icon size={19} className="text-white/60 shrink-0" />
                    <span className="text-white/60 text-[0.95rem] flex-1">{label}</span>
                    <span className="text-[0.6rem] bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full font-medium leading-none">
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
                      ? 'bg-brand-yellow text-brand-navy shadow-sm'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
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

      {/* Footer — "Powered by VigorousONE" */}
      <div className="px-5 py-4 border-t border-white/15 flex items-center gap-2">
        {/* White rounded backing so the logo's white JPG bg doesn't read as a
            stray square against the green sidebar (mirrors the top-left shield). */}
        <span className="shrink-0 bg-white rounded-md p-0.5 flex items-center justify-center">
          <Image
            src="/assets/vigorousone-logo.jpg"
            alt="VigorousONE"
            width={20}
            height={20}
            className="rounded-sm"
          />
        </span>
        <span className="text-xs text-white/70 leading-tight">Powered by VigorousONE</span>
      </div>
      </aside>
    </>
  );
}
