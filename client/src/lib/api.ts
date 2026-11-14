const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type RegisterResponse = {
  user: AuthUser;
  verificationRequired: boolean;
  message: string;
};

export type DashboardData = {
  period: { start: string; end: string; label: string };
  stats: {
    totalMonitors: number;
    operationalMonitors: number;
    downMonitors: number;
    pausedMonitors: number;
    activeIncidents: number;
    overallUptime: number | null;
    checkCount: number;
    avgResponseTimeMs: number | null;
  };
  recentIncidents: Array<{
    id: string;
    monitor_id: string;
    monitor_name: string;
    title: string;
    status: string;
    started_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    monitor_id: string;
    monitor_name: string;
    status: string;
    status_code: number | null;
    latency_ms: number | null;
    error: string | null;
    checked_at: string;
  }>;
  timeline: Array<{
    bucket: string;
    checks: number;
    successful: number;
    uptime: number | null;
    avg_response_time_ms: number | null;
  }>;
};

export type AnalyticsData = {
  period: { start: string; end: string; label: string };
  summary: {
    checkCount: number;
    successfulChecks: number;
    overallUptime: number | null;
    avgResponseTimeMs: number | null;
    minResponseTimeMs: number | null;
    maxResponseTimeMs: number | null;
    downtimeMs: number;
    incidentCount: number;
  };
  monitors: Array<{
    id: string;
    name: string;
    checkCount: number;
    successfulChecks: number;
    uptime: number | null;
    avgResponseTimeMs: number | null;
    minResponseTimeMs: number | null;
    maxResponseTimeMs: number | null;
  }>;
  timeline: Array<{
    bucket: string;
    checkCount: number;
    successfulChecks: number;
    uptime: number | null;
    avgResponseTimeMs: number | null;
    minResponseTimeMs: number | null;
    maxResponseTimeMs: number | null;
  }>;
  incidentFrequency: Array<{ day: string; incidents: number }>;
};

export type SettingsData = {
  user: AuthUser & { created_at: string };
  organization: { name: string; updated_at: string } | null;
};

export type StatusPage = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean | number;
  created_at?: string;
};

export type PublicStatusPage = {
  name: string;
  slug: string;
  monitors: Array<{
    name: string;
    status: string;
    last_checked_at: string | null;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    started_at: string;
    resolved_at: string | null;
    monitor_name: string;
  }>;
};

export async function api<T>(
  path: string,
  options: RequestInit = {},
  redirectOnUnauthorized = true
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;

    throw new Error(
      'Cannot connect to PulseWatch API. Check that the backend is running on port 5001.'
    );
  }

  const responseText = await response.text();
  let payload: {
    success?: boolean;
    data?: unknown;
    error?: { message?: string; code?: string };
    code?: string;
  } = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error('The API returned an invalid response.');
      }
    }
  }

  if (!response.ok || payload.success === false) {
    const error = new Error(
      payload.error?.message || `Request failed (${response.status})`
    ) as Error & { code?: string };

    error.code = payload.code || payload.error?.code;

    if (
      response.status === 401 &&
      redirectOnUnauthorized &&
      typeof window !== 'undefined'
    ) {
      localStorage.removeItem('pulsewatch_user');
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }

    throw error;
  }

  return payload.data as T;
}

export const dashboardApi = {
  get: (signal?: AbortSignal) =>
    api<DashboardData>('/dashboard', { signal }),
};

export const analyticsApi = {
  get: (from: string, to: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ from, to });
    return api<AnalyticsData>(`/analytics?${query}`, { signal });
  },
};

export const settingsApi = {
  get: (signal?: AbortSignal) =>
    api<SettingsData>('/settings', { signal }),
  updateProfile: (name: string) =>
    api<AuthUser>(
      '/settings/profile',
      { method: 'PATCH', body: JSON.stringify({ name }) }
    ),
  updateOrganization: (name: string) =>
    api<SettingsData['organization']>(
      '/settings/organization',
      { method: 'PATCH', body: JSON.stringify({ name }) }
    ),
};

export const statusPagesApi = {
  list: (signal?: AbortSignal) =>
    api<StatusPage[]>('/status-pages', { signal }),
  create: (data: Pick<StatusPage, 'name' | 'slug'>) =>
    api<StatusPage>(
      '/status-pages',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  update: (
    id: string,
    data: Pick<StatusPage, 'name' | 'slug'>
  ) =>
    api<StatusPage>(
      `/status-pages/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  publish: (id: string, published: boolean) =>
    api<{ published: boolean }>(
      `/status-pages/${encodeURIComponent(id)}/publish`,
      { method: 'PATCH', body: JSON.stringify({ published }) }
    ),
  remove: (id: string) =>
    api<{ deleted: boolean }>(
      `/status-pages/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
  getPublic: (slug: string, signal?: AbortSignal) =>
    api<PublicStatusPage>(
      `/status-pages/public/${encodeURIComponent(slug)}`,
      { signal, credentials: 'omit' }
    ),
};

export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) =>
    api<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'omit',
    }, false),

  verifyEmail: (data: { email: string; otp: string }) =>
    api<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  resendOtp: (data: { email: string }) =>
    api<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'omit',
    }, false),

  login: (data: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  forgotPassword: (data: { email: string }) =>
    api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'omit',
    }, false),

  resetPassword: (data: {
    email: string;
    otp: string;
    newPassword: string;
  }) =>
    api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'omit',
    }, false),
};
