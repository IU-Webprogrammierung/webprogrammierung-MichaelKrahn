# CSS Cleanup Tasks - COMPLETED

## Phase 1: Add Global Variables to style.css ✓
- [x] Added standardized glass/blur variables
- [x] Added common border-radius values
- [x] Added common transition timing values

## Phase 2: Fix Duplicates and Issues ✓

### css/hero.css ✓
- [x] Removed duplicate .cursor animation (consolidated to style.css)

### css/projects.css ✓
- [x] Removed duplicate .cursor animation (now uses shared rule from style.css)

### css/globe.css ✓
- [x] Removed duplicate .hero-title rule

### css/footer.css ✓
- [x] Removed duplicate @media (prefers-reduced-motion: reduce)

### css/navbar.css ✓
- [x] Removed empty .nav-indicator commented block

## Notes:
- shop.css has its own :root with dark theme - this is intentional for the shop page
- Global CSS variables now available in style.css for reuse across all components
