# UI Detail Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing mobile map experience into a precise, aligned Shanghai city-guide interface without changing its product behavior.

**Architecture:** Centralize the incumbent visual values into a small semantic token set, then apply one shared 16px content rail and role-based component dimensions across all states. Keep the existing React components and map/drawer structure; make the smallest markup changes needed for true optical centering and stable responsive geometry.

**Tech Stack:** React 19, CSS Modules, Next.js, Lucide icons, MapLibre, Playwright, Testing Library, Impeccable

**Spec:** `docs/superpowers/specs/2026-10-27-live-reliability-ui-polish-design.md`

## Global Constraints

- Alignment, spacing, typography, and state consistency take priority over color changes.
- Preserve all existing copy, behavior, accessibility labels, and 44px minimum touch targets.
- Use a 16px mobile content rail and 48px primary form controls.
- No new runtime dependency, illustration, marketing claim, or decorative animation.
- Respect safe areas and `prefers-reduced-motion`.

## Review Focus

- Icon-bearing buttons: visible text remains optically centered within the whole control.
- Long Chinese/Latin mixed store names: truncate without moving the copy action.
- 360px and keyboard-open layouts: no horizontal overflow or inaccessible action.
- Empty/error/stale/correction states: same content rail and control roles as the primary flow.
- Drawer collapsed/expanded transition: markers remain clickable above the collapsed sheet and focus remains visible.

---

### Task 1: Shared visual tokens and centered entry controls

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/experience.module.css`
- Modify: `src/components/location/location-prompt.tsx`
- Modify: `src/components/location/place-search.tsx`
- Modify: `tests/components/home-page.test.tsx`

**Interfaces:**
- Consumes: existing location/search callbacks and labels.
- Produces: shared semantic CSS tokens and a three-slot action layout whose label center is independent of the leading icon.

- [ ] **Step 1: Add failing component/geometry assertions**

Assert buttons retain accessible names and icon slots are decorative; add a mobile browser geometry assertion that the label center differs from the button center by at most 1px and that search input/button heights are both 48px.

- [ ] **Step 2: Run tests and witness failure**

Run: `npm test -- tests/components/home-page.test.tsx && npm run test:e2e -- tests/e2e/home.spec.ts`

- [ ] **Step 3: Implement tokens and control geometry**

Define the spec's surface, text, border, category, focus, radius and spacing tokens in `:root`. Replace repeated literals in entry surfaces. Use a three-column grid (`20px 1fr 20px`) for icon-bearing full-width buttons.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/components/home-page.test.tsx && npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/experience.module.css src/components/location tests/components/home-page.test.tsx tests/e2e/home.spec.ts
git commit -m "style(entry): align location and search controls"
```

### Task 2: Map, markers and drawer rhythm

**Files:**
- Modify: `src/components/map/map-ui.module.css`
- Modify: `src/components/map/map-markers.tsx`
- Modify: `src/components/stores/category-tabs.tsx`
- Modify: `src/components/stores/store-card.tsx`
- Modify: `tests/components/store-drawer.test.tsx`
- Modify: `tests/components/store-map.test.tsx`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: current `StoreGroup`, `MapFilter`, selection and drawer callbacks.
- Produces: unchanged component props with consistent category colors, rails, typography and selected/focus states.

- [ ] **Step 1: Add failing semantics and responsive geometry tests**

Assert tea, beverage and coffee markers expose stable category data/classes; assert topbar, drawer heading, tabs and list share the same 16px left rail; assert 360px and 412px widths have no overflow.

- [ ] **Step 2: Run focused tests and witness failure**

Run: `npm test -- tests/components/store-drawer.test.tsx tests/components/store-map.test.tsx && npm run test:e2e -- tests/e2e/home.spec.ts`

- [ ] **Step 3: Implement the city-guide marker and drawer system**

Use one semantic category color per store type across markers and brand tiles. Align all drawer sections to the shared rail, normalize same-role type sizes, retain truncation, and keep only transform/opacity motion.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/components/store-drawer.test.tsx tests/components/store-map.test.tsx && npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/components/map src/components/stores tests/components tests/e2e/home.spec.ts
git commit -m "style(map): unify markers and drawer rhythm"
```

### Task 3: Status, correction and responsive finish

**Files:**
- Modify: `src/components/feedback/page-status.tsx`
- Modify: `src/components/corrections/correction-dialog.tsx`
- Modify: `src/components/experience.module.css`
- Modify: `tests/components/home-page.test.tsx`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: existing loading/error/empty/stale and correction state contracts.
- Produces: the same behaviors with consistent surfaces, control roles and responsive dialog placement.

- [ ] **Step 1: Add failing state and responsive assertions**

Cover long messages, disabled/loading correction submission, 360px overflow, visible focus, and desktop dialog centering without changing accessible names.

- [ ] **Step 2: Run focused tests and witness failure**

Run: `npm test -- tests/components/home-page.test.tsx && npm run test:e2e -- tests/e2e/home.spec.ts`

- [ ] **Step 3: Implement final state consistency**

Apply shared rails/tokens to status cards, stale banner, feedback action and dialog. Add only the responsive rules required by the spec; do not add new states or copy.

- [ ] **Step 4: Run Impeccable and visual QA once**

Run the manual detector once over all changed UI targets, inspect mobile and desktop together, fix findings in one batch, and perform at most one confirmation pass.

- [ ] **Step 5: Run the full release gate and commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && git diff --check`

```bash
git add src tests
git commit -m "style(ui): finish responsive state consistency"
```

### Task 4: Deploy and inspect production

**Files:**
- No planned source changes.

**Interfaces:**
- Consumes: verified UI commits and GitHub/Vercel integration.
- Produces: production deployment evidence at the public site.

- [ ] **Step 1: Push `main` and verify Vercel success**

Confirm the remote SHA matches local HEAD and the Vercel check completes successfully.

- [ ] **Step 2: Inspect production at representative sizes**

Walk location permission, place search, map/list filtering, copy feedback, empty/error and correction flows at phone and desktop sizes; verify no console errors or horizontal overflow.
