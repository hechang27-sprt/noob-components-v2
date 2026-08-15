import type { NDateLocale, NPartialLocale } from "naive-ui";

/**
 * naive-ui's full locale declaration for the override registry — the naive-ui
 * equivalent of a noob package's `AdminLocale`-style locale schema, composing
 * the component-chrome pack and the date pack.
 *
 * The pack half is declared in the **override form** (`NPartialLocale`, the
 * first parameter of naive-ui's own `createLocale`), mirroring the theme
 * preseed precedent (naive-ui declares `GlobalThemeOverrides`, the override
 * form, and the uniform conversion is a structural no-op). Declaring the full
 * `NLocale` instead would NOT be a structural no-op: the registry's
 * `DeepPartial` recurses into `object` leaves, and `NLocale` contains
 * function-typed leaves (`loadingRequiredMessage`, `total`, `selected`, …),
 * which `DeepPartial` would mangle — breaking assignability to
 * `createLocale`'s `NPartialLocale` parameter. `DeepPartial<NPartialLocale>`
 * is exactly `NPartialLocale` (the optional mapping's `| undefined` shields
 * function leaves from the recursion).
 *
 * The date half is the full `NDateLocale` pack: naive-ui ships no
 * `createDateLocale`/partial date helper, so consumers merge a partial over
 * the base pack themselves (`merge({}, base.dateLocale, override.dateLocale)`).
 */
export interface NaiveUiLocale {
  /** Component-chrome texts, in `createLocale`'s partial-over-base form. */
  locale: NPartialLocale;
  /** Date locale pack (full; no naive-ui partial helper exists). */
  dateLocale: NDateLocale;
}
