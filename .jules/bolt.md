## 2025-05-18 - Avoid array allocation per filter iteration in search functions
**Learning:** Constructing dynamic arrays (`[worker.name, worker.category, ...worker.services].map(...)`) inside filter loops generates significant garbage collector overhead and memory churn on frequent search inputs.
**Action:** Replace dynamic array allocations and `.some()` calls in tight filter loops with direct short-circuiting checks or indexed loop traversals.
