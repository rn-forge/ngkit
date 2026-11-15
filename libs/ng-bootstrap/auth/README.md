# @rn-forge/ng-bootstrap/auth

Secondary entry point of `@rn-forge/ng-bootstrap`. It can be used by importing
from `@rn-forge/ng-bootstrap/auth`.

## Login page

Route `/login` to `LoginComponent`. It reads `returnTo` from the query string
(default `/`, also used for unsafe return paths). It automatically starts login
when there is one navigating provider and no password provider. Otherwise it
displays provider buttons and, when available, a password form.
