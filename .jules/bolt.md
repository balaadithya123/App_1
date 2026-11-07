## 2025-05-18 - Avoid array allocation per filter iteration in search functions
**Learning:** Constructing dynamic arrays (`[worker.name, worker.category, ...worker.services].map(...)`) inside filter loops generates significant garbage collector overhead and memory churn on frequent search inputs.
**Action:** Replace dynamic array allocations and `.some()` calls in tight filter loops with direct short-circuiting checks or indexed loop traversals.

## 2025-05-19 - Partition domain lists in a single linear pass to eliminate redundant array/Date allocations
**Learning:** Chaining `.map()`, multiple `.filter()`, and `.length` lookups on lists (e.g. `getDueAndUpcomingHomeItems`) creates 4–5 temporary array allocations and repeatedly instantiates Date objects per item.
**Action:** Use a single O(N) loop to compute status, partition items into target lists, and track count metrics inline while normalizing reference dates once outside the loop.
