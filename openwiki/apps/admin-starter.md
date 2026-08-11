---
type: app
title: apps/admin-starter — Scaffold Placeholder
description: A package.json-only workspace member whose dev script currently prints that it is not scaffolded; no source exists yet.
tags: [app, placeholder, workspace]
---

# apps/admin-starter — Scaffold Placeholder

`apps/admin-starter` is a workspace member with **no source code** yet. Its
`package.json` declares:

```json
{
  "name": "admin-starter",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "node -e \"console.log('admin-starter is not scaffolded yet')\""
  }
}
```

The root `pnpm dev` script currently forwards to `pnpm --filter admin-starter dev`,
which prints the stub message. Until it is scaffolded, use
`pnpm --filter demo dev` for a runnable host application
([apps/demo](demo.md)). There is nothing else to document here; revisit this page
when a scaffold lands.
