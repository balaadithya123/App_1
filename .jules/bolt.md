## 2025-05-18 - Avoid array allocation per filter iteration in search functions
**Learning:** Constructing dynamic arrays (`[worker.name, worker.category, ...worker.services].map(...)`) inside filter loops generates significant garbage collector overhead and memory churn on frequent search inputs.
**Action:** Replace dynamic array allocations and `.some()` calls in tight filter loops with direct short-circuiting checks or indexed loop traversals.

## 2025-05-19 - Cache parsed localStorage objects and Map groupings for worker card lookups
**Learning:** Calling `localStorage.getItem` + `JSON.parse` + `.filter()` inside list component render loops (such as worker rating badges) causes repeated JSON parsing and O(K * N) iteration on every render frame.
**Action:** Cache parsed localStorage structures and Map groupings keyed by raw string equality, converting O(K * N) per-frame lookups to O(1) Map lookups.
