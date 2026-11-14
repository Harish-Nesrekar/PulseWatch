'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { NotificationBell } from '@/components/notification-bell';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  BarChart3,
  ChevronsUpDown,
  CornerDownLeft,
  Globe2,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  Settings,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

import { api, dashboardApi } from '@/lib/api';
import type { AuthUser } from '@/lib/api';

type SidebarProps = {
  user?: AuthUser | null;
  incidentCount?: number | null;
};

type NavItem = { name: string; href: string; icon: LucideIcon };
type Theme = 'light' | 'dark';

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Monitor',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Monitors', href: '/monitors', icon: Server },
      { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Status pages', href: '/status-pages', icon: Globe2 },
    ],
  },
];
const settingsItem: NavItem = { name: 'Settings', href: '/settings', icon: Settings };
const allPages = [...groups.flatMap(g => g.items), settingsItem];
const mobilePrimary = allPages.slice(0, 4);
const mobileMore = allPages.slice(4);

const THEME_KEY = 'pulsewatch_theme';
const COLLAPSED_KEY = 'pulsewatch_sidebar_collapsed';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]';
const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/* ------------------------------ hooks ------------------------------ */

function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const stored = window.localStorage.getItem(THEME_KEY);
    setTheme(stored === 'dark' || stored === 'light' ? stored : media.matches ? 'dark' : 'light');

    const follow = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved !== 'dark' && saved !== 'light') setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  useEffect(() => {
    if (theme !== null) document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(current => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === 'true'), []);
  const toggle = useCallback(() => {
    setCollapsed(current => {
      window.localStorage.setItem(COLLAPSED_KEY, String(!current));
      return !current;
    });
  }, []);
  return { collapsed, toggle };
}

function useIncidentCount(incidentCount: number | null | undefined) {
  const [count, setCount] = useState<number | null>(incidentCount ?? null);

  useEffect(() => {
    if (incidentCount !== undefined) {
      setCount(incidentCount);
      return;
    }
    const controller = new AbortController();
    dashboardApi
      .get(controller.signal)
      .then(result => setCount(result.stats.activeIncidents))
      .catch(() => {
        if (!controller.signal.aborted) toast.error('Unable to load the active incident count.');
      });
    return () => controller.abort();
  }, [incidentCount]);

  return count;
}

function useOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [close, open, ref]);
}

/* ---------------------------- primitives --------------------------- */

function Logo() {
  return (
    <Link
      href="/dashboard"
      aria-label="PulseWatch dashboard"
      className={`flex min-w-0 items-center gap-3 rounded-xl ${focusRing}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_oklch,var(--success)_12%,var(--surface))] ring-1 ring-inset ring-[color-mix(in_oklch,var(--success)_22%,transparent)]">
        <svg viewBox="0 0 32 24" className="h-4 w-5" aria-hidden="true">
          <path
            d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31"
            fill="none"
            stroke="var(--success)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="truncate text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
        Pulse<span className="text-[var(--success)]">Watch</span>
      </span>
    </Link>
  );
}

function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[11px] font-semibold leading-none text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavLink({
  item, active, collapsed, count, layoutId,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  count?: number | null;
  layoutId: string;
}) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  const hasCount = typeof count === 'number' && count > 0;
  const label = hasCount ? `${item.name}, ${count} active` : item.name;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={`group relative flex h-10 items-center gap-3 rounded-[10px] text-sm font-medium transition-colors ${focusRing} ${
        collapsed ? 'justify-center' : 'px-3'
      } ${
        active
          ? 'text-[var(--primary-hover)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          aria-hidden="true"
          className="absolute inset-0 rounded-[10px] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)] ring-1 ring-inset ring-[color-mix(in_oklch,var(--primary)_20%,transparent)]"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.75} />
        {hasCount && collapsed && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" />
        )}
      </span>
      {!collapsed && <span className="relative min-w-0 flex-1 truncate">{item.name}</span>}
      {!collapsed && hasCount && <CountBadge count={count} className="relative" />}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {item.name}
          {hasCount ? ` (${count})` : ''}
        </span>
      )}
    </Link>
  );
}

function MenuRow({
  icon, children, onClick, href, danger = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const cls = `flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors ${focusRing} ${
    danger
      ? 'text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_9%,transparent)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
  }`;
  return href ? (
    <Link href={href} role="menuitem" className={cls} onClick={onClick}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type="button" role="menuitem" className={cls} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function identityOf(user: AuthUser | null | undefined) {
  const name = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : 'User';
  const email = typeof user?.email === 'string' ? user.email : '';
  const initials =
    name === 'User'
      ? 'U'
      : name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return { name, email, initials };
}

function UserMenu({
  user, collapsed, theme, onToggleTheme, onSignOut,
}: {
  user: AuthUser | null | undefined;
  collapsed: boolean;
  theme: Theme | null;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, open, close);
  const { name, email, initials } = identityOf(user);
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? `Account menu for ${name}` : undefined}
        title={collapsed ? `${name}${email ? ` · ${email}` : ''}` : undefined}
        onClick={() => setOpen(value => !value)}
        className={`flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--surface-muted)] ${focusRing} ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary-hover)]">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{name}</span>
              <span className="block truncate text-xs text-[var(--text-muted)]">{email}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={`absolute z-50 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-md)] ${
            collapsed ? 'bottom-0 left-full ml-3 w-60' : 'bottom-full left-0 mb-2 w-full'
          }`}
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
            {email && <p className="truncate text-xs text-[var(--text-muted)]">{email}</p>}
          </div>
          <div className="my-1 h-px bg-[var(--border-subtle)]" />
          <MenuRow href="/settings" onClick={close} icon={<Settings className="h-4 w-4" aria-hidden="true" />}>
            Settings
          </MenuRow>
          <MenuRow onClick={onToggleTheme} icon={<ThemeIcon className="h-4 w-4" aria-hidden="true" />}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </MenuRow>
          <div className="my-1 h-px bg-[var(--border-subtle)]" />
          <MenuRow danger onClick={onSignOut} icon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
            Sign out
          </MenuRow>
        </div>
      )}
    </div>
  );
}

/* -------------------------- command palette ------------------------ */

type Command = {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  run?: () => void;
};

function CommandPalette({
  open, onOpenChange, commands,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter(command => command.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);

  const execute = (command: Command | undefined) => {
    if (!command) return;
    onOpenChange(false);
    if (command.href) router.push(command.href);
    else command.run?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex(i => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex(i => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute(results[index]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-overlay" />
        <Dialog.Content className="command-dialog" aria-describedby="command-description">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description id="command-description" className="sr-only">
            Search pages and actions. Use the arrow keys to move and Enter to run.
          </Dialog.Description>

          <div className="command-dialog__search">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              className="command-dialog__input"
              autoComplete="off"
              placeholder="Search pages and actions"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={results[index] ? `command-${results[index].id}` : undefined}
              aria-label="Search pages and actions"
            />
            <kbd>Esc</kbd>
          </div>

          <div id="command-list" role="listbox" aria-label="Results" className="command-dialog__results">
            {results.length ? (
              results.map((command, position) => {
                const Icon = command.icon;
                const selected = position === index;
                return (
                  <button
                    key={command.id}
                    id={`command-${command.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => execute(command)}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    {command.hint && <span className="text-xs text-[var(--text-muted)]">{command.hint}</span>}
                    {selected && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />}
                  </button>
                );
              })
            ) : (
              <p className="command-dialog__empty" role="status">
                Nothing matches “{query}”. Try a page name like Monitors.
              </p>
            )}
          </div>

          <div className="command-dialog__footer">
            <span><kbd>↑</kbd> <kbd>↓</kbd> to move</span>
            <span><kbd>Enter</kbd> to open</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------ sidebar ---------------------------- */

export function Sidebar({ user, incidentCount }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleCollapsed } = useCollapsed();
  const openIncidentCount = useIncidentCount(incidentCount);
  const [moreOpen, setMoreOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  // ⌘K / Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMoreOpen(false);
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      toast.error('The server could not confirm sign-out. Please retry when the API is available.');
      return;
    }
    localStorage.removeItem('pulsewatch_user');
    router.replace('/login');
  }, [router]);

  const openPalette = () => {
    setMoreOpen(false);
    setCommandOpen(true);
  };

  const commands: Command[] = useMemo(
    () => [
      ...allPages.map(item => ({ id: item.href.slice(1), label: item.name, icon: item.icon, href: item.href, hint: 'Page' })),
      { id: 'theme', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: theme === 'dark' ? Sun : Moon, hint: 'Action', run: toggleTheme },
      { id: 'signout', label: 'Sign out', icon: LogOut, hint: 'Action', run: () => void handleLogout() },
    ],
    [handleLogout, theme, toggleTheme],
  );

  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const moreIsActive = mobileMore.some(item => isActivePath(pathname, item.href));
  const countFor = (item: NavItem) => (item.href === '/incidents' ? openIncidentCount : null);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-30 hidden h-[100dvh] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div
  className={`flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] ${
    collapsed ? 'justify-center gap-1' : 'justify-between px-4'
  }`}
>
  {!collapsed && <Logo />}

  <div className="flex items-center gap-1">
    <NotificationBell />

    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] ${focusRing}`}
    >
      <CollapseIcon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  </div>
</div>

        <div className={collapsed ? 'px-3 pt-4' : 'px-3 pt-4'}>
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search pages and actions"
            className={`flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-sm text-[var(--text-muted)] transition-colors hover:border-[color-mix(in_oklch,var(--primary)_35%,var(--border-subtle))] hover:text-[var(--text-secondary)] ${focusRing} ${
              collapsed ? 'justify-center' : 'px-3'
            }`}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search</span>

              </>
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Workspace">
          {groups.map(group => (
            <div key={group.label}>
              {collapsed ? (
                <div className="mx-3 mb-2 h-px bg-[var(--border-subtle)]" aria-hidden="true" />
              ) : (
                <p className="mb-1.5 px-3 text-xs font-medium text-[var(--text-muted)]">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    collapsed={collapsed}
                    count={countFor(item)}
                    layoutId="sidebar-active"
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-[var(--border-subtle)] p-3">
          <NavLink
            item={settingsItem}
            active={isActivePath(pathname, settingsItem.href)}
            collapsed={collapsed}
            layoutId="sidebar-active"
          />
          <UserMenu user={user} collapsed={collapsed} theme={theme} onToggleTheme={toggleTheme} onSignOut={handleLogout} />
        </div>
      </aside>

      <div
        className={`hidden shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none md:block ${collapsed ? 'w-[72px]' : 'w-64'}`}
        aria-hidden="true"
      />

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Mobile navigation"
        className="pulsewatch-mobile-nav fixed inset-x-0 bottom-0 z-[100] grid grid-cols-5 border-t border-[var(--border-subtle)] bg-[var(--surface)] px-1 pt-1.5 md:hidden"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom), 6px)',
          minHeight: '64px',
          isolation: 'isolate',
        }}
      >
        {mobilePrimary.map(item => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          const count = countFor(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${focusRing} ${
                active ? 'text-[var(--primary-hover)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="relative" aria-hidden="true">
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
                {typeof count === 'number' && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-[var(--danger)] px-1 text-center text-[9px] font-semibold leading-4 text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              {item.name}
              {active && <span aria-hidden="true" className="absolute inset-x-6 -top-1.5 h-0.5 rounded-full bg-[var(--primary)]" />}
            </Link>
          );
        })}

        <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${focusRing} ${
                moreIsActive || moreOpen ? 'text-[var(--primary-hover)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              More
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="mobile-drawer-overlay" />
            <Dialog.Content className="mobile-drawer" aria-describedby={undefined}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-subtle)]" aria-hidden="true" />
              <Dialog.Title className="sr-only">More navigation</Dialog.Title>

              <div className="mb-3">
                <Logo />
              </div>

              <div className="space-y-1">
                <NotificationBell variant="mobile" />
                <button
                  type="button"
                  onClick={openPalette}
                  className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] ${focusRing}`}
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="flex-1 text-left">Search pages and actions</span>
                </button>

                {mobileMore.map(item => (
                  <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} collapsed={false} layoutId="drawer-active" />
                ))}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] ${focusRing}`}
                >
                  <ThemeIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_9%,transparent)] ${focusRing}`}
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                  Sign out
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary-hover)]">
                  {identityOf(user).initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{identityOf(user).name}</span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">{identityOf(user).email}</span>
                </span>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </nav>

      <style jsx global>{`
        /* Keep the mobile navigation pinned to the viewport, not the document flow. */
        @media (max-width: 767px) {
          .pulsewatch-mobile-nav {
            position: fixed !important;
            inset: auto 0 0 0 !important;
            z-index: 1000 !important;
            box-sizing: border-box;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            height: calc(72px + env(safe-area-inset-bottom, 0px));
            min-height: calc(72px + env(safe-area-inset-bottom, 0px));
            padding: 6px 4px env(safe-area-inset-bottom, 0px);
            background: #ffffff !important;
            border-top: 1px solid var(--border-subtle);
            box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.09);
            isolation: isolate;
            transform: translateZ(0);
          }


         .pulsewatch-mobile-nav {
  position: fixed !important;
  inset: auto 0 0 0 !important;
  z-index: 1000 !important;
  pointer-events: auto !important;
}
        }
      `}</style>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} commands={commands} />
    </>
  );
}

export default Sidebar;
