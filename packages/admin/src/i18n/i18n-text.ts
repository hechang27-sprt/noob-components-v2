import { z } from "zod";

/**
 * Discriminated-union representation of one displayable text value.
 *
 * `string` carries verbatim display text; `i18n` carries a message key (and
 * optional named interpolation values) resolved against the host global
 * Composer at render time, so `i18n` text stays reactive to locale switches
 * and survives history-state persistence as its key rather than a translated
 * snapshot.
 */
export const adminI18nTextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("string"), value: z.string() }),
  z.object({
    kind: z.literal("i18n"),
    key: z.string(),
    // Named interpolation values are persisted with history state, so they
    // must stay JSON-serializable primitives.
    named: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  }),
]);

/** One displayable text value: verbatim text or a resolvable message key. */
export type I18nText = z.infer<typeof adminI18nTextSchema>;

/**
 * Resolves one I18nText value against a translator.
 *
 * @param text - The displayable text value to resolve.
 * @param translate - Translates one message key with optional named values.
 * @returns The resolved display string.
 */
export function resolveI18nText(
  text: I18nText,
  translate: (
    key: string,
    named?: Record<string, string | number | boolean>,
  ) => string,
): string {
  if (text.kind === "i18n") {
    return translate(text.key, text.named);
  }
  return text.value;
}
