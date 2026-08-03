import { useAdminShell } from "@noob-naive-ui/admin";
import { NButton } from "naive-ui";
import { defineComponent } from "vue";

/** Renders the reports page with an application-owned detail navigation trigger. */
export const ReportsDemoPage = defineComponent(
  /** @returns The reports page render function. */
  () => {
    /** Retains the nearest shell's descendant navigation control. */
    const { navigate } = useAdminShell();

    /** Opens a new detail page instance even when the destination is already open. */
    function openDetail(): void {
      const randomYear = Math.round(Math.random() * 40 + 2000);
      navigate(
        { navKey: "detail", payload: { reportId: `quarterly-${randomYear}` } },
        () => ({ kind: "open" }),
      ).catch((error: unknown) => {
        console.error("Navigation failed:", error);
      });
    }

    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">Reports</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          Open a report detail page that is intentionally absent from the
          sidebar menu.
        </p>
        <NButton type="primary" onClick={() => openDetail()}>
          Open quarterly report detail
        </NButton>
      </main>
    );
  },
  { name: "ReportsDemoPage" },
);
