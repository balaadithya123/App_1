import { Skeleton } from "@/components/ui/skeleton";

export function WorkerCardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <div className="flex gap-2.5 pt-3 border-t border-[#EAE2DC] dark:border-white/10">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

export function WorkerProfileSkeleton() {
  return (
    <div aria-busy="true" className="space-y-5 pb-20">
      {/* Main Hero Profile Card */}
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full hidden sm:block" />
        </div>
      </div>

      {/* Details & Callback Form Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-5/6 rounded-md" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-3">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function AgencyProfileSkeleton() {
  return (
    <div aria-busy="true" className="space-y-5 pb-20">
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-4 w-36 rounded-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 p-4 space-y-2.5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-3 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SupplierDetailSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6 pb-20">
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-3">
        <Skeleton className="h-5 w-36 rounded-md" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 p-3.5"
          >
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton({
  statCount = 3,
  cardCount = 2,
}: {
  statCount?: number;
  cardCount?: number;
}) {
  return (
    <div aria-busy="true" className="mx-auto max-w-4xl space-y-5 pb-16">
      {/* Hero Banner Skeleton */}
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-36 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      {statCount > 0 && (
        <div
          className={`grid gap-3.5 grid-cols-1 sm:grid-cols-2 ${
            statCount >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {Array.from({ length: statCount }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-2.5"
            >
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content Sections */}
      {Array.from({ length: cardCount }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({
  count = 3,
  columns = 1,
}: {
  count?: number;
  columns?: 1 | 2;
}) {
  return (
    <div
      aria-busy="true"
      className={columns === 2 ? "grid gap-4 md:grid-cols-2" : "space-y-3.5"}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-3 w-3/4 rounded-md" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScoreCardSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-3xl space-y-5 pb-16">
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 sm:p-5"
          >
            <div className="flex items-start gap-3 flex-1">
              <Skeleton className="h-5 w-5 rounded-full mt-0.5 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-64 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormCardSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-2xl space-y-5 pb-16">
      <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <div className="space-y-3.5 pt-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
    </div>
  );
}

export function RateGuideSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-2.5"
        >
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
          <Skeleton className="h-3 w-72 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function CompactSectionSkeleton({
  variant = "rows",
}: {
  variant?: "rows" | "grid" | "photos" | "banner";
}) {
  if (variant === "banner") {
    return (
      <div
        aria-busy="true"
        className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 space-y-2.5"
      >
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
    );
  }

  if (variant === "photos") {
    return (
      <div
        aria-busy="true"
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div aria-busy="true" className="mt-4 grid gap-3.5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4 space-y-2.5"
          >
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1 rounded-full" />
              <Skeleton className="h-8 flex-1 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true" className="space-y-3 py-1">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5 space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function RouteAppShellSkeleton() {
  return (
    <div
      aria-busy="true"
      className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0A09]"
    >
      {/* Top Bar Ghost */}
      <div className="h-16 border-b border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <div className="hidden md:flex items-center gap-6">
            <Skeleton className="h-4 w-14 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Page Content Skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <DashboardSkeleton statCount={3} cardCount={1} />
      </div>
    </div>
  );
}
