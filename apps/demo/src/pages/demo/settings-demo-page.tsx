import { defineComponent } from "vue";

/** Renders the persisted frontend-preferences demonstration page. */
export const SettingsDemoPage = defineComponent(
  /** @returns The settings page render function. */
  () => () => (
    <main class="p-6">
      <h1 class="m-0 text-2xl font-semibold">Settings</h1>
      <p class="mt-3 max-w-2xl text-base leading-6">
        Use the runtime controls in the shell header to try its persisted
        frontend preferences.
      </p>
    </main>
  ),
  { name: "SettingsDemoPage" },
);
