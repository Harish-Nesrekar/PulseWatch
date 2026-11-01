"use client";

import { Bell, Search, CircleUserRound, Menu } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-line bg-[#090d16]/90 px-5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-muted hover:bg-white/5 lg:hidden" aria-label="Menu"><Menu size={19} /></button>
        <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
          <span>Workspace</span><span className="text-[#3e4a5d]">/</span><span className="font-medium text-white">Overview</span>
        </div>
        <div className="text-sm font-semibold text-white sm:hidden">PulseWatch</div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-line bg-panel px-3 md:flex">
          <Search size={14} className="text-muted" />
          <span className="text-xs text-[#68768b]">Search anything...</span>
          <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">⌘ K</span>
        </div>
        <button className="relative rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-white" aria-label="Notifications">
          <Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-mint" />
        </button>
        <div className="flex items-center gap-2 border-l border-line pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2b3a4c] bg-[#172434] text-xs font-semibold text-mint"><CircleUserRound size={17} /></div>
          <div className="hidden sm:block"><div className="text-xs font-medium text-white">Your account</div><div className="text-[10px] text-muted">Local workspace</div></div>
        </div>
      </div>
    </header>
  );
}
