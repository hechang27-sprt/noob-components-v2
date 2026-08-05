import { inject, type InjectionKey, type Ref } from "vue";

import type { AdminShellNavigate, AdminShellTab } from "./admin-shell";

/**
 * Exposes the nearest AdminShell's public tabs controller.
 *
 * Shell-owned page-instance state and actions only; the host-authoritative
 * `navigation.active` is not re-exposed to descendants.
 */
export type AdminShellContext = {
  /** Requests navigation through this shell instance's existing resolution path. */
  navigate: AdminShellNavigate;
  /** Committed page instances keyed by immutable id (reactive for rendering). */
  tabs: ReadonlyMap<string, AdminShellTab>;
  /** The sole user-visible page-instance ordering. */
  visibleTabs: Ref<string[]>;
  /** Sanitized tab-navigation feedback for the current boundary. */
  tabError: Ref<string | undefined>;
  /** Returns whether Naive UI may activate a known idle page instance. */
  canActivateTab: (id: string | number) => boolean;
  /** Requests activation for one exact committed page instance. */
  activateTab: (id: string) => Promise<void>;
  /** Requests closure for one exact committed page instance. */
  closeTab: (id: string) => Promise<void>;
};

/**
 * Identifies shell context privately while preserving typed hierarchical
 * injection. Exported only so the shell can provide the controller; it is not
 * part of the public barrel surface.
 */
export const adminShellContextKey: InjectionKey<AdminShellContext> =
  Symbol("AdminShellContext");

/**
 * Resolves the public tabs controller supplied by the nearest ancestor AdminShell.
 *
 * @returns The nearest shell's tabs controller (navigation, tab state, and actions).
 * @throws When the caller is not rendered beneath an AdminShell provider.
 */
export function useAdminShell(): AdminShellContext {
  const context = inject(adminShellContextKey);
  if (!context) {
    throw new Error("useAdminShell() requires an ancestor AdminShell.");
  }
  return context;
}
