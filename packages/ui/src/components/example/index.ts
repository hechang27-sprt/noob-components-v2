export { Root as Example } from "./root";

// Re-export the augmentation modules (type-only): unplugin-dts strips
// bare side-effect imports from emitted d.ts, which would orphan the
// module augmentations for consumers (keyof -> never). Type-only
// re-exports survive emit and keep the files in the declaration graph.
export type * from "./theme";
export type * from "./i18n";
