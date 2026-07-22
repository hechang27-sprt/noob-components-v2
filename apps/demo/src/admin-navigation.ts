import type {
  AdminShellDestination,
  AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";

import { type DemoNavKey } from "./routes";

/** Describes host-owned presentation assigned when one destination opens as an AdminShell tab. */
type DemoTabPresentation = Pick<AdminShellTabDescriptor, "label" | "closable">;

/** Resolves destination-specific tab labels and close policy outside the router registry. */
const tabPresentation = {
  /** Supplies the fixed non-closable home-tab presentation. */
  dashboard: () => ({ label: "Dashboard", closable: false }),
  /** Supplies the report-list tab presentation. */
  reports: () => ({ label: "Reports", closable: true }),
  /** Supplies the settings tab presentation. */
  settings: () => ({ label: "Settings", closable: true }),
  /** Supplies a parameter-aware title for one report-detail tab. */
  detail: (destination: AdminShellDestination) => ({
    label: `Report ${String(destination.payload?.reportId ?? "detail")}`,
    closable: true,
  }),
} satisfies Record<
  DemoNavKey,
  (destination: AdminShellDestination) => DemoTabPresentation
>;

/**
 * Creates a host-owned public tab descriptor from a page-instance ID and destination.
 *
 * @param id - Immutable page-instance identity selected by the host.
 * @param destination - Canonical shell destination whose key selects tab presentation.
 * @returns The complete descriptor supplied to the shell navigation adapter.
 * @throws When the destination key is outside the demo route registry.
 */
export function describeDemoDestination(
  id: string,
  destination: AdminShellDestination,
): AdminShellTabDescriptor {
  const navKey = destination.navKey as DemoNavKey;
  const resolvePresentation = tabPresentation[navKey];
  if (!resolvePresentation) {
    throw new Error(`Unknown demo tab destination "${destination.navKey}".`);
  }
  return {
    id,
    nav: destination,
    ...resolvePresentation(destination),
  };
}
