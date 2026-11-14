const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export type ApiError = {
  success: false;
  error: {
    message: string;
  };
};

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
  verificationRequired: true;
  message: string;
};

export type MonitorStatus = 'UP' | 'DOWN' | 'PENDING';

export type MonitorMethod = 'GET' | 'HEAD';

export type Monitor = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: MonitorMethod;
  interval_seconds: number;
  expected_status: number;
  is_active: number | boolean;
  status: MonitorStatus;
  last_checked_at: string | null;
  last_status_code: number | null;
  last_latency_ms: number | null;
  consecutive_failures: number;
  created_at: string;
  updated_at?: string;
};

export type MonitorInput = {
  name: string;
  url: string;
  method?: MonitorMethod;
  interval_seconds: number;
  expected_status?: number;
};

export type MonitorUpdateInput = Partial<MonitorInput> & {
  is_active?: boolean;
};

export type MonitorCheck = {
  id: string;
  monitor_id: string;
  status: MonitorStatus;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
};

export type MonitorCheckResult = {
  status: MonitorStatus;
  statusCode: number | null;
  latency: number;
  error: string | null;
  checkedAt?: string;
};

async function api<T>(
  path: string,
  options: RequestInit = {}
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
      credentials: 'include',
      cache: 'no-store'
    });
  } catch {
    throw new Error(
      'Cannot connect to PulseWatch API. Check that the backend is running on port 5001.'
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload?.error?.message ||
      `Request failed (${response.status})`
    );
  }

  return payload.data as T;
}

export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) =>
    api<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  verifyEmail: (data: {
    email: string;
    otp: string;
  }) =>
    api<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  resendOtp: (data: {
    email: string;
  }) =>
    api<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: (data: {
    email: string;
    password: string;
  }) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

export const monitorApi = {
  // Fetch all monitors belonging to the logged-in user.
  list: () => api<Monitor[]>('/monitors', { method: 'GET' }),

  // Create a new monitor.
  create: (data: MonitorInput) =>
    api<Monitor>(
      '/monitors',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          interval_seconds: Number(data.interval_seconds)
        })
      }
    ),

  // Fetch one monitor.
  get: (id: string) =>
    api<Monitor>(`/monitors/${encodeURIComponent(id)}`, { method: 'GET' }),

  // Update monitor configuration or active state.
  update: (
    id: string,
    data: MonitorUpdateInput
  ) =>
    api<Monitor>(
      `/monitors/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      }
    ),

  // Pause a monitor.
  pause: (id: string) =>
    api<Monitor>(
      `/monitors/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false })
      }
    ),

  // Resume a monitor.
  resume: (id: string) =>
    api<Monitor>(
      `/monitors/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_active: true })
      }
    ),

  // Delete a monitor.
  remove: (id: string) =>
    api<{ deleted: boolean }>(
      `/monitors/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  // Run a manual health check.
  checkNow: (id: string) =>
    api<MonitorCheckResult>(
      `/monitors/${encodeURIComponent(id)}/check`,
      { method: 'POST' }
    ),

  // Fetch check history.
  checks: (
    id: string,
    limit = 100
  ) =>
    api<MonitorCheck[]>(
      `/monitors/${encodeURIComponent(id)}/checks?limit=${limit}`,
      { method: 'GET' }
    )
};