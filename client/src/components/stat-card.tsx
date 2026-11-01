import type { ReactNode } from "react";

export function StatCard({ label, value, detail, icon, tone = "mint" }: {
  label: string; value: string | number; detail: string; icon: ReactNode; tone?: "mint" | "blue" | "amber" | "red";
}) {
  const tones = {
    mint: "bg-[#14352e] text-mint",
    blue: "bg-[#172d49] text-blue-300",
    amber: "bg-[#3b2c18] text-amber-300",
    red: "bg-[#3c2028] text-rose-300"
  };
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-4 text-[30px] font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[11px] text-[#78869a]">{detail}</div>
    </div>
  );
}
