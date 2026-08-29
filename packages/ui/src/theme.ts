import {
  type LibraryThemeDescriptor,
  type RegistryThemeOverrides,
  useCssVarsFor,
} from "@noob-naive-ui/registry";
import { LIB_ID } from "./registry";
import { useTheme } from "@noob-naive-ui/registry";

/** CSS custom-property prefix for the ui library (`--noob-ui-…`). */
export const CSS_PREFIX = "noob-ui" as const;

/**
 * Component-first themeVar schema for ui package components — the empty
 * augmentation hook. Each component declares its own camelCase themeVar
 * schema into this interface via module augmentation targeting
 * `@noob-naive-ui/ui`:
 *
 * ```ts
 * // ui-card.tsx
 * declare module "@noob-naive-ui/ui" {
 *   interface UiThemeComponents { Card: UiCardThemeVars; }
 * }
 * ```
 *
 * The merged interface drives `NoobUiThemeOverrides.Card` (autocompletes
 * `borderColor`-style names and rejects raw `--noob-ui-…` names) and
 * `useUiTheme`'s component key. `useUiTheme` (registry `useTheme`) converts
 * overrides to `--noob-ui-<component>-<kebab-case>` CSS custom properties.
 */
export interface NoobUiThemeComponents {}

/** Typed per-component themeVar overrides for the ui package, derived from the registry. */
export type NoobUiThemeOverrides = RegistryThemeOverrides[typeof LIB_ID];

/**
 * The ui package's typed theme descriptor. The runtime value is only the
 * stable `libraryId` under which theme overrides live in the shared registry;
 * the `__theme` brand pins the themeVar schema at type level only.
 */
export const noobUiTheme: LibraryThemeDescriptor<NoobUiThemeComponents> = {
  libraryId: LIB_ID,
};

export function useUiCssVarsFor<
  const ComponentId extends keyof NoobUiThemeComponents,
>(componentId: ComponentId) {
  return useCssVarsFor(LIB_ID, componentId, CSS_PREFIX);
}

type Defaults<K extends keyof NoobUiThemeComponents> =
  | Partial<NoobUiThemeComponents[K]>
  | (() => Partial<NoobUiThemeComponents[K]>);

export function useUiTheme<const K extends keyof NoobUiThemeComponents>(
  componentId: K,
  defaults?: Defaults<K>,
) {
  return useTheme({
    libraryId: LIB_ID,
    cssPrefix: CSS_PREFIX,
    componentId,
    defaults,
  });
}
