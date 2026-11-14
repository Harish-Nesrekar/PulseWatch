"use client";
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import {
  Activity,
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Server,
  Clock3,
  BarChart3,
  AlertTriangle,
  ExternalLink,
  LockKeyhole,
} from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Global Edge Checking',
    description:
      'Run HTTP/HTTPS checks with custom methods and expected status codes at precise intervals from reliable worker nodes.',
    accent: 'blue',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise SSRF Guard',
    description:
      'Robust connection-time IP pinning and private network protection to safeguard internal infrastructure during checks.',
    accent: 'violet',
  },
  {
    icon: Server,
    title: 'Public Status Pages',
    description:
      'Publish branded status pages with real-time health indicators, uptime history bars, and active incident announcements.',
    accent: 'cyan',
  },
];

const highlights = [
  'Automated incident lifecycles',
  'HTTP and HTTPS monitoring',
  'Public customer-facing status pages',
  'Configurable monitoring intervals',
];

const WAVE_PATH =
  'M0 58 L28 58 L42 55 L55 61 L69 58 L84 58 L98 34 L111 82 L126 58 L151 58 L165 53 L180 62 L195 58 L220 58 L235 24 L249 88 L264 58 L288 58 L303 51 L318 64 L333 58 L357 58 L372 39 L386 77 L401 58 L425 58 L440 52 L455 63 L470 58 L520 58';

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function LandingPage() {
  const rafRef = useRef<number | null>(null);

  const cancelScroll = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    document.documentElement.classList.remove('is-scrolling');
  };

  // Always start the landing page at the hero section. Browsers may otherwise
  // restore the previous scroll position when the user returns to this page.
  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    // Remove a stale section hash so the browser cannot reopen at that anchor.
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  // Let the user interrupt the animated scroll by scrolling manually.
  useEffect(() => {
    const stop = () => cancelScroll();
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
      cancelScroll();
    };
  }, []);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();

    cancelScroll();

    const headerOffset =
      document.querySelector('.landing-navbar')?.getBoundingClientRect().height ?? 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const startY = window.scrollY;
    const targetY = Math.min(
      maxScroll,
      Math.max(0, target.getBoundingClientRect().top + startY - headerOffset - 10),
    );
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    history.replaceState(null, '', href);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: targetY, behavior: 'auto' });
      return;
    }

    // Faster section navigation while keeping the motion smooth: 240–420ms.
    const duration = Math.min(420, Math.max(240, Math.abs(distance) * 0.14));
    const root = document.documentElement;
    root.classList.add('is-scrolling');

    let startTime: number | null = null;
    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      window.scrollTo({
        top: startY + distance * easeInOutCubic(progress),
        behavior: 'auto',
      });
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        root.classList.remove('is-scrolling');
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const trackPointer = (event: MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
  };

  return (
    <main className="landing-page min-h-screen overflow-hidden text-slate-800">
      {/* Restrained technical backdrop */}
      <div className="landing-aurora" aria-hidden="true">
        <div className="landing-grid" />
        <div className="landing-guide landing-guide-one" />
        <div className="landing-guide landing-guide-two" />
      </div>

      {/* Navbar — same centered desktop layout and compact mobile nav as Pricing */}
      <header className="landing-navbar sticky top-0 z-50">
        <div className="pricing-navbar-inner relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3"
            aria-label="PulseWatch home"
          >
            <div className="landing-brand-icon">
              <svg viewBox="0 0 32 24" className="pulse-logo-line" aria-hidden="true">
                <defs>
                  <linearGradient id="pulseLogoGradientHeader" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#258b63" />
                    <stop offset="48%" stopColor="#258b63" />
                    <stop offset="100%" stopColor="#31b77a" />
                  </linearGradient>
                </defs>
                <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke="url(#pulseLogoGradientHeader)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Pulse<span className="brand-accent">Watch</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <Link href="#features" className="nav-link" onClick={scrollToSection}>Features</Link>
            <Link href="#reliability" className="nav-link" onClick={scrollToSection}>Reliability</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-4">
            <Link href="/login" className="signin-link hidden sm:inline-flex">Sign in</Link>
            <Link href="/register" className="navbar-cta cursor-reactive" onMouseMove={trackPointer}>
              <span>Get started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <nav aria-label="Mobile navigation" className="mobile-pricing-nav order-3 flex w-full items-center justify-center gap-7 border-t border-slate-200/80 pt-3 text-xs font-semibold text-slate-600 md:hidden">
            <Link href="#features" className="nav-link" onClick={scrollToSection}>Features</Link>
            <Link href="#reliability" className="nav-link" onClick={scrollToSection}>Reliability</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section relative px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
            {/* Hero content */}
            <div className="text-center lg:text-left">
              <div className="hero-eyebrow mx-auto mb-7 lg:mx-0">
                <span className="hero-eyebrow-icon">
                  <Zap className="h-3.5 w-3.5" />
                </span>

                <span>
                  Next-gen observability & uptime monitoring
                </span>
              </div>

              <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:mx-0 lg:text-[62px]">
                Know when your services go down.

                <span className="hero-gradient-text mt-2 block" aria-label="Before your customers do">
                  <span className="word-swap" aria-hidden="true">
                    <span>Before your customers do.</span>
                    <span>Before revenue is lost.</span>
                    <span>Before teams are alerted.</span>
                  </span>
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-slate-500 sm:text-lg lg:mx-0">
                Enterprise-grade API and website monitoring with
                lightning-fast checks, automated incident lifecycles,
                and stunning public status pages.
              </p>

              {/* CTA */}
              <div className="hero-section-ctas mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/register" className="hero-primary-button cursor-reactive" onMouseMove={trackPointer}>
                  Start free monitoring
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link href="/dashboard" className="hero-secondary-button cursor-reactive" onMouseMove={trackPointer}>
                  View live demo
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Highlights */}
              <div className="hero-highlights mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 lg:justify-start">
                {highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            {/* Product preview */}
            <div className="hero-product-preview relative mx-auto w-full max-w-xl lg:ml-auto">
              <div
                className="dashboard-preview tilt-surface"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width;
                  const y = (event.clientY - rect.top) / rect.height;
                  event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
                  event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
                  event.currentTarget.style.setProperty('--pointer-x', `${x * 100}%`);
                  event.currentTarget.style.setProperty('--pointer-y', `${y * 100}%`);
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.setProperty('--tilt-x', '0deg');
                  event.currentTarget.style.setProperty('--tilt-y', '0deg');
                }}
              >
                <div className="ghost-cursor" aria-hidden="true">
                  <span className="ghost-cursor__dot" />
                  <span>Live preview</span>
                </div>
                {/* Preview top bar */}
                <div className="preview-topbar">
                  <div className="flex items-center gap-2">
                    <div className="preview-brand">
                      <svg viewBox="0 0 32 24" className="pulse-logo-line pulse-logo-line--preview" aria-hidden="true">
                        <defs>
                          <linearGradient id="pulseLogoGradientPreview" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#258b63" />
                            <stop offset="100%" stopColor="#31b77a" />
                          </linearGradient>
                        </defs>
                        <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke="url(#pulseLogoGradientPreview)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <span className="text-xs font-bold tracking-tight text-slate-900">
                      Pulse<span className="brand-accent">Watch</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="preview-live-dot" />
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Monitoring
                    </span>
                  </div>
                </div>

                {/* Preview content */}
                <div className="preview-content">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Overview
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-800">
                        System health
                      </h3>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">
                      Last 24 hours
                    </div>
                  </div>

                  {/* Preview stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="preview-stat">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">
                          Uptime
                        </span>

                        <div className="preview-stat-icon bg-emerald-50 text-emerald-600">
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      <p className="text-2xl font-extrabold tracking-tight text-slate-800">
                        <span className="number-roll">99.99%</span>
                      </p>

                      <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                        Excellent availability
                      </p>
                    </div>

                    <div className="preview-stat">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">
                          Response time
                        </span>

                        <div className="preview-stat-icon bg-blue-50 text-blue-600">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      <p className="text-2xl font-extrabold tracking-tight text-slate-800">
                        <span className="number-roll">124</span><span className="ml-1 text-sm">ms</span>
                      </p>

                      <p className="mt-1 text-[10px] font-semibold text-blue-600">
                        Average latency
                      </p>
                    </div>
                  </div>

                  {/* Preview uptime chart */}
                  <div className="preview-chart-card mt-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Service availability
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Monitoring activity overview
                        </p>
                      </div>

                      <BarChart3 className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div
                      className="availability-wave"
                      role="img"
                      aria-label="Illustrative animated monitoring waveform"
                    >
                      <svg viewBox="0 0 520 112" preserveAspectRatio="none" aria-hidden="true">
                        <path className="availability-wave__track" d={WAVE_PATH} />
                        <path className="availability-wave__progress" d={WAVE_PATH}>
                          <animate
                            attributeName="stroke-dashoffset"
                            values="739.906;0"
                            keyTimes="0;1"
                            dur="20s"
                            repeatCount="indefinite"
                            calcMode="linear"
                          />
                        </path>
                        <circle className="availability-wave__marker-halo" r="7" cx="0" cy="0">
                          <animateMotion
                            dur="20s"
                            repeatCount="indefinite"
                            calcMode="paced"
                            rotate="auto"
                            path={WAVE_PATH}
                          />
                        </circle>
                        <circle className="availability-wave__marker" r="3.8" cx="0" cy="0">
                          <animateMotion
                            dur="20s"
                            repeatCount="indefinite"
                            calcMode="paced"
                            rotate="auto"
                            path={WAVE_PATH}
                          />
                        </circle>
                      </svg>
                    </div>

                    <div className="mt-3 flex justify-between text-[9px] text-slate-400">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>Now</span>
                    </div>
                  </div>

                  {/* Preview monitor */}
                  <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700">
                        Monitored services
                      </span>

                      <span className="text-[9px] font-semibold text-slate-400">
                        Preview
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: 'Production API', detail: 'api.example.com' },
                        { name: 'Main Website', detail: 'www.example.com' },
                        { name: 'Application Server', detail: 'app.example.com' },
                      ].map((service) => (
                        <div
                          key={service.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                              <Server className="h-3.5 w-3.5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-bold text-slate-700">
                                {service.name}
                              </p>

                              <p className="truncate text-[9px] text-slate-400">
                                {service.detail}
                              </p>
                            </div>
                          </div>

                          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Operational
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="event-feed" aria-label="Illustrative ordered monitoring event feed">
                    <div className="event-feed__heading">
                      <span>RECENT CHECKS</span>
                      <span className="event-feed__live"><i /> LIVE DEMO</span>
                    </div>
                    <div className="event-feed__row"><time>14:32:08</time><b>api.example.com</b><span className="is-ok">200 OK</span></div>
                    <div className="event-feed__row"><time>14:31:52</time><b>checkout.example.com</b><span className="is-warn">Slow</span></div>
                    <div className="event-feed__row"><time>14:31:30</time><b>www.example.com</b><span className="is-ok">200 OK</span></div>
                  </div>
                </div>
              </div>

              {/* Floating reliability card */}
              <div className="floating-reliability-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-800">
                    Stay informed
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-400">
                    Monitor service health
                  </p>
                </div>

                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature introduction */}
      <section
        id="features"
        className="relative px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="section-eyebrow">
              <Zap className="h-3.5 w-3.5" />
              BUILT FOR RELIABILITY
            </div>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Engineered for high-availability teams
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              Everything you need to maintain 99.99% uptime and keep
              stakeholders informed.
            </p>
          </div>

          <div className="stack-marquee" aria-label="Web technologies and monitoring concepts">
            <span className="stack-marquee__label">BUILT AROUND THE WEB</span>
            <div className="stack-marquee__viewport">
              <div className="stack-marquee__track">
                {['HTTP / HTTPS', 'REST APIs', 'TLS', 'DNS', 'Webhooks', 'Status Pages', 'HTTP / HTTPS', 'REST APIs', 'TLS', 'DNS', 'Webhooks', 'Status Pages'].map((item, index) => (
                  <span key={`${item}-${index}`} className="stack-marquee__item">{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="feature-card tilt-surface"
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width;
                    const y = (event.clientY - rect.top) / rect.height;
                    event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`);
                    event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
                    event.currentTarget.style.setProperty('--pointer-x', `${x * 100}%`);
                    event.currentTarget.style.setProperty('--pointer-y', `${y * 100}%`);
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.setProperty('--tilt-x', '0deg');
                    event.currentTarget.style.setProperty('--tilt-y', '0deg');
                  }}
                >
                  <div
                    className={`feature-icon feature-icon-${feature.accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-slate-800">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {feature.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <span>Built into PulseWatch</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reliability section */}
      <section
        id="reliability"
        className="relative px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="reliability-panel mx-auto max-w-7xl overflow-hidden">
          <div className="grid items-center gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <div className="section-eyebrow">
                <ShieldCheck className="h-3.5 w-3.5" />
                RELIABILITY FIRST
              </div>

              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Don't wait for customers to report an outage.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                Monitor your endpoints, identify service disruptions,
                and communicate incidents through public status pages.
                Keep your team informed with a clearer picture of
                service health.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  {
                    icon: Clock3,
                    title: 'Scheduled monitoring',
                    text: 'Run checks at your configured intervals.',
                  },
                  {
                    icon: AlertTriangle,
                    title: 'Incident awareness',
                    text: 'Identify and track service disruptions.',
                  },
                  {
                    icon: Globe,
                    title: 'Customer transparency',
                    text: 'Share service health through public status pages.',
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reliability visual */}
            <div className="reliability-visual">
              <div className="relative z-10">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Monitoring overview
                    </p>

                    <h3 className="mt-1 text-lg font-extrabold text-slate-800">
                      Service reliability
                    </h3>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>

                <div className="reliability-score-card">
                  <p className="text-xs font-semibold text-slate-400">
                    Availability target
                  </p>

                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-800">
                    99.99%
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[99.99%] rounded-full bg-[#315f91]" />
                  </div>

                  <p className="mt-2 text-[10px] text-slate-400">
                    Illustrative target, not a measured PulseWatch SLA
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="reliability-mini-card">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    <p className="mt-3 text-[10px] font-semibold text-slate-400">
                      Monitoring
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      Continuous
                    </p>
                  </div>

                  <div className="reliability-mini-card">
                    <LockKeyhole className="h-4 w-4 text-violet-500" />
                    <p className="mt-3 text-[10px] font-semibold text-slate-400">
                      Protection
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      SSRF guard
                    </p>
                  </div>
                </div>

                <div className="check-flow mt-4" aria-label="How a monitoring check flows through PulseWatch">
                  <div className="check-flow__heading">
                    <span>HOW A CHECK MOVES</span>
                    <span>01 — 03</span>
                  </div>
                  <div className="check-flow__track">
                    <div className="check-flow__node check-flow__node--scheduler" tabIndex={0}>
                      <span className="check-flow__node-icon"><Clock3 className="h-4 w-4" /></span>
                      <span className="check-flow__node-label">Scheduler</span>
                    </div>
                    <span className="check-flow__connector check-flow__connector--one" aria-hidden="true" />
                    <div className="check-flow__node check-flow__node--worker" tabIndex={0}>
                      <span className="check-flow__node-icon"><Activity className="h-4 w-4" /></span>
                      <span className="check-flow__node-label">Worker</span>
                    </div>
                    <span className="check-flow__connector check-flow__connector--two" aria-hidden="true" />
                    <div className="check-flow__node check-flow__node--endpoint" tabIndex={0}>
                      <span className="check-flow__node-icon"><Globe className="h-4 w-4" /></span>
                      <span className="check-flow__node-label">Endpoint</span>
                    </div>
                  </div>
                  <p className="check-flow__caption">A scheduled request becomes a recorded health check.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section px-5 py-20 sm:px-8 sm:py-24">
        <div className="bottom-cta mx-auto max-w-7xl px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
            <svg viewBox="0 0 32 24" className="pulse-logo-line pulse-logo-line--cta" aria-hidden="true">
              <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke="#15945f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Take control of your service reliability.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-indigo-100/85 sm:text-base">
            Start monitoring your websites and APIs with PulseWatch.
            Know what's happening before your customers do.
          </p>

          <Link href="/register" className="bottom-cta-button cursor-reactive mt-8" onMouseMove={trackPointer}>
            Get started with PulseWatch
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="pricing"
        className="relative border-t border-white/70 bg-white/40 px-5 py-8 backdrop-blur-xl sm:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="footer-brand-icon">
              <svg viewBox="0 0 32 24" className="pulse-logo-line" aria-hidden="true">
                <defs>
                  <linearGradient id="pulseLogoGradientFooter" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#258b63" />
                    <stop offset="48%" stopColor="#258b63" />
                    <stop offset="100%" stopColor="#31b77a" />
                  </linearGradient>
                </defs>
                <path d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31" fill="none" stroke="url(#pulseLogoGradientFooter)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <span className="text-sm font-extrabold tracking-tight text-slate-900">
              Pulse<span className="brand-accent">Watch</span>
            </span>
          </Link>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} PulseWatch. All rights reserved.
          </p>

          <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
            <Link href="/login" className="nav-link">
              Sign in
            </Link>

            <Link href="/register" className="nav-link">
              Get started
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        /* Scrolling is driven by the JS rAF scroller, so native smoothing stays off. */
        html { scroll-behavior: auto; }

        /* Pause heavy effects while the programmatic scroll runs. */
        html.is-scrolling .landing-page {
          pointer-events: none;
        }
        html.is-scrolling .landing-page *,
        html.is-scrolling .landing-page *::before,
        html.is-scrolling .landing-page *::after {
          animation-play-state: paused !important;
          transition: none !important;
        }

        /* Match the login/register wordmark: dark Pulse, green Watch. */
        .brand-accent { color: #16834f !important; }

        .landing-page {
          isolation: isolate;
          background: #f7f8fa;
          color: #172033;
        }

        .landing-aurora {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background:
            linear-gradient(90deg, transparent 0, transparent calc(50% - 0.5px), rgba(27, 47, 78, 0.035) 50%, transparent calc(50% + 0.5px)),
            #f7f8fa;
        }

        .landing-grid {
          position: absolute;
          inset: 0;
          opacity: 0.38;
          background-image: linear-gradient(rgba(36, 57, 87, 0.035) 1px, transparent 1px);
          background-size: 100% 72px;
          mask-image: linear-gradient(to bottom, black, transparent 72%);
        }

        .landing-guide {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(36, 57, 87, 0.045);
        }

        .landing-guide-one { left: max(5vw, calc((100vw - 1280px) / 2)); }
        .landing-guide-two { right: max(5vw, calc((100vw - 1280px) / 2)); }

        .landing-navbar {
          border-bottom: 1px solid #e6e9ef;
          background: rgba(247, 248, 250, 0.94);
        }

        .mobile-pricing-nav { min-height: 34px; }
        .mobile-pricing-nav a { white-space: nowrap; }
        @media (min-width: 768px) {
          .landing-navbar > .pricing-navbar-inner { column-gap: clamp(12px, 2vw, 32px); }
          .landing-navbar nav:not(.mobile-pricing-nav) {
            position: absolute;
            left: 50%;
            top: 50%;
            display: flex;
            align-items: center;
            transform: translate(-50%, -50%);
            gap: clamp(16px, 2.3vw, 32px);
            white-space: nowrap;
          }
        }
        @media (min-width: 768px) and (max-width: 1100px) {
          .landing-navbar > div { padding-inline: 22px; }
          .landing-navbar nav:not(.mobile-pricing-nav) { gap: 16px; font-size: 12px; }
          .landing-navbar .text-xl { font-size: 18px; }
          .landing-navbar .signin-link { padding-inline: 5px; }
          .landing-navbar .navbar-cta { padding-inline: 10px; }
        }
        @media (max-width: 420px) {
          .landing-brand-icon { width: 36px; height: 36px; }
          .landing-brand-icon .pulse-logo-line { width: 21px; height: 16px; }
          .landing-navbar .navbar-cta { min-height: 36px; gap: 5px; padding: 8px 10px; font-size: 11px; }
          .mobile-pricing-nav { gap: 0; justify-content: space-around; }
        }

        .landing-brand-icon,
        .footer-brand-icon {
          display: flex;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #253f68;
          border-radius: 10px;
          background: #243f68;
          box-shadow: none;
        }

        .footer-brand-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
        }

        .nav-link {
          transition: color 160ms ease;
        }

        .nav-link:hover {
          color: #16834f;
        }

        .signin-link {
          padding: 9px 10px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          transition: color 160ms ease;
        }

        .signin-link:hover {
          color: #334155;
        }

        .navbar-cta {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 10px;
          background: #24466f;
          padding: 9px 13px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 6px 16px rgba(71, 119, 245, 0.2);
          transition: all 180ms ease;
        }

        .navbar-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 9px 20px rgba(71, 119, 245, 0.28);
        }

        .hero-section {
          isolation: isolate;
        }

        .hero-eyebrow,
        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
          color: #52647d;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.12em;
          box-shadow: none;
        }

        .hero-eyebrow-icon {
          display: flex;
          width: 22px;
          height: 22px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e7edf5;
          color: #294b78;
        }

        .hero-gradient-text {
          color: #315f91;
          background: none;
        }

        .hero-primary-button,
        .hero-secondary-button {
          display: inline-flex;
          width: 100%;
          min-height: 49px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 12px;
          padding: 13px 21px;
          font-size: 13px;
          font-weight: 800;
          transition: all 180ms ease;
        }

        .hero-primary-button {
          border: 1px solid transparent;
          background: #24466f;
          color: white;
          box-shadow: none;
        }

        .hero-primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 13px 27px rgba(71, 119, 245, 0.3);
        }

        .hero-secondary-button {
          border: 1px solid #d9dfe8;
          background: #fff;
          color: #42536b;
          box-shadow: none;
        }

        .hero-secondary-button:hover {
          transform: translateY(-2px);
          border-color: #dbe4ff;
          background: white;
          color: #4f63d8;
        }

        .dashboard-preview {
          position: relative;
          overflow: hidden;
          border: 1px solid #dce2ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 24px 55px rgba(28, 43, 64, 0.10), 0 2px 5px rgba(28, 43, 64, 0.04);
          transform: none;
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .dashboard-preview:hover {
          border-color: #c8d3e1;
          box-shadow: 0 28px 64px rgba(28, 43, 64, 0.13), 0 2px 5px rgba(28, 43, 64, 0.04);
        }

        .preview-topbar {
          display: flex;
          min-height: 55px;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #edf0f7;
          padding: 0 17px;
        }

        .preview-brand {
          display: flex;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          border: 1px solid #dce9e2;
          border-radius: 9px;
          background: #f7fbf8;
        }
        .pulse-logo-line--preview { width: 19px; height: 15px; }

        .preview-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .preview-content {
          padding: 19px;
        }

        .preview-stat {
          border: 1px solid #edf0f7;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.8);
          padding: 13px;
        }

        .preview-stat-icon {
          display: flex;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .preview-chart-card {
          border: 1px solid #edf0f7;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.8);
          padding: 14px;
        }

        .floating-reliability-card {
          position: absolute;
          right: -14px;
          bottom: 38px;
          display: flex;
          width: 205px;
          align-items: center;
          gap: 10px;
          border: 1px solid #dce3ec;
          border-radius: 10px;
          background: #fff;
          padding: 11px;
          box-shadow: 0 8px 22px rgba(28, 43, 64, 0.08);
          animation: none;
        }

        .feature-card {
          position: relative;
          border: 1px solid #e0e5ec;
          border-radius: 12px;
          background: #fff;
          padding: 27px;
          box-shadow: none;
          transition: border-color 180ms ease, background-color 180ms ease;
        }

        .feature-card:hover {
          border-color: #cbd6e3;
          background: #fcfdff;
        }

        .feature-icon {
          display: flex;
          width: 49px;
          height: 49px;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 15px;
        }

        .feature-icon-blue {
          border-color: #dce7ff;
          background: #edf2f7;
          color: #5376dc;
        }

        .feature-icon-violet {
          border-color: #eadfff;
          background: #f0eef5;
          color: #8a62cf;
        }

        .feature-icon-cyan {
          border-color: #d5f3f7;
          background: #eaf3f3;
          color: #2797a8;
        }

        .reliability-panel {
          border: 1px solid #e0e5ec;
          border-radius: 14px;
          background: #fff;
          box-shadow: none;
        }

        .reliability-visual {
          position: relative;
          overflow: hidden;
          border: 1px solid #dce3ec;
          border-radius: 12px;
          background: #f4f6f9;
          padding: 24px;
        }

        .reliability-score-card {
          border: 1px solid #e0e5ec;
          border-radius: 10px;
          background: #fff;
          padding: 20px;
          box-shadow: none;
        }

        .reliability-mini-card {
          border: 1px solid #e0e5ec;
          border-radius: 10px;
          background: #fff;
          padding: 14px;
        }

        .bottom-cta {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 25px;
          background: #24466f;
          box-shadow: none;
        }

        .bottom-cta::before {
          position: absolute;
          top: -130px;
          right: -100px;
          width: 300px;
          height: 300px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          content: '';
          box-shadow:
            0 0 0 35px rgba(255, 255, 255, 0.035),
            0 0 0 75px rgba(255, 255, 255, 0.025);
          pointer-events: none;
        }

        .bottom-cta-button {
          position: relative;
          display: inline-flex;
          min-height: 47px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 11px;
          background: white;
          padding: 12px 19px;
          color: #4f5ec8;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(36, 42, 105, 0.14);
          transition: all 180ms ease;
        }

        .bottom-cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 27px rgba(36, 42, 105, 0.2);
        }

        .check-flow {
          border: 1px solid #dce3ec;
          border-radius: 10px;
          background: #fff;
          padding: 15px;
        }

        .check-flow__heading {
          display: flex;
          justify-content: space-between;
          color: #8491a3;
          font-size: 9px;
          font-weight: 750;
          letter-spacing: .12em;
        }

        .check-flow__track {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 15px;
        }

        .check-flow__node {
          display: flex;
          min-width: 0;
          flex: 0 1 82px;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }

        .check-flow__node-icon {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid #dce3ec;
          border-radius: 9px;
          background: #f7f9fb;
          color: #315f91;
        }

        .check-flow__node-label {
          color: #42536b;
          font-size: 10px;
          font-weight: 650;
        }

        .check-flow__connector {
          position: relative;
          height: 2px;
          min-width: 10px;
          flex: 1;
          margin-top: -17px;
          overflow: hidden;
          background: #d9e2e9;
          transition: background 180ms ease;
        }
        .check-flow__connector::after {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #21966a, #45c58a);
          content: '';
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 420ms cubic-bezier(.2,.7,.2,1);
        }
        .check-flow:has(.check-flow__node--scheduler:hover) .check-flow__connector--one::after,
        .check-flow:has(.check-flow__node--worker:hover) .check-flow__connector--one::after,
        .check-flow:has(.check-flow__node--worker:hover) .check-flow__connector--two::after,
        .check-flow:has(.check-flow__node--endpoint:hover) .check-flow__connector--two::after {
          transform: scaleX(1);
        }

        .check-flow__caption {
          margin-top: 13px;
          color: #8491a3;
          font-size: 10px;
          line-height: 1.5;
        }

        .landing-page :is(a, button):focus-visible {
          outline: 3px solid rgba(49, 95, 145, .35);
          outline-offset: 3px;
        }

        .landing-page a,
        .landing-page button {
          text-underline-offset: 3px;
        }


        /* Interactive motion layer — subtle, pointer-led, and layout-preserving. */
        .tilt-surface {
          --tilt-x: 0deg;
          --tilt-y: 0deg;
          --pointer-x: 50%;
          --pointer-y: 50%;
          transform: perspective(1000px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
          transform-style: preserve-3d;
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }
        .tilt-surface:hover { will-change: transform; }
        .tilt-surface::after {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(230px circle at var(--pointer-x) var(--pointer-y), rgba(74,125,183,.09), transparent 70%);
          content: '';
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
        }
        .tilt-surface:hover::after { opacity: 1; }
        .dashboard-preview.tilt-surface:hover {
          transform: perspective(1000px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translateY(-3px);
        }
        .feature-card.tilt-surface:hover {
          transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translateY(-4px);
          border-color: #cbd6e3;
          box-shadow: 0 12px 28px rgba(28,43,64,.07);
        }
        .cursor-reactive {
          --pointer-x: 50%;
          --pointer-y: 50%;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transition: transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
        }
        .cursor-reactive::before {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: radial-gradient(120px circle at var(--pointer-x) var(--pointer-y), rgba(255,255,255,.24), transparent 72%);
          content: '';
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease;
        }
        .cursor-reactive:hover::before { opacity: 1; }
        .cursor-reactive:hover { transform: translateY(-2px); }
        .cursor-reactive:active { transform: translateY(0) scale(.985); }
        .cursor-reactive svg { transition: transform 180ms ease; }
        .cursor-reactive:hover svg { transform: translateX(3px); }

        .ghost-cursor {
          position: absolute;
          z-index: 4;
          top: 43%;
          right: 14%;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #58718d;
          font-size: 9px;
          font-weight: 700;
          pointer-events: none;
          animation: ghost-drift 6s ease-in-out infinite;
        }
        .ghost-cursor__dot {
          width: 8px;
          height: 8px;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #6b9ac8;
          box-shadow: 0 0 0 1px #6b9ac8;
        }
        .ghost-cursor span:last-child {
          border: 1px solid #e0e7ef;
          border-radius: 5px;
          background: #fff;
          padding: 4px 6px;
        }
        @keyframes ghost-drift {
          0%, 100% { transform: translate(0,0); }
          45% { transform: translate(-17px,13px); }
          70% { transform: translate(-7px,20px); }
        }

        .number-roll {
          display: inline-block;
          transform-origin: 50% 80%;
          animation: number-arrive 700ms cubic-bezier(.2,.75,.25,1) both;
        }
        @keyframes number-arrive {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .word-swap { display: inline-grid; overflow: hidden; vertical-align: bottom; }
        .word-swap span { grid-area: 1 / 1; animation: word-cycle 9s infinite; }
        .word-swap span:nth-child(2) { animation-delay: 3s; }
        .word-swap span:nth-child(3) { animation-delay: 6s; }
        @keyframes word-cycle {
          0%, 27% { opacity: 1; transform: translateY(0); }
          33%, 94% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .event-feed {
          margin-top: 13px;
          border: 1px solid #e3e9f0;
          border-radius: 10px;
          background: #fff;
          padding: 10px 12px;
          animation: feed-in 650ms ease both;
        }
        .event-feed__heading {
          display: flex;
          justify-content: space-between;
          color: #8290a2;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .1em;
        }
        .event-feed__live { display: inline-flex; align-items: center; gap: 5px; color: #6e9b83; }
        .event-feed__live i { width: 5px; height: 5px; border-radius: 50%; background: #4aa77b; }
        .event-feed__row {
          display: grid;
          grid-template-columns: 52px minmax(0,1fr) auto;
          align-items: center;
          gap: 8px;
          border-top: 1px solid #f0f2f5;
          padding: 7px 0 0;
          margin-top: 7px;
          color: #77869a;
          font-size: 9px;
          animation: event-row-in 450ms ease both;
        }
        .event-feed__row:nth-child(2) { animation-delay: 100ms; }
        .event-feed__row:nth-child(3) { animation-delay: 200ms; }
        .event-feed__row:nth-child(4) { animation-delay: 300ms; }
        .event-feed__row b { overflow: hidden; color: #35465b; text-overflow: ellipsis; white-space: nowrap; }
        .event-feed__row .is-ok { color: #29936b; font-weight: 750; }
        .event-feed__row .is-warn { color: #b78231; font-weight: 750; }
        @keyframes feed-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes event-row-in { from { opacity: 0; transform: translateX(7px); } to { opacity: 1; transform: translateX(0); } }

        .stack-marquee {
          display: flex;
          align-items: center;
          gap: 22px;
          overflow: hidden;
          margin: 0 0 28px;
          border-top: 1px solid #e6eaf0;
          border-bottom: 1px solid #e6eaf0;
          padding: 14px 0;
        }
        .stack-marquee__label { flex: none; color: #8b97a7; font-size: 9px; font-weight: 800; letter-spacing: .11em; }
        .stack-marquee__viewport { min-width: 0; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
        .stack-marquee__track { display: flex; width: max-content; gap: 30px; animation: marquee-loop 27s linear infinite; }
        .stack-marquee__item { color: #637187; font-size: 11px; font-weight: 750; letter-spacing: .04em; white-space: nowrap; }
        @keyframes marquee-loop { to { transform: translateX(-50%); } }

        .review-deck {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 13px;
          margin-top: 28px;
        }
        .review-tile {
          min-width: 0;
          min-height: 190px;
          overflow: hidden;
          border: 1px solid #e0e6ed;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
          scroll-snap-align: start;
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }
        .review-tile:hover { transform: translateY(-3px); border-color: #cbd6e3; box-shadow: 0 10px 25px rgba(28,43,64,.06); }
        .review-tile__eyebrow { color: #8794a5; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
        .review-tile h3 { margin-top: 17px; color: #24354c; font-size: 16px; font-weight: 800; letter-spacing: -.02em; }
        .review-tile p { margin-top: 7px; color: #78869a; font-size: 11px; line-height: 1.65; }
        .review-sparkline { display: flex; height: 40px; align-items: end; gap: 4px; margin-top: 14px; }
        .review-sparkline i { flex: 1; border-radius: 2px 2px 0 0; background: #9bb8d3; }
        .review-path { display: flex; align-items: center; gap: 7px; margin-top: 17px; }
        .review-path i { position: relative; width: 22px; height: 22px; border: 1px solid #cbd9e7; border-radius: 7px; background: #edf4fa; }
        .review-path i:not(:last-child)::after { position: absolute; top: 9px; left: 21px; width: 14px; border-top: 1px dashed #8eabc6; content: ''; }
        .review-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 17px; border-radius: 20px; background: #edf7f1; padding: 6px 9px; color: #418361; font-size: 9px; font-weight: 750; }
        .review-status i { width: 6px; height: 6px; border-radius: 50%; background: #4ba77b; }

        @media (hover: none), (pointer: coarse) {
          .tilt-surface { transform: none !important; }
          .tilt-surface::after { display: none; }
          .cursor-reactive:hover { transform: none; }
          .ghost-cursor { display: none; }
        }
        @media (max-width: 760px) {
          .stack-marquee { align-items: flex-start; flex-direction: column; gap: 9px; }
        }

        @media (max-width: 420px) {
          .check-flow__track { gap: 4px; }
          .check-flow__node-label { font-size: 9px; }
          .check-flow__node-icon { width: 30px; height: 30px; }
        }

        @media (max-width: 640px) {
          .hero-section {
            padding-top: 65px;
          }

          .dashboard-preview {
            transform: none;
          }

          .floating-reliability-card {
            right: -5px;
            bottom: 20px;
            width: 185px;
          }

          .feature-card {
            padding: 23px;
          }

          .reliability-visual {
            padding: 17px;
          }
        }


        .landing-brand-icon,
        .footer-brand-icon {
          border: 1px solid #dce9e2;
          background: #f7fbf8;
          box-shadow: none;
        }
        .pulse-logo-line { display:block; width:25px; height:20px; overflow:visible; }
        .pulse-logo-line--cta { width:32px; height:24px; }
        .pulse-logo-line path { stroke-dasharray:46; stroke-dashoffset:0; animation:logo-pulse 2.8s ease-in-out infinite; }
        @keyframes logo-pulse {
          0%,100% { stroke-dashoffset:0; opacity:1; }
          50% { stroke-dashoffset:-5; opacity:.82; }
        }

        .availability-wave {
          height:92px; overflow:hidden; border:1px solid #e7edf0;
          border-radius:9px; background:linear-gradient(180deg,#fbfdfc,#f7faf8);
          padding:8px 10px;
        }
        .availability-wave svg { display:block; width:100%; height:100%; overflow:visible; }
        .availability-wave__grid { fill:none; stroke:#e8efeb; stroke-width:1; stroke-dasharray:2 5; }
        .availability-wave__track {
          fill: none;
          stroke: #cbd5d1;
          stroke-width: 2.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .availability-wave__progress {
          fill: none;
          stroke: #087443;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 739.906 739.906;
          stroke-dashoffset: 739.906;
        }
        .availability-wave__marker-halo {
          fill: rgba(8, 116, 67, .16);
          stroke: rgba(8, 116, 67, .2);
          stroke-width: 1;
        }
        .availability-wave__marker {
          fill: #075c37;
          stroke: #ffffff;
          stroke-width: 1.8;
        }

        .check-flow__node { position:relative; cursor:pointer; outline:none; }
        .check-flow__node-icon {
          transition:color 180ms ease,border-color 180ms ease,background 180ms ease,box-shadow 180ms ease;
        }
        .check-flow__node:hover .check-flow__node-icon,
        .check-flow__node:focus-visible .check-flow__node-icon {
          border-color:#a8dfc2; background:#effaf4; color:#21875d;
          box-shadow:0 0 0 4px rgba(45,168,117,.09);
        }
        .check-flow__node--scheduler:hover .lucide-clock,
        .check-flow__node--scheduler:focus-visible .lucide-clock { animation:clock-tick 1.1s ease-in-out infinite; transform-origin:50% 50%; }
        .check-flow__node--worker:hover .lucide-activity,
        .check-flow__node--worker:focus-visible .lucide-activity { animation:worker-beat .75s ease-in-out infinite; }
        .check-flow__node--endpoint:hover .lucide-globe,
        .check-flow__node--endpoint:focus-visible .lucide-globe { animation:endpoint-ping 1s ease-in-out infinite; }
        @keyframes clock-tick { 0%,100% { transform:rotate(0); } 25% { transform:rotate(-12deg); } 75% { transform:rotate(12deg); } }
        @keyframes worker-beat { 0%,100% { transform:scale(1); } 35% { transform:scale(1.15); } 65% { transform:scale(.94); } }
        @keyframes endpoint-ping { 0%,100% { transform:scale(1); } 50% { transform:scale(1.12); } }


        /* Viewport composition: keep the landing page's first screen intentional. */
        .landing-navbar { min-height: 68px; }
        .hero-section {
          min-height: calc(100svh - 68px);
          display: flex;
          align-items: center;
          padding-top: clamp(18px, 3.2svh, 42px);
          padding-bottom: clamp(18px, 3.2svh, 42px);
        }
        .hero-section > .relative {
          width: 100%;
        }
        .hero-section .grid {
          gap: clamp(22px, 3vw, 46px);
        }
        .hero-section h1 {
          font-size: clamp(38px, 4.25vw, 60px);
          line-height: 1.04;
          letter-spacing: -.045em;
        }
        .hero-section h1 .hero-gradient-text { margin-top: .12em; }
        .hero-section > div > div > div:first-child > p {
          margin-top: clamp(12px, 2vh, 22px);
          font-size: clamp(13px, 1.1vw, 16px);
          line-height: 1.55;
        }
        .hero-section .hero-eyebrow { margin-bottom: clamp(12px, 2.3vh, 24px); }
        .hero-section .hero-section-ctas { margin-top: clamp(14px, 2.5vh, 26px); }
        .hero-section .dashboard-preview { width: 100%; }
        .preview-topbar { min-height: 44px; }
        .preview-content { padding: clamp(11px, 1.35vw, 17px); }
        .preview-content > .mb-5 { margin-bottom: 12px; }
        .preview-stat { padding: 10px; }
        .preview-stat .mb-3 { margin-bottom: 6px; }
        .preview-chart-card { margin-top: 10px; padding: 10px; }
        .preview-chart-card .mb-4 { margin-bottom: 8px; }
        .availability-wave { height: clamp(58px, 8.5vh, 78px); }
        .preview-content > .mt-4 { margin-top: 10px; }
        .preview-content .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 7px; }
        .preview-content .event-feed { margin-top: 9px; padding: 7px 9px; }
        .preview-content .event-feed__row { margin-top: 5px; padding-top: 5px; }
        .floating-reliability-card { bottom: 20px; right: -8px; }

        /* Each following content group reads as a deliberate screen-sized chapter. */
        #features {
          min-height: 100svh;
          display: flex;
          align-items: center;
          padding-top: clamp(34px, 6vh, 72px);
          padding-bottom: clamp(34px, 6vh, 72px);
        }
        #features > div { width: 100%; }
        #features .mx-auto.mb-14 { margin-bottom: clamp(22px, 4vh, 42px); }
        #reliability {
          min-height: 100svh;
          display: flex;
          align-items: center;
          padding-top: clamp(30px, 5vh, 64px);
          padding-bottom: clamp(30px, 5vh, 64px);
        }
        #reliability > .reliability-panel { width: 100%; }
        .landing-cta-section {
          min-height: 76svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: clamp(28px, 5vh, 60px);
          padding-bottom: clamp(28px, 5vh, 60px);
        }
        .landing-cta-section > .bottom-cta { width: 100%; }

        /* Short desktop/laptop viewports: scale spacing and dashboard density, never clip. */
        @media (min-width: 1024px) and (max-height: 820px) {
          .hero-section { padding-top: 14px; padding-bottom: 14px; }
          .hero-section h1 { font-size: clamp(34px, 3.7vw, 50px); }
          .hero-section .hero-eyebrow { margin-bottom: 12px; }
          .hero-section .hero-section-ctas { margin-top: 13px; }
          .hero-section .hero-highlights { margin-top: 12px; }
          .preview-topbar { min-height: 38px; }
          .preview-content { padding: 10px; }
          .preview-content > .mb-5 { margin-bottom: 8px; }
          .preview-stat { padding: 8px; }
          .preview-chart-card { margin-top: 7px; padding: 8px; }
          .availability-wave { height: 54px; }
          .preview-content > .mt-4 { margin-top: 7px; }
          .preview-content .event-feed { margin-top: 6px; padding: 6px 8px; }
          .preview-content .event-feed__row { margin-top: 4px; padding-top: 4px; }
          .floating-reliability-card { bottom: 12px; }
        }
        @media (min-width: 1024px) and (max-height: 700px) {
          .hero-section h1 { font-size: clamp(32px, 3.2vw, 43px); }
          .hero-section p { line-height: 1.4; }
          .hero-section .dashboard-preview { transform: scale(.94); transform-origin: center right; }
          .hero-section .grid { gap: 18px; }
          .preview-stat p.text-2xl { font-size: 1.25rem; }
        }

        /* Tablet: use two balanced columns; phone: stack naturally without clipping. */
        @media (min-width: 700px) and (max-width: 1023px) {
          .hero-section { min-height: auto; padding-top: 42px; padding-bottom: 48px; }
          .hero-section .grid { grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr); gap: 22px; }
          .hero-section h1 { font-size: clamp(34px, 5vw, 48px); }
          .hero-section .dashboard-preview { transform: none; }
          .preview-content { padding: 11px; }
          .preview-stat { padding: 8px; }
          .availability-wave { height: 58px; }
          .event-feed__row { grid-template-columns: 45px minmax(0,1fr) auto; gap: 5px; font-size: 8px; }
        }
        @media (max-width: 699px) {
          .hero-section {
            min-height: auto;
            display: block;
            padding-top: 34px;
            padding-bottom: 42px;
          }
          .hero-section h1 { font-size: clamp(35px, 10vw, 48px); }
          .hero-section .grid { gap: 30px; }
          .hero-section .dashboard-preview { max-width: 560px; }
          #features, #reliability { min-height: auto; display: block; }
          .landing-cta-section { min-height: auto; }
        }


        /* Fit the complete dashboard preview inside the first viewport. */
        .hero-product-preview {
          box-sizing: border-box;
          width: calc(100% - clamp(16px, 2vw, 30px));
          max-width: 680px;
          min-width: 0;
          margin-left: auto;
          margin-right: clamp(16px, 2vw, 30px);
          zoom: clamp(.64, min(calc(100svh / 980), calc(100vw / 1800)), .84);
        }
        .hero-product-preview .dashboard-preview {
          width: 100%;
          min-width: 0;
        }
        .hero-product-preview .floating-reliability-card {
          right: 12px;
          max-width: calc(100% - 24px);
        }

        @media (min-width: 1024px) and (max-height: 820px) {
          .hero-product-preview {
            width: calc(100% - clamp(16px, 2vw, 30px));
            margin-left: auto;
            margin-right: clamp(16px, 2vw, 30px);
            zoom: clamp(.62, min(calc(100svh / 1020), calc(100vw / 1800)), .80);
          }
        }
        @media (min-width: 1024px) and (max-height: 700px) {
          .hero-product-preview {
            width: calc(100% - 20px);
            margin-left: auto;
            margin-right: 20px;
            zoom: clamp(.58, min(calc(100svh / 1080), calc(100vw / 1800)), .70);
          }
        }
        @media (min-width: 700px) and (max-width: 1023px) {
          .hero-product-preview {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
            zoom: .88;
          }
        }
        @media (max-width: 699px) {
          .hero-product-preview {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
            zoom: 1;
          }
        }

        .hero-product-preview {
          container-type: inline-size;
          container-name: pulse-preview;
        }
        @container pulse-preview (max-width: 560px) {
          .preview-topbar { min-height: 42px; padding-inline: 12px; }
          .preview-content { padding: 12px; }
          .preview-content h3 { font-size: 15px; }
          .preview-stat { padding: 9px; }
          .preview-stat .text-2xl { font-size: 1.25rem; }
          .preview-stat-icon { width: 23px; height: 23px; }
          .preview-chart-card { padding: 10px; }
          .event-feed { padding: 7px 9px; }
          .event-feed__row { grid-template-columns: 44px minmax(0,1fr) auto; gap: 5px; font-size: 8px; }
          .floating-reliability-card { width: 184px; padding: 8px; }
        }
        @container pulse-preview (max-width: 470px) {
          .preview-topbar { min-height: 38px; }
          .preview-content { padding: 9px; }
          .preview-content h3 { font-size: 13px; }
          .preview-stat { padding: 7px; }
          .preview-stat .text-2xl { font-size: 1.05rem; }
          .preview-stat .text-xs { font-size: 9px; }
          .preview-chart-card { padding: 8px; }
          .availability-wave { height: 48px; }
          .event-feed__row { grid-template-columns: 38px minmax(0,1fr) auto; gap: 4px; font-size: 7px; }
          .floating-reliability-card { width: 164px; gap: 7px; font-size: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pulse-logo-line path { animation:none !important; }
          .check-flow__node-icon { transition:none; }
          .word-swap span,
          .number-roll,
          .ghost-cursor,
          .stack-marquee__track,
          .event-feed,
          .event-feed__row {
            animation: none !important;
          }
          .word-swap span:not(:first-child) { display: none; }
          .tilt-surface,
          .cursor-reactive,
          .review-tile { transition: none !important; }
          .floating-reliability-card {
            animation: none;
          }

          .dashboard-preview,
          .feature-card,
          .hero-primary-button,
          .hero-secondary-button,
          .navbar-cta,
          .bottom-cta-button {
            transition: none;
          }

          .dashboard-preview:hover,
          .feature-card:hover,
          .hero-primary-button:hover,
          .hero-secondary-button:hover,
          .navbar-cta:hover,
          .bottom-cta-button:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}