# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Modal Dialog Accessibility & Escape Key Interactions
**Learning:** Custom overlay modals in this app (like `PostNeedModal`) lacked standard accessible dialog attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`), `Escape` key handlers, backdrop click dismissals, and background scroll locking (`document.body.style.overflow = "hidden"`), creating screen reader and mobile scrolling issues.
**Action:** Ensure custom modal and sheet overlays always implement `role="dialog"`, `aria-modal="true"`, `Escape` key listeners, backdrop dismissal, and body scroll lock for consistent accessible dialog behavior.
