# Noob Components

This workspace provides reusable frontend building blocks for admin applications while keeping application policy and backend integration in the consuming application.

## Language

**Admin shell**:
Router-neutral application chrome that presents navigation, page instances, account controls, and local display preferences.
_Avoid_: Admin runtime, application shell runtime

**Admin router runtime**:
The integration that coordinates Vue Router navigation and browser history with Admin-shell page instances.
_Avoid_: Router adapter

**Host application**:
The consuming application that owns authentication effects, backend integration, menu policy, route definitions, and application pages.
_Avoid_: Starter, runtime consumer

**Navigation target key**:
A stable host-defined key identifying an abstract navigable destination definition. The admin router runtime represents it as both an `AdminRouteRegistry` key and a Vue Router route name.
_Avoid_: Route key, menu key

**Destination**:
A navigation target key plus its canonical payload, describing where Admin-shell navigation should go without identifying an open occurrence. Two destinations are equal when both their keys and canonical payloads are equal.
_Avoid_: Route, tab, page instance

**Page instance**:
One identity-bearing open occurrence of a destination represented in the Admin shell. Equal destinations may have distinct page instances.
_Avoid_: Route tab, destination

**Navigation scope**:
A host-defined browser-history isolation epoch used to prevent page history from crossing an authenticated-context transition. It is not an authentication session, authorization boundary, or security credential.
_Avoid_: Session, auth scope, security scope

**Authentication state**:
The Admin package's frontend determination that authentication is loading, unavailable, anonymous, or authenticated. It is presentation and routing state, not proof of a host session or possession of a security credential.
_Avoid_: Session state, login status

**Authentication presentation identity**:
Frontend-only account information used to render an authenticated user, such as a label, avatar, or subtitle. It is neither a session nor an authentication credential.
_Avoid_: User session, account record

**Anonymous cause**:
The explanation for an anonymous Authentication state: no authentication was established, the user requested sign-out, or the host evicted the user for a classified reason.
_Avoid_: Logout reason, auth error
