# Unified Nearby Mall Grouping Design

## Intent

NaichaMap should behave the same whether the user is inside or outside a mall: search nearby beverage stores and nearby malls, associate stores with malls using reliable evidence, and show unmatched stores under “周边街铺”. Being inside a mall is only an ordering hint, never a separate product mode.

## Goals

- Refresh nearby stores and malls for every new cache generation.
- Reconsider all nearby persisted malls when associating refreshed stores.
- Associate a store when its point is inside a mall boundary, when its AMap parent matches a nearby mall, or when its name/address names a nearby mall; all non-boundary matches require a reasonable distance.
- Show a location filter for mall groups and “周边街铺”, independent from the existing drink-category filter.
- Keep only malls containing at least one matched beverage store in the filter.
- Use one “附近好喝的” experience regardless of `currentMall`; `currentMall` may still sort the likely current mall first.

## Non-goals

- Do not display empty nearby malls.
- Do not infer mall membership from distance alone.
- Do not add navigation, floor data, login, or a new dependency.
- Do not change the database schema in this iteration.

## Approaches

1. **Selected: refresh-time reassignment plus two orthogonal filters.** Reuse current AMap results and persisted mall candidates, trigger a one-time cache generation bump, and add location filtering beside category filtering. This fixes the observed behavior with the smallest complete change.
2. Add a separate mall discovery API and client-side association. Rejected because it duplicates server logic and exposes inconsistent grouping during cache refreshes.
3. Add a permanent association-evidence table and background reconciliation job. Deferred because it adds operational complexity not required for the first version.

## Association rules

Priority order:

1. Store coordinate inside `boundary_wgs84`.
2. AMap store parent ID equals the mall POI ID and the store is within 500 metres of the mall centre.
3. Normalized store name, branch name, or address contains the normalized mall name and the store is within 500 metres.
4. Otherwise the store remains “周边街铺”.

Distance alone must never assign a store to a mall.

## UI behavior

The drawer exposes two independent rows:

- Location: `全部地点`, each non-empty mall group, `周边街铺` when present.
- Category: `全部`, `茶饮`, `咖啡`.

Both filters apply to the map and list. Starting a new location search resets the location filter to `全部地点`. The page title remains the searched place label when one exists; otherwise it is `附近好喝的`.

## Constraints and risks

- AMap parent IDs can be incomplete; the 500-metre cap prevents obviously remote assignments.
- Name evidence can still miss stores whose POI data does not mention the mall; those safely remain street stores.
- The search-cell ID receives a version prefix so existing 30-day cache entries refresh once without a destructive database migration.
