# Unified Nearby Mall Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always group nearby beverage stores into nearby malls when evidence supports it, and let users filter the unified result by location and drink category.

**Architecture:** The nearby service refreshes against all persisted mall candidates and uses a small evidence hierarchy for assignment. The map reducer owns an independent location-group filter so the drawer and markers share one visible-group selector.

**Tech Stack:** Next.js 16, TypeScript, React, Vitest, Testing Library, Playwright, Supabase/PostGIS, AMap Web Service.

**Spec:** `docs/superpowers/specs/2026-10-29-unified-nearby-mall-grouping-design.md`

## Global Constraints

- No new dependency or database schema change.
- Distance alone never assigns a store to a mall.
- Only non-empty mall groups appear in the location filter.
- Location and category filters both affect map markers and list rows.
- Preserve the 30-day cache policy after a one-time cache-generation refresh.

## Review Focus

- Parent-ID evidence without a mall name in the store address must still group within 500 metres.
- Same-name evidence beyond 500 metres must not group.
- A newly fetched store must be checked against previously persisted nearby malls, not only malls returned by the current provider request.
- Changing location must reset a stale location-group filter.
- Combining location and category filters must preserve only non-empty groups on both map and list.

---

### Task 1: Unified server-side mall association

**Files:**
- Modify: `src/features/nearby/mall-confidence.ts`
- Modify: `src/features/nearby/service.ts`
- Modify: `src/lib/geo/grid.ts`
- Test: `tests/unit/mall-confidence.test.ts`
- Test: `tests/unit/nearby-service.test.ts`
- Test: `tests/unit/grid.test.ts`

**Interfaces:**
- Consumes: existing `MallCandidate`, `StoreMallEvidence`, `NearbyRepository.listMallCandidates()`.
- Produces: `resolveMallForStore()` with boundary, parent, and name evidence; refreshed stores assigned against all persisted candidates; `v2:` search-cell IDs.

- [ ] Write failing tests for parent-only evidence within 500m, name-only evidence within 500m, rejection beyond 500m, all-candidate refresh assignment, and the `v2:` cell ID.
- [ ] Run the focused unit tests and verify failures reflect the old strict association and old cache generation.
- [ ] Implement the minimal association and refresh changes.
- [ ] Run focused unit tests, then the full Vitest suite.
- [ ] Commit as `fix(nearby): unify mall association`.

### Task 2: Independent location and category filtering

**Files:**
- Modify: `src/features/map/reducer.ts`
- Modify: `src/features/map/selectors.ts`
- Modify: `src/components/map/map-shell.tsx`
- Modify: `src/components/stores/store-drawer.tsx`
- Create: `src/components/stores/location-tabs.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/unit/map-reducer.test.ts`
- Test: `tests/unit/map-selectors.test.ts`
- Test: `tests/components/store-drawer.test.tsx`
- Test: `tests/components/home-page.test.tsx`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: Task 1's unified `StoreGroup[]` response.
- Produces: `groupFilter: "all" | string`, `SET_GROUP_FILTER`, and `filterStoreGroups(groups, category, groupFilter)` shared by drawer and map.

- [ ] Write failing unit/component tests for combined filters, reset on new data, location tabs, and unified title behavior.
- [ ] Run focused tests and verify they fail because the location filter is absent.
- [ ] Implement reducer, selector, location tabs, shared drawer/map filtering, and the unified title.
- [ ] Add an E2E flow selecting a mall and category, verify map/list consistency and no 360px overflow; watch it fail before implementation if not covered by the component RED.
- [ ] Run focused tests, full Vitest, lint, typecheck, and all Playwright tests.
- [ ] Commit as `feat(map): filter nearby stores by mall`.

### Task 3: Final verification and deployment

**Files:**
- Review all files changed since the plan base.

**Interfaces:**
- Consumes: Tasks 1–2 completed behavior.
- Produces: reviewed, pushed, production-smoke-tested deployment.

- [ ] Run a fresh whole-branch review against this spec and its Review Focus.
- [ ] Fix any Critical/Important findings in one RED→GREEN pass and rerun the full suite.
- [ ] Push `main`, confirm Vercel succeeds, and smoke-test one Shanghai coordinate for grouped mall/street response.
