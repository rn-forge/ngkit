"""Serve the fixture: `python serve.py [host:port]` (default localhost:8100)."""

import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from rn_forge.fastapi import AppConfig, FastApiApp
from rn_forge.auth import DevelopmentIdentityProvider
from rn_forge.fastapi.auth import AuthRoutesConfig, SessionMiddleware, auth_router, sessions_for

from accounts import ACCOUNTS, accounts, account_state, contexts
from products import ProductStore, build_router


def main() -> None:
    host, _, port = (sys.argv[1] if len(sys.argv) > 1 else "localhost:8100").rpartition(":")
    store = ProductStore()
    config = AuthRoutesConfig(
        providers={"development": DevelopmentIdentityProvider(ACCOUNTS, debug=True)},
        accounts=accounts, contexts=contexts, account_state=account_state,
        problem_type_base="https://ng-demo.invalid/problems/",
        error_route="/login/error", trusted_origins=("http://localhost:4200",), debug=True,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await store.start()
        yield

    # No autoreload: idempotency keys live in process memory.
    app = FastApiApp(
        AppConfig(tracing=False),
        routers=[auth_router(config), build_router(store)],
        lifespan=lifespan,
        title="ng-demo-api-fastapi",
    )
    app.add_middleware(SessionMiddleware, sessions=sessions_for(config))
    uvicorn.run(app, host=host or "localhost", port=int(port), log_level="warning")


if __name__ == "__main__":
    main()
