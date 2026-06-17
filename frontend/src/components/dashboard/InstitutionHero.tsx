'use client';

import { MapPin, Users, Briefcase, BookOpen } from 'lucide-react';
import { institution } from '@/lib/mockData';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

function MetaPill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-[#FF9933] rounded-full px-3 py-1 text-sm text-[#0A0F2C]">
      {icon && <span className="text-[#FF9933]">{icon}</span>}
      {children}
    </div>
  );
}

export function InstitutionHero() {
  const { lang } = useLanguage();

  return (
    <div className="relative bg-white px-6 py-5 border-b border-gray-100">
      {/* Institution Pro badge */}
      <div className="absolute top-5 right-6">
        <span
          className="text-white text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
        >
          {t('institutionPro', lang)}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-[#0A0F2C] mb-4">{institution.name}</h1>

      <div className="flex flex-wrap gap-2">
        <MetaPill>{institution.type}</MetaPill>
        <MetaPill icon={<MapPin size={12} />}>{institution.location}</MetaPill>
        <MetaPill icon={<Users size={12} />}>
          {institution.studentCount.toLocaleString()} Students
        </MetaPill>
        <MetaPill icon={<Briefcase size={12} />}>{institution.staffCount} Staff</MetaPill>
        <MetaPill icon={<BookOpen size={12} />}>{institution.board}</MetaPill>
      </div>
    </div>
  );
}
