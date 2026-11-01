"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertTriangle, BarChart3, Blocks, ChevronDown,
  CircleHelp, Command, Gauge, LifeBuoy, Settings2, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Monitors", href: "/monitors", icon: Activity },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle, count: "—" },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-[#0b111d] lg:flex">
      <div className="flex h-[76px] items-center gap-3 border-b border-line px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-[#07130f] shadow-glow">
          <Activity size={20} strokeWidth={2.7} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-white">pulsewatch</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Reliability cloud</div>
        </div>
      </div>

      <div className="px-4 pt-6">
        <button className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-3 py-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1b2b38] text-mint">
            <Blocks size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">Workspace</div>
            <div className="text-[11px] text-muted">Connect organization</div>
          </div>
          <ChevronDown size={15} className="text-muted" />
        </button>
      </div>

      <div className="px-5 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657187]">Workspace</div>
      <nav className="space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition",
              active ? "bg-[#172a2a] font-medium text-mint" : "text-[#9aa7ba] hover:bg-white/[0.04] hover:text-white"
            )}>
              <Icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.count && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">{item.count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657187]">Manage</div>
      <nav className="space-y-1 px-3">
        <Link href="/settings" className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition", pathname === "/settings" ? "bg-[#172a2a] text-mint" : "text-[#9aa7ba] hover:bg-white/[0.04] hover:text-white")}>
          <Settings2 size={17} /> Settings
        </Link>
        <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-[#9aa7ba] transition hover:bg-white/[0.04] hover:text-white">
          <CircleHelp size={17} /> HTTP reference
        </a>
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-line bg-panel p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-white"><ShieldCheck size={15} className="text-mint" /> Built for reliability</div>
          <p className="mt-2 text-[11px] leading-5 text-muted">Monitoring runs independently from your browser session.</p>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#748399]"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Backend setup in progress</div>
        </div>
        <div className="mt-4 flex items-center gap-2 px-1 text-[10px] text-[#647187]"><Command size={12} /> PULSEWATCH / EARLY ACCESS <span className="ml-auto">v0.1</span></div>
      </div>
    </aside>
  );
}
