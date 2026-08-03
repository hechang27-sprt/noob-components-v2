# Implementation Plan

1. Retain and validate focused prototype package unit/component tests for snapshot, selection, override precedence, and host fallback behavior.
2. Reconcile the durable i18n spec with the optional monorepo preset and package-owned production precompilation.
3. Extract the locale demonstration into `components/internationalization-demo-page.tsx`.
4. Add the `internationalization` registry destination at `demo/internationalization`, remove locale demonstration content from Dashboard, add its tab presentation, and expose it under Demo > Internationalization in the menu.
5. Run prototype tests/typecheck/build and demo typecheck/build.
6. Browser-verify authentication, menu navigation, routed tab presentation, locale switching, console cleanliness, and flat-resource HMR without document reload.
