import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, MapPin, MessageCircle, Package, RefreshCw, Search, X } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabase } from "@/lib/supabase";

type Contact = { id: string; person_name: string; role: string | null; whatsapp: string };
type Product = { id: string; name: string; unit: string | null; indicative_price: number | null; price_updated_at: string | null };
type Supplier = { id: string; name: string; category: string; description: string | null; area: string | null; city: string | null; delivery_radius_km: number | null; supplier_contacts: Contact[] | null; supplier_products: Product[] | null };
type Item = Product & { supplier: Supplier };
const CATEGORIES = ["All", "Sand", "Stone & Aggregates", "Cement", "Bricks & Blocks", "Steel", "Tiles", "Tools & Rental", "Other"];

function sendWhatsApp(contact: Contact, supplier: Supplier, product?: Product) {
  const digits = contact.whatsapp.replace(/\D/g, "");
  const phone = digits.length === 10 ? "91" + digits : digits;
  const message = product
    ? "Hi " + contact.person_name + ", I found " + supplier.name + " on Builderco. Please share current price and delivery details for " + product.name + (product.unit ? " per " + product.unit : "") + "."
    : "Hi " + contact.person_name + ", I found " + supplier.name + " on Builderco. Please share your current materials catalogue and delivery details.";
  window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}
function Price({ product }: { product: Product }) {
  if (product.indicative_price == null) return <span className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Ask for price</span>;
  const time = product.price_updated_at ? new Date(product.price_updated_at).getTime() : NaN;
  const age = Number.isNaN(time) ? null : Math.max(0, Math.floor((Date.now() - time) / 86400000));
  return <span className="text-xs text-[#52525B] dark:text-[#A1A1AA]"><b className="text-[#09090B] dark:text-white">₹{product.indicative_price.toLocaleString("en-IN")}</b>{product.unit ? " / " + product.unit : ""}{age == null || age > 14 ? <span className="ml-1 text-amber-600 dark:text-amber-400">· confirm price</span> : <span className="ml-1">· updated {age === 0 ? "today" : age + "d ago"}</span>}</span>;
}
function MaterialCard({ item }: { item: Item }) {
  const contact = item.supplier.supplier_contacts?.[0];
  const place = [item.supplier.area, item.supplier.city].filter(Boolean).join(", ");
  return <article className="flex flex-col gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-2xs dark:border-[#27272A] dark:bg-[#141416]">
    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5"><Package size={18}/></div><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.name}</h3><p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">{item.supplier.category} · {item.supplier.name}</p>{place && <p className="mt-1 flex items-center gap-1 text-xs text-[#71717A] dark:text-[#A1A1AA]"><MapPin size={11}/>{place}</p>}</div></div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E7] pt-3 dark:border-[#27272A]"><Price product={item}/>{contact ? <button type="button" onClick={() => sendWhatsApp(contact, item.supplier, item)} className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"><MessageCircle size={13}/>Ask supplier</button> : <span className="text-xs text-[#71717A]">Contact unavailable</span>}</div>
  </article>;
}
function SupplierCard({ supplier }: { supplier: Supplier }) {
  const products = supplier.supplier_products ?? [];
  const contacts = supplier.supplier_contacts ?? [];
  const place = [supplier.area, supplier.city].filter(Boolean).join(", ");
  return <article className="space-y-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-2xs dark:border-[#27272A] dark:bg-[#141416]">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-base font-semibold">{supplier.name}</h3><p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">{supplier.category}{place ? " · " + place : ""}{supplier.delivery_radius_km ? " · delivery " + supplier.delivery_radius_km + " km" : ""}</p></div><span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Verified</span></div>
    {supplier.description && <p className="text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">{supplier.description}</p>}
    {products.length > 0 && <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#27272A]">{products.map((product, index) => <div key={product.id} className={"flex items-center justify-between gap-3 px-3 py-2.5 " + (index ? "border-t border-[#E4E4E7] dark:border-[#27272A]" : "")}><span className="text-sm font-medium">{product.name}</span><Price product={product}/></div>)}</div>}
    {contacts[0] ? <div className="flex items-center justify-between gap-3 border-t border-[#E4E4E7] pt-3 dark:border-[#27272A]"><div><p className="text-xs font-semibold">{contacts[0].person_name}</p>{contacts[0].role && <p className="text-[11px] text-[#71717A]">{contacts[0].role}</p>}</div><button type="button" onClick={() => sendWhatsApp(contacts[0], supplier)} className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"><MessageCircle size={13}/>Contact supplier</button></div> : <p className="text-xs text-[#71717A]">Contact details are not listed yet.</p>}
  </article>;
}
export default function Materials() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"materials" | "suppliers">("materials");
  const [search, setSearch] = useState("");
  const loadSuppliers = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      if (!supabase) throw new Error("Supabase is not configured");
      const result = await supabase.from("suppliers").select("id,name,category,description,area,city,delivery_radius_km,supplier_contacts(id,person_name,role,whatsapp),supplier_products(id,name,unit,indicative_price,price_updated_at)").eq("is_verified", true).order("name");
      if (result.error) throw result.error;
      setSuppliers((result.data ?? []) as unknown as Supplier[]);
    } catch (error) { console.warn("[Materials] Unable to load suppliers:", error); setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadSuppliers(); }, [loadSuppliers]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (category !== "All" && supplier.category.toLowerCase() !== category.toLowerCase()) return false;
      const haystack = [supplier.name, supplier.category, supplier.description ?? "", supplier.area ?? "", supplier.city ?? "", ...(supplier.supplier_products ?? []).map((product) => product.name)].join(" ").toLowerCase();
      return !term || haystack.includes(term);
    });
  }, [suppliers, category, search]);
  const items = useMemo<Item[]>(() => filtered.flatMap((supplier) => (supplier.supplier_products ?? []).map((product) => ({ ...product, supplier }))), [filtered]);
  const clearFilters = () => { setSearch(""); setCategory("All"); };
  const empty = (title: string, detail: string) => <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 text-center dark:border-[#27272A] dark:bg-[#141416]"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-[#71717A] dark:text-[#A1A1AA]">{detail}</p>{(search || category !== "All") && <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold underline underline-offset-4">Clear filters</button>}</div>;

  return <div className="flex min-h-screen flex-col bg-[#FAFAFA] pb-24 font-sans text-[#09090B] dark:bg-[#09090B] dark:text-[#FAFAFA]">
    <header className="sticky top-0 z-40 w-full border-b border-[#E4E4E7] bg-white/90 backdrop-blur-xl dark:border-[#27272A] dark:bg-[#09090B]/90"><div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6"><Link to="/home" aria-label="Back to home" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800"><ArrowLeft size={16}/></Link><div className="min-w-0 flex-1"><h1 className="text-lg font-bold tracking-tight">Materials & Suppliers</h1><p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Find building materials and trusted local suppliers</p></div><button type="button" onClick={() => void loadSuppliers()} aria-label="Refresh catalogue" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/></button></div></header>
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 pt-5 sm:px-6">
      <section className="rounded-2xl border border-[#E4E4E7] bg-white p-4 dark:border-[#27272A] dark:bg-[#141416]"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5"><Package size={20}/></div><div><h2 className="font-semibold">Building supplies, in one place</h2><p className="mt-1 text-sm leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">Browse materials or suppliers separately, compare indicative prices, and contact suppliers directly. Confirm stock, final rates and delivery with the supplier.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-zinc-50 p-3 dark:bg-[#0D0D10]"><p className="text-xl font-bold">{suppliers.length}</p><p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Verified suppliers</p></div><div className="rounded-xl bg-zinc-50 p-3 dark:bg-[#0D0D10]"><p className="text-xl font-bold">{suppliers.reduce((sum, supplier) => sum + (supplier.supplier_products?.length ?? 0), 0)}</p><p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Listed materials</p></div></div></section>
      <label className="flex h-11 items-center gap-2.5 rounded-full border border-[#E4E4E7] bg-white px-4 dark:border-[#27272A] dark:bg-[#141416]"><Search size={16} className="shrink-0 text-[#71717A]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cement, steel, sand, supplier..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A]"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-[#71717A]"><X size={15}/></button>}</label>
      <div className="grid grid-cols-2 rounded-full border border-[#E4E4E7] bg-white p-1 dark:border-[#27272A] dark:bg-[#141416]" role="tablist" aria-label="Catalogue view"><button type="button" role="tab" aria-selected={view === "materials"} onClick={() => setView("materials")} className={"inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold " + (view === "materials" ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#71717A] dark:text-[#A1A1AA]")}><Package size={15}/>Materials</button><button type="button" role="tab" aria-selected={view === "suppliers"} onClick={() => setView("suppliers")} className={"inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold " + (view === "suppliers" ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#71717A] dark:text-[#A1A1AA]")}><Building2 size={15}/>Suppliers</button></div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">{CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={"shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold " + (category === item ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-200 bg-white text-[#52525B] dark:border-neutral-800 dark:bg-[#141416] dark:text-[#A1A1AA]")}>{item}</button>)}</div>
      {loading ? <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : failed ? <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 text-center dark:border-[#27272A] dark:bg-[#141416]"><p className="text-sm font-semibold">Catalogue couldn't be loaded</p><p className="mt-1 text-sm text-[#71717A]">Check the database setup or try again.</p><button type="button" onClick={() => void loadSuppliers()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"><RefreshCw size={13}/>Try again</button></div> : view === "materials" ? items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <MaterialCard key={item.id} item={item}/>)}</div> : empty(search || category !== "All" ? "No matching materials" : "No materials listed yet", search || category !== "All" ? "Try another search or category." : "Verified suppliers and their products appear here when listed.") : filtered.length ? <div className="grid gap-4 md:grid-cols-2">{filtered.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier}/>)}</div> : empty("No matching suppliers", "Try another search or category.")}
      <p className="px-1 text-[11px] text-[#71717A]">Prices are indicative, not guaranteed. Confirm current rates, stock, transport and delivery timing directly with the supplier.</p>
    </main><NavBar/>
  </div>;
}
