"""The `products` resource: model, wire models, store and routes.

Everything the standards table lists comes from `rn-forge-fastapi` and
`rn-forge-sqlalchemy`; the rest is marked "hand-written" below.
"""

import tempfile
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response
from pydantic import field_validator
from sqlalchemy import Numeric, String, delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Mapped, mapped_column

from rn_forge.fastapi import (
    idempotent,
    merge_into,
    merge_patch_body,
    merge_patch_openapi,
    order_by_param,
    page_params,
    require_if_match,
)
from rn_forge.fastapi.transfer import (
    batch_create_router,
    batch_delete_router,
    import_router,
    import_template_router,
    tabular_export,
    tabular_format,
)
from rn_forge.sqlalchemy import (
    AuditMixin,
    Base,
    VersionMixin,
    keyset,
    next_page_token,
    update_versioned,
    upsert,
)
from rn_forge.web import (
    Cursor,
    OrderField,
    Page,
    StoredResponse,
    VersionETagCodec,
    WireModel,
    check_precondition,
    request_hash,
)
from rn_forge.web.exceptions import IdempotencyKeyInFlight, IdempotencyKeyReuse
from rn_forge.web.transfer import ImportCounts

DATABASE_PATH = Path(tempfile.gettempdir()) / "ng-demo-api-fastapi.sqlite3"
ACTOR = "anonymous"
ETAGS = VersionETagCodec()

# The five products of the demo's mock (`SEED_PRODUCTS` in `mock-api.interceptor.ts`).
SEED_PRODUCTS = [
    (1, "Widget A", "Widgets", 9.99, True),
    (2, "Widget B", "Widgets", 14.99, True),
    (3, "Gadget X", "Gadgets", 49.99, False),
    (4, "Gadget Y", "Gadgets", 79.99, True),
    (5, "Doohickey", "Other", 4.99, True),
]


class Product(AuditMixin, VersionMixin, Base):
    """`VersionMixin` backs the `ETag`; `AuditMixin` adds the audit fields."""

    __tablename__ = "products"
    # AUTOINCREMENT, so a deleted id is never reused (as with the Django fixture).
    __table_args__ = {"sqlite_autoincrement": True}

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False))
    active: Mapped[bool] = mapped_column(default=True)


class ProductIn(WireModel):
    """The writable fields: a create body, and the document a merge patch validates."""

    name: str
    category: str
    price: float
    active: bool = True


class ProductOut(WireModel):
    id: int
    name: str
    category: str
    price: float  # a JSON number
    active: bool
    created_by: str | None
    create_time: datetime
    updated_by: str | None
    update_time: datetime


class ProductRow(WireModel):
    """A spreadsheet row: the export, import and template columns."""

    id: int | None = None
    name: str
    category: str
    price: float
    active: bool

    @field_validator("id", mode="before")
    @classmethod
    def blank_id_is_new(cls, value: object) -> object:
        return None if value == "" else value


SORTABLE = {"id": Product.id, "name": Product.name, "category": Product.category, "price": Product.price}


class CacheIdempotencyStore:
    """Hand-written: the library supplies the protocol and the decorator, not a store.

    Keys live in process memory (the fixture runs one process), cleared by reset.
    """

    def __init__(self) -> None:
        self.entries: dict[tuple[str, str], tuple[str, StoredResponse | None]] = {}

    async def record_or_replay(self, *, scope: str, key: str, request_body: Any) -> StoredResponse | None:
        digest = request_hash(request_body)
        entry = self.entries.get((scope, key))
        if entry is None:
            self.entries[(scope, key)] = (digest, None)
            return None
        stored_digest, response = entry
        if stored_digest != digest:
            raise IdempotencyKeyReuse(
                "Idempotency key {} was replayed with a different request body", key, error_code=422
            )
        if response is None:
            raise IdempotencyKeyInFlight(
                "Idempotency key {} is still processing its original request", key, error_code=409
            )
        return StoredResponse(status=response.status, body=response.body, replayed=True)

    async def complete(self, *, scope: str, key: str, status: int, response_body: Any) -> None:
        digest, _ = self.entries[(scope, key)]
        self.entries[(scope, key)] = (digest, StoredResponse(status=status, body=dict(response_body)))


IDEMPOTENCY = CacheIdempotencyStore()


class ProductStore:
    """Implements the library's `ImportStore`, `TemplateSource`, `BatchCreateStore`
    and `BatchDeleteStore` over SQLite, plus the single-row operations."""

    def __init__(self) -> None:
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{DATABASE_PATH}")
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def start(self) -> None:
        """Recreate the temporary SQLite file, create the schema and seed it."""
        DATABASE_PATH.unlink(missing_ok=True)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        await self.reset()

    async def reset(self) -> None:
        """Hand-written test hook: restore the seed, the id sequence and the idempotency keys."""
        async with self.sessions() as session:
            await session.execute(delete(Product))
            await session.execute(text("DELETE FROM sqlite_sequence WHERE name = 'products'"))
            session.add_all(
                Product(
                    id=id_, name=name, category=category, price=price, active=active,
                    created_by="seed", updated_by="seed",
                )
                for id_, name, category, price, active in SEED_PRODUCTS
            )
            await session.commit()
        IDEMPOTENCY.entries.clear()

    # ImportStore
    async def import_rows(self, rows: Sequence[ProductRow], *, validate_only: bool) -> ImportCounts:
        async with self.sessions() as session:
            counts = await upsert(
                session,
                Product,
                [row.model_dump(by_alias=False) for row in rows],
                key=["id"],
                fields=["name", "category", "price", "active"],
                actor=ACTOR,
            )
            if validate_only:
                await session.rollback()
            else:
                await session.commit()
        return ImportCounts(counts.created, counts.updated, counts.skipped)

    # TemplateSource, and the export
    async def rows(self) -> Sequence[Product]:
        return await self.filtered(None, None, ())

    async def filtered(
        self, name: str | None, category: str | None, terms: Sequence[OrderField]
    ) -> Sequence[Product]:
        async with self.sessions() as session:
            stmt = keyset(
                self.filters(select(Product), name, category),
                columns=SORTABLE, terms=terms, cursor=None, id_column=Product.id,
            )
            return (await session.scalars(stmt)).all()

    @staticmethod
    def filters(stmt: Any, name: str | None, category: str | None) -> Any:
        if name:
            stmt = stmt.where(Product.name.icontains(name))
        if category:
            stmt = stmt.where(Product.category == category)
        return stmt

    async def page(
        self, size: int, cursor: Cursor | None, terms: Sequence[OrderField],
        name: str | None, category: str | None,
    ) -> Page[ProductOut]:
        stmt = keyset(
            self.filters(select(Product), name, category),
            columns=SORTABLE, terms=terms, cursor=cursor, id_column=Product.id,
        )
        async with self.sessions() as session:
            found = (await session.scalars(stmt.limit(size + 1))).all()
        window = found[:size]
        token = None
        if len(found) > size:
            last = window[-1]
            token = next_page_token([getattr(last, t.field) for t in terms], last.id, terms)
        return Page[ProductOut](
            items=[ProductOut.model_validate(p) for p in window], next_page_token=token
        )

    async def get(self, product_id: int) -> Product:
        async with self.sessions() as session:
            product = await session.get(Product, product_id)
        if product is None:
            raise LookupError(f"Product {product_id} not found")
        return product

    async def create(self, item: ProductIn) -> Product:
        product = Product(**item.model_dump(by_alias=False), created_by=ACTOR, updated_by=ACTOR)
        async with self.sessions() as session:
            session.add(product)
            await session.commit()
        return product

    async def update(self, product_id: int, item: ProductIn) -> Product:
        async with self.sessions() as session:
            product = await session.get(Product, product_id)
            if product is None:
                raise LookupError(f"Product {product_id} not found")
            product = await update_versioned(
                session, product, **item.model_dump(by_alias=False), updated_by=ACTOR
            )
            await session.commit()
        return product

    # BatchCreateStore
    async def create_many(self, items: Sequence[ProductIn]) -> Sequence[Product]:
        created = [
            Product(**item.model_dump(by_alias=False), created_by=ACTOR, updated_by=ACTOR) for item in items
        ]
        async with self.sessions() as session:
            session.add_all(created)
            await session.commit()
        return created

    # BatchDeleteStore
    async def find(self, ids: Sequence[str]) -> list[str]:
        async with self.sessions() as session:
            numeric = [int(i) for i in ids if i.isdigit()]
            found = await session.scalars(select(Product.id).where(Product.id.in_(numeric)))
            return [str(i) for i in found]

    async def delete_many(self, ids: Sequence[str]) -> None:
        async with self.sessions() as session:
            await session.execute(delete(Product).where(Product.id.in_([int(i) for i in ids])))
            await session.commit()


def build_router(store: ProductStore) -> APIRouter:
    def product_store() -> ProductStore:
        return store

    router = APIRouter(prefix="/api")
    router.include_router(import_router("/products", model=ProductRow, store=product_store, max_rows=5000))
    router.include_router(
        import_template_router("/products", model=ProductRow, source=product_store, max_rows=5000)
    )
    router.include_router(
        batch_create_router(
            "/products", model=ProductIn, response_model=ProductOut, resource_name="products",
            store=product_store, max_rows=100,
        )
    )
    router.include_router(
        batch_delete_router("/products", resource_label="Product", store=product_store, max_rows=100)
    )

    # Hand-written: the filters, which the library has no helper for.
    @router.get("/products")
    async def products_list(
        request: Request,
        fmt=Depends(tabular_format(("csv", "xlsx"))),
        page=Depends(page_params(cap=100, default=50)),
        terms=Depends(order_by_param(allowed=list(SORTABLE))),
        name: str | None = None,
        category: str | None = None,
    ) -> Any:
        if fmt is not None:
            rows = await store.filtered(name, category, terms)
            return await tabular_export(
                rows, ProductRow, fmt, f"products.{fmt.extension}", max_rows=5000, instance=request.url.path
            )
        return await store.page(*page, terms, name, category)

    def with_etag[R: Response](product: Product, response: R) -> R:
        response.headers["ETag"] = ETAGS.format(entity_id=product.id, version=product.version)
        return response

    def body(product: Product) -> dict[str, Any]:
        return ProductOut.model_validate(product).model_dump(mode="json")

    @router.get("/products/{product_id}")
    async def products_get(product_id: int) -> JSONResponse:
        product = await store.get(product_id)
        return with_etag(product, JSONResponse(body(product)))

    # Hand-written: `ETag` on create (the library supplies none), over its idempotency decorator.
    @router.post("/products", status_code=201)
    @idempotent(IDEMPOTENCY, scope="products")
    async def products_create(request: Request, item: ProductIn) -> JSONResponse:
        product = await store.create(item)
        return with_etag(product, JSONResponse(body(product), status_code=201))

    @router.patch("/products/{product_id}", openapi_extra=merge_patch_openapi())
    async def products_update(
        product_id: int,
        patch: Annotated[bytes, Depends(merge_patch_body())],
        if_match: Annotated[str, Depends(require_if_match(codec=ETAGS))],
    ) -> JSONResponse:
        current = await store.get(product_id)
        check_precondition(
            if_match, current_version=current.version, entity_id=product_id, codec=ETAGS
        )
        product = await store.update(product_id, merge_into(ProductIn, current, patch))
        return with_etag(product, JSONResponse(body(product)))

    # Hand-written test hook.
    @router.post("/_test/reset", status_code=204)
    async def reset() -> Response:
        await store.reset()
        return Response(status_code=204)

    return router
