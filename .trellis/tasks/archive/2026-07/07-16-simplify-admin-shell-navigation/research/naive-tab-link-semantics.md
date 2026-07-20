# Naive UI tab/link interaction evidence

## Version inspected

- `naive-ui@2.44.1`

## NTab interaction ownership

`NTab` renders an outer tab element and installs its activation handler on that element:

- `es/tabs/src/Tab.mjs:99-112` renders the tab and sets `onClick` to `activateTab` for click-triggered tabs.
- `es/tabs/src/Tab.mjs:65-79` calls the injected tabs activation function after `onBeforeLeave` permits the transition.
- `es/tabs/src/Tabs.mjs:307-333` emits `onUpdateValue` and updates uncontrolled tab state.
- `es/tabs/src/Tab.mjs:121-125` renders the close control as a sibling of the tab label and stops close-click propagation in `handleClose` at lines 51-55.

## Consequence for nested links

A `RouterLink` or anchor rendered inside an `NTab` label bubbles its click to the outer `NTab` by default. If the shell also supplies `NTabs.onUpdateValue`, one pointer action can trigger both link navigation and the tabs callback.

Preventing propagation avoids duplicate activation but makes the nested link—not the complete outer tab—the activation surface unless CSS and markup deliberately stretch the link. The close control must remain outside that activation surface.

Therefore embedding links is not a callback-free drop-in replacement. It requires an explicit choice of interaction authority and browser/accessibility verification.

## Boundary implication

`RouterLink` is application-router integration and must not enter the router-neutral `@noob-naive-ui/admin` package. If native link semantics become a requirement, the application/starter should supply link-rendered labels or a narrowly scoped application link component.
