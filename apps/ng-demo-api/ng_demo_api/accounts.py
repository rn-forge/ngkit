"""Fixture accounts for the development identity provider."""

from __future__ import annotations

from rn_forge.auth import (
    AccountRejected,
    AuthorizationContext,
    DevelopmentAccount,
    DevelopmentIdentityProvider,
    ExternalIdentity,
)
from rn_forge.django.auth import AuthRoutesConfig

ADMIN_PERMISSIONS = frozenset(
    {
        "demo.dashboard",
        "demo.products",
        "demo.products.list",
        "demo.products.read",
        "demo.products.create",
        "demo.products.update",
        "demo.products.delete",
        "demo.products.import",
        "demo.products.export",
        "demo.products.upload",
        "demo.forms",
        "demo.org-chart",
    }
)
READER_PERMISSIONS = frozenset(
    {"demo.products", "demo.products.list", "demo.products.read"}
)

DEVELOPMENT_ACCOUNTS = (
    DevelopmentAccount(subject="demo-admin", name="Demo Admin"),
    DevelopmentAccount(subject="demo-reader", name="Demo Reader"),
)

_CONTEXTS = {
    "demo-admin": (ADMIN_PERMISSIONS, frozenset({"admin"})),
    "demo-reader": (READER_PERMISSIONS, frozenset({"reader"})),
}
_STATE = {account_id: {"active": True, "session_version": 0} for account_id in _CONTEXTS}


class FixtureAccountResolver:
    """Resolve only the two fixture accounts asserted by the dev provider."""

    def resolve(self, identity: ExternalIdentity) -> str:
        if identity.issuer == "development" and identity.subject in _CONTEXTS:
            return identity.subject
        raise AccountRejected("identity is not a fixture account")

    def lookup(self, issuer: str, subject: str) -> str | None:
        return subject if issuer == "development" and subject in _CONTEXTS else None


class FixtureAuthorizationContexts:
    """Return each account's fixed permissions and current session version."""

    def resolve(self, account_id: str) -> AuthorizationContext:
        permissions, roles = _CONTEXTS[account_id]
        state = _STATE[account_id]
        return AuthorizationContext(
            active=state["active"],
            session_version=state["session_version"],
            permissions=permissions,
            roles=roles,
        )


class FixtureAccountState:
    """Keep active status and session versions in process memory."""

    def set_active(self, account_id: str, active: bool) -> None:
        _STATE[account_id]["active"] = active

    def bump_session_version(self, account_id: str) -> int:
        _STATE[account_id]["session_version"] += 1
        return _STATE[account_id]["session_version"]


accounts = FixtureAccountResolver()
contexts = FixtureAuthorizationContexts()
account_state = FixtureAccountState()
config = AuthRoutesConfig(
    providers={
        "development": DevelopmentIdentityProvider(DEVELOPMENT_ACCOUNTS, debug=True),
    },
    accounts=accounts,
    contexts=contexts,
    account_state=account_state,
    error_route="/login/error",
)
