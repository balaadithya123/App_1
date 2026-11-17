const WORKER_DASHBOARD_PREFIX = "builderco_offline_worker_dash_";
const WORKER_CALLBACKS_PREFIX = "builderco_offline_worker_callbacks_";
const DIRECTORY_WORKERS_KEY = "builderco_offline_workers_directory";

export interface CachedWorkerDashboard {
  userId: string;
  role: string;
  userMetadata: Record<string, any>;
  callbackCount: number;
  updatedAt: number;
}

export interface CachedCallbackRequests<T = any> {
  userId: string;
  requests: T[];
  updatedAt: number;
}

export interface CachedDirectoryWorkers<T = any> {
  workers: T[];
  updatedAt: number;
}

function safeRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private browsing errors
  }
}

export function saveCachedWorkerDashboard(snapshot: CachedWorkerDashboard): void {
  if (!snapshot?.userId) return;
  safeWrite(`${WORKER_DASHBOARD_PREFIX}${snapshot.userId}`, snapshot);
}

export function loadCachedWorkerDashboard(
  userId?: string,
): CachedWorkerDashboard | null {
  if (userId) {
    return safeRead<CachedWorkerDashboard>(`${WORKER_DASHBOARD_PREFIX}${userId}`);
  }
  if (typeof window === "undefined") return null;
  try {
    let newest: CachedWorkerDashboard | null = null;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(WORKER_DASHBOARD_PREFIX)) continue;
      const item = safeRead<CachedWorkerDashboard>(k);
      if (item && (!newest || item.updatedAt > newest.updatedAt)) {
        newest = item;
      }
    }
    return newest;
  } catch {
    return null;
  }
}

export function saveCachedCallbackRequests<T = any>(
  userId: string,
  requests: T[],
): void {
  if (!userId) return;
  const payload: CachedCallbackRequests<T> = {
    userId,
    requests,
    updatedAt: Date.now(),
  };
  safeWrite(`${WORKER_CALLBACKS_PREFIX}${userId}`, payload);
}

export function loadCachedCallbackRequests<T = any>(
  userId?: string,
): CachedCallbackRequests<T> | null {
  if (userId) {
    return safeRead<CachedCallbackRequests<T>>(
      `${WORKER_CALLBACKS_PREFIX}${userId}`,
    );
  }
  if (typeof window === "undefined") return null;
  try {
    let newest: CachedCallbackRequests<T> | null = null;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(WORKER_CALLBACKS_PREFIX)) continue;
      const item = safeRead<CachedCallbackRequests<T>>(k);
      if (item && (!newest || item.updatedAt > newest.updatedAt)) {
        newest = item;
      }
    }
    return newest;
  } catch {
    return null;
  }
}

export function saveCachedDirectoryWorkers<T = any>(workers: T[]): void {
  if (!Array.isArray(workers)) return;
  const payload: CachedDirectoryWorkers<T> = {
    workers,
    updatedAt: Date.now(),
  };
  safeWrite(DIRECTORY_WORKERS_KEY, payload);
}

export function loadCachedDirectoryWorkers<T = any>(): CachedDirectoryWorkers<T> | null {
  return safeRead<CachedDirectoryWorkers<T>>(DIRECTORY_WORKERS_KEY);
}

export function formatCacheAge(updatedAt?: number): string {
  if (!updatedAt) return "just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
