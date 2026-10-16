"""Serve the fixture: `python serve.py [host:port]` (default localhost:8100)."""

import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from rn_forge.fastapi import AppConfig, FastApiApp

from products import ProductStore, build_router


def main() -> None:
    host, _, port = (sys.argv[1] if len(sys.argv) > 1 else "localhost:8100").rpartition(":")
    store = ProductStore()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await store.start()
        yield

    # No autoreload: idempotency keys live in process memory.
    app = FastApiApp(
        AppConfig(tracing=False),
        routers=[build_router(store)],
        lifespan=lifespan,
        title="ng-demo-api-fastapi",
    )
    uvicorn.run(app, host=host or "localhost", port=int(port), log_level="warning")


if __name__ == "__main__":
    main()
