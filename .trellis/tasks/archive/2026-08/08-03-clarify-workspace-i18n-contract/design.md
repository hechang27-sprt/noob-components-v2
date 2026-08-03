# Design: workspace i18n contract and routed demonstration

## Documentation and tests

Keep the optional workspace-preset contract and focused prototype tests from the approved scope. The package tests own reload-independent contracts: defensive snapshotting, component/locale selection, partial override sibling preservation, and host fallback inheritance.

## Routed demonstration

Move `PrototypeCard` and its locale-state diagnostics out of the dashboard into a dedicated registry route:

- nav key: `internationalization`;
- relative route path: `demo/internationalization`;
- menu hierarchy: `Demo` parent -> `Internationalization` leaf;
- tab label: `Internationalization`, closable like other non-home pages.

The dashboard returns to generic home content. The new routed page remains host-owned demo composition and imports the prototype package through its public API. Existing global preference-to-Composer synchronization continues to drive the card locale.

Follow the established file boundary: place the routed composition component in `apps/demo/src/components/internationalization-demo-page.tsx`; keep only the route definition in `route-registry.tsx`, menu hierarchy in `main.ts`, and tab presentation in `admin-navigation.ts`.

## Verification

- Unit/component tests cover package contracts without reload-driven URL modes.
- Browser: authenticate, open Demo > Internationalization, verify a closable routed tab and locale switching.
- Browser HMR: edit/restore the flat component locale resource while that route is mounted and verify the page marker survives.
- Demo and prototype typechecks/builds pass.
