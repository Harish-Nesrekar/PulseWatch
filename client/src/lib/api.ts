import type { ApiError, Monitor } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      cache: "no-store"
    });
  } catch {
    throw new Error(`Cannot reach PulseWatch API at ${API_URL}. Is the backend running?`);
  }

  const body = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) {
    throw new Error(body.error?.message ?? `API request failed (${response.status})`);
  }
  return body;
}

export const api = {
  getMonitors: () => request<{ data: Monitor[] }>("/api/v1/monitors"),
  createMonitor: (payload: {
    name: string;
    url: string;
    method: "GET" | "HEAD";
    intervalSeconds: number;
    timeoutMs: number;
    expectedStatus: number;
  }) => request<{ data: Monitor }>("/api/v1/monitors", {
    method: "POST",
    body: JSON.stringify(payload)
  })
};
