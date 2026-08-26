import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// App_1 production Supabase is the single source of truth. The explicit public
// fallback prevents a misconfigured Vercel environment from silently switching
// the directory to the in-memory mock database or another Supabase project.
const APP1_SUPABASE_URL = "https://mjwuksdnbewdayhssacc.supabase.co";
const APP1_SUPABASE_PUBLISHABLE_KEY = "sb_publishable__ULoko5SRRH7WMIsO9ydkw_ZV18Nu3w";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || APP1_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  APP1_SUPABASE_PUBLISHABLE_KEY;

// In-memory fallback database for AI Studio container preview when credentials are not configured
const memoryStore = new Map<string, any[]>();

class MockQueryBuilder {
  private table: string;
  private filters: Array<(row: any) => boolean> = [];
  private updateData?: any;
  private insertData?: any[];
  private isUpsert = false;
  private isDelete = false;
  private selectCols = "*";
  private isHeadOnly = false;
  private sortCol?: string;
  private sortAsc = true;
  private limitCount?: number;

  constructor(table: string) {
    this.table = table;
    if (!memoryStore.has(table)) memoryStore.set(table, []);
  }
  select(cols?: string, options?: { count?: string; head?: boolean }) { if (cols) this.selectCols = cols; if (options?.head) this.isHeadOnly = true; return this; }
  insert(data: any | any[]) { this.insertData = Array.isArray(data) ? data : [data]; return this; }
  update(data: any) { this.updateData = data; return this; }
  upsert(data: any | any[]) { this.insertData = Array.isArray(data) ? data : [data]; this.isUpsert = true; return this; }
  delete() { this.isDelete = true; return this; }
  eq(field: string, value: any) { this.filters.push((r) => r[field] === value); return this; }
  in(field: string, values: any[]) { const set = new Set(values); this.filters.push((r) => set.has(r[field])); return this; }
  gte(field: string, value: any) { this.filters.push((r) => r[field] >= value); return this; }
  is(field: string, value: any) { this.filters.push((r) => r[field] === value); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sortCol = field; this.sortAsc = options?.ascending !== false; return this; }
  limit(count: number) { this.limitCount = count; return this; }

  private execute() {
    let rows = memoryStore.get(this.table) || [];
    if (this.insertData) {
      const createdRows = this.insertData.map((item) => ({ id: item.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString(), ...item }));
      if (this.isUpsert) for (const row of createdRows) { const idx = rows.findIndex((r) => r.id === row.id); if (idx >= 0) rows[idx] = { ...rows[idx], ...row }; else rows.push(row); }
      else rows.push(...createdRows);
      memoryStore.set(this.table, rows);
      return { data: createdRows.length === 1 ? createdRows[0] : createdRows, error: null, count: createdRows.length };
    }
    if (this.updateData) {
      const updated: any[] = [];
      rows = rows.map((r) => { if (this.filters.every((f) => f(r))) { const next = { ...r, ...this.updateData }; updated.push(next); return next; } return r; });
      memoryStore.set(this.table, rows);
      return { data: updated.length === 1 ? updated[0] : updated, error: null, count: updated.length };
    }
    if (this.isDelete) { const remaining = rows.filter((r) => !this.filters.every((f) => f(r))); memoryStore.set(this.table, remaining); return { data: [], error: null, count: rows.length - remaining.length }; }
    let results = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.sortCol) { const col = this.sortCol; const asc = this.sortAsc; results.sort((a, b) => { if (a[col] < b[col]) return asc ? -1 : 1; if (a[col] > b[col]) return asc ? 1 : -1; return 0; }); }
    if (this.limitCount !== undefined) results = results.slice(0, this.limitCount);
    if (this.isHeadOnly) return { data: null, error: null, count: results.length };
    return { data: results, error: null, count: results.length };
  }
  async single() { const res = this.execute(); const item = Array.isArray(res.data) ? res.data[0] : res.data; if (!item) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } }; return { data: item, error: null }; }
  async maybeSingle() { const res = this.execute(); const item = Array.isArray(res.data) ? res.data[0] : res.data; return { data: item ?? null, error: null }; }
  then(resolve: (value: any) => any, reject?: (reason: any) => any) { try { const res = this.execute(); return Promise.resolve(res).then(resolve, reject); } catch (err) { return Promise.reject(err).then(resolve, reject); } }
}

const createMockSupabase = () => {
  console.warn("[AI Studio] Supabase credentials not set — using in-memory mock database");
  return {
    from(table: string) { return new MockQueryBuilder(table); },
    auth: { async getUser(token: string) { if (!token) return { data: { user: null }, error: { message: "Invalid session or token" } }; return { data: { user: { id: "00000000-0000-0000-0000-000000000001", email: "worker@example.com", phone: "9876543210", user_metadata: { role: "worker", name: "Demo Worker", phone: "9876543210" } } }, error: null }; } },
    async rpc(_name: string, _args?: any) { return { data: null, error: null }; },
  } as unknown as SupabaseClient;
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
