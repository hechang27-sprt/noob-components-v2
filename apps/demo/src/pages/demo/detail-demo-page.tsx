import { defineComponent } from "vue";

/** Renders the non-menu detail route reached through an application-owned button. */
export const DetailDemoPage = defineComponent(
  /**
   * Creates detail content from the explicit report route prop.
   *
   * @param props - Contains the report identity projected from the URL path parameter.
   * @returns The report detail page render function.
   */
  (props: { reportId: string }) => () => (
    <main class="p-6">
      <h1 class="m-0 text-2xl font-semibold">
        Report detail: {props.reportId}
      </h1>
      <p class="mt-3 max-w-2xl text-base leading-6">
        Report {props.reportId} was opened by a page-owned action and has no
        sidebar menu item.
      </p>
    </main>
  ),
  {
    name: "DetailDemoPage",
    props: {
      reportId: { type: String, required: true },
    },
  },
);
