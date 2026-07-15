import { createPinia } from "pinia";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import { useAdminShellPreferencesStore } from "@noob-naive-ui/admin";
import "@noob-naive-ui/admin/style.css";

import App from "./App";
import { demoRoutes } from "./routes";
import "./style.css";

/** Creates the demo's application-owned Pinia instance before any public store is resolved. */
const pinia = createPinia();
/** Creates the demo's local browser router without passing routing ownership to the shell. */
const router = createRouter({
  history: createWebHistory(),
  routes: demoRoutes,
});
/** Resolves the public shell preference store against the application Pinia instance. */
const preferences = useAdminShellPreferencesStore(pinia);

/** Initializes the public preference store with the runtime locale choices shown by the shell. */
preferences.initialize({
  defaults: {
    availableLocales: [
      { key: "en", label: "English" },
      { key: "zh-CN", label: "简体中文" },
    ],
  },
});

/** Mounts the frontend-only demonstration application after installing its app-owned plugins. */
createApp(App).use(pinia).use(router).mount("#app");
