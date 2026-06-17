'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
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

const NAV_ITEMS: Array<{
  labelKey: TranslationKey;
  icon: IconComponent;
  href: string;
  disabled: boolean;
}> = [
  { labelKey: 'navDashboard',   icon: LayoutDashboard, href: '/dashboard', disabled: false },
  { labelKey: 'navChatCopilot', icon: MessageSquare,   href: '/chat',      disabled: false },
  { labelKey: 'navAssessment',  icon: ClipboardCheck,  href: '#',          disabled: true },
  { labelKey: 'navPolicies',    icon: FileText,        href: '#',          disabled: true },
  { labelKey: 'navIncidents',   icon: ShieldAlert,     href: '#',          disabled: true },
  { labelKey: 'navAdmin',       icon: Users,           href: '#',          disabled: true },
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
    <aside className="w-60 bg-[#0A0F2C] flex flex-col shrink-0 border-r border-[#1A2756]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1A2756]">
        <div className="flex items-center gap-3">
          <div className="bg-[#FF9933] p-2 rounded-xl">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight tracking-tight">
              EduPrivacy AI
            </h1>
            <p className="text-[#FF9933] text-sm leading-tight mt-0.5 font-medium">
              DPDP Copilot
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ labelKey, icon: Icon, href, disabled }) => {
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
                <Icon size={20} className="text-[#9CA3AF] shrink-0" />
                <span className="text-[#9CA3AF] text-base flex-1">{label}</span>
                <span className="text-[0.6rem] bg-[#1A2756] text-[#9CA3AF] px-1.5 py-0.5 rounded-full font-medium leading-none">
                  {t('navSoon', lang)}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={labelKey}
              href={href}
              style={isActive ? { background: 'linear-gradient(135deg, #FF9933, #138808)' } : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-white/70 hover:bg-[#0F1A3E] hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-base">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1A2756]">
        <p className="text-[0.65rem] text-[#9CA3AF]">{today}</p>
        <p className="text-[0.65rem] text-[#9CA3AF] mt-0.5 font-medium">ENG IN</p>
      </div>
    </aside>
  );
}
