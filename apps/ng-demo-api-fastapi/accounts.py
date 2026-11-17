"""Hand-written fixture accounts and process-memory authorization state."""

from rn_forge.auth import AccountRejected, AuthorizationContext, DevelopmentAccount, ExternalIdentity

ACCOUNTS = (
    DevelopmentAccount(subject="demo-admin", name="Demo Admin"),
    DevelopmentAccount(subject="demo-reader", name="Demo Reader"),
)
PERMISSIONS = {
    "demo-admin": frozenset({
        "demo.dashboard", "demo.products", "demo.products.list", "demo.products.read",
        "demo.products.create", "demo.products.update", "demo.products.delete",
        "demo.products.import", "demo.products.export", "demo.forms", "demo.org-chart",
        "demo.products.upload",
    }),
    "demo-reader": frozenset({"demo.products", "demo.products.list", "demo.products.read"}),
}
ROLES = {"demo-admin": frozenset({"admin"}), "demo-reader": frozenset({"reader"})}


class FixtureAccounts:
    """Resolve only the two development fixture accounts."""

    def resolve(self, identity: ExternalIdentity) -> str:
        account = self.lookup(identity.issuer, identity.subject)
        if account is None:
            raise AccountRejected("Unknown development account")
        return account

    def lookup(self, issuer: str, subject: str) -> str | None:
        return subject if issuer == "development" and subject in PERMISSIONS else None


class FixtureState:
    """Keep active status and session versions in process memory."""

    def __init__(self) -> None:
        self.active = {account.subject: True for account in ACCOUNTS}
        self.versions = {account.subject: 1 for account in ACCOUNTS}

    def set_active(self, account_id: str, active: bool) -> None:
        self.active[account_id] = active

    def bump_session_version(self, account_id: str) -> int:
        self.versions[account_id] += 1
        return self.versions[account_id]


class FixtureContexts:
    """Return fixed permissions and roles with the account's current state."""

    def __init__(self, state: FixtureState) -> None:
        self.state = state

    def resolve(self, account_id: str) -> AuthorizationContext:
        return AuthorizationContext(
            active=self.state.active[account_id],
            session_version=self.state.versions[account_id],
            permissions=PERMISSIONS[account_id], roles=ROLES[account_id],
        )


accounts = FixtureAccounts()
account_state = FixtureState()
contexts = FixtureContexts(account_state)
