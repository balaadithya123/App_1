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

export const filterWorkers = (
  workers: Worker[],
  service: string,
  location: string,
) => {
  const normalizedService = normalizeSearchValue(service);
  const normalizedLocation = normalizeSearchValue(location);
  const serviceStem = stemWord(normalizedService);

  return workers.filter((worker) => {
    const searchableServices = [worker.name, worker.category, ...worker.services].map(
      (value) => normalizeSearchValue(value),
    );
    const searchableLocation = normalizeSearchValue(worker.locality);

    const matchesService =
      !normalizedService ||
      searchableServices.some((value) => {
        if (value.includes(normalizedService) || normalizedService.includes(value)) return true;
        if (serviceStem && (value.includes(serviceStem) || stemWord(value).includes(serviceStem))) return true;
        return false;
      });

    const matchesLocation =
      !normalizedLocation || searchableLocation.includes(normalizedLocation);

    return matchesService && matchesLocation;
  });
};

