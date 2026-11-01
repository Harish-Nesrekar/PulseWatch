import { Settings2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

export default function SettingsPage() {
  return <AppShell><PageHeading eyebrow="Workspace configuration" title="Settings" description="Manage workspace access, integrations and notification preferences." />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-line bg-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Settings2 size={17} className="text-mint" /> Workspace settings</div><p className="mt-2 text-xs leading-5 text-muted">Organization creation, membership and role management will be enabled after authentication and organization APIs are implemented.</p><span className="mt-4 inline-flex rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] text-amber-300">Not connected</span></div>
      <div className="rounded-2xl border border-line bg-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} className="text-mint" /> Security</div><p className="mt-2 text-xs leading-5 text-muted">Session security, member permissions, API keys and audit history require backend implementation.</p><span className="mt-4 inline-flex rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] text-amber-300">Not connected</span></div>
    </div>
  </AppShell>;
}
