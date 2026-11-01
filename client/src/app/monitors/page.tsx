"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, RadioTower, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ConnectionState } from "@/components/connection-state";
import { api } from "@/lib/api";
import type { Monitor } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { const result = await api.getMonitors(); setMonitors(result.data); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load monitors."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function createMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const data = new FormData(event.currentTarget);
    try {
      await api.createMonitor({
        name: String(data.get("name")),
        url: String(data.get("url")),
        method: data.get("method") as "GET" | "HEAD",
        intervalSeconds: Number(data.get("intervalSeconds")),
        timeoutMs: Number(data.get("timeoutMs")),
        expectedStatus: Number(data.get("expectedStatus"))
      });
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create monitor.");
    } finally { setSaving(false); }
  }

  return (
    <AppShell>
      <PageHeading eyebrow="Service inventory" title="Monitors" description="Configure the HTTP endpoints PulseWatch should check."
        action={<button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-xs font-semibold text-[#07130f] hover:bg-[#7aebc7]"><Plus size={15} /> New monitor</button>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/70 p-4">
        <div><div className="text-xs font-medium text-white">Backend connection</div><div className="mt-1 text-[11px] text-muted">Monitor records are loaded from your API.</div></div>
        <div className="flex items-center gap-3"><ConnectionState state={loading ? "loading" : error ? "error" : "connected"} message={error} /><button onClick={() => void load()} className="rounded-lg border border-line p-2 text-muted hover:text-white" aria-label="Refresh"><RefreshCw size={15} /></button></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="grid grid-cols-[minmax(0,1.6fr)_100px_120px_150px] gap-3 border-b border-line px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#718096] max-md:grid-cols-[minmax(0,1fr)_90px]">
          <span>Monitor</span><span>Status</span><span className="max-md:hidden">Interval</span><span className="max-md:hidden">Last checked</span>
        </div>
        {loading ? <div className="p-8 text-center text-xs text-muted">Loading monitor records…</div> :
          error ? <div className="p-8"><div className="mx-auto max-w-lg text-center"><RadioTower size={24} className="mx-auto text-amber-300" /><p className="mt-3 text-sm font-medium text-white">Could not load monitors</p><p className="mt-2 text-xs leading-5 text-muted">{error}</p><p className="mt-3 text-[11px] text-muted">The backend starter intentionally disables protected monitor routes until authentication is implemented.</p></div></div> :
          monitors.length === 0 ? <div className="p-12 text-center"><RadioTower size={26} className="mx-auto text-mint" /><p className="mt-3 text-sm font-medium">No monitors configured</p><p className="mt-1 text-xs text-muted">Create your first endpoint monitor.</p><button onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-line px-3 py-2 text-xs hover:bg-white/5">Create monitor</button></div> :
          monitors.map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1.6fr)_100px_120px_150px] items-center gap-3 border-b border-line px-5 py-4 last:border-0 max-md:grid-cols-[minmax(0,1fr)_90px]"><div className="min-w-0"><div className="truncate text-xs font-semibold text-white">{m.name}</div><div className="mt-1 truncate text-[11px] text-muted">{m.url}</div></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[10px] ${m.enabled ? "bg-emerald-400/10 text-mint" : "bg-slate-400/10 text-slate-300"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{m.enabled ? (m.consecutiveFails ? "Failing" : "Enabled") : "Paused"}</span><span className="text-xs text-muted max-md:hidden">{m.intervalSeconds}s</span><span className="text-[11px] text-muted max-md:hidden">{formatDate(m.lastCheckedAt)}</span></div>)}
      </div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-[#101725] shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold">Create monitor</h2><p className="mt-1 text-[11px] text-muted">Add an HTTP endpoint to your workspace.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-white/5" aria-label="Close"><X size={17} /></button></div>
          <form onSubmit={createMonitor} className="space-y-4 p-5">
            <Field label="Monitor name"><input name="name" required maxLength={100} placeholder="Production API" className="field" /></Field>
            <Field label="Endpoint URL"><input name="url" required type="url" placeholder="https://api.example.com/health" className="field" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method"><select name="method" className="field"><option>GET</option><option>HEAD</option></select></Field>
              <Field label="Expected status"><input name="expectedStatus" type="number" min="100" max="599" defaultValue="200" className="field" /></Field>
              <Field label="Interval (seconds)"><input name="intervalSeconds" type="number" min="60" max="86400" defaultValue="300" className="field" /></Field>
              <Field label="Timeout (ms)"><input name="timeoutMs" type="number" min="1000" max="15000" defaultValue="10000" className="field" /></Field>
            </div>
            {formError && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-muted hover:text-white">Cancel</button><button disabled={saving} className="rounded-lg bg-mint px-4 py-2 text-xs font-semibold text-[#07130f] disabled:opacity-50">{saving ? "Creating…" : "Create monitor"}</button></div>
          </form>
        </div>
      </div>}
      <style jsx>{`.field{width:100%;margin-top:7px;border:1px solid #293548;border-radius:9px;background:#0b111d;padding:10px 11px;color:#f7f9fc;font-size:12px;outline:none}.field:focus{border-color:#5ee0b5}.field::placeholder{color:#647187}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-[#a8b3c4]">{label}{children}</label>;
}
