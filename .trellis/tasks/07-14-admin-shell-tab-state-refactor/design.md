# Design: map-backed AdminShell tab state

## State and ownership

```ts
export type AdminShellTabInput = {
  key: string;
  label: string;
  closable?: boolean;
};

export type AdminShellTab = AdminShellTabInput & {
  index: number;
  activationPendingVersion?: number;
  closePendingVersion?: number;
};

const tabs = reactive(new Map<string, AdminShellTab>());
const visibleTabs = ref<string[]>([]);
```

`AdminShellTabInput` is the starter-owned descriptor carried by `tabController.current`. `AdminShellTab` is shell-local state; its `index` and pending ownership fields are never host input. The public barrel exports both types because the controller must name the input and the existing public tab type now represents shell state.

`visibleTabs` is the only ordering source. Rendering resolves each key through `tabs`; suggested-next selection uses a key’s position in `visibleTabs`. Map iteration order is never used for user-visible order.

## State transitions

- **Record host current:** if absent, create a local tab from host descriptor plus current array-end index and empty pending fields. If present, update only `key`, `label`, and `closable`; preserve shell fields. Reindex after insertion.
- **Activate:** capture `sessionVersion` and record it in the tab’s activation-pending field. Suppress a duplicate only when the same current tab owns activation. On settle, clear only if the map still contains the same tab with the captured activation owner and the same session. Rejections show the existing generic error under those same guards.
- **Close:** compute the suggested-next key from `visibleTabs`; record the captured session in the tab’s close-pending field. On successful guarded resolution, delete the tab, remove its key from `visibleTabs`, and reindex every retained tab. Rejection retains the tab and reports the existing generic error. Finally clears only its own still-current request.
- **Session boundary:** auth/controller changes increment `sessionVersion`, clear the map and ordering list, and remove feedback. Old promise settlements cannot affect the new state.

## Compatibility

This is a clean public contract cutover: `AdminShellTabController.current` changes from `AdminShellTab | null` to `AdminShellTabInput | null`. There are no known starter consumers. No compatibility alias is retained because a host descriptor must not falsely promise shell-derived fields.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Map insertion order leaks into UI order | Render and navigate exclusively from `visibleTabs`; test reindex after close. |
| A host refresh overwrites local async state | Merge only the three host-owned descriptor fields. |
| Old async completion clears a newer request | Compare session and exact per-tab pending version before mutation/clear. |
| Missing keys remain in the order list | Delete key and reindex in one local helper; tests assert visible DOM order. |

## Non-goals

This refactor deliberately does not change the existing controller reactivity contract or the separate ARIA-tab review finding.
