'use client';

import { useLanguage } from '@/context/LanguageContext';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center bg-[#1A2756] rounded-lg p-0.5 gap-0.5" role="group" aria-label="Language">
      {(['en', 'hi'] as const).map((value) => (
        <button
          key={value}
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            lang === value
              ? 'bg-[#FF9933] text-white shadow-sm'
              : 'text-[#9CA3AF] hover:text-white'
          }`}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
