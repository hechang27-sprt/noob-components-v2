# Component and export boundary map

Source inspected: `../noob-components`

Purpose: classify the old public surface into four migration buckets:

- **Use Naive UI directly**
- **Keep/rebuild in `@noob-naive-ui/ui`**
- **Move to `@noob-naive-ui/admin`**
- **Delete / internal-only unless proven valuable**

This map assumes the chosen architecture:

- admin-first platform
- Naive UI is directly co-consumed by internal teams
- `@noob-naive-ui/ui` exports value-add composites, hooks, token/theme bridge helpers, and specialized widgets
- no Naive wrapper parity and no broad Naive re-exports

Primary old export surfaces:

- `packages/base/index.ts` (`../noob-components/packages/base/index.ts:1-48`)
- `packages/manage/index.ts` (`../noob-components/packages/manage/index.ts:1-6`)

## Boundary rule

For each old export, ask:

1. **Does Naive UI already fully satisfy this need?**
   - If yes: use Naive UI directly.
2. **Does this export encode durable workflow, domain, or data-heavy behavior?**
   - If yes: keep/rebuild it in `@noob-naive-ui/ui` or `@noob-naive-ui/admin`.
3. **Is it just convenience wrapping with little semantic value?**
   - If yes: delete it instead of porting it.

## `packages/base` export map

| Old export          | Future home                                                   | Recommendation                                            | Rationale                                                                          | Migration note                                                                                                       |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NoobButton`        | Naive direct                                                  | Do not port as public export                              | Commodity control; wrapper parity would create duplicate button surfaces           | Use `NButton` directly unless product-specific behavior emerges                                                      |
| `NoobSelect`        | Naive direct                                                  | Do not port as public export                              | Commodity select control; low-value wrapper                                        | Use Naive select directly                                                                                            |
| `NoobInput`         | Naive direct                                                  | Do not port as public export                              | Commodity input control; avoid duplicate API layer                                 | Use Naive input directly                                                                                             |
| `NoobDate`          | Naive direct                                                  | Do not port as public export                              | Commodity date input if Naive satisfies the need                                   | Re-evaluate only if timezone/business semantics are needed                                                           |
| `NoobTag`           | Naive direct                                                  | Do not port as public export                              | Commodity display primitive                                                        | Use Naive tag/badge equivalents directly                                                                             |
| `LightBox`          | `@noob-naive-ui/ui` only if still valuable                    | Re-evaluate                                               | Could be a real reusable media/display helper, but not obviously core              | Keep only if repeatedly needed in internal apps                                                                      |
| `ButtonWithTooltip` | Delete or local composition                                   | Do not port by default                                    | Easy local composition from Naive primitives; not durable product value            | Compose `NButton` + tooltip at callsite if needed                                                                    |
| `ConfirmCancel`     | Delete or local composition                                   | Do not port by default                                    | Extremely thin action-row composition                                              | Replace with local Naive layout/button composition                                                                   |
| `TzDatePicker`      | `@noob-naive-ui/ui` if timezone semantics matter              | Keep only if semantics are real                           | Timezone-aware behavior may be product value                                       | Rebuild only if it encodes durable timezone rules                                                                    |
| `TzDateTime`        | `@noob-naive-ui/ui` if timezone semantics matter              | Keep only if semantics are real                           | Same as above                                                                      | Treat as domain/date formatting helper, not generic date wrapper                                                     |
| `WsMonitorToggle`   | `@noob-naive-ui/ui` or `@noob-naive-ui/admin` depending scope | Re-evaluate                                               | Might encode operational behavior beyond a toggle control                          | Keep only if multiple internal apps need the same workflow                                                           |
| `SearchRow`         | `@noob-naive-ui/ui`                                           | Rebuild as value-add composite                            | Strong admin workflow primitive; repeatedly used in manage views                   | Build on top of Naive form/layout primitives                                                                         |
| `ListTable`         | `@noob-naive-ui/ui`                                           | Rebuild as value-add composite                            | Strong admin data-table workflow surface                                           | Likely thinner than old version; should coexist with direct Naive table usage when appropriate                       |
| `ListTableV2`       | `@noob-naive-ui/ui`                                           | Preserve and rebuild                                      | One of the strongest differentiated components in the repo                         | Keep measurement pipeline; migrate rendering/foundation                                                              |
| `NoData`            | Internal to `@noob-naive-ui/ui` or delete                     | Usually not a public export                               | Low-value public surface; often better as internal empty-state primitive           | Export only if it becomes a coherent empty-state component                                                           |
| `JsonView`          | `@noob-naive-ui/ui`                                           | Preserve and rebuild                                      | Specialized data-heavy component with real value                                   | Keep flattening/measurement seams; remove EP-specific menu coupling                                                  |
| `Infomation`        | Delete or redesign                                            | Re-evaluate                                               | Name/API unclear; likely weak generic value                                        | Keep only if repeated internal usage proves it useful                                                                |
| `ModifyForm`        | `@noob-naive-ui/ui`                                           | Rebuild carefully                                         | Valuable if it encodes repeated admin form workflow, not just old EP form wrapping | Keep generic form plumbing in `@noob-naive-ui/ui`; backend/business-specific admin forms belong in starters/app code |
| `Descriptions`      | Naive direct or delete                                        | Do not port by default                                    | Commodity descriptive layout if Naive already covers it                            | Only keep if internal teams need a strongly opinionated version                                                      |
| `TableAction`       | `@noob-naive-ui/ui`                                           | Rebuild as small admin composite                          | Repeated action-column pattern in admin pages                                      | Keep narrow: action-row conventions, not button wrappers                                                             |
| `ListTableDialog`   | `@noob-naive-ui/ui`                                           | Preserve as composite only if it remains backend-agnostic | Encodes selection/query/confirm workflow beyond a raw dialog                       | Rebuild only if it can stay generic; backend-specific operation flows belong in starters/app code                    |

## `packages/manage` export map

| Old export   | Future home                                  | Recommendation                             | Rationale                                                                                       | Migration note                                                                                                               |
| ------------ | -------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Index`      | `@noob-naive-ui/admin`                       | Preserve                                   | Main admin shell runtime entry, not generic UI                                                  | Rebuild around Pinia shell state, frontend runtime contracts, and Naive provider                                             |
| `ZhuBeiDong` | `@noob-naive-ui/admin` or delete             | Re-evaluate                                | Alternate shell/theme variant; likely too specific to keep by default                           | Keep only if still needed as a named shell/runtime variant                                                                   |
| `Common`     | `@noob-naive-ui/admin`                       | Preserve selectively                       | Login/common entry flows belong in the admin runtime                                            | Split broadly useful auth pages from legacy variants; keep backend operations out                                            |
| `NoobHead`   | `@noob-naive-ui/admin`                       | Preserve as admin shell piece              | Header/menu/shell chrome is app-shell runtime, not generic UI                                   | Do not move to `@noob-naive-ui/ui` unless a subpiece becomes truly reusable                                                  |
| `Views`      | starter/app code or frontend runtime surface | Do not preserve as a packaged page catalog | Exported route/page catalogs are too backend-shaped and app-shaped for the new runtime boundary | Replace with frontend-ready route visibility inputs plus starter-owned route modules instead of a packaged `Views` namespace |

## Practical migration order for this map

### 1. Start with the current export list, but do not promise parity

Use the old `packages/base/index.ts` list as the audit checklist, not as the required future API surface.

### 2. Port high-value composites first

Best candidates:

- `SearchRow`
- `ListTable`
- `ListTableV2`
- `JsonView`
- `ModifyForm`
- `TableAction`
- `ListTableDialog`

### 3. Delete low-value wrapper surface aggressively

Best first-drop candidates:

- `NoobButton`
- `NoobSelect`
- `NoobInput`
- `NoobDate`
- `NoobTag`
- `ButtonWithTooltip`
- `ConfirmCancel`
- likely `Descriptions`

### 4. Keep “maybe” items behind proof

Only keep these if internal usage proves they encode repeated product value:

- `LightBox`
- `TzDatePicker`
- `TzDateTime`
- `WsMonitorToggle`
- `Infomation`

## Recommended documentation rule for consumers

Document the boundary explicitly:

- **Use Naive UI directly** for commodity controls and layout primitives.
- **Use `@noob-naive-ui/ui`** for value-add composites, hooks, token/theme bridge helpers, and specialized widgets.
- **Use `@noob-naive-ui/admin`** for shell runtime, login/auth UI, direct starter-built menu composition, open tabs, and shell-level state — not for menu visibility derivation, router ownership, or packaged business/admin operation pages.

If that boundary is not written down, teams will recreate ambiguity around whether to use a direct Naive component or a library wrapper.
