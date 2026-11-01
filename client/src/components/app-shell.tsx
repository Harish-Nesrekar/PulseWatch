import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-white">
      <Sidebar />
      <div className="min-h-screen lg:pl-[248px]">
        <Topbar />
        <main className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">{children}</main>
        <footer className="mx-auto max-w-[1500px] px-5 pb-8 text-[10px] text-[#58667b] md:px-8">PulseWatch · API reliability workspace · Early access</footer>
      </div>
    </div>
  );
}
