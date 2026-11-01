import { AlertTriangle, Construction } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

export default function IncidentsPage() {
  return <AppShell><PageHeading eyebrow="Incident response" title="Incidents" description="Investigate service disruptions and track recovery." />
    <div className="rounded-2xl border border-line bg-panel px-6 py-16 text-center"><Construction size={28} className="mx-auto text-amber-300" /><h2 className="mt-4 text-sm font-semibold">Incident API integration pending</h2><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">The backend starter includes the initial incident database model, but incident listing, acknowledgement and resolution endpoints are not implemented yet. This page will connect when those endpoints are ready.</p></div>
  </AppShell>;
}
