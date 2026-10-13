import {
  BrickWall,
  Grid3x3,
  Layers,
  Mountain,
  Package,
  Ruler,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type CategoryMeta = { icon: LucideIcon; tone: string };

const META: Record<string, CategoryMeta> = {
  Sand: { icon: Layers, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  "Stone & Aggregates": { icon: Mountain, tone: "bg-stone-500/10 text-stone-700 dark:text-stone-300" },
  Cement: { icon: Package, tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  "Bricks & Blocks": { icon: BrickWall, tone: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  Steel: { icon: Ruler, tone: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  Tiles: { icon: Grid3x3, tone: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  "Tools & Rental": { icon: Wrench, tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
};

const FALLBACK: CategoryMeta = {
  icon: Store,
  tone: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

export function getCategoryMeta(category: string): CategoryMeta {
  return META[category] ?? FALLBACK;
}
