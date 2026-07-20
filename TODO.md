## Review — dad036e

Verdict: request changes.

### P1 — Host tab updates can remain permanently stale

packages/admin/src/components/admin-shell.tsx:282-286

AdminShellTabController.current is typed as a plain AdminShellTab | null. A valid host can retain the
same controller object and later assign controller.current = nextTab. Vue does not track writes to a
nested non-reactive object, so the shell may retain the old active tab and membership after
navigation.

Fix: make current a reactive source (Ref/computed) or explicitly require the host to replace the
controller object when current changes. Document the chosen contract and add a post-mount update
test.

### P2 — Optional tab fields cannot be cleared

packages/admin/src/components/admin-shell.tsx:121-124

The tab update merges new descriptors into the previous entry. If an earlier descriptor has closable:
false and the next descriptor omits closable, the prior false survives, so the tab remains
non-closable despite the default being closable.

Fix: replace the stored descriptor with the host descriptor rather than merging it. Add a closable:
false → omitted regression case.

### P2 — ARIA tab semantics are incomplete

packages/admin/src/components/admin-shell.tsx:413-420

The component declares tablist / tab roles but does not implement the keyboard and focus behavior
those roles promise: roving tabindex, Arrow/Home/End navigation, tabpanel association, or focus
handling after close.

Fix: implement the APG tabs model with keyboard/focus tests, or remove these roles and use
semantically simpler controls.

### Review evidence

- Shell/component reviewer: request changes; findings above.
- Public API/docs reviewer: no actionable issue in assigned files.
- Dependency/build reviewer: no issue in package.json, vite.config.ts, or pnpm-workspace.yaml;
  pro-naive-ui peer/dev dependency and externalization are consistent.
- pnpm-lock.yaml was excluded as requested.
- Reviewers used jj diff/jj show equivalents because this is a JJ-managed repository.

## Code Style Fix

Unify all component declarations to this style:

```ts
const DetailDemoPage = defineComponent(
  /**
   * Creates detail content from descriptor params forwarded as component props.
   *
   * @param props - Contains the report identity retained in the active tab descriptor.
   * @returns A render function for the non-menu detail page.
   */
  (props: { reportId: string }) => () => (
    <main class="p-6">
      <h1 class="m-0 text-2xl font-semibold">
        Report detail: {props.reportId}
      </h1>
      <p class="mt-3 max-w-2xl text-base leading-6">
        Report {props.reportId} was opened by a page-owned action and has no
        sidebar menu item.
      </p>
    </main>
  ),
  {
    name: "DetailDemoPage",
    props: ["reportId"],
  },
);
```

Note:

- Use TSX
- Use Vue 3.3+ `(props) => jsxReturningFunction`-style component declaration instead of `setup()` based declaration
- Save this to trellis specs so that all future code use this code style.
- For sake of easy debugging, name every component via `{ name: "MyComponent" }`
