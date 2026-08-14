/**
 * Theme-vars pair for one component library, mirroring the i18n descriptor
 * trio in `library-i18n-descriptor.ts`. Component libraries (e.g. the ui
 * package) declare per-component themeVars with exact `--n-*` names preserved
 * in the type, and a typed descriptor pins that schema so consumers can
 * override a component's vars with structural typing (unknown names are
 * rejected at the host boundary).
 */

/**
 * Per-component partial themeVar overrides for one component library. Each
 * component key maps to a partial of that component's exact `--n-*` var
 * object, so `themeOverride.Card` autocompletes the Card's exact var names
 * and rejects unknown keys.
 *
 * @typeParam Components - The library's component-first themeVar schema.
 */
export type LibraryThemeOverrides<Components> = {
  [K in keyof Components]?: Partial<Components[K]>;
};

/**
 * One component library's typed theme handle. The runtime value is only the
 * stable `libraryId` under which theme overrides live in the shared registry;
 * the `__theme` brand pins the library's themeVar schema at type level only
 * and is never present at runtime.
 *
 * @typeParam Components - The library's component-first themeVar schema.
 */
export type LibraryThemeDescriptor<Components> = {
  /** Stable per-library identifier under which theme overrides live. */
  libraryId: string;
  /**
   * Type-level brand pinning the library's themeVar schema so consumers can
   * infer it from the annotated handle. Never present at runtime.
   */
  readonly __theme?: LibraryThemeOverrides<Components>;
};
