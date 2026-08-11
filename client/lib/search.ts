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
    const searchableServices = [worker.category, ...worker.services].map((service) =>
      normalizeSearchValue(service),
    );
    const searchableLocation = normalizeSearchValue(worker.locality);

    const matchesService =
      !normalizedService ||
      searchableServices.some((service) => service.includes(normalizedService));
    const matchesLocation =
      !normalizedLocation || searchableLocation.includes(normalizedLocation);

    return matchesService && matchesLocation;
  });
};
