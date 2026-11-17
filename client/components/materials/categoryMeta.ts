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
  Steel: { icon: Ruler, tone: "bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]" },
  Tiles: { icon: Grid3x3, tone: "bg-teal-500/10 text-[#0F8A73] dark:text-[#3DD1B3]" },
  "Tools & Rental": { icon: Wrench, tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
};

const FALLBACK: CategoryMeta = {
  icon: Store,
  tone: "bg-[#F5EFEA] dark:bg-[#242220] text-[#6B645F] dark:text-[#9E958F]",
};

export function getCategoryMeta(category: string): CategoryMeta {
  return META[category] ?? FALLBACK;
}
