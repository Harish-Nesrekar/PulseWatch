"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Heart,
  Mail,
  Handshake,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const comparison = [
  ["HTTP / HTTPS monitoring", "Included", "Planned", "Planned"],
  ["Scheduled availability checks", "Included", "Planned", "Planned"],
  ["Response-time tracking", "Included", "Planned", "Planned"],
  ["Incident detection and lifecycle", "Included", "Planned", "Planned"],
  ["Public status pages", "Included", "Planned", "Planned"],
  ["SSRF and private-network safeguards", "Included", "Planned", "Planned"],
  ["Advanced monitoring controls", "—", "Planned", "Planned"],
  ["Extended history and analytics", "—", "Planned", "Planned"],
  ["Team and organization features", "—", "—", "Planned"],
  ["Priority support", "—", "Planned", "Planned"],
];

const faqs = [
  {
    q: "Is PulseWatch really free?",
    a: "Yes. The current core PulseWatch experience is free to use. If plan limits or paid features are introduced in the future, they will be communicated clearly before they take effect.",
  },
  {
    q: "Do I need to contribute to keep using PulseWatch?",
    a: "No. Supporting PulseWatch is completely optional. You can continue using the Free plan without making a contribution.",
  },
  {
    q: "Are Pro and Business available now?",
    a: "Not yet. Pro and Business are future plans, not purchasable subscriptions. Their features and prices will be published before launch.",
  },
  {
    q: "What does a contribution support?",
    a: "Voluntary contributions help with infrastructure, monitoring capacity, maintenance, and continued development. They do not currently unlock paid features or change your plan.",
  },
];

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "footer-brand-icon" : "landing-brand-icon"}>
      <svg viewBox="0 0 32 24" className="pulse-logo-line" aria-hidden="true">
        <defs>
          <linearGradient id={small ? "pulsePricingFooter" : "pulsePricingHeader"} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#258b63" />
            <stop offset="100%" stopColor="#31b77a" />
          </linearGradient>
        </defs>
        <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke={`url(#${small ? "pulsePricingFooter" : "pulsePricingHeader"})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Included({ children }: { children: import("react").ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-slate-600">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-3 w-3" strokeWidth={2.8} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="pricing-page landing-page min-h-screen overflow-hidden text-slate-800">
      <div className="landing-aurora" aria-hidden="true">
        <div className="landing-grid" />
        <div className="landing-guide landing-guide-one" />
        <div className="landing-guide landing-guide-two" />
      </div>

      <header className="landing-navbar sticky top-0 z-50">
        <div className="pricing-navbar-inner relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3" aria-label="PulseWatch home">
            <BrandMark />
            <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Pulse<span className="brand-accent">Watch</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <Link href="/#features" className="nav-link">Features</Link>
            <Link href="/#reliability" className="nav-link">Reliability</Link>
            <Link href="/pricing" aria-current="page" className="pricing-nav-active">Pricing</Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-4">
            <Link href="/login" className="signin-link hidden sm:inline-flex">Sign in</Link>
            <Link href="/register" className="navbar-cta">
              <span>Get started</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <nav aria-label="Mobile navigation" className="mobile-pricing-nav order-3 flex w-full items-center justify-center gap-7 border-t border-slate-200/80 pt-3 text-xs font-semibold text-slate-600 md:hidden">
            <Link href="/#features" className="nav-link">Features</Link>
            <Link href="/#reliability" className="nav-link">Reliability</Link>
            <Link href="/pricing" aria-current="page" className="pricing-nav-active">Pricing</Link>
          </nav>
        </div>
      </header>

      <section className="relative px-5 pb-14 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-24">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="section-eyebrow mx-auto">
            <Zap className="h-3.5 w-3.5" /> SIMPLE, TRANSPARENT PRICING
          </div>
          <h1 className="pricing-hero-title mx-auto mt-6 max-w-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900">
            Monitoring that starts free.
            <span className="hero-gradient-text mt-2 block">Built to grow with you.</span>
          </h1>
          <p className="pricing-hero-copy mx-auto mt-6 max-w-2xl text-sm leading-8 text-slate-500 sm:text-base">
            Start monitoring your websites and APIs with PulseWatch at no cost.
            If it helps you, you can choose to support its continued development.
            No pressure. No hidden commitment.
          </p>
        </div>
      </section>

      <section className="pricing-page-cards relative z-10 mx-auto grid max-w-7xl gap-5 px-5 pb-20 sm:px-8 lg:grid-cols-3">
        <article className="pricing-card pricing-card--free">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">Free</p>
              <p className="mt-1 text-xs text-slate-400">Everything you need to get started</p>
            </div>
            <span className="pricing-status pricing-status--available">AVAILABLE NOW</span>
          </div>
          <div className="mt-7 flex items-end gap-2">
            <span className="text-5xl font-extrabold tracking-tight text-slate-900">₹0</span>
            <span className="pb-1.5 text-sm text-slate-400">/ forever</span>
          </div>
          <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">The essentials to keep an eye on your services.</p>
          <Link href="/register" className="pricing-primary-button mt-6">
            Start free monitoring <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="pricing-divider" />
          <p className="pricing-list-label">WHAT'S INCLUDED</p>
          <ul className="mt-4 space-y-3">
            <Included>HTTP and HTTPS monitoring</Included>
            <Included>Scheduled availability checks</Included>
            <Included>Response-time tracking</Included>
            <Included>Incident detection and tracking</Included>
            <Included>Public status pages</Included>
            <Included>Built-in SSRF safeguards</Included>
          </ul>
        </article>

        <article className="pricing-card pricing-card--support">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">Support PulseWatch</p>
              <p className="mt-1 text-xs text-slate-400">Help us keep building</p>
            </div>
            <span className="pricing-icon pricing-icon--heart"><Heart className="h-5 w-5" /></span>
          </div>
          <div className="mt-7">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">Your choice</span>
          </div>
          <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">A voluntary contribution from people who want to help PulseWatch grow.</p>
          <div className="pricing-secondary-button mt-6">
            <Heart className="h-4 w-4" /> 100% optional
          </div>
          <div className="pricing-divider" />
          <p className="pricing-list-label">YOUR SUPPORT HELPS WITH</p>
          <ul className="mt-4 space-y-3">
            <Included>Monitoring infrastructure and uptime</Included>
            <Included>Reliable background check capacity</Included>
            <Included>Ongoing maintenance and improvements</Included>
            <Included>Building useful features for everyone</Included>
          </ul>
          <p className="mt-auto border-t border-slate-100 pt-5 text-xs leading-6 text-slate-400">
            Contribution checkout is not enabled yet. We’ll publish a secure way to contribute when it is ready.
          </p>
        </article>

        <article className="pricing-card pricing-card--future">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">Pro & Business</p>
              <p className="mt-1 text-xs text-slate-400">For growing monitoring needs</p>
            </div>
            <span className="pricing-status pricing-status--future">COMING SOON</span>
          </div>
          <div className="mt-7">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">In the future</span>
          </div>
          <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">More capacity and collaboration options as PulseWatch evolves.</p>
          <div className="pricing-secondary-button pricing-secondary-button--muted mt-6">
            <Sparkles className="h-4 w-4" /> Not available to purchase
          </div>
          <div className="pricing-divider" />
          <p className="pricing-list-label">POTENTIAL FUTURE ADDITIONS</p>
          <ul className="mt-4 space-y-3">
            <Included>Advanced monitoring controls</Included>
            <Included>Extended history and analytics</Included>
            <Included>Team and organization features</Included>
            <Included>Priority support options</Included>
          </ul>
          <p className="mt-auto border-t border-slate-100 pt-5 text-xs leading-6 text-slate-400">
            Planned ideas only. Final features and pricing have not been announced.
          </p>
        </article>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="section-eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> PLAN DETAILS</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Compare the plans</h2>
          </div>
          <p className="max-w-md text-xs leading-6 text-slate-500">
            Free reflects the current core product. Pro and Business entries are proposed future capabilities, not active entitlements.
          </p>
        </div>
        <div className="pricing-table-wrap">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="w-[46%]">FEATURE</th>
                  <th>FREE</th>
                  <th>PRO <span>FUTURE</span></th>
                  <th>BUSINESS <span>FUTURE</span></th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([feature, free, pro, business]) => (
                  <tr key={feature}>
                    <td className="font-semibold text-slate-700">{feature}</td>
                    {[free, pro, business].map((value, index) => (
                      <td key={`${feature}-${index}`}>
                        {value === "Included" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Included</span>
                        ) : value === "Planned" ? (
                          <span className="text-xs font-semibold text-slate-400">Planned</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          Exact usage limits, plan prices, and launch dates will be published transparently before any changes take effect.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <div className="pricing-faq-panel">
          <div className="mb-7 text-center">
            <div className="section-eyebrow mx-auto"><Sparkles className="h-3.5 w-3.5" /> GOOD TO KNOW</div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm font-bold text-slate-800"
                  aria-expanded={openFaq === index}
                >
                  {faq.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                </button>
                {openFaq === index && <p className="mt-3 max-w-3xl pr-8 text-sm leading-7 text-slate-500">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="mb-8 text-center">
          <div className="section-eyebrow mx-auto"><Mail className="h-3.5 w-3.5" /> LET’S CONNECT</div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Questions, pricing or collaboration?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Have a question about PulseWatch, interested in future plans, or want to work together? Send me an email.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="pricing-contact-card">
            <span className="pricing-contact-icon"><Mail className="h-5 w-5" /></span>
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">Pricing enquiries</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ask about current availability, future Pro and Business plans, or pricing details.
            </p>
            <a className="pricing-contact-link mt-5" href="mailto:harishnesrekar422@gmail.com?subject=PulseWatch%20Pricing%20Enquiry">
              Discuss pricing <ArrowRight className="h-4 w-4" />
            </a>
          </article>
          <article className="pricing-contact-card">
            <span className="pricing-contact-icon pricing-contact-icon--green"><Handshake className="h-5 w-5" /></span>
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">Collaboration & partnerships</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Interested in collaborating, contributing ideas, or exploring a partnership? Let’s talk.
            </p>
            <a className="pricing-contact-link mt-5" href="mailto:harishnesrekar422@gmail.com?subject=PulseWatch%20Collaboration%20Enquiry">
              Explore collaboration <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          Email: <a className="font-bold text-slate-800 underline decoration-emerald-600 underline-offset-4" href="mailto:harishnesrekar422@gmail.com">harishnesrekar422@gmail.com</a>
        </p>
      </section>

      <section className="landing-cta-section relative z-10 px-5 py-16 sm:px-8 sm:py-20">
        <div className="bottom-cta mx-auto max-w-7xl px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
            <svg viewBox="0 0 32 24" className="h-6 w-8" aria-hidden="true">
              <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke="#15945f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Take control of your service reliability.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-indigo-100/85 sm:text-base">
            Start monitoring your websites and APIs with PulseWatch. Know what’s happening before your customers do.
          </p>
          <Link href="/register" className="bottom-cta-button mt-8">
            Get started with PulseWatch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/70 bg-white/40 px-5 py-8 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark small />
            <span className="text-sm font-extrabold tracking-tight text-slate-900">Pulse<span className="brand-accent">Watch</span></span>
          </Link>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} PulseWatch. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/login" className="nav-link">Sign in</Link>
            <Link href="/register" className="nav-link">Get started</Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .pricing-page {
          isolation: isolate;
          background: #f7f8fa;
          color: #172033;
        }
        .pricing-page .brand-accent { color: #16834f !important; }
        .pricing-page .landing-aurora {
          position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
          background:
            linear-gradient(90deg, transparent 0, transparent calc(50% - .5px), rgba(27,47,78,.035) 50%, transparent calc(50% + .5px)),
            #f7f8fa;
        }
        .pricing-page .landing-grid {
          position: absolute; inset: 0; opacity: .38;
          background-image: linear-gradient(rgba(36,57,87,.035) 1px, transparent 1px);
          background-size: 100% 72px;
          mask-image: linear-gradient(to bottom, black, transparent 72%);
        }
        .pricing-page .landing-guide { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(36,57,87,.045); }
        .pricing-page .landing-guide-one { left: max(5vw, calc((100vw - 1280px) / 2)); }
        .pricing-page .landing-guide-two { right: max(5vw, calc((100vw - 1280px) / 2)); }
        .pricing-page .landing-navbar { border-bottom: 1px solid #e6e9ef; background: rgba(247,248,250,.94); backdrop-filter: blur(16px); }
        .pricing-page .landing-brand-icon, .pricing-page .footer-brand-icon {
          display: flex; width: 40px; height: 40px; flex-shrink: 0; align-items: center; justify-content: center;
          border: 1px solid #dce9e2; border-radius: 10px; background: #f7fbf8;
        }
        .pricing-page .footer-brand-icon { width: 32px; height: 32px; }
        .pricing-page .pulse-logo-line { width: 23px; height: 18px; }
        .pricing-page .landing-brand-icon .pulse-logo-line,
        .pricing-page .footer-brand-icon .pulse-logo-line { display: block; }
        .pricing-page .nav-link { transition: color 160ms ease; }
        .pricing-page .nav-link:hover, .pricing-page .pricing-nav-active { color: #4f63d8; }
        .pricing-page .pricing-nav-active { position: relative; }
        .pricing-page .pricing-nav-active::after {
          position: absolute; right: 0; bottom: -9px; left: 0; height: 2px; border-radius: 2px;
          background: #315f91; content: "";
        }
        .pricing-page .signin-link { padding: 9px 10px; color: #64748b; font-size: 13px; font-weight: 700; transition: color 160ms ease; }
        .pricing-page .signin-link:hover { color: #334155; }
        .pricing-page .navbar-cta {
          display: inline-flex; min-height: 38px; align-items: center; justify-content: center; gap: 7px;
          border-radius: 10px; background: #24466f; padding: 9px 13px; color: white; font-size: 12px;
          font-weight: 700; transition: all 180ms ease;
        }
        .pricing-page .navbar-cta:hover { transform: translateY(-1px); background: #1d3b60; }
        .pricing-page .section-eyebrow {
          display: inline-flex; align-items: center; gap: 9px; border: 0; border-radius: 0; background: transparent;
          padding: 0; color: #52647d; font-size: 10px; font-weight: 750; letter-spacing: .12em;
        }
        .pricing-page .hero-gradient-text { color: #315f91; background: none; }
        .pricing-card {
          display: flex; min-width: 0; flex-direction: column; border: 1px solid #e0e5ec; border-radius: 14px;
          background: #fff; padding: 25px; box-shadow: none; transition: border-color 180ms ease, box-shadow 180ms ease;
        }
        .pricing-card:hover { border-color: #cbd6e3; box-shadow: 0 12px 28px rgba(28,43,64,.06); }
        .pricing-card--free { border-top: 3px solid #258b63; }
        .pricing-card--support { border-top: 3px solid #315f91; }
        .pricing-card--future { border-top: 3px solid #a8b4c3; }
        .pricing-status { display: inline-flex; white-space: nowrap; border-radius: 5px; padding: 6px 8px; font-size: 9px; font-weight: 800; letter-spacing: .08em; }
        .pricing-status--available { background: #eaf5ef; color: #16834f; }
        .pricing-status--future { background: #eef1f5; color: #64748b; }
        .pricing-icon { display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 10px; }
        .pricing-icon--heart { background: #fdf0f1; color: #c65b68; }
        .pricing-primary-button {
          display: inline-flex; min-height: 47px; align-items: center; justify-content: center; gap: 9px;
          border-radius: 11px; background: #24466f; padding: 12px 18px; color: white; font-size: 12px; font-weight: 800;
          transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }
        .pricing-primary-button:hover { transform: translateY(-2px); background: #1d3b60; box-shadow: 0 10px 22px rgba(36,70,111,.18); }
        .pricing-secondary-button {
          display: flex; min-height: 47px; align-items: center; justify-content: center; gap: 8px;
          border: 1px solid #dce6e0; border-radius: 11px; background: #f7fbf8; color: #258b63;
          padding: 12px 18px; font-size: 12px; font-weight: 800;
        }
        .pricing-secondary-button--muted { border-color: #e0e5ec; background: #f7f8fa; color: #64748b; }
        .pricing-divider { height: 1px; margin: 23px 0 19px; background: #edf0f4; }
        .pricing-list-label { color: #8491a3; font-size: 9px; font-weight: 800; letter-spacing: .13em; }
        .pricing-table-wrap { overflow: hidden; border: 1px solid #e0e5ec; border-radius: 13px; background: white; }
        .pricing-table-wrap th { border-bottom: 1px solid #e6eaf0; background: #f4f6f9; padding: 16px 20px; color: #52647d; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
        .pricing-table-wrap th span { margin-left: 4px; color: #9aa6b5; font-size: 8px; }
        .pricing-table-wrap td { border-bottom: 1px solid #edf0f4; padding: 15px 20px; }
        .pricing-table-wrap tbody tr:last-child td { border-bottom: 0; }
        .pricing-faq-panel { border: 1px solid #e0e5ec; border-radius: 14px; background: #fff; padding: 25px; }
        .pricing-contact-card {
          border: 1px solid #e0e5ec; border-radius: 14px; background: #fff; padding: 26px;
          box-shadow: none; transition: border-color 180ms ease, box-shadow 180ms ease;
        }
        .pricing-contact-card:hover { border-color: #cbd6e3; box-shadow: 0 12px 28px rgba(28,43,64,.06); }
        .pricing-contact-icon {
          display: inline-flex; width: 42px; height: 42px; align-items: center; justify-content: center;
          border: 1px solid #dce7f1; border-radius: 11px; background: #eef3f8; color: #315f91;
        }
        .pricing-contact-icon--green { border-color: #dce9e2; background: #f0f8f3; color: #16834f; }
        .pricing-contact-link {
          display: inline-flex; align-items: center; gap: 8px; color: #24466f; font-size: 13px; font-weight: 800;
          text-decoration: none; transition: color 160ms ease, gap 160ms ease;
        }
        .pricing-contact-link:hover { gap: 12px; color: #16834f; }

        /* Explicit contrast: never allow inherited light text on the light page background. */
        .pricing-page { color: #172033 !important; }
        .pricing-page h1, .pricing-page h2, .pricing-page h3,
        .pricing-page .pricing-card p:first-child,
        .pricing-page .pricing-card .text-slate-900,
        .pricing-page .pricing-card .text-slate-800 { color: #111827 !important; }
        .pricing-page p, .pricing-page li, .pricing-page td,
        .pricing-page .text-slate-500, .pricing-page .text-slate-600,
        .pricing-page .text-slate-400 { color: #526071; }
        .pricing-page .pricing-card { color: #172033; }
        .pricing-page .pricing-card .pricing-list-label { color: #52647d !important; }
        .pricing-page .pricing-card .pricing-status--available { color: #16834f !important; }
        .pricing-page .pricing-card .pricing-status--future { color: #526071 !important; }
        .pricing-page .pricing-table-wrap th { color: #334155 !important; }
        .pricing-page .pricing-table-wrap td { color: #334155 !important; }
        .pricing-page .pricing-faq-panel button { color: #172033 !important; }
        .pricing-page .pricing-faq-panel p { color: #526071 !important; }
        /* Keep the closing CTA unmistakably navy with high-contrast white copy. */
        .pricing-page .landing-cta-section { background: transparent !important; }
        .pricing-page .bottom-cta {
          background: #24466f !important;
          border: 1px solid #24466f !important;
          color: #ffffff !important;
        }
        .pricing-page .bottom-cta h2 { color: #ffffff !important; }
        .pricing-page .bottom-cta p { color: #e7edf5 !important; opacity: 1 !important; }
        .pricing-page .bottom-cta-button {
          background: #ffffff !important; color: #24466f !important; border-color: #ffffff !important;
        }
        .pricing-page :is(a, button):focus-visible { outline: 3px solid rgba(49,95,145,.35); outline-offset: 3px; }
        .pricing-page .mobile-pricing-nav { min-height: 34px; }
        .pricing-page .mobile-pricing-nav .pricing-nav-active::after { bottom: -7px; }

        /* Fluid desktop and laptop layout: prevent oversized type and cramped columns. */
        .pricing-page .pricing-hero-title {
          font-size: clamp(2.35rem, 4.1vw, 4.35rem);
          max-width: min(100%, 1100px);
          text-wrap: balance;
        }
        .pricing-page .pricing-hero-copy {
          max-width: min(100%, 700px);
          margin-inline: auto;
        }
        .pricing-page .landing-navbar > .pricing-navbar-inner {
          column-gap: clamp(12px, 2vw, 32px);
        }
        /* Keep the desktop navigation at the true horizontal centre of the viewport. */
        @media (min-width: 768px) {
          .pricing-page .landing-navbar nav:not(.mobile-pricing-nav) {
            position: absolute;
            left: 50%;
            top: 50%;
            display: flex;
            align-items: center;
            transform: translate(-50%, -50%);
            white-space: nowrap;
          }
        }
        .pricing-page .landing-navbar nav:not(.mobile-pricing-nav) {
          gap: clamp(16px, 2.3vw, 32px);
        }
        .pricing-page .pricing-card {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .pricing-page .pricing-card > div:first-child {
          flex-wrap: wrap;
        }
        .pricing-page .pricing-table-wrap {
          max-width: 100%;
        }
        @media (min-width: 768px) and (max-width: 1100px) {
          .pricing-page .landing-navbar > div {
            padding-inline: 22px;
          }
          .pricing-page .landing-navbar nav:not(.mobile-pricing-nav) {
            gap: 16px;
            font-size: 12px;
          }
          .pricing-page .landing-navbar .text-xl {
            font-size: 18px;
          }
          .pricing-page .signin-link {
            padding-inline: 5px;
          }
          .pricing-page .navbar-cta {
            padding-inline: 10px;
          }
          .pricing-page .pricing-card {
            padding: 20px;
          }
        }
        @media (min-width: 1101px) {
          .pricing-page .pricing-card {
            padding: 30px;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .pricing-page .pricing-page-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-page .pricing-card--future {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 420px) {
          .pricing-page .landing-brand-icon { width: 36px; height: 36px; }
          .pricing-page .landing-brand-icon .pulse-logo-line { width: 21px; height: 16px; }
          .pricing-page .navbar-cta { min-height: 36px; gap: 5px; padding: 8px 10px; font-size: 11px; }
          .pricing-page .mobile-pricing-nav { gap: 0; justify-content: space-around; }
        }
        @media (min-width: 640px) {
          .pricing-card { padding: 29px; }
          .pricing-faq-panel { padding: 38px; }
        }
      `}</style>
    </main>
  );
}
