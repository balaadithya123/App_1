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
    const searchableServices = [worker.name, worker.category, ...worker.services].map(
      (value) => normalizeSearchValue(value),
    );
    const searchableLocation = normalizeSearchValue(worker.locality);

    const matchesService =
      !normalizedService ||
      searchableServices.some((value) => value.includes(normalizedService));
    const matchesLocation =
      !normalizedLocation || searchableLocation.includes(normalizedLocation);

    return matchesService && matchesLocation;
  });
};
