import { BarChart3, Construction } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

export default function AnalyticsPage() {
  return <AppShell><PageHeading eyebrow="Reliability insights" title="Analytics" description="Understand uptime, latency and service performance over time." />
    <div className="rounded-2xl border border-line bg-panel px-6 py-16 text-center"><BarChart3 size={28} className="mx-auto text-mint" /><h2 className="mt-4 text-sm font-semibold">Waiting for check-history APIs</h2><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">Charts will be connected to persisted check results and uptime aggregation endpoints. No placeholder metrics are presented as real measurements.</p></div>
  </AppShell>;
}
