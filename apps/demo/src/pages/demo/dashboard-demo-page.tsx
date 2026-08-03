import { defineComponent } from "vue";

/** Renders the non-closable dashboard home page. */
export const DashboardDemoPage = defineComponent(
  /** @returns The dashboard page render function. */
  () => () => (
    <main class="p-6">
      <h1 class="m-0 text-2xl font-semibold">Dashboard</h1>
      <p class="mt-3 max-w-2xl text-base leading-6">
        This local page demonstrates the non-closable home tab in the public
        admin shell.
      </p>
    </main>
  ),
  { name: "DashboardDemoPage" },
);
