import Link from "next/link";
import { Activity, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
    <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-[#07130f]"><Activity size={21} /></div><div><div className="font-semibold">PulseWatch</div><div className="text-[10px] uppercase tracking-[0.18em] text-muted">Reliability cloud</div></div></div>
      <h1 className="mt-8 text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm leading-6 text-muted">Authentication is the next backend milestone. This screen is a visual placeholder and does not collect or transmit credentials.</p>
      <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-200"><LockKeyhole size={15} /> Sign-in not enabled yet</div><p className="mt-2 text-xs leading-5 text-muted">The backend starter intentionally has no login or session-creation endpoint. We will connect this form only after secure authentication is implemented.</p></div>
      <Link href="/" className="mt-6 flex h-10 items-center justify-center rounded-lg bg-mint text-xs font-semibold text-[#07130f]">Back to dashboard</Link>
    </div>
  </main>;
}
