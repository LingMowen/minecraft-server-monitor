import { ServerWithStatus, ServerStatus } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export interface HistoryRecord {
  timestamp: number;
  players: number;
  latency: number;
}

export interface PlayerStats {
  maxPlayersDay: number;
  maxPlayersWeek: number;
  maxPlayersMonth: number;
  maxPlayersDayTime: number;
  maxPlayersWeekTime: number;
  maxPlayersMonthTime: number;
}

export type TimeRange = 'hour' | 'day' | 'week' | 'month';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
};

const getUsername = (): string | null => {
  return localStorage.getItem('username');
};

const setUsername = (username: string): void => {
  localStorage.setItem('username', username);
};

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  login: async (username: string, password: string): Promise<{ success: boolean; token: string; username: string }> => {
    const result = await fetchApi<{ success: boolean; token: string; username: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (result.success) {
      setToken(result.token);
      setUsername(result.username);
    }
    return result;
  },

  logout: (): void => {
    removeToken();
  },

  verifyToken: async (): Promise<{ valid: boolean; username?: string }> => {
    try {
      const result = await fetchApi<{ valid: boolean; username: string }>('/verify');
      return result;
    } catch {
      return { valid: false };
    }
  },

  isAuthenticated: (): boolean => {
    return !!getToken();
  },

  getUsername: (): string | null => {
    return getUsername();
  },

  getServers: () => fetchApi<ServerWithStatus[]>('/servers'),

  getServer: (id: string) => fetchApi<ServerWithStatus>(`/servers/${id}`),

  getServerStatus: (id: string) => fetchApi<ServerStatus>(`/servers/${id}/status`),

  getServerHistory: (id: string, range: TimeRange = 'hour') => 
    fetchApi<HistoryRecord[]>(`/servers/${id}/history?range=${range}`),

  getServerStats: (id: string) => 
    fetchApi<PlayerStats>(`/servers/${id}/stats`),

  addServer: (server: Omit<ServerWithStatus, 'id'>) =>
    fetchApi<{ success: boolean; server: ServerWithStatus }>('/servers', {
      method: 'POST',
      body: JSON.stringify(server),
    }),

  updateServer: (id: string, server: Partial<Omit<ServerWithStatus, 'id'>>) =>
    fetchApi<{ success: boolean; server: ServerWithStatus }>(`/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(server),
    }),

  removeServer: (id: string) =>
    fetchApi<{ success: boolean }>(`/servers/${id}`, { method: 'DELETE' }),

  getSettings: () => 
    fetchApi<{ username: string; port: number }>('/settings'),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean }>('/settings/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export default api;
