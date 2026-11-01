import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

export function ConnectionState({ state, message }: { state: "loading" | "error" | "connected"; message?: string }) {
  if (state === "loading") return <div className="flex items-center gap-2 text-xs text-muted"><LoaderCircle size={14} className="animate-spin" /> Connecting to API...</div>;
  if (state === "connected") return <div className="flex items-center gap-2 text-xs text-mint"><CheckCircle2 size={14} /> API connected</div>;
  return <div className="flex max-w-xl items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-200"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{message ?? "Backend connection is not ready."}</span></div>;
}
