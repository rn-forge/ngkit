# @rn-forge/ng-bootstrap/auth

Secondary entry point of `@rn-forge/ng-bootstrap`. It can be used by importing
from `@rn-forge/ng-bootstrap/auth`.

## Login page

Route `/login` to `LoginComponent`. It reads `returnTo` from the query string
(default `/`, also used for unsafe return paths). It automatically starts login
when there is one navigating provider and no password provider. Otherwise it
displays provider buttons and, when available, a password form.

## Error and forbidden pages

Route `/login/error` to `AuthErrorComponent` and `/forbidden` to
`ForbiddenComponent`, outside the guarded routes.

The error page reads the `error` query parameter and displays a message for
`access_denied`, `account_not_provisioned`, `login_failed` or
`session_not_established`. Missing or unrecognised codes show an unknown-error
message; the raw value is never displayed. "Back to sign in" links to the
configured `loginPath` (default `/login`).

The forbidden page explains that the signed-in user lacks permission and offers
"Go to the home page", linking to `/`. It never offers or starts another login.
