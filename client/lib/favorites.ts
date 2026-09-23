const STORAGE_KEY = "app1:saved-workers";
const NOTES_STORAGE_KEY = "app1:worker-notes";

function readSavedWorkerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function readWorkerNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(
      window.localStorage.getItem(NOTES_STORAGE_KEY) || "{}",
    );
    return typeof value === "object" && value !== null ? value : {};
  } catch {
    return {};
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
  const next = saved
    ? current.filter((id) => id !== workerId)
    : [...current, workerId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("saved-workers-changed"));
  return !saved;
}

export function getWorkerNote(workerId: string): string {
  const notes = readWorkerNotes();
  return notes[workerId] || "";
}

export function setWorkerNote(workerId: string, note: string): void {
  if (typeof window === "undefined") return;
  const notes = readWorkerNotes();
  if (note.trim()) {
    notes[workerId] = note;
  } else {
    delete notes[workerId];
  }
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent("saved-workers-changed"));
}
