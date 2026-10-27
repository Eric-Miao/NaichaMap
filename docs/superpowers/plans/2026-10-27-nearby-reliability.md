# Nearby Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployed nearby search return useful beverage results when individual AMap category or mall requests fail, while preserving privacy and caching.

**Architecture:** Keep the existing AMap adapter and nearby orchestration seams. Make beverage aggregation tolerant of partial category failures, make mall discovery optional for the core store result, and expose only a safe stage/error code to server logs for production diagnosis.

**Tech Stack:** TypeScript, Next.js route handlers, Vitest, AMap Web Service, Supabase/PostGIS, Vercel

**Spec:** `docs/superpowers/specs/2026-10-27-live-reliability-ui-polish-design.md`

## Global Constraints

- Never log coordinates, request bodies, raw IPs, secrets, or upstream payloads.
- At least one successful beverage category is sufficient; all beverage categories failing is an error.
- Mall lookup failure must safely degrade to nearby grouping.
- Preserve the 30-day grid cache and existing API response contract.

## Review Focus

- One of seven beverage category calls times out while others succeed: successful stores are returned and deduplicated.
- All beverage category calls fail: caller receives a retryable provider error.
- Mall lookup fails while beverages succeed: stores return with no current mall.
- Supabase save fails after provider success: lease is marked failed and no sensitive diagnostics are emitted.
- Two simultaneous cold requests: only the lease owner refreshes and the waiter follows existing behavior.

---

### Task 1: Partial AMap beverage success

**Files:**
- Modify: `src/lib/amap/client.ts`
- Modify: `tests/unit/amap-client.test.ts`

**Interfaces:**
- Consumes: `AmapClient.searchPages(endpoint, params)` and existing `AmapProviderError` codes.
- Produces: unchanged `searchBeverages(centerGcj02, radius): Promise<NormalizedPoi[]>` with partial-success semantics.

- [ ] **Step 1: Write failing adapter tests**

Add tests named `keeps successful beverage categories when one category times out` and `fails when every beverage category fails`; assert deduplicated normalized results in the first and `AMAP_UPSTREAM`/`AMAP_TIMEOUT` in the second.

- [ ] **Step 2: Run the focused test and witness failure**

Run: `npm test -- tests/unit/amap-client.test.ts`

- [ ] **Step 3: Implement partial aggregation**

Use `Promise.allSettled` inside `searchBeverages`; flatten fulfilled batches, and throw a stable `AmapProviderError` only when no category request fulfilled. Do not add a dependency or change public types.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/amap-client.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/lib/amap/client.ts tests/unit/amap-client.test.ts
git commit -m "fix(amap): tolerate partial beverage search failures"
```

### Task 2: Mall lookup degradation and safe diagnostics

**Files:**
- Modify: `src/features/nearby/service.ts`
- Modify: `tests/unit/nearby-service.test.ts`
- Modify: `tests/unit/logging-privacy.test.ts`

**Interfaces:**
- Consumes: `provider.searchBeverages` and `provider.searchMalls`.
- Produces: unchanged `createNearbyService(deps)` response, plus a server-only diagnostic containing only `stage` and stable error `code`.

- [ ] **Step 1: Write failing orchestration and privacy tests**

Assert mall rejection still saves/returns beverage stores with an empty mall list; assert provider/database diagnostics contain no point, request body, IP, key, or raw upstream response.

- [ ] **Step 2: Run focused tests and witness failure**

Run: `npm test -- tests/unit/nearby-service.test.ts tests/unit/logging-privacy.test.ts`

- [ ] **Step 3: Implement safe degradation**

Await beverage search as required and mall search as optional. Preserve lease completion rules. Emit one safe diagnostic only on failed refresh, using a helper that maps known errors to stable codes.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/nearby-service.test.ts tests/unit/logging-privacy.test.ts && npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/features/nearby/service.ts tests/unit/nearby-service.test.ts tests/unit/logging-privacy.test.ts
git commit -m "fix(nearby): degrade safely when mall lookup fails"
```

### Task 3: Deploy and validate cold/warm queries

**Files:**
- Modify only if required by observed production evidence.

**Interfaces:**
- Consumes: deployed `/api/nearby` and Supabase cache.
- Produces: verified cold and warm response evidence for a public Shanghai landmark.

- [ ] **Step 1: Run the full release gate**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

- [ ] **Step 2: Push to `main` and wait for Vercel success**

Verify the remote SHA matches local HEAD and GitHub reports the Vercel check successful.

- [ ] **Step 3: Run cold and warm production probes**

POST the public Shanghai IFC coordinate twice. Expected: HTTP 200, at least one group/store, and no coordinate echo. If it still fails, use the safe diagnostic code to fix the demonstrated stage before UI work.

