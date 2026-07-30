Yes. Several designs are viable. The strongest alternative is an explicit **Admin runtime/plugin**, which avoids both host boilerplate and component-triggered global mutation.

## Comparison

| Design | Default messages | Host overrides | Locale ownership | Main tradeoff |
|---|---|---|---|---|
| A. Component self-registration | Automatic on mount | Good with defaults-first merge | `AdminShell` bridge | Hidden global mutation during rendering |
| B. Admin Vue plugin/runtime | Automatic during app setup | Excellent | Explicit policy | One additional `app.use()` |
| C. Local Composer per package | Automatic | Awkward | Package-local | Split-brain risk |
| D. Host-provided i18n adapter | Depends on adapter | Excellent | Fully explicit | Reimplements part of Vue I18n |
| E. Admin-owned `createI18n()` factory | Automatic | Good at creation time | Admin factory | Admin becomes application infrastructure |
| F. Translation callbacks/label props | Host-owned | Complete | Host-owned | Excessive API surface and boilerplate |

My recommendation is **B: an explicit Admin Vue plugin/runtime**.

---

# A. Component self-registration

This is the design discussed previously:

```ts
export const AdminShell = defineComponent(() => {
  const composer = useI18n({ useScope: "global" });

  ensureAdminMessages(composer);

  // ...
});
```

## Advantages

- Minimal consumer setup.
- Messages are guaranteed to exist when the component renders.
- No separate Admin installation API.
- Host overrides remain possible.
- One global Composer.

## Weaknesses

The component mutates application-global configuration during setup:

```text
component mount
  └─ changes global message registry
```

That creates observable lifecycle behavior:

- Messages do not exist until the first Admin component mounts.
- A host cannot reliably inspect all available messages before mounting.
- SSR must ensure registration occurs identically on server and client.
- Unmounting does not unregister messages.
- Multiple Admin package versions could race to register the same namespace.
- Registration behavior becomes coupled to whichever component mounts first.
- A test mounting `AdminShell` has the side effect of changing its shared test Composer.

It can be made correct and idempotent, but it is somewhat magical.

### Verdict

Promising for a component collection with very low ceremony. Less attractive for `admin`, which already has package-level runtime configuration and persisted state.

---

# B. Explicit Admin Vue plugin/runtime

Create one Admin integration object that receives the host-owned Composer and configures all Admin runtime behavior before rendering.

```ts
import {
  createAdminPlugin,
  adminMessages,
} from "@noob-naive-ui/admin";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      admin: {
        login: {
          title: "Welcome back",
        },
      },
    },
  },
});

app.use(i18n);

app.use(
  createAdminPlugin({
    i18n,
    locale: {
      ownership: "shell",
    },
  }),
);
```

The plugin:

1. Registers built-in Admin messages.
2. Preserves existing host overrides.
3. Provides the Composer to Admin components through a private injection key.
4. Coordinates locale preference synchronization.
5. Optionally validates that the supplied Composer uses Composition API mode.
6. Keeps runtime services out of Pinia state.

A possible contract:

```ts
export interface CreateAdminPluginOptions {
  /**
   * Supplies the host-owned Vue I18n instance used by all Admin components.
   */
  i18n: I18n;

  /**
   * Selects which side controls the active global locale.
   */
  locale?: AdminLocaleCoordination;

  /**
   * Supplies host overrides registered above package defaults.
   */
  messages?: AdminMessageOverrides;
}

export type AdminLocaleCoordination =
  | {
      /**
       * The persisted Admin preference controls the global Composer.
       */
      ownership: "shell";
    }
  | {
      /**
       * The host Composer controls the Admin preference display.
       */
      ownership: "host";
    }
  | {
      /**
       * The shell initializes from persistence and then accepts changes
       * from either side.
       */
      ownership: "synchronized";
    };
```

Use a discriminated union rather than booleans such as:

```ts
syncGlobalLocale?: boolean;
preferStoredLocale?: boolean;
followHostLocale?: boolean;
```

Multiple booleans permit contradictory combinations. A single ownership mode makes precedence explicit.

## Why injection still helps

Admin components could call global `useI18n()` directly, but private injection makes the package boundary explicit:

```ts
const adminI18nKey: InjectionKey<AdminI18nRuntime> =
  Symbol("AdminI18nRuntime");
```

The provided runtime can be narrow:

```ts
export interface AdminI18nRuntime {
  t: Composer["t"];
  locale: WritableComputedRef<string>;
}
```

Components use:

```ts
const { t, locale } = useAdminI18n();
```

They still use the one host Composer under the hood, but no component needs to discover, register, or configure it.

This also gives a deterministic error:

```text
AdminShell requires createAdminPlugin() to be installed.
```

Instead of a generic Vue I18n injection error.

## Advantages

- Explicit application startup behavior.
- Messages available before any Admin component renders.
- Clean SSR semantics.
- One place for override precedence.
- One place for locale ownership policy.
- No runtime service stored in Pinia.
- Easy to add future Admin-wide configuration without adding many component props.
- Tests install one Admin plugin instead of duplicating registration logic.

## Weaknesses

Consumer setup becomes:

```ts
app.use(i18n);
app.use(createAdminPlugin({ i18n }));
```

That is one extra line and requires passing the i18n instance already installed globally.

There is also potential duplication between:

```ts
app.use(i18n);
createAdminPlugin({ i18n });
```

But the duplication is useful: Vue installs the Composer globally, while Admin explicitly binds itself to that same Composer. The API makes the one-Composer invariant observable and testable.

### Verdict

Best fit for this repository.

---

# C. Package-local Composer with inherited global locale

Each Admin component or package subtree uses a local Composer:

```ts
const { t } = useI18n({
  useScope: "local",
  inheritLocale: true,
  messages: adminMessages,
});
```

The local Composer follows the global locale but owns Admin messages.

## Advantages

- Messages are always available.
- No global message registration.
- No namespace collision.
- No registration helper.
- Components can work with only `app.use(i18n)`.
- Locale changes from the global Composer propagate through `inheritLocale`.

## Weaknesses

Host overrides in the global Composer do not naturally replace local messages. Local scope wins for local keys.

You could introduce package-level override input:

```ts
createAdminPlugin({
  messages: {
    en: {
      login: {
        title: "Welcome",
      },
    },
  },
});
```

But now overrides use an Admin-specific channel rather than normal global Vue I18n messages.

Other problems:

- A Composer may be created per component rather than per package subtree.
- `$te`, fallback behavior, date formats, and number formats can differ between scopes.
- Host tooling inspecting global messages cannot see package-local resources.
- Shared components outside the Admin subtree cannot access Admin translations.
- It creates multiple Composer objects even if they share locale.

This is not full locale split-brain, because locale can be inherited, but it is **message-registry split-brain**.

### Verdict

Technically clean for isolated widgets. Poor fit when easy host overrides are a primary goal.

---

# D. Host-provided i18n adapter

Avoid a direct runtime dependency on Vue I18n inside Admin components. Define a narrow package-owned interface:

```ts
export interface AdminTranslationRuntime {
  /**
   * Resolves one package-owned translation key.
   */
  t(
    key: AdminTranslationKey,
    params?: Record<string, unknown>,
  ): string;

  /**
   * Supplies the currently active locale.
   */
  locale: Readonly<Ref<string>>;

  /**
   * Requests a global locale change.
   */
  setLocale(locale: string): void;
}
```

The host adapts Vue I18n:

```ts
createAdminPlugin({
  translation: {
    t: (key, params) => i18n.global.t(key, params),
    locale: readonly(i18n.global.locale),
    setLocale(locale) {
      i18n.global.locale.value = locale;
    },
  },
});
```

## Advantages

- Admin is not coupled directly to Vue I18n runtime APIs.
- Host can use another localization system.
- Locale ownership is explicit.
- Very easy to test with a small in-memory adapter.
- Runtime service stays outside Pinia state.
- No dependence on global Vue injection.

## Weaknesses

The adapter quickly expands:

```ts
t
te
tm
d
n
locale
fallbackLocale
setLocale
loadLocale
```

It risks becoming an incomplete wrapper around Vue I18n.

Other costs:

- Message registration remains a separate concern.
- Strong Vue I18n message typing is weakened.
- Consumers must write adapter boilerplate.
- Vue I18n features may leak through anyway.
- Supporting multiple localization systems is speculative unless there is a real consumer requirement.

### Verdict

Good if localization-backend independence is an actual project requirement. Otherwise unnecessary abstraction.

---

# E. Admin-owned Composer factory

Export a factory that creates the application’s one Composer with Admin defaults:

```ts
const i18n = createAdminI18n({
  locale: "en",
  messages: {
    en: {
      admin: {
        login: {
          title: "Welcome back",
        },
      },
      application: {
        home: "Home",
      },
    },
  },
});

app.use(i18n);
```

Implementation:

```ts
export function createAdminI18n(
  options: CreateAdminI18nOptions,
): I18n {
  return createI18n({
    legacy: false,
    fallbackLocale: "en",
    ...options,
    messages: mergeAdminDefaults(options.messages),
  });
}
```

## Advantages

- One setup call.
- One Composer.
- Built-in messages registered before rendering.
- Host overrides can be merged during creation.
- Easy typing and deterministic initialization.

## Weaknesses

The Admin library becomes responsible for creating application-wide infrastructure.

That is problematic when the host:

- already has an i18n instance;
- uses an application framework that creates it;
- needs Vue I18n options not exposed by the factory;
- has SSR-specific Composer creation;
- uses plugins requiring access to the original configuration;
- wants independent initialization order.

The factory either exposes nearly every `createI18n()` option or becomes restrictive. If it accepts and forwards all options, it is mostly a wrapper with little durable value.

### Verdict

Good for an opinionated Admin starter application. Wrong as the only integration path for a reusable library.

It could be a convenience exported from `apps/admin-starter`, not the core `admin` package.

---

# F. Translation callbacks or label props

Make every translated value configurable:

```tsx
<AdminShell
  labels={{
    signOut: "Sign out",
    fontSizeSmall: "Small",
  }}
/>
```

Or:

```ts
createAdminShell({
  translate(key) {
    return i18n.global.t(`admin.${key}`);
  },
});
```

## Advantages

- No hidden Composer dependency.
- Every string is overrideable.
- Easy isolated testing.
- No global registration.

## Weaknesses

This becomes a parallel localization system:

- every component needs label props;
- every new string changes public types;
- interpolation and pluralization must be reinvented;
- ARIA text is easy to omit;
- locale changes require reactive callback behavior;
- callers must provide large dictionaries;
- defaults still require package-owned resources.

### Verdict

Useful for a small reusable primitive with two or three labels. Not suitable for an Admin shell and login workflow.

---

# G. Message-only package with explicit installer

Separate messages from the component package:

```text
@noob-naive-ui/admin
@noob-naive-ui/admin-locales
```

Consumer:

```ts
import { installAdminLocales } from "@noob-naive-ui/admin-locales";

installAdminLocales(i18n);
```

## Advantages

- Consumers that do not need built-in locales do not pay bundle cost.
- Locale packages can version independently.
- Optional languages can be separate entrypoints.
- Clear static boundary.

## Weaknesses

- More packages and version coordination.
- More installation boilerplate.
- Components can render missing keys if the locale package is omitted.
- Admin and locale message schemas can drift.
- Independent versions conflict with the one-version rule.

### Verdict

Only worthwhile if translations become large or require independent community translation releases.

A single package with optional locale subpath exports achieves most benefits with less machinery:

```ts
import en from "@noob-naive-ui/admin/locales/en";
```

---

# Recommended layered design

Use two levels.

## Core contract: explicit Admin plugin

```ts
const i18n = createI18n({
  legacy: false,
  locale: "en",
  messages: hostMessages,
});

app.use(i18n);

app.use(
  createAdminPlugin({
    i18n,
    localeOwnership: "shell",
  }),
);
```

The plugin:

- registers bundled defaults beneath host overrides;
- provides a narrow private Admin i18n runtime;
- coordinates locale synchronization;
- performs no persistence itself;
- stores no Composer in Pinia state.

## Convenience contract: starter-owned factory

The future Admin starter can reduce setup further:

```ts
const { i18n, adminPlugin } = createAdminRuntime({
  locale: "en",
  messages: hostMessages,
});

app.use(i18n);
app.use(adminPlugin);
```

This convenience belongs in the opinionated starter/runtime layer, not in the core component library.

## Locale ownership modes

I would expose two modes initially, not three:

```ts
export type AdminLocaleOwnership =
  | "shell"
  | "host";
```

### `"shell"`

- Hydrated Admin preference sets the Composer locale.
- Selecting a locale updates preference and Composer.
- External Composer changes may update displayed preference to remain coherent.
- Intended for Admin-dedicated applications.

### `"host"`

- Composer locale is authoritative.
- Admin selector either:
  - requests locale changes through a configured callback; or
  - is hidden/read-only if the host does not allow changes.
- Intended when Admin is embedded in a larger application.

Avoid `"synchronized"` until exact conflict and initialization semantics are required. In practice, “synchronized” still needs one side to win simultaneous or startup changes, so it often obscures ownership rather than resolving it.

## Final recommendation

```text
Host owns Composer creation
        │
        ▼
createAdminPlugin({ i18n, localeOwnership })
        │
        ├── registers package defaults under host overrides
        ├── provides private Admin translation runtime
        └── coordinates store.locale ↔ Composer.locale
                without placing Composer in Pinia
```

This is more explicit and maintainable than component self-registration, while keeping consumer setup to one Admin-specific installation call. It also leaves a clean path for SSR, lazy locales, package overrides, and an opinionated starter convenience API.