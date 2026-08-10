import type { Worker } from "@/data/workers";

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

export const filterWorkers = (
  workers: Worker[],
  service: string,
  location: string,
) => {
  const normalizedService = normalizeSearchValue(service);
  const normalizedLocation = normalizeSearchValue(location);

  return workers.filter((worker) => {
    const matchesService = normalizedService
      ? worker.category.toLowerCase() === normalizedService
      : true;
    const matchesLocation = normalizedLocation
      ? worker.locality.toLowerCase().includes(normalizedLocation)
      : true;

    return matchesService && matchesLocation;
  });
};
