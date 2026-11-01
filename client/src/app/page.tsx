"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Clock3, Plus, RadioTower, ShieldCheck, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { StatCard } from "@/components/stat-card";
import { ConnectionState } from "@/components/connection-state";
import { api } from "@/lib/api";
import type { Monitor } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMonitors()
      .then((result) => setMonitors(result.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const healthy = useMemo(() => monitors.filter((m) => m.enabled && m.consecutiveFails === 0).length, [monitors]);
  const failing = useMemo(() => monitors.filter((m) => m.consecutiveFails > 0).length, [monitors]);

  return (
    <AppShell>
      <PageHeading eyebrow="Your command center" title="Good to see you." description="Here's the current health of the services you're keeping an eye on."
        action={<Link href="/monitors" className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-xs font-semibold text-[#07130f] transition hover:bg-[#7aebc7]"><Plus size={15} /> Add monitor</Link>} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-amber-400" /> Workspace connection</div>
        <ConnectionState state={loading ? "loading" : error ? "error" : "connected"} message={error} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total monitors" value={loading ? "—" : monitors.length} detail="Configured endpoints" icon={<RadioTower size={17} />} tone="blue" />
        <StatCard label="Healthy monitors" value={loading ? "—" : healthy} detail="No consecutive failures recorded" icon={<ShieldCheck size={17} />} />
        <StatCard label="Failing monitors" value={loading ? "—" : failing} detail="Currently showing failed checks" icon={<Activity size={17} />} tone="red" />
        <StatCard label="Open incidents" value="—" detail="Incident API not connected yet" icon={<Zap size={17} />} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><h2 className="text-sm font-semibold text-white">Your monitors</h2><p className="mt-1 text-[11px] text-muted">Live configuration from the API</p></div>
            <Link href="/monitors" className="flex items-center gap-1 text-xs font-medium text-mint hover:text-white">View all <ArrowUpRight size={14} /></Link>
          </div>
          {error ? <div className="p-6 text-sm text-muted">Monitor data is unavailable until the API and authentication are configured.</div> :
            loading ? <div className="p-6 text-sm text-muted">Loading monitors…</div> :
            monitors.length === 0 ? <div className="flex flex-col items-center px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17312d] text-mint"><RadioTower size={22} /></div><h3 className="mt-4 text-sm font-semibold">No monitors yet</h3><p className="mt-2 max-w-sm text-xs leading-5 text-muted">Add an HTTP endpoint to start building your service health overview.</p><Link href="/monitors" className="mt-5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-white hover:bg-white/5">Configure a monitor</Link></div> :
            <div className="divide-y divide-line">{monitors.slice(0, 6).map((m) => <div key={m.id} className="flex items-center gap-3 px-5 py-4"><span className={`h-2 w-2 rounded-full ${m.consecutiveFails ? "bg-rose-400" : m.enabled ? "bg-mint" : "bg-slate-500"}`} /><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-white">{m.name}</div><div className="mt-1 truncate text-[11px] text-muted">{m.url}</div></div><span className="hidden text-[11px] text-muted sm:block">{m.enabled ? "Enabled" : "Paused"}</span><span className="text-[11px] text-[#8190a5]">{formatDate(m.lastCheckedAt)}</span></div>)}</div>}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17312d] text-mint"><Clock3 size={16} /></div><div><h2 className="text-sm font-semibold">Monitoring pipeline</h2><p className="text-[11px] text-muted">System readiness checklist</p></div></div>
          <div className="mt-5 space-y-4">
            {[
              ["API service", "Health endpoint available", "ready"],
              ["PostgreSQL", "Persistent monitor and check storage", "setup"],
              ["Redis queue", "Background job dispatch", "setup"],
              ["Worker", "Independent scheduled checks", "setup"],
              ["Authentication", "Secure user and workspace sessions", "setup"]
            ].map(([name, desc, status]) => <div key={name} className="flex items-start gap-3"><span className={`mt-1 h-2 w-2 rounded-full ${status === "ready" ? "bg-mint" : "bg-amber-400"}`} /><div className="flex-1"><div className="text-xs font-medium text-white">{name}</div><div className="mt-1 text-[11px] text-muted">{desc}</div></div><span className={`text-[10px] ${status === "ready" ? "text-mint" : "text-amber-300"}`}>{status === "ready" ? "Available" : "Pending"}</span></div>)}
          </div>
          <div className="mt-6 rounded-xl border border-line bg-[#0b111d] p-3"><div className="flex items-center gap-2 text-xs font-medium text-white"><Zap size={14} className="text-mint" /> Next milestone</div><p className="mt-2 text-[11px] leading-5 text-muted">Complete authentication and organization membership before enabling monitor operations.</p></div>
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-[#0d1420] p-4 text-[11px] leading-5 text-muted">
        <strong className="text-white">Data integrity:</strong> Metrics on this page are derived from the backend monitor response. Uptime percentages, latency trends and incident counts will appear after their respective APIs are implemented; no sample metrics are presented as live data.
      </div>
    </AppShell>
  );
}
