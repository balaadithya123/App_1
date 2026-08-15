const STORAGE_KEY = "app1-recently-viewed";
const MAX_ITEMS = 6;

export const getRecentlyViewedWorkerIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
};

export const addRecentlyViewedWorker = (workerId: string) => {
  try {
    const next = [workerId, ...getRecentlyViewedWorkerIds().filter((id) => id !== workerId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("recently-viewed-changed"));
  } catch {
    // localStorage may be unavailable; recently viewed is non-critical.
  }
};

export const clearRecentlyViewedWorkers = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("recently-viewed-changed"));
  } catch {
    // no-op
  }
};
