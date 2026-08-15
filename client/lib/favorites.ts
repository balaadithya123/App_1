const STORAGE_KEY = "app1:saved-workers";

function readSavedWorkerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getSavedWorkerIds(): string[] {
  return readSavedWorkerIds();
}

export function isWorkerSaved(workerId: string): boolean {
  return readSavedWorkerIds().includes(workerId);
}

export function toggleSavedWorker(workerId: string): boolean {
  const current = readSavedWorkerIds();
  const saved = current.includes(workerId);
  const next = saved ? current.filter((id) => id !== workerId) : [...current, workerId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("saved-workers-changed"));
  return !saved;
}
