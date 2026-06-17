const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "";

export async function apiFetch(path: string, init?: RequestInit & { token?: string | null }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init?.token) {
    headers["Authorization"] = `Bearer ${init.token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export function wsConnect(token?: string | null): WebSocket {
  const url = token ? `${WS_BASE}?token=${encodeURIComponent(token)}` : `${WS_BASE}`;
  return new WebSocket(url);
}

export function wsConnectRooms(token: string | null | undefined, rooms: string[]): WebSocket {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (rooms.length > 0) params.set("rooms", rooms.join(","));
  return new WebSocket(`${WS_BASE}?${params.toString()}`);
}
