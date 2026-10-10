import type { Worker } from "@/data/workers";

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

const stemWord = (word: string) => {
  const w = word.trim().toLowerCase();
  if (w.endsWith("ians") || w.endsWith("ian")) return w.replace(/ians?$/, "");
  if (w.endsWith("ers") || w.endsWith("er")) return w.replace(/ers?$/, "");
  if (w.endsWith("ors") || w.endsWith("or")) return w.replace(/ors?$/, "");
  if (w.endsWith("ing")) return w.replace(/ing$/, "");
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
};

/**
 * Fast worker search filter with minimal allocations per item.
 * Performance Optimization:
 * - Pre-computes normalized service & location parameters outside the loop.
 * - Fast-paths when search terms are empty.
 * - Avoids array creation ([worker.name, worker.category, ...worker.services]) per worker per filter pass.
 */
export const filterWorkers = (
  workers: Worker[],
  service: string,
  location: string,
) => {
  const normalizedService = normalizeSearchValue(service);
  const normalizedLocation = normalizeSearchValue(location);

  // Fast path: if no search criteria, return all workers immediately
  if (!normalizedService && !normalizedLocation) {
    return workers;
  }

  const serviceStem = normalizedService ? stemWord(normalizedService) : "";

  // Helper to check if a target field matches the normalized service query
  const matchesFieldValue = (value: string): boolean => {
    const normValue = normalizeSearchValue(value);
    if (
      normValue.includes(normalizedService) ||
      normalizedService.includes(normValue)
    ) {
      return true;
    }
    if (
      serviceStem &&
      (normValue.includes(serviceStem) || stemWord(normValue).includes(serviceStem))
    ) {
      return true;
    }
    return false;
  };

  return workers.filter((worker) => {
    // Check location match first if location query exists
    if (normalizedLocation) {
      const searchableLocation = normalizeSearchValue(worker.locality);
      if (!searchableLocation.includes(normalizedLocation)) {
        return false;
      }
    }

    // Check service query match if service query exists
    if (normalizedService) {
      // Check worker name, category, and services list without allocating temporary arrays
      if (
        matchesFieldValue(worker.name) ||
        matchesFieldValue(worker.category)
      ) {
        return true;
      }

      for (let i = 0; i < worker.services.length; i++) {
        if (matchesFieldValue(worker.services[i])) {
          return true;
        }
      }

      return false;
    }

    return true;
  });
};
