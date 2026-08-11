A code wiki for this repository.

## Link rules (hard requirement)

- Every internal link MUST be a relative path computed from the current file's directory
  to the target file, with the exact number of `../` segments.
- A page at the wiki root referencing a page under a subdirectory uses NO `../` (e.g.
  `architecture/overview.md`).
- A page at `packages/admin/overview.md` referencing `architecture/overview.md` uses
  exactly TWO `../` (`../../architecture/overview.md`).
- Before writing a link, resolve the target relative to the current file and verify it
  exists on disk.
- NEVER emit root-relative links starting with `/`.

## Prose & Style guide

Prefer concise and clear technical writing and avoid using both excessively terse and complicated language. Avoid overusing jargonish language. For English language output, try to follow the ASD-STE100 standard.
