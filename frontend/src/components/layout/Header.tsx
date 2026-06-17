'use client';

import { Scale } from 'lucide-react';
import { LanguageToggle } from '@/components/chat/LanguageToggle';

export function Header() {
  return (
    <header className="bg-[#0A0F2C] border-b border-[#1A2756] px-5 py-3 flex items-center justify-between shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="bg-[#FF9933] p-2 rounded-xl">
          <Scale size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-[0.95rem] leading-tight tracking-tight">
            DPDP Mitra
          </h1>
          <p className="text-[#9CA3AF] text-[0.65rem] leading-tight">
            Digital Personal Data Protection Assistant
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        <LanguageToggle />
        <div className="w-8 h-8 bg-[#1A2756] border border-[#243570] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-semibold select-none">U</span>
        </div>
      </div>
    </header>
  );
}
