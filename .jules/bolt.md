## 2025-05-18 - Avoid array allocation per filter iteration in search functions
**Learning:** Constructing dynamic arrays (`[worker.name, worker.category, ...worker.services].map(...)`) inside filter loops generates significant garbage collector overhead and memory churn on frequent search inputs.
**Action:** Replace dynamic array allocations and `.some()` calls in tight filter loops with direct short-circuiting checks or indexed loop traversals.

## 2025-05-19 - Short-circuit cheap boolean filter properties before string operations
**Learning:** Evaluating expensive string operations (`toLowerCase()`, `includes()`, regex stemming, or location matching) before cheap boolean/numeric filters (`onlyAvailableToday`, `onlyVerified`) wastes CPU cycles on items that will ultimately be discarded.
**Action:** Reorder filter predicates in collection searches to evaluate cheap boolean and numeric properties first, enabling immediate short-circuiting.
