from __future__ import annotations

import json
import os
import sqlite3
import threading
import unicodedata
from contextlib import closing, nullcontext
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .auth import build_session_expiry, generate_session_token, hash_password, verify_password
from .db_runtime import CompatConnection, connect_postgres, get_database_url, is_postgres_enabled
from .finance import (
    get_expense_category_label,
    get_period_bounds,
    is_date_in_range,
    list_expense_categories as _list_expense_categories,
    normalize_date_input,
    normalize_expense_category_key,
    parse_business_date,
)
from .orders import (
    apply_second_payment,
    build_order_from_quote,
    build_status_key,
    get_next_status,
    get_status_label,
    get_travel_transport_label,
    is_order_pending_collection,
    is_valid_order_status,
    list_default_order_statuses,
    normalize_travel_transport_type,
)
from .pending import (
    DEFAULT_PENDING_PRIORITY_KEY,
    DEFAULT_PENDING_STATUS_KEY,
    get_pending_priority_label,
    get_pending_status_label,
    is_valid_pending_status,
    normalize_pending_priority,
    normalize_pending_status,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = Path(
    os.environ.get("FERSHOP_DB_PATH", str(DATA_DIR / "fershop_app.sqlite3"))
).expanduser()

DEFAULT_COMPANY_SLUG = "fershop"
DEFAULT_COMPANY_NAME = "FerShop"
DEFAULT_COMPANY_BRAND_NAME = "FerShop USA"
DEFAULT_COMPANY_TAGLINE = "Cotizaciones elegantes para importacion y cierre comercial"
DEFAULT_COMPANY_LOGO_PATH = "/static/assets/fershop-logo-crop.jpg"
DEFAULT_ADMIN_USERNAME = os.environ.get("FERSHOP_DEFAULT_ADMIN_USERNAME", "fershop_admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("FERSHOP_DEFAULT_ADMIN_PASSWORD", "FerShop2026!")
CLOSED_ORDER_STATUS_KEY = "cycle_closed"
_INIT_LOCK = threading.Lock()
_INITIALIZED_TARGETS: dict[tuple[Any, ...], bool] = {}


def _cleanup_stale_files() -> None:
    if is_postgres_enabled():
        return
    if DB_PATH.exists() and DB_PATH.stat().st_size == 0:
        DB_PATH.unlink(missing_ok=True)

    for suffix in ("-journal", "-wal", "-shm"):
        sidecar = Path(f"{DB_PATH}{suffix}")
        sidecar.unlink(missing_ok=True)


def _connect() -> sqlite3.Connection | CompatConnection:
    if is_postgres_enabled():
        return connect_postgres()

    _cleanup_stale_files()
    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA journal_mode=MEMORY")
    connection.execute("PRAGMA temp_store=MEMORY")
    return connection


def _init_target_key() -> tuple[Any, ...]:
    return ("postgres", get_database_url(), id(_connect))


def _is_postgres_connection(connection: Any) -> bool:
    return bool(getattr(connection, "backend", "") == "postgres")


def _format_cop_plain(value: float) -> str:
    return f"${value:,.0f} COP".replace(",", ".")


def _normalize_catalog_name(value: Any) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""
    normalized = unicodedata.normalize("NFKD", raw_value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.casefold().split())


def _quote_input_line_items(input_data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = input_data.get("line_items", [])
    if not raw_items and isinstance(input_data.get("quote_items"), list):
        raw_items = input_data.get("quote_items", [])
    normalized_items: list[dict[str, Any]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            item_input = item.get("input") if isinstance(item.get("input"), dict) else item
            if not isinstance(item_input, dict):
                continue
            product_name = str(item.get("product_name") or item_input.get("product_name") or "").strip()
            if not product_name:
                continue
            try:
                quantity = int(item.get("quantity") or item_input.get("quantity") or 1)
            except (TypeError, ValueError):
                quantity = 1
            normalized_items.append(
                {
                    "product_id": item.get("product_id") or item_input.get("product_id"),
                    "product_name": product_name,
                    "quantity": max(quantity, 1),
                }
            )

    if normalized_items:
        return normalized_items

    fallback_product_name = str(input_data.get("product_name") or "").strip()
    if not fallback_product_name:
        return []
    return [
        {
            "product_id": input_data.get("product_id"),
            "product_name": fallback_product_name,
            "quantity": 1,
        }
    ]


def _quote_result_line_items(record: dict[str, Any]) -> list[dict[str, Any]]:
    result_data = record.get("result", {})
    input_data = record.get("input", {})
    raw_items = result_data.get("line_items", [])
    if not raw_items and isinstance(result_data.get("quote_items"), list):
        raw_items = result_data.get("quote_items", [])
    normalized_items: list[dict[str, Any]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            item_result = item.get("result", {}) if isinstance(item.get("result"), dict) else {}
            item_final = item_result.get("final", {}) if isinstance(item_result, dict) else {}
            product_name = str(item.get("product_name") or "").strip()
            if not product_name:
                continue
            try:
                quantity = int(item.get("quantity") or 1)
            except (TypeError, ValueError):
                quantity = 1
            normalized_items.append(
                {
                    "product_id": item.get("product_id"),
                    "product_name": product_name,
                    "quantity": max(quantity, 1),
                    "sale_price_cop": float(
                        item.get("sale_price_cop") or item_final.get("sale_price_cop") or 0
                    ),
                    "profit_cop": float(item.get("profit_cop") or item_final.get("profit_cop") or 0),
                }
            )

    if normalized_items:
        return normalized_items

    fallback_input_items = _quote_input_line_items(input_data)
    if len(fallback_input_items) != 1:
        return fallback_input_items

    fallback_item = fallback_input_items[0]
    final_data = result_data.get("final", {})
    fallback_item["sale_price_cop"] = float(final_data.get("sale_price_cop") or 0)
    fallback_item["profit_cop"] = float(final_data.get("profit_cop") or 0)
    return [fallback_item]


def _ensure_table_columns(
    connection: sqlite3.Connection | CompatConnection,
    table_name: str,
    columns: dict[str, str],
) -> None:
    if _is_postgres_connection(connection):
        existing = {
            row["column_name"]
            for row in connection.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ?
                """,
                (table_name,),
            ).fetchall()
        }
    else:
        existing = {
            row[1]
            for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
        }
    for column_name, column_definition in columns.items():
        if column_name not in existing:
            connection.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            )


def _get_table_columns(
    connection: sqlite3.Connection | CompatConnection,
    table_name: str,
) -> set[str]:
    if _is_postgres_connection(connection):
        return {
            row["column_name"]
            for row in connection.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ?
                """,
                (table_name,),
            ).fetchall()
        }

    return {
        row[1]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }


def _table_exists(connection: sqlite3.Connection | CompatConnection, table_name: str) -> bool:
    if _is_postgres_connection(connection):
        row = connection.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = ?
            """,
            (table_name,),
        ).fetchone()
    else:
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        ).fetchone()
    return row is not None


def _ensure_company_id_column(
    connection: sqlite3.Connection | CompatConnection,
    table_name: str,
    default_company_id: int,
) -> None:
    if not _table_exists(connection, table_name):
        return
    _ensure_table_columns(connection, table_name, {"company_id": "INTEGER NOT NULL DEFAULT 1"})
    connection.execute(
        f"UPDATE {table_name} SET company_id = ? WHERE company_id IS NULL OR company_id <= 0",
        (default_company_id,),
    )


def _insert_and_get_id(
    connection: sqlite3.Connection | CompatConnection,
    sql: str,
    params: tuple[Any, ...],
) -> int:
    if _is_postgres_connection(connection):
        cursor = connection.execute(f"{sql.rstrip().rstrip(';')} RETURNING id", params)
        row = cursor.fetchone()
        if row is None:
            raise RuntimeError("No se pudo recuperar el ID insertado en PostgreSQL.")
        return int(row[0])

    cursor = connection.execute(sql, params)
    return int(cursor.lastrowid)


def _ensure_default_company_and_admin(
    connection: sqlite3.Connection | CompatConnection,
) -> dict[str, Any]:
    connection.row_factory = sqlite3.Row
    existing_company = connection.execute(
        """
        SELECT id, slug, name, brand_name, tagline, logo_path, is_active
        FROM companies
        WHERE slug = ?
        """,
        (DEFAULT_COMPANY_SLUG,),
    ).fetchone()
    if existing_company is None:
        company_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO companies (
                created_at,
                slug,
                name,
                brand_name,
                tagline,
                logo_path,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                DEFAULT_COMPANY_SLUG,
                DEFAULT_COMPANY_NAME,
                DEFAULT_COMPANY_BRAND_NAME,
                DEFAULT_COMPANY_TAGLINE,
                DEFAULT_COMPANY_LOGO_PATH,
                1,
            ),
        )
    else:
        company_id = existing_company["id"]

    existing_user = connection.execute(
        """
        SELECT id
        FROM users
        WHERE username = ?
        """,
        (DEFAULT_ADMIN_USERNAME,),
    ).fetchone()
    if existing_user is None:
        salt_hex, hash_hex = hash_password(DEFAULT_ADMIN_PASSWORD)
        connection.execute(
            """
            INSERT INTO users (
                created_at,
                company_id,
                username,
                display_name,
                password_salt,
                password_hash,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                company_id,
                DEFAULT_ADMIN_USERNAME,
                "Administrador FerShop",
                salt_hex,
                hash_hex,
                1,
            ),
        )

    row = connection.execute(
        """
        SELECT id, slug, name, brand_name, tagline, logo_path, is_active
        FROM companies
        WHERE id = ?
        """,
        (company_id,),
    ).fetchone()
    return {
        "id": row["id"],
        "slug": row["slug"],
        "name": row["name"],
        "brand_name": row["brand_name"],
        "tagline": row["tagline"],
        "logo_path": row["logo_path"],
        "is_active": bool(row["is_active"]),
    }


def _ensure_product_dimension_value(
    connection: sqlite3.Connection | CompatConnection,
    table_name: str,
    name: str,
    company_id: int,
) -> dict[str, Any] | None:
    clean_name = str(name or "").strip()
    normalized_name = _normalize_catalog_name(clean_name)
    if not normalized_name:
        return None

    connection.row_factory = sqlite3.Row
    existing = connection.execute(
        f"""
        SELECT id, created_at, company_id, name
        FROM {table_name}
        WHERE company_id = ? AND normalized_name = ?
        """,
        (company_id, normalized_name),
    ).fetchone()
    if existing is not None:
        return {
            "id": existing["id"],
            "created_at": existing["created_at"],
            "company_id": existing["company_id"],
            "name": existing["name"],
        }

    created_at = datetime.now(timezone.utc).isoformat()
    item_id = _insert_and_get_id(
        connection,
        f"""
        INSERT INTO {table_name} (
            created_at,
            company_id,
            name,
            normalized_name
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            created_at,
            company_id,
            clean_name,
            normalized_name,
        ),
    )
    return {
        "id": item_id,
        "created_at": created_at,
        "company_id": company_id,
        "name": clean_name,
    }


def _seed_product_dimension_catalogs(
    connection: sqlite3.Connection | CompatConnection,
) -> None:
    if not _table_exists(connection, "products"):
        return

    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT company_id, category, store
        FROM products
        """
    ).fetchall()
    for row in rows:
        company_id = int(row["company_id"] or 1)
        _ensure_product_dimension_value(connection, "product_categories", row["category"], company_id)
        _ensure_product_dimension_value(connection, "product_stores", row["store"], company_id)


def _list_product_dimension_rows(
    table_name: str,
    *,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            f"""
            SELECT id, created_at, company_id, name, normalized_name
            FROM {table_name}
            WHERE company_id = ?
            ORDER BY normalized_name ASC, id ASC
            """,
            (company_id,),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "company_id": row["company_id"],
            "name": row["name"],
        }
        for row in rows
    ]


def _create_product_dimension_row(
    table_name: str,
    name: str,
    *,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        record = _ensure_product_dimension_value(connection, table_name, name, company_id)
        connection.commit()
    if record is None:
        raise ValueError("Debes enviar un nombre valido.")
    return record


def _serialize_status_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "key": row["status_key"],
        "label": row["label"],
        "description": row["description"],
        "sort_order": row["sort_order"],
        "is_active": bool(row["is_active"]),
        "is_system": bool(row["is_system"]),
    }


def _serialize_expense_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "expense_date": row["expense_date"],
        "category_key": row["category_key"],
        "category_label": get_expense_category_label(row["category_key"]),
        "concept": row["concept"],
        "amount_cop": row["amount_cop"],
        "notes": row["notes"],
    }


def _serialize_pending_request_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "company_id": row["company_id"],
        "client_id": row["client_id"],
        "client_name": row["client_name"],
        "title": row["title"],
        "category": row["category"],
        "desired_store": row["desired_store"],
        "desired_size": row["desired_size"],
        "desired_color": row["desired_color"],
        "quantity": int(row["quantity"] or 1),
        "budget_cop": float(row["budget_cop"] or 0),
        "priority_key": row["priority_key"],
        "priority_label": get_pending_priority_label(row["priority_key"]),
        "status_key": row["status_key"],
        "status_label": get_pending_status_label(row["status_key"]),
        "due_date": row["due_date"],
        "reference_url": row["reference_url"],
        "reference_notes": row["reference_notes"],
        "notes": row["notes"],
        "linked_quote_id": row["linked_quote_id"],
        "is_linked_to_quote": row["linked_quote_id"] is not None,
    }


def _record_payment_event(
    connection: sqlite3.Connection,
    *,
    company_id: int,
    order_id: int,
    payment_kind: str,
    amount_cop: float,
    payment_date: str,
    note: str = "",
) -> None:
    if amount_cop <= 0:
        return

    connection.execute(
        """
        INSERT INTO payment_events (
            created_at,
            company_id,
            order_id,
            payment_kind,
            amount_cop,
            payment_date,
            note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now(timezone.utc).isoformat(),
            company_id,
            order_id,
            payment_kind,
            amount_cop,
            payment_date,
            note,
        ),
    )


def _backfill_payment_events(connection: sqlite3.Connection) -> None:
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT
            id,
            company_id,
            created_at,
            advance_paid_cop,
            second_payment_amount_cop,
            second_payment_received_at
        FROM orders
        ORDER BY id ASC
        """
    ).fetchall()

    for row in rows:
        advance_exists = connection.execute(
            """
            SELECT 1
            FROM payment_events
            WHERE order_id = ? AND company_id = ? AND payment_kind = 'advance'
            LIMIT 1
            """,
            (row["id"], row["company_id"]),
        ).fetchone()
        if not advance_exists and float(row["advance_paid_cop"] or 0) > 0:
            _record_payment_event(
                connection,
                company_id=row["company_id"],
                order_id=row["id"],
                payment_kind="advance",
                amount_cop=float(row["advance_paid_cop"] or 0),
                payment_date=normalize_date_input(row["created_at"]).isoformat(),
                note="Anticipo inicial registrado desde la compra.",
            )

        balance_exists = connection.execute(
            """
            SELECT 1
            FROM payment_events
            WHERE order_id = ? AND company_id = ? AND payment_kind = 'balance'
            LIMIT 1
            """,
            (row["id"], row["company_id"]),
        ).fetchone()
        if (
            not balance_exists
            and float(row["second_payment_amount_cop"] or 0) > 0
            and str(row["second_payment_received_at"] or "").strip()
        ):
            _record_payment_event(
                connection,
                company_id=row["company_id"],
                order_id=row["id"],
                payment_kind="balance",
                amount_cop=float(row["second_payment_amount_cop"] or 0),
                payment_date=parse_business_date(
                    row["second_payment_received_at"],
                    field_name="fecha del segundo pago",
                ).isoformat(),
                note="Pago final migrado desde el historial existente.",
            )


def _list_status_rows(
    connection: sqlite3.Connection,
    company_id: int,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    connection.row_factory = sqlite3.Row
    query = """
        SELECT id, created_at, status_key, label, description, sort_order, is_active, is_system
        FROM company_order_statuses
        WHERE company_id = ?
    """
    params: list[Any] = [company_id]
    if not include_inactive:
        query += " AND is_active = 1"
    query += " ORDER BY sort_order ASC, id ASC"
    rows = connection.execute(query, tuple(params)).fetchall()
    return [_serialize_status_row(row) for row in rows]


def _seed_default_order_statuses(connection: sqlite3.Connection, default_company_id: int) -> None:
    connection.row_factory = sqlite3.Row
    existing_rows = connection.execute(
        """
        SELECT status_key
        FROM company_order_statuses
        WHERE company_id = ?
        ORDER BY id ASC
        """,
        (default_company_id,),
    ).fetchall()
    existing_keys = {row["status_key"] for row in existing_rows}
    active_defaults = list_default_order_statuses()
    all_defaults = list_default_order_statuses(include_legacy=True)

    if not existing_keys:
        for sort_order, status in enumerate(active_defaults, start=1):
            connection.execute(
                """
                INSERT INTO company_order_statuses (
                    created_at,
                    company_id,
                    status_key,
                    label,
                    description,
                    sort_order,
                    is_active,
                    is_system
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    default_company_id,
                    status["key"],
                    status["label"],
                    status["description"],
                    sort_order,
                    1,
                    1,
                ),
            )
        current_order = len(active_defaults)
        for status in all_defaults[len(active_defaults) :]:
            current_order += 1
            connection.execute(
                """
                INSERT INTO company_order_statuses (
                    created_at,
                    company_id,
                    status_key,
                    label,
                    description,
                    sort_order,
                    is_active,
                    is_system
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    default_company_id,
                    status["key"],
                    status["label"],
                    status["description"],
                    current_order,
                    0,
                    1,
                ),
            )
        return

    current_order = connection.execute(
        "SELECT COALESCE(MAX(sort_order), 0) FROM company_order_statuses WHERE company_id = ?",
        (default_company_id,),
    ).fetchone()[0]
    for status in all_defaults:
        if status["key"] in existing_keys:
            continue
        current_order += 1
        connection.execute(
            """
            INSERT INTO company_order_statuses (
                created_at,
                company_id,
                status_key,
                label,
                description,
                sort_order,
                is_active,
                is_system
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                default_company_id,
                status["key"],
                status["label"],
                status["description"],
                current_order,
                0 if status["key"] == "second_payment_pending" else 1,
                1,
            ),
        )


def _migrate_legacy_order_states(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        UPDATE orders
        SET status_key = CASE
            WHEN balance_due_cop > 0 THEN 'client_notified'
            ELSE 'second_payment_received'
        END
        WHERE status_key = 'second_payment_pending'
        """
    )


def init_db(skip_defaults: bool = False) -> None:
    target_key: tuple[Any, ...] | None = None
    init_context = nullcontext()
    if is_postgres_enabled():
        target_key = _init_target_key()
        init_level = _INITIALIZED_TARGETS.get(target_key)
        if init_level is True or (skip_defaults and init_level is False):
            return
        init_context = _INIT_LOCK

    with init_context:
        if target_key is not None:
            init_level = _INITIALIZED_TARGETS.get(target_key)
            if init_level is True or (skip_defaults and init_level is False):
                return

        if not is_postgres_enabled():
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with closing(_connect()) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    brand_name TEXT NOT NULL,
                    tagline TEXT NOT NULL DEFAULT '',
                    logo_path TEXT NOT NULL DEFAULT '',
                    is_active INTEGER NOT NULL DEFAULT 1
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL,
                    username TEXT NOT NULL UNIQUE,
                    display_name TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_token TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT NOT NULL,
                    city TEXT NOT NULL,
                    address TEXT NOT NULL DEFAULT '',
                    neighborhood TEXT NOT NULL DEFAULT '',
                    preferred_contact_channel TEXT NOT NULL DEFAULT '',
                    preferred_payment_method TEXT NOT NULL DEFAULT '',
                    interests TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL
                )
                """
            )
            _ensure_table_columns(
                connection,
                "clients",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "address": "TEXT NOT NULL DEFAULT ''",
                    "neighborhood": "TEXT NOT NULL DEFAULT ''",
                    "preferred_contact_channel": "TEXT NOT NULL DEFAULT ''",
                    "preferred_payment_method": "TEXT NOT NULL DEFAULT ''",
                    "interests": "TEXT NOT NULL DEFAULT ''",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    reference TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    store TEXT NOT NULL DEFAULT '',
                    price_usd_net REAL NOT NULL,
                    tax_usa_percent REAL NOT NULL,
                    locker_shipping_usd REAL NOT NULL,
                    notes TEXT NOT NULL
                )
                """
            )
            _ensure_table_columns(
                connection,
                "products",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "category": "TEXT NOT NULL DEFAULT ''",
                    "store": "TEXT NOT NULL DEFAULT ''",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS product_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    normalized_name TEXT NOT NULL,
                    UNIQUE(company_id, normalized_name)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS product_stores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    normalized_name TEXT NOT NULL,
                    UNIQUE(company_id, normalized_name)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    client_id INTEGER,
                    client_name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    desired_store TEXT NOT NULL DEFAULT '',
                    desired_size TEXT NOT NULL DEFAULT '',
                    desired_color TEXT NOT NULL DEFAULT '',
                    quantity INTEGER NOT NULL DEFAULT 1,
                    budget_cop REAL NOT NULL DEFAULT 0,
                    priority_key TEXT NOT NULL DEFAULT 'normal',
                    status_key TEXT NOT NULL DEFAULT 'new',
                    due_date TEXT NOT NULL DEFAULT '',
                    reference_url TEXT NOT NULL DEFAULT '',
                    reference_notes TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    linked_quote_id INTEGER
                )
                """
            )
            _ensure_table_columns(
                connection,
                "pending_requests",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "client_id": "INTEGER",
                    "client_name": "TEXT NOT NULL DEFAULT ''",
                    "category": "TEXT NOT NULL DEFAULT ''",
                    "desired_store": "TEXT NOT NULL DEFAULT ''",
                    "desired_size": "TEXT NOT NULL DEFAULT ''",
                    "desired_color": "TEXT NOT NULL DEFAULT ''",
                    "quantity": "INTEGER NOT NULL DEFAULT 1",
                    "budget_cop": "REAL NOT NULL DEFAULT 0",
                    "priority_key": "TEXT NOT NULL DEFAULT 'normal'",
                    "status_key": "TEXT NOT NULL DEFAULT 'new'",
                    "due_date": "TEXT NOT NULL DEFAULT ''",
                    "reference_url": "TEXT NOT NULL DEFAULT ''",
                    "reference_notes": "TEXT NOT NULL DEFAULT ''",
                    "notes": "TEXT NOT NULL DEFAULT ''",
                    "linked_quote_id": "INTEGER",
                    "updated_at": "TEXT NOT NULL DEFAULT ''",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS quotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    client_name TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    notes TEXT NOT NULL,
                    input_json TEXT NOT NULL,
                    result_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS company_order_statuses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL,
                    status_key TEXT NOT NULL,
                    label TEXT NOT NULL,
                    description TEXT NOT NULL,
                    sort_order INTEGER NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    is_system INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(company_id, status_key)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    quote_id INTEGER NOT NULL UNIQUE,
                    client_id INTEGER,
                    product_id INTEGER,
                    client_name TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    status_key TEXT NOT NULL,
                    sale_price_cop REAL NOT NULL,
                    advance_paid_cop REAL NOT NULL,
                    second_payment_amount_cop REAL NOT NULL DEFAULT 0,
                    second_payment_received_at TEXT NOT NULL DEFAULT '',
                    travel_transport_type TEXT NOT NULL DEFAULT '',
                    balance_due_cop REAL NOT NULL,
                    notes TEXT NOT NULL,
                    snapshot_json TEXT NOT NULL
                )
                """
            )
            _ensure_table_columns(
                connection,
                "orders",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "second_payment_amount_cop": "REAL NOT NULL DEFAULT 0",
                    "second_payment_received_at": "TEXT NOT NULL DEFAULT ''",
                    "travel_transport_type": "TEXT NOT NULL DEFAULT ''",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS order_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    order_id INTEGER NOT NULL,
                    status_key TEXT NOT NULL,
                    note TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS payment_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    order_id INTEGER NOT NULL,
                    payment_kind TEXT NOT NULL,
                    amount_cop REAL NOT NULL,
                    payment_date TEXT NOT NULL,
                    note TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    expense_date TEXT NOT NULL,
                    category_key TEXT NOT NULL,
                    concept TEXT NOT NULL,
                    amount_cop REAL NOT NULL,
                    notes TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_clients_company_created ON clients (company_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_products_company_created ON products (company_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_product_categories_company_name ON product_categories (company_id, name ASC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_product_stores_company_name ON product_stores (company_id, name ASC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_pending_requests_company_status ON pending_requests (company_id, status_key, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_pending_requests_company_client ON pending_requests (company_id, client_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_quotes_company_created ON quotes (company_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders (company_id, status_key, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_order_events_company_order ON order_events (company_id, order_id, id ASC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_payment_events_company_order ON payment_events (company_id, order_id, id ASC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses (company_id, expense_date DESC, id DESC)"
            )

            default_company_id = 1
            if not skip_defaults:
                default_company = _ensure_default_company_and_admin(connection)
                default_company_id = int(default_company["id"])

            _ensure_company_id_column(connection, "clients", default_company_id)
            _ensure_company_id_column(connection, "products", default_company_id)
            _ensure_company_id_column(connection, "product_categories", default_company_id)
            _ensure_company_id_column(connection, "product_stores", default_company_id)
            _ensure_company_id_column(connection, "pending_requests", default_company_id)
            _ensure_company_id_column(connection, "quotes", default_company_id)
            _ensure_company_id_column(connection, "orders", default_company_id)
            _ensure_company_id_column(connection, "order_events", default_company_id)
            _ensure_company_id_column(connection, "payment_events", default_company_id)
            _ensure_company_id_column(connection, "expenses", default_company_id)
            _seed_product_dimension_catalogs(connection)
            if not skip_defaults:
                _seed_default_order_statuses(connection, default_company_id=default_company_id)
                _migrate_legacy_order_states(connection)
                _backfill_payment_events(connection)
            connection.commit()
            if target_key is not None:
                _INITIALIZED_TARGETS[target_key] = not skip_defaults


def get_default_company_id() -> int:
    init_db()
    with closing(_connect()) as connection:
        row = connection.execute(
            "SELECT id FROM companies WHERE slug = ?",
            (DEFAULT_COMPANY_SLUG,),
        ).fetchone()
    return int(row[0])


def _normalize_company_id(company_id: int | None) -> int:
    return int(company_id) if company_id is not None else get_default_company_id()


def _serialize_company_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "name": row["name"],
        "brand_name": row["brand_name"],
        "tagline": row["tagline"],
        "logo_path": row["logo_path"],
        "is_active": bool(row["is_active"]),
    }


def get_company(company_id: int) -> dict[str, Any] | None:
    init_db()
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT id, slug, name, brand_name, tagline, logo_path, is_active
            FROM companies
            WHERE id = ?
            """,
            (company_id,),
        ).fetchone()
    if row is None:
        return None
    return _serialize_company_row(row)


def create_company_with_admin(
    *,
    slug: str,
    name: str,
    brand_name: str,
    tagline: str = "",
    logo_path: str = "",
    username: str,
    password: str,
    display_name: str = "",
) -> dict[str, Any]:
    init_db()

    clean_name = str(name or "").strip()
    clean_brand_name = str(brand_name or "").strip() or clean_name
    clean_slug_source = str(slug or "").strip() or clean_name
    clean_slug = build_status_key(clean_slug_source).replace("_", "-")
    clean_tagline = str(tagline or "").strip()
    clean_logo_path = str(logo_path or "").strip() or DEFAULT_COMPANY_LOGO_PATH
    clean_username = str(username or "").strip().lower()
    clean_password = str(password or "")
    clean_display_name = str(display_name or "").strip() or clean_brand_name

    if not clean_name:
        raise ValueError("El nombre de la empresa es obligatorio.")
    if not clean_username:
        raise ValueError("El usuario administrador es obligatorio.")

    created_at = datetime.now(timezone.utc).isoformat()
    salt_hex, hash_hex = hash_password(clean_password)

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing_company = connection.execute(
            "SELECT id FROM companies WHERE slug = ?",
            (clean_slug,),
        ).fetchone()
        if existing_company is not None:
            raise ValueError("Ya existe una empresa con ese identificador.")

        existing_user = connection.execute(
            "SELECT id FROM users WHERE username = ?",
            (clean_username,),
        ).fetchone()
        if existing_user is not None:
            raise ValueError("Ese usuario ya existe.")

        company_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO companies (
                created_at,
                slug,
                name,
                brand_name,
                tagline,
                logo_path,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                clean_slug,
                clean_name,
                clean_brand_name,
                clean_tagline,
                clean_logo_path,
                1,
            ),
        )
        _seed_default_order_statuses(connection, default_company_id=company_id)
        user_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO users (
                created_at,
                company_id,
                username,
                display_name,
                password_salt,
                password_hash,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                clean_username,
                clean_display_name,
                salt_hex,
                hash_hex,
                1,
            ),
        )
        connection.commit()

        company_row = connection.execute(
            """
            SELECT id, slug, name, brand_name, tagline, logo_path, is_active
            FROM companies
            WHERE id = ?
            """,
            (company_id,),
        ).fetchone()

    return {
        "company": _serialize_company_row(company_row),
        "user": {
            "id": user_id,
            "username": clean_username,
            "display_name": clean_display_name,
        },
    }


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    init_db()
    clean_username = str(username or "").strip()
    clean_password = str(password or "")
    if not clean_username or not clean_password:
        return None

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                users.id AS user_id,
                users.company_id,
                users.username,
                users.display_name,
                users.password_salt,
                users.password_hash,
                users.is_active,
                companies.slug,
                companies.name,
                companies.brand_name,
                companies.tagline,
                companies.logo_path,
                companies.is_active AS company_is_active
            FROM users
            JOIN companies ON companies.id = users.company_id
            WHERE users.username = ?
            """,
            (clean_username,),
        ).fetchone()
    if row is None:
        return None
    if not bool(row["is_active"]) or not bool(row["company_is_active"]):
        return None
    if not verify_password(clean_password, row["password_salt"], row["password_hash"]):
        return None

    return {
        "user_id": row["user_id"],
        "company_id": row["company_id"],
        "username": row["username"],
        "display_name": row["display_name"],
        "company": {
            "id": row["company_id"],
            "slug": row["slug"],
            "name": row["name"],
            "brand_name": row["brand_name"],
            "tagline": row["tagline"],
            "logo_path": row["logo_path"],
        },
    }


def create_session_for_user(user_data: dict[str, Any]) -> str:
    init_db()
    created_at = datetime.now(timezone.utc).isoformat()
    expires_at = build_session_expiry()
    session_token = generate_session_token()

    with closing(_connect()) as connection:
        connection.execute(
            """
            INSERT INTO sessions (
                session_token,
                created_at,
                expires_at,
                user_id,
                company_id
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                session_token,
                created_at,
                expires_at,
                user_data["user_id"],
                user_data["company_id"],
            ),
        )
        connection.commit()
    return session_token


def get_session_by_token(session_token: str) -> dict[str, Any] | None:
    init_db()
    clean_token = str(session_token or "").strip()
    if not clean_token:
        return None

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                sessions.session_token,
                sessions.expires_at,
                users.id AS user_id,
                users.username,
                users.display_name,
                users.is_active,
                companies.id AS company_id,
                companies.slug,
                companies.name,
                companies.brand_name,
                companies.tagline,
                companies.logo_path,
                companies.is_active AS company_is_active
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            JOIN companies ON companies.id = sessions.company_id
            WHERE sessions.session_token = ?
            """,
            (clean_token,),
        ).fetchone()
        if row is None:
            return None

        expires_at = datetime.fromisoformat(row["expires_at"])
        if expires_at <= datetime.now(timezone.utc):
            connection.execute(
                "DELETE FROM sessions WHERE session_token = ?",
                (clean_token,),
            )
            connection.commit()
            return None

        if not bool(row["is_active"]) or not bool(row["company_is_active"]):
            return None

    return {
        "session_token": row["session_token"],
        "user": {
            "id": row["user_id"],
            "username": row["username"],
            "display_name": row["display_name"],
        },
        "company": {
            "id": row["company_id"],
            "slug": row["slug"],
            "name": row["name"],
            "brand_name": row["brand_name"],
            "tagline": row["tagline"],
            "logo_path": row["logo_path"],
        },
    }


def delete_session(session_token: str) -> None:
    init_db()
    clean_token = str(session_token or "").strip()
    if not clean_token:
        return
    with closing(_connect()) as connection:
        connection.execute("DELETE FROM sessions WHERE session_token = ?", (clean_token,))
        connection.commit()


def _resolve_pending_client_snapshot(
    connection: sqlite3.Connection | CompatConnection,
    *,
    company_id: int,
    client_id: int | None,
    client_name: str = "",
) -> tuple[int | None, str]:
    clean_name = str(client_name or "").strip()
    if client_id in (None, "", 0):
        if not clean_name:
            raise ValueError("Selecciona un cliente valido para este pendiente.")
        return None, clean_name

    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT id, name
        FROM clients
        WHERE id = ? AND company_id = ?
        """,
        (int(client_id), company_id),
    ).fetchone()
    if row is None:
        raise ValueError("El cliente seleccionado para este pendiente no existe.")
    return int(row["id"]), str(row["name"])


def _link_pending_request_to_quote(
    connection: sqlite3.Connection | CompatConnection,
    *,
    pending_request_id: int,
    quote_id: int,
    company_id: int,
) -> None:
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT id
        FROM pending_requests
        WHERE id = ? AND company_id = ?
        """,
        (pending_request_id, company_id),
    ).fetchone()
    if row is None:
        raise ValueError("El pendiente que intentas convertir no existe.")

    connection.execute(
        """
        UPDATE pending_requests
        SET linked_quote_id = ?,
            status_key = ?,
            updated_at = ?
        WHERE id = ? AND company_id = ?
        """,
        (
            quote_id,
            "quoted",
            datetime.now(timezone.utc).isoformat(),
            pending_request_id,
            company_id,
        ),
    )


def save_pending_request(
    pending_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    updated_at = created_at

    with closing(_connect()) as connection:
        resolved_client_id, resolved_client_name = _resolve_pending_client_snapshot(
            connection,
            company_id=company_id,
            client_id=pending_data.get("client_id"),
            client_name=str(pending_data.get("client_name", "")).strip(),
        )
        pending_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO pending_requests (
                created_at,
                updated_at,
                company_id,
                client_id,
                client_name,
                title,
                category,
                desired_store,
                desired_size,
                desired_color,
                quantity,
                budget_cop,
                priority_key,
                status_key,
                due_date,
                reference_url,
                reference_notes,
                notes,
                linked_quote_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                updated_at,
                company_id,
                resolved_client_id,
                resolved_client_name,
                str(pending_data.get("title", "")).strip(),
                str(pending_data.get("category", "")).strip(),
                str(pending_data.get("desired_store", "")).strip(),
                str(pending_data.get("desired_size", "")).strip(),
                str(pending_data.get("desired_color", "")).strip(),
                max(int(pending_data.get("quantity") or 1), 1),
                float(pending_data.get("budget_cop") or 0),
                normalize_pending_priority(pending_data.get("priority_key")),
                normalize_pending_status(pending_data.get("status_key")),
                str(pending_data.get("due_date", "")).strip(),
                str(pending_data.get("reference_url", "")).strip(),
                str(pending_data.get("reference_notes", "")).strip(),
                str(pending_data.get("notes", "")).strip(),
                None,
            ),
        )
        connection.commit()

    record = get_pending_request(pending_id, company_id=company_id)
    if record is None:
        raise ValueError("No fue posible cargar el pendiente guardado.")
    return record


def list_pending_requests(
    limit: int = 100,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                client_id,
                client_name,
                title,
                category,
                desired_store,
                desired_size,
                desired_color,
                quantity,
                budget_cop,
                priority_key,
                status_key,
                due_date,
                reference_url,
                reference_notes,
                notes,
                linked_quote_id
            FROM pending_requests
            WHERE company_id = ?
            ORDER BY
                CASE WHEN status_key IN ('quoted', 'discarded') THEN 1 ELSE 0 END ASC,
                CASE priority_key
                    WHEN 'urgent' THEN 0
                    WHEN 'high' THEN 1
                    WHEN 'normal' THEN 2
                    ELSE 3
                END ASC,
                CASE WHEN due_date = '' THEN 1 ELSE 0 END ASC,
                due_date ASC,
                id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()

    return [_serialize_pending_request_row(row) for row in rows]


def get_pending_request(
    pending_request_id: int,
    company_id: int | None = None,
) -> dict[str, Any] | None:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                client_id,
                client_name,
                title,
                category,
                desired_store,
                desired_size,
                desired_color,
                quantity,
                budget_cop,
                priority_key,
                status_key,
                due_date,
                reference_url,
                reference_notes,
                notes,
                linked_quote_id
            FROM pending_requests
            WHERE id = ? AND company_id = ?
            """,
            (pending_request_id, company_id),
        ).fetchone()

    if row is None:
        return None
    return _serialize_pending_request_row(row)


def update_pending_request_status(
    pending_request_id: int,
    status_key: str,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    normalized_status = normalize_pending_status(status_key)

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            """
            SELECT id, linked_quote_id
            FROM pending_requests
            WHERE id = ? AND company_id = ?
            """,
            (pending_request_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("El pendiente no existe.")
        if normalized_status == "quoted" and existing["linked_quote_id"] is None:
            raise ValueError("Solo puedes marcarlo como cotizado cuando ya exista una cotizacion.")

        connection.execute(
            """
            UPDATE pending_requests
            SET status_key = ?,
                updated_at = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                normalized_status,
                datetime.now(timezone.utc).isoformat(),
                pending_request_id,
                company_id,
            ),
        )
        connection.commit()

    record = get_pending_request(pending_request_id, company_id=company_id)
    if record is None:
        raise ValueError("No fue posible cargar el pendiente actualizado.")
    return record


def save_quote(
    input_data: dict[str, Any],
    result_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    raw_pending_request_id = input_data.get("pending_request_id")
    pending_request_id = None
    if raw_pending_request_id not in (None, "", 0):
        try:
            pending_request_id = int(raw_pending_request_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("El pendiente asociado a la cotizacion no es valido.") from exc

    with closing(_connect()) as connection:
        quote_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO quotes (
                created_at,
                company_id,
                client_name,
                product_name,
                notes,
                input_json,
                result_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                input_data.get("client_name", ""),
                input_data.get("product_name", ""),
                input_data.get("notes", ""),
                json.dumps(input_data, ensure_ascii=False),
                json.dumps(result_data, ensure_ascii=False),
            ),
        )
        if pending_request_id is not None:
            _link_pending_request_to_quote(
                connection,
                pending_request_id=pending_request_id,
                quote_id=quote_id,
                company_id=company_id,
            )
        connection.commit()

    return {
        "id": quote_id,
        "created_at": created_at,
        "company_id": company_id,
        "client_name": input_data.get("client_name", ""),
        "product_name": input_data.get("product_name", ""),
        "notes": input_data.get("notes", ""),
        "result": result_data,
    }


def update_quote(
    quote_id: int,
    input_data: dict[str, Any],
    result_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    raw_pending_request_id = input_data.get("pending_request_id")
    pending_request_id = None
    if raw_pending_request_id not in (None, "", 0):
        try:
            pending_request_id = int(raw_pending_request_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("El pendiente asociado a la cotizacion no es valido.") from exc

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            """
            SELECT id, created_at
            FROM quotes
            WHERE id = ? AND company_id = ?
            """,
            (quote_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("La cotizacion no existe.")

        order_row = connection.execute(
            "SELECT id FROM orders WHERE quote_id = ? AND company_id = ?",
            (quote_id, company_id),
        ).fetchone()
        if order_row is not None:
            raise ValueError("No puedes editar una cotizacion que ya fue convertida en compra.")

        connection.execute(
            """
            UPDATE quotes
            SET client_name = ?,
                product_name = ?,
                notes = ?,
                input_json = ?,
                result_json = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                input_data.get("client_name", ""),
                input_data.get("product_name", ""),
                input_data.get("notes", ""),
                json.dumps(input_data, ensure_ascii=False),
                json.dumps(result_data, ensure_ascii=False),
                quote_id,
                company_id,
            ),
        )
        if pending_request_id is not None:
            _link_pending_request_to_quote(
                connection,
                pending_request_id=pending_request_id,
                quote_id=quote_id,
                company_id=company_id,
            )
        connection.commit()

    record = get_quote(quote_id, company_id=company_id)
    if record is None:
        raise ValueError("No fue posible cargar la cotizacion actualizada.")
    return record


def save_client(client_data: dict[str, Any], company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        client_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO clients (
                created_at,
                company_id,
                name,
                phone,
                email,
                city,
                address,
                neighborhood,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                client_data.get("name", ""),
                client_data.get("phone", ""),
                client_data.get("email", ""),
                client_data.get("city", ""),
                client_data.get("address", ""),
                client_data.get("neighborhood", ""),
                client_data.get("preferred_contact_channel", ""),
                client_data.get("preferred_payment_method", ""),
                client_data.get("interests", ""),
                client_data.get("notes", ""),
            ),
        )
        connection.commit()

    return {
        "id": client_id,
        "created_at": created_at,
        "company_id": company_id,
        "name": client_data.get("name", ""),
        "phone": client_data.get("phone", ""),
        "email": client_data.get("email", ""),
        "city": client_data.get("city", ""),
        "address": client_data.get("address", ""),
        "neighborhood": client_data.get("neighborhood", ""),
        "preferred_contact_channel": client_data.get("preferred_contact_channel", ""),
        "preferred_payment_method": client_data.get("preferred_payment_method", ""),
        "interests": client_data.get("interests", ""),
        "notes": client_data.get("notes", ""),
    }


def list_clients(limit: int = 100, company_id: int | None = None) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                phone,
                email,
                city,
                address,
                neighborhood,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes
            FROM clients
            WHERE company_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "company_id": row["company_id"],
            "name": row["name"],
            "phone": row["phone"],
            "email": row["email"],
            "city": row["city"],
            "address": row["address"],
            "neighborhood": row["neighborhood"],
            "preferred_contact_channel": row["preferred_contact_channel"],
            "preferred_payment_method": row["preferred_payment_method"],
            "interests": row["interests"],
            "notes": row["notes"],
        }
        for row in rows
    ]


def get_client_detail(client_id: int, company_id: int | None = None) -> dict[str, Any] | None:
    init_db()
    company_id = _normalize_company_id(company_id)

    def _match_entity(
        target_id: int, target_name: str, candidate_id: Any, candidate_name: Any
    ) -> bool:
        clean_candidate_id = str(candidate_id).strip() if candidate_id not in (None, "") else ""
        if clean_candidate_id:
            return clean_candidate_id == str(target_id)
        return str(candidate_name or "").strip().casefold() == target_name.casefold()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        client_row = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                phone,
                email,
                city,
                address,
                neighborhood,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes
            FROM clients
            WHERE id = ? AND company_id = ?
            """,
            (client_id, company_id),
        ).fetchone()
        if client_row is None:
            return None

        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]

        quote_rows = connection.execute(
            """
            SELECT id, created_at, client_name, product_name, notes, input_json, result_json
            FROM quotes
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        order_rows = connection.execute(
            """
            SELECT *
            FROM orders
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        payment_rows = connection.execute(
            """
            SELECT order_id, amount_cop
            FROM payment_events
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()

        orders_by_quote_id = {
            int(row["quote_id"]): int(row["id"])
            for row in order_rows
            if row["quote_id"] not in (None, "")
        }

        matching_quotes: list[dict[str, Any]] = []
        for row in quote_rows:
            input_data = json.loads(row["input_json"])
            if not _match_entity(
                client_row["id"],
                str(client_row["name"]),
                input_data.get("client_id"),
                row["client_name"],
            ):
                continue

            result_data = json.loads(row["result_json"])
            final_data = result_data.get("final", {})
            matching_quotes.append(
                {
                    "id": row["id"],
                    "created_at": row["created_at"],
                    "client_name": row["client_name"],
                    "product_name": row["product_name"],
                    "notes": row["notes"],
                    "input": input_data,
                    "result": result_data,
                    "sale_price_cop": float(final_data.get("sale_price_cop") or 0),
                    "quoted_advance_cop": float(final_data.get("advance_cop") or 0),
                    "profit_cop": float(final_data.get("profit_cop") or 0),
                    "has_order": row["id"] in orders_by_quote_id,
                    "order_id": orders_by_quote_id.get(row["id"]),
                }
            )

        matching_order_rows = [
            row
            for row in order_rows
            if _match_entity(
                client_row["id"],
                str(client_row["name"]),
                row["client_id"],
                row["client_name"],
            )
        ]
        events_by_order_id = _list_order_events(
            connection,
            [row["id"] for row in matching_order_rows],
            all_statuses,
            company_id,
        )

    payment_totals_by_order_id: dict[int, float] = {}
    for row in payment_rows:
        order_id = int(row["order_id"] or 0)
        payment_totals_by_order_id[order_id] = payment_totals_by_order_id.get(order_id, 0.0) + float(
            row["amount_cop"] or 0
        )

    recent_orders = [
        _serialize_order(
            row,
            events_by_order_id.get(row["id"], []),
            all_statuses,
            active_statuses,
        )
        for row in matching_order_rows[:6]
    ]

    total_sales_cop = 0.0
    gross_profit_cop = 0.0
    accounts_receivable_cop = 0.0
    open_orders_count = 0
    cash_in_total_cop = 0.0
    top_products: dict[str, dict[str, Any]] = {}
    for quote in matching_quotes:
        quote_line_items = _quote_result_line_items(quote)
        for line_item in quote_line_items:
            product_name = str(line_item.get("product_name") or quote["product_name"] or "").strip()
            product_key = str(line_item.get("product_id") or product_name or "").strip() or str(
                quote["id"]
            )
            bucket = top_products.setdefault(
                product_key,
                {
                    "product_id": line_item.get("product_id"),
                    "product_name": product_name or "Producto sin nombre",
                    "quotes_count": 0,
                    "orders_count": 0,
                    "quoted_sales_total_cop": 0.0,
                    "sales_total_cop": 0.0,
                    "gross_profit_cop": 0.0,
                },
            )
            bucket["quotes_count"] += 1
            bucket["quoted_sales_total_cop"] += float(line_item.get("sale_price_cop") or 0)

    for row in matching_order_rows:
        snapshot = json.loads(row["snapshot_json"])
        order_profit_cop = float(snapshot.get("result", {}).get("final", {}).get("profit_cop") or 0)
        order_sales_cop = float(row["sale_price_cop"] or 0)
        total_sales_cop += order_sales_cop
        gross_profit_cop += order_profit_cop
        if is_order_pending_collection(row["status_key"], row["balance_due_cop"]):
            accounts_receivable_cop += float(row["balance_due_cop"] or 0)
        cash_in_total_cop += payment_totals_by_order_id.get(int(row["id"]), 0.0)
        if row["status_key"] != CLOSED_ORDER_STATUS_KEY:
            open_orders_count += 1

        for line_item in _quote_result_line_items(snapshot):
            product_name = str(line_item.get("product_name") or row["product_name"] or "").strip()
            product_key = str(line_item.get("product_id") or product_name or "").strip() or str(
                row["id"]
            )
            bucket = top_products.setdefault(
                product_key,
                {
                    "product_id": line_item.get("product_id"),
                    "product_name": product_name or "Producto sin nombre",
                    "quotes_count": 0,
                    "orders_count": 0,
                    "quoted_sales_total_cop": 0.0,
                    "sales_total_cop": 0.0,
                    "gross_profit_cop": 0.0,
                },
            )
            bucket["orders_count"] += 1
            bucket["sales_total_cop"] += float(line_item.get("sale_price_cop") or 0)
            bucket["gross_profit_cop"] += float(line_item.get("profit_cop") or 0)

    sorted_products = sorted(
        top_products.values(),
        key=lambda item: (
            -item["orders_count"],
            -item["sales_total_cop"],
            -item["quotes_count"],
            item["product_name"].casefold(),
        ),
    )

    quotes_count = len(matching_quotes)
    orders_count = len(matching_order_rows)
    average_ticket_cop = total_sales_cop / orders_count if orders_count else 0.0
    conversion_rate_percent = orders_count / quotes_count if quotes_count else 0.0
    last_quote_at = matching_quotes[0]["created_at"] if matching_quotes else ""
    last_order_at = str(matching_order_rows[0]["created_at"]) if matching_order_rows else ""

    return {
        "client": {
            "id": client_row["id"],
            "created_at": client_row["created_at"],
            "company_id": client_row["company_id"],
            "name": client_row["name"],
            "phone": client_row["phone"],
            "email": client_row["email"],
            "city": client_row["city"],
            "address": client_row["address"],
            "neighborhood": client_row["neighborhood"],
            "preferred_contact_channel": client_row["preferred_contact_channel"],
            "preferred_payment_method": client_row["preferred_payment_method"],
            "interests": client_row["interests"],
            "notes": client_row["notes"],
        },
        "summary": {
            "quotes_count": quotes_count,
            "orders_count": orders_count,
            "open_orders_count": open_orders_count,
            "sales_total_cop": total_sales_cop,
            "cash_in_total_cop": cash_in_total_cop,
            "accounts_receivable_cop": accounts_receivable_cop,
            "gross_profit_cop": gross_profit_cop,
            "average_ticket_cop": average_ticket_cop,
            "conversion_rate_percent": conversion_rate_percent,
            "last_quote_at": last_quote_at,
            "last_order_at": last_order_at,
        },
        "top_products": sorted_products[:6],
        "recent_quotes": matching_quotes[:6],
        "recent_orders": recent_orders,
    }


def list_product_categories(company_id: int | None = None) -> list[dict[str, Any]]:
    return _list_product_dimension_rows("product_categories", company_id=company_id)


def create_product_category(name: str, company_id: int | None = None) -> dict[str, Any]:
    return _create_product_dimension_row("product_categories", name, company_id=company_id)


def list_product_stores(company_id: int | None = None) -> list[dict[str, Any]]:
    return _list_product_dimension_rows("product_stores", company_id=company_id)


def create_product_store(name: str, company_id: int | None = None) -> dict[str, Any]:
    return _create_product_dimension_row("product_stores", name, company_id=company_id)


def save_product(product_data: dict[str, Any], company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        product_columns = [
            "created_at",
            "company_id",
            "name",
            "reference",
            "category",
            "store",
            "price_usd_net",
            "tax_usa_percent",
            "locker_shipping_usd",
            "notes",
        ]
        product_values = [
            created_at,
            company_id,
            product_data.get("name", ""),
            product_data.get("reference", ""),
            product_data.get("category", ""),
            product_data.get("store", ""),
            product_data.get("price_usd_net", 0),
            product_data.get("tax_usa_percent", 0),
            product_data.get("locker_shipping_usd", 0),
            product_data.get("notes", ""),
        ]
        existing_columns = _get_table_columns(connection, "products")
        legacy_defaults = {
            "travel_cost_usd": 0,
            "local_costs_cop": 0,
        }
        for column_name, default_value in legacy_defaults.items():
            if column_name in existing_columns:
                product_columns.append(column_name)
                product_values.append(default_value)

        product_id = _insert_and_get_id(
            connection,
            f"""
            INSERT INTO products ({", ".join(product_columns)})
            VALUES ({", ".join("?" for _ in product_columns)})
            """,
            tuple(product_values),
        )
        _ensure_product_dimension_value(
            connection,
            "product_categories",
            product_data.get("category", ""),
            company_id,
        )
        _ensure_product_dimension_value(
            connection,
            "product_stores",
            product_data.get("store", ""),
            company_id,
        )
        connection.commit()

    return {
        "id": product_id,
        "created_at": created_at,
        "company_id": company_id,
        "name": product_data.get("name", ""),
        "reference": product_data.get("reference", ""),
        "category": product_data.get("category", ""),
        "store": product_data.get("store", ""),
        "price_usd_net": product_data.get("price_usd_net", 0),
        "tax_usa_percent": product_data.get("tax_usa_percent", 0),
        "locker_shipping_usd": product_data.get("locker_shipping_usd", 0),
        "notes": product_data.get("notes", ""),
    }


def update_product_pricing(
    product_id: int,
    *,
    price_usd_net: float,
    tax_usa_percent: float,
    locker_shipping_usd: float,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)

    for field_name, value in (
        ("price_usd_net", price_usd_net),
        ("tax_usa_percent", tax_usa_percent),
        ("locker_shipping_usd", locker_shipping_usd),
    ):
        if float(value) < 0:
            raise ValueError(f"El campo '{field_name}' no puede ser negativo.")

    with closing(_connect()) as connection:
        connection.execute(
            """
            UPDATE products
            SET
                price_usd_net = ?,
                tax_usa_percent = ?,
                locker_shipping_usd = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                float(price_usd_net),
                float(tax_usa_percent),
                float(locker_shipping_usd),
                product_id,
                company_id,
            ),
        )
        connection.commit()

    item = get_product_detail(product_id, company_id=company_id)
    if item is None:
        raise ValueError("Producto no encontrado.")
    return item["product"]


def list_products(limit: int = 100, company_id: int | None = None) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                reference,
                category,
                store,
                price_usd_net,
                tax_usa_percent,
                locker_shipping_usd,
                notes
            FROM products
            WHERE company_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "company_id": row["company_id"],
            "name": row["name"],
            "reference": row["reference"],
            "category": row["category"],
            "store": row["store"],
            "price_usd_net": row["price_usd_net"],
            "tax_usa_percent": row["tax_usa_percent"],
            "locker_shipping_usd": row["locker_shipping_usd"],
            "notes": row["notes"],
        }
        for row in rows
    ]


def get_product_detail(product_id: int, company_id: int | None = None) -> dict[str, Any] | None:
    init_db()
    company_id = _normalize_company_id(company_id)

    def _match_entity(
        target_id: int, target_name: str, candidate_id: Any, candidate_name: Any
    ) -> bool:
        clean_candidate_id = str(candidate_id).strip() if candidate_id not in (None, "") else ""
        if clean_candidate_id:
            return clean_candidate_id == str(target_id)
        return str(candidate_name or "").strip().casefold() == target_name.casefold()

    def _matches_product_record(record: dict[str, Any], target_id: int, target_name: str) -> bool:
        line_items = _quote_input_line_items(record)
        if line_items:
            for item in line_items:
                if _match_entity(
                    target_id,
                    target_name,
                    item.get("product_id"),
                    item.get("product_name"),
                ):
                    return True
            return False
        return False

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        product_row = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                reference,
                category,
                store,
                price_usd_net,
                tax_usa_percent,
                locker_shipping_usd,
                notes
            FROM products
            WHERE id = ? AND company_id = ?
            """,
            (product_id, company_id),
        ).fetchone()
        if product_row is None:
            return None

        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]

        quote_rows = connection.execute(
            """
            SELECT id, created_at, client_name, product_name, notes, input_json, result_json
            FROM quotes
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        order_rows = connection.execute(
            """
            SELECT *
            FROM orders
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        payment_rows = connection.execute(
            """
            SELECT order_id, amount_cop
            FROM payment_events
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()

        orders_by_quote_id = {
            int(row["quote_id"]): int(row["id"])
            for row in order_rows
            if row["quote_id"] not in (None, "")
        }

        matching_quotes: list[dict[str, Any]] = []
        for row in quote_rows:
            input_data = json.loads(row["input_json"])
            if not _matches_product_record(
                input_data,
                product_row["id"],
                str(product_row["name"]),
            ):
                continue

            result_data = json.loads(row["result_json"])
            final_data = result_data.get("final", {})
            matching_quotes.append(
                {
                    "id": row["id"],
                    "created_at": row["created_at"],
                    "client_name": row["client_name"],
                    "product_name": row["product_name"],
                    "notes": row["notes"],
                    "input": input_data,
                    "result": result_data,
                    "sale_price_cop": float(final_data.get("sale_price_cop") or 0),
                    "quoted_advance_cop": float(final_data.get("advance_cop") or 0),
                    "profit_cop": float(final_data.get("profit_cop") or 0),
                    "has_order": row["id"] in orders_by_quote_id,
                    "order_id": orders_by_quote_id.get(row["id"]),
                }
            )

        matching_order_rows = [
            row
            for row in order_rows
            if _matches_product_record(
                json.loads(row["snapshot_json"]).get("input", {}),
                product_row["id"],
                str(product_row["name"]),
            )
        ]
        events_by_order_id = _list_order_events(
            connection,
            [row["id"] for row in matching_order_rows],
            all_statuses,
            company_id,
        )

    payment_totals_by_order_id: dict[int, float] = {}
    for row in payment_rows:
        order_id = int(row["order_id"] or 0)
        payment_totals_by_order_id[order_id] = payment_totals_by_order_id.get(order_id, 0.0) + float(
            row["amount_cop"] or 0
        )

    recent_orders = [
        _serialize_order(
            row,
            events_by_order_id.get(row["id"], []),
            all_statuses,
            active_statuses,
        )
        for row in matching_order_rows[:6]
    ]

    total_sales_cop = 0.0
    gross_profit_cop = 0.0
    accounts_receivable_cop = 0.0
    cash_in_total_cop = 0.0
    open_orders_count = 0
    top_clients: dict[str, dict[str, Any]] = {}
    for quote in matching_quotes:
        relevant_line_items = [
            item
            for item in _quote_result_line_items(quote)
            if _match_entity(
                product_row["id"],
                str(product_row["name"]),
                item.get("product_id"),
                item.get("product_name"),
            )
        ]
        client_key = str(quote["input"].get("client_id") or quote["client_name"] or "").strip() or str(
            quote["id"]
        )
        bucket = top_clients.setdefault(
            client_key,
            {
                "client_id": quote["input"].get("client_id"),
                "client_name": quote["client_name"] or "Cliente sin nombre",
                "quotes_count": 0,
                "orders_count": 0,
                "quoted_sales_total_cop": 0.0,
                "sales_total_cop": 0.0,
                "cash_in_total_cop": 0.0,
                "accounts_receivable_cop": 0.0,
                "gross_profit_cop": 0.0,
            },
        )
        bucket["quotes_count"] += 1
        bucket["quoted_sales_total_cop"] += sum(
            float(line_item.get("sale_price_cop") or 0) for line_item in relevant_line_items
        )

    for row in matching_order_rows:
        snapshot = json.loads(row["snapshot_json"])
        order_receivable_cop = float(row["balance_due_cop"] or 0)
        order_cash_in_cop = payment_totals_by_order_id.get(int(row["id"]), 0.0)
        relevant_line_items = [
            item
            for item in _quote_result_line_items(snapshot)
            if _match_entity(
                product_row["id"],
                str(product_row["name"]),
                item.get("product_id"),
                item.get("product_name"),
            )
        ]
        relevant_sales_cop = sum(float(item.get("sale_price_cop") or 0) for item in relevant_line_items)
        relevant_profit_cop = sum(float(item.get("profit_cop") or 0) for item in relevant_line_items)
        total_snapshot_sales_cop = sum(
            float(item.get("sale_price_cop") or 0) for item in _quote_result_line_items(snapshot)
        )
        order_share = (relevant_sales_cop / total_snapshot_sales_cop) if total_snapshot_sales_cop else 0.0
        relevant_receivable_cop = (
            order_receivable_cop * order_share
            if is_order_pending_collection(row["status_key"], order_receivable_cop)
            else 0.0
        )
        relevant_cash_in_cop = order_cash_in_cop * order_share

        total_sales_cop += relevant_sales_cop
        gross_profit_cop += relevant_profit_cop
        accounts_receivable_cop += relevant_receivable_cop
        cash_in_total_cop += relevant_cash_in_cop
        if row["status_key"] != CLOSED_ORDER_STATUS_KEY:
            open_orders_count += 1

        client_key = str(row["client_id"] or row["client_name"] or "").strip() or str(row["id"])
        bucket = top_clients.setdefault(
            client_key,
            {
                "client_id": row["client_id"],
                "client_name": row["client_name"] or "Cliente sin nombre",
                "quotes_count": 0,
                "orders_count": 0,
                "quoted_sales_total_cop": 0.0,
                "sales_total_cop": 0.0,
                "cash_in_total_cop": 0.0,
                "accounts_receivable_cop": 0.0,
                "gross_profit_cop": 0.0,
            },
        )
        bucket["orders_count"] += 1
        bucket["sales_total_cop"] += relevant_sales_cop
        bucket["cash_in_total_cop"] += relevant_cash_in_cop
        bucket["accounts_receivable_cop"] += relevant_receivable_cop
        bucket["gross_profit_cop"] += relevant_profit_cop

    sorted_clients = sorted(
        top_clients.values(),
        key=lambda item: (
            -item["orders_count"],
            -item["sales_total_cop"],
            -item["quotes_count"],
            item["client_name"].casefold(),
        ),
    )

    quotes_count = len(matching_quotes)
    orders_count = len(matching_order_rows)
    average_sale_price_cop = total_sales_cop / orders_count if orders_count else 0.0
    conversion_rate_percent = orders_count / quotes_count if quotes_count else 0.0
    last_quote_at = matching_quotes[0]["created_at"] if matching_quotes else ""
    last_order_at = str(matching_order_rows[0]["created_at"]) if matching_order_rows else ""

    return {
        "product": {
            "id": product_row["id"],
            "created_at": product_row["created_at"],
            "company_id": product_row["company_id"],
            "name": product_row["name"],
            "reference": product_row["reference"],
            "category": product_row["category"],
            "store": product_row["store"],
            "price_usd_net": product_row["price_usd_net"],
            "tax_usa_percent": product_row["tax_usa_percent"],
            "locker_shipping_usd": product_row["locker_shipping_usd"],
            "notes": product_row["notes"],
        },
        "summary": {
            "quotes_count": quotes_count,
            "orders_count": orders_count,
            "open_orders_count": open_orders_count,
            "sales_total_cop": total_sales_cop,
            "cash_in_total_cop": cash_in_total_cop,
            "accounts_receivable_cop": accounts_receivable_cop,
            "gross_profit_cop": gross_profit_cop,
            "average_sale_price_cop": average_sale_price_cop,
            "conversion_rate_percent": conversion_rate_percent,
            "last_quote_at": last_quote_at,
            "last_order_at": last_order_at,
        },
        "top_clients": sorted_clients[:6],
        "recent_quotes": matching_quotes[:6],
        "recent_orders": recent_orders,
    }


def list_expense_categories() -> list[dict[str, str]]:
    return _list_expense_categories()


def save_expense(
    expense_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    category_key = normalize_expense_category_key(expense_data.get("category_key"))
    concept = str(expense_data.get("concept", "")).strip()
    if not concept:
        raise ValueError("El concepto del gasto es obligatorio.")

    try:
        amount_cop = float(expense_data.get("amount_cop") or 0)
    except (TypeError, ValueError) as exc:
        raise ValueError("El valor del gasto debe ser numerico.") from exc
    if amount_cop <= 0:
        raise ValueError("El valor del gasto debe ser mayor a cero.")

    expense_date = parse_business_date(
        expense_data.get("expense_date"),
        field_name="fecha del gasto",
    ).isoformat()
    notes = str(expense_data.get("notes", "")).strip()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        expense_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO expenses (
                created_at,
                company_id,
                expense_date,
                category_key,
                concept,
                amount_cop,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                expense_date,
                category_key,
                concept,
                amount_cop,
                notes,
            ),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, created_at, company_id, expense_date, category_key, concept, amount_cop, notes
            FROM expenses
            WHERE id = ?
            """,
            (expense_id,),
        ).fetchone()
    return _serialize_expense_row(row)


def list_expenses(
    limit: int = 100,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, created_at, company_id, expense_date, category_key, concept, amount_cop, notes
            FROM expenses
            WHERE company_id = ?
            ORDER BY expense_date DESC, id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()
    return [_serialize_expense_row(row) for row in rows]


def list_order_statuses(
    include_inactive: bool = False,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        return _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=include_inactive,
        )


def create_order_status(
    label: str,
    description: str = "",
    insert_after_key: str | None = None,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    clean_label = str(label or "").strip()
    if not clean_label:
        raise ValueError("El nombre del estado es obligatorio.")

    clean_description = str(description or "").strip()
    clean_insert_after_key = str(insert_after_key or "").strip() or None
    status_key = build_status_key(clean_label)
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            """
            SELECT id
            FROM company_order_statuses
            WHERE company_id = ? AND status_key = ?
            """,
            (company_id, status_key),
        ).fetchone()
        if existing is not None:
            raise ValueError("Ya existe un estado con ese nombre.")

        active_statuses = _list_status_rows(connection, company_id=company_id)
        if clean_insert_after_key:
            anchor = next(
                (status for status in active_statuses if status["key"] == clean_insert_after_key),
                None,
            )
            if anchor is None:
                raise ValueError("El estado base para insertar no existe.")
            new_sort_order = int(anchor["sort_order"]) + 1
            connection.execute(
                """
                UPDATE company_order_statuses
                SET sort_order = sort_order + 1
                WHERE company_id = ? AND is_active = 1 AND sort_order >= ?
                """,
                (company_id, new_sort_order),
            )
        else:
            new_sort_order = (
                int(active_statuses[-1]["sort_order"]) + 1 if active_statuses else 1
            )

        status_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO company_order_statuses (
                created_at,
                company_id,
                status_key,
                label,
                description,
                sort_order,
                is_active,
                is_system
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                status_key,
                clean_label,
                clean_description,
                new_sort_order,
                1,
                0,
            ),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, created_at, status_key, label, description, sort_order, is_active, is_system
            FROM company_order_statuses
            WHERE id = ?
            """,
            (status_id,),
        ).fetchone()
        return _serialize_status_row(row)


def list_quotes(limit: int = 15, company_id: int | None = None) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, created_at, company_id, client_name, product_name, notes, input_json, result_json
            FROM quotes
            WHERE company_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()
        order_rows = connection.execute(
            "SELECT id, quote_id FROM orders WHERE company_id = ?",
            (company_id,),
        ).fetchall()
        orders_by_quote_id = {row["quote_id"]: row["id"] for row in order_rows}

    quotes: list[dict[str, Any]] = []
    for row in rows:
        input_data = json.loads(row["input_json"])
        result_data = json.loads(row["result_json"])
        quotes.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "company_id": row["company_id"],
                "client_name": row["client_name"],
                "product_name": row["product_name"],
                "notes": row["notes"],
                "input": input_data,
                "result": result_data,
                "has_order": row["id"] in orders_by_quote_id,
                "order_id": orders_by_quote_id.get(row["id"]),
            }
        )
    return quotes


def get_quote(quote_id: int, company_id: int | None = None) -> dict[str, Any] | None:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT id, created_at, company_id, client_name, product_name, notes, input_json, result_json
            FROM quotes
            WHERE id = ? AND company_id = ?
            """,
            (quote_id, company_id),
        ).fetchone()
        order_row = connection.execute(
            "SELECT id FROM orders WHERE quote_id = ? AND company_id = ?",
            (quote_id, company_id),
        ).fetchone()

    if row is None:
        return None

    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "client_name": row["client_name"],
        "product_name": row["product_name"],
        "notes": row["notes"],
        "input": json.loads(row["input_json"]),
        "result": json.loads(row["result_json"]),
        "has_order": order_row is not None,
        "order_id": order_row["id"] if order_row is not None else None,
    }


def _serialize_order(
    row: sqlite3.Row,
    events: list[dict[str, Any]],
    all_statuses: list[dict[str, Any]],
    active_statuses: list[dict[str, Any]],
) -> dict[str, Any]:
    snapshot = json.loads(row["snapshot_json"])
    next_status = get_next_status(row["status_key"], statuses=active_statuses)
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "quote_id": row["quote_id"],
        "client_id": row["client_id"],
        "product_id": row["product_id"],
        "client_name": row["client_name"],
        "product_name": row["product_name"],
        "status_key": row["status_key"],
        "status_label": get_status_label(row["status_key"], statuses=all_statuses),
        "next_status_key": next_status,
        "next_status_label": (
            get_status_label(next_status, statuses=all_statuses) if next_status else None
        ),
        "sale_price_cop": row["sale_price_cop"],
        "quoted_advance_cop": snapshot.get("result", {}).get("final", {}).get("advance_cop"),
        "advance_paid_cop": row["advance_paid_cop"],
        "second_payment_amount_cop": row["second_payment_amount_cop"],
        "second_payment_received_at": row["second_payment_received_at"],
        "travel_transport_type": row["travel_transport_type"],
        "travel_transport_label": get_travel_transport_label(row["travel_transport_type"]),
        "balance_due_cop": row["balance_due_cop"],
        "last_status_changed_at": events[-1]["created_at"] if events else row["created_at"],
        "notes": row["notes"],
        "snapshot": snapshot,
        "events": events,
    }


def _list_order_events(
    connection: sqlite3.Connection,
    order_ids: list[int],
    all_statuses: list[dict[str, Any]],
    company_id: int,
) -> dict[int, list[dict[str, Any]]]:
    if not order_ids:
        return {}

    placeholders = ", ".join("?" for _ in order_ids)
    rows = connection.execute(
        f"""
        SELECT id, created_at, order_id, status_key, note
        FROM order_events
        WHERE company_id = ? AND order_id IN ({placeholders})
        ORDER BY id ASC
        """,
        (company_id, *order_ids),
    ).fetchall()

    grouped: dict[int, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row["order_id"], []).append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "status_key": row["status_key"],
                "status_label": get_status_label(row["status_key"], statuses=all_statuses),
                "note": row["note"],
            }
        )
    return grouped


def create_order_from_quote(
    quote_id: int,
    advance_paid_cop: float | None = None,
    company_id: int | None = None,
) -> tuple[dict[str, Any], bool]:
    init_db()
    company_id = _normalize_company_id(company_id)
    quote_record = get_quote(quote_id, company_id=company_id)
    if quote_record is None:
        raise ValueError("La cotización no existe.")

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]
        existing = connection.execute(
            "SELECT * FROM orders WHERE quote_id = ? AND company_id = ?",
            (quote_id, company_id),
        ).fetchone()
        if existing is not None:
            events = _list_order_events(
                connection,
                [existing["id"]],
                all_statuses,
                company_id,
            ).get(existing["id"], [])
            return _serialize_order(existing, events, all_statuses, active_statuses), True

        order_data = build_order_from_quote(quote_record, advance_paid_cop=advance_paid_cop)
        created_at = datetime.now(timezone.utc).isoformat()
        order_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO orders (
                created_at,
                company_id,
                quote_id,
                client_id,
                product_id,
                client_name,
                product_name,
                status_key,
                sale_price_cop,
                advance_paid_cop,
                second_payment_amount_cop,
                second_payment_received_at,
                travel_transport_type,
                balance_due_cop,
                notes,
                snapshot_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                order_data["quote_id"],
                order_data.get("client_id"),
                order_data.get("product_id"),
                order_data["client_name"],
                order_data["product_name"],
                order_data["status_key"],
                order_data["sale_price_cop"],
                order_data["advance_paid_cop"],
                0,
                "",
                order_data.get("travel_transport_type", ""),
                order_data["balance_due_cop"],
                order_data["notes"],
                json.dumps(order_data["snapshot"], ensure_ascii=False),
            ),
        )
        connection.execute(
            """
            INSERT INTO order_events (
                created_at,
                company_id,
                order_id,
                status_key,
                note
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                order_id,
                order_data["status_key"],
                (
                    "Compra creada desde la cotización. "
                    f"Anticipo real recibido: {_format_cop_plain(order_data['advance_paid_cop'])}. "
                    f"Saldo pendiente: {_format_cop_plain(order_data['balance_due_cop'])}."
                ),
            ),
        )
        _record_payment_event(
            connection,
            company_id=company_id,
            order_id=order_id,
            payment_kind="advance",
            amount_cop=float(order_data["advance_paid_cop"] or 0),
            payment_date=normalize_date_input(created_at).isoformat(),
            note="Anticipo recibido al confirmar la compra.",
        )
        connection.commit()

        created = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        events = _list_order_events(connection, [order_id], all_statuses, company_id).get(
            order_id, []
        )
        return _serialize_order(created, events, all_statuses, active_statuses), False


def list_orders(
    limit: int = 100,
    company_id: int | None = None,
    include_closed: bool = False,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]
        rows = connection.execute(
            """
            SELECT *
            FROM orders
            WHERE company_id = ?
              AND (? = 1 OR status_key <> ?)
            ORDER BY id DESC
            LIMIT ?
            """,
            (company_id, 1 if include_closed else 0, CLOSED_ORDER_STATUS_KEY, limit),
        ).fetchall()
        events_by_order_id = _list_order_events(
            connection,
            [row["id"] for row in rows],
            all_statuses,
            company_id,
        )

    return [
        _serialize_order(
            row,
            events_by_order_id.get(row["id"], []),
            all_statuses,
            active_statuses,
        )
        for row in rows
    ]


def update_order_status(
    order_id: int,
    status_key: str,
    note: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]
        existing = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("La compra no existe.")

        balance_due = float(existing["balance_due_cop"] or 0)
        if not is_valid_order_status(status_key, statuses=active_statuses):
            raise ValueError("El estado enviado no es válido.")

        next_status_key = get_next_status(existing["status_key"], statuses=active_statuses)
        if next_status_key is None:
            raise ValueError("Esta compra ya completó su flujo.")
        if status_key != next_status_key:
            raise ValueError("Solo puedes avanzar al siguiente estado del flujo.")

        if status_key == "second_payment_received" and balance_due > 0:
            raise ValueError(
                "Registra el segundo pago antes de marcarlo como recibido."
            )

        connection.execute(
            """
            UPDATE orders
            SET status_key = ?, balance_due_cop = ?
            WHERE id = ? AND company_id = ?
            """,
            (status_key, balance_due, order_id, company_id),
        )
        connection.execute(
            """
            INSERT INTO order_events (
                created_at,
                company_id,
                order_id,
                status_key,
                note
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                now,
                company_id,
                order_id,
                status_key,
                note,
            ),
        )
        connection.commit()
        updated = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        events = _list_order_events(connection, [order_id], all_statuses, company_id).get(
            order_id, []
        )
        return _serialize_order(updated, events, all_statuses, active_statuses)


def update_order_travel_transport(
    order_id: int,
    travel_transport_type: str,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]
        existing = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("La compra no existe.")

        snapshot = json.loads(existing["snapshot_json"])
        purchase_type = str(snapshot.get("input", {}).get("purchase_type") or "").strip().lower()
        if purchase_type != "travel":
            raise ValueError("La ruta solo aplica para compras realizadas en viaje.")

        normalized_transport_type = normalize_travel_transport_type(
            travel_transport_type,
            purchase_type=purchase_type,
        )

        connection.execute(
            """
            UPDATE orders
            SET travel_transport_type = ?
            WHERE id = ? AND company_id = ?
            """,
            (normalized_transport_type, order_id, company_id),
        )
        connection.execute(
            """
            INSERT INTO order_events (
                created_at,
                company_id,
                order_id,
                status_key,
                note
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                now,
                company_id,
                order_id,
                existing["status_key"],
                f"Ruta del producto actualizada a: {get_travel_transport_label(normalized_transport_type)}.",
            ),
        )
        connection.commit()

        updated = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        events = _list_order_events(connection, [order_id], all_statuses, company_id).get(
            order_id, []
        )
        return _serialize_order(updated, events, all_statuses, active_statuses)


def register_second_payment(
    order_id: int,
    amount_cop: float,
    received_at: str | None = None,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        active_statuses = [status for status in all_statuses if status["is_active"]]
        existing = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("La compra no existe.")

        payment_update = apply_second_payment(
            dict(existing),
            amount_cop=amount_cop,
            received_at=received_at,
        )

        connection.execute(
            """
            UPDATE orders
            SET second_payment_amount_cop = ?,
                second_payment_received_at = ?,
                balance_due_cop = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                payment_update["second_payment_amount_cop"],
                payment_update["second_payment_received_at"],
                payment_update["balance_due_cop"],
                order_id,
                company_id,
            ),
        )
        connection.execute(
            """
            INSERT INTO order_events (
                created_at,
                company_id,
                order_id,
                status_key,
                note
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                now,
                company_id,
                order_id,
                existing["status_key"],
                (
                    f"Segundo pago registrado: {_format_cop_plain(payment_update['payment_amount_cop'])}. "
                    f"Fecha reportada: {payment_update['payment_date']}. "
                    f"Saldo pendiente: {_format_cop_plain(payment_update['balance_due_cop'])}."
                    + (
                        " Ya puedes avanzar al estado de segundo pago recibido."
                        if payment_update["balance_due_cop"] == 0
                        else ""
                    )
                ),
            ),
        )
        _record_payment_event(
            connection,
            company_id=company_id,
            order_id=order_id,
            payment_kind="balance",
            amount_cop=float(payment_update["payment_amount_cop"] or 0),
            payment_date=payment_update["payment_date"],
            note="Pago adicional registrado desde la compra.",
        )
        connection.commit()
        updated = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        events = _list_order_events(connection, [order_id], all_statuses, company_id).get(
            order_id, []
        )
        return _serialize_order(updated, events, all_statuses, active_statuses)


def build_dashboard_summary(
    period_key: str = "daily",
    company_id: int | None = None,
    reference_date: str | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    period = get_period_bounds(period_key, reference_date=reference_date)
    start_date = normalize_date_input(period["start_date"])
    end_date = normalize_date_input(period["end_date"])

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        order_rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                status_key,
                sale_price_cop,
                balance_due_cop,
                snapshot_json,
                client_id,
                client_name,
                product_id,
                product_name
            FROM orders
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        payment_rows = connection.execute(
            """
            SELECT order_id, payment_kind, amount_cop, payment_date
            FROM payment_events
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        expense_rows = connection.execute(
            """
            SELECT id, created_at, company_id, expense_date, category_key, concept, amount_cop, notes
            FROM expenses
            WHERE company_id = ?
            ORDER BY expense_date DESC, id DESC
            """,
            (company_id,),
        ).fetchall()

    def _display_name(value: Any, fallback: str) -> str:
        clean_value = str(value or "").strip()
        return clean_value or fallback

    def _entity_key(entity_id: Any, label: str) -> tuple[str, str]:
        clean_id = str(entity_id).strip() if entity_id not in (None, "") else ""
        return (clean_id, label.casefold())

    period_payment_by_order_id: dict[int, float] = {}
    for row in payment_rows:
        if is_date_in_range(row["payment_date"], start_date, end_date):
            order_id = int(row["order_id"] or 0)
            period_payment_by_order_id[order_id] = (
                period_payment_by_order_id.get(order_id, 0.0)
                + float(row["amount_cop"] or 0)
            )

    period_orders = [
        row for row in order_rows if is_date_in_range(row["created_at"], start_date, end_date)
    ]
    open_orders = [row for row in order_rows if row["status_key"] != CLOSED_ORDER_STATUS_KEY]
    collection_ready_orders = [
        row
        for row in open_orders
        if is_order_pending_collection(row["status_key"], row["balance_due_cop"])
    ]
    accounts_receivable_cop = sum(
        float(row["balance_due_cop"] or 0) for row in collection_ready_orders
    )
    period_balance_due_cop = sum(float(row["balance_due_cop"] or 0) for row in period_orders)
    sales_total_cop = sum(float(row["sale_price_cop"] or 0) for row in period_orders)

    gross_profit_cop = 0.0
    for row in period_orders:
        snapshot = json.loads(row["snapshot_json"])
        gross_profit_cop += float(
            snapshot.get("result", {}).get("final", {}).get("profit_cop") or 0
        )

    cash_in_total_cop = sum(
        float(row["amount_cop"] or 0)
        for row in payment_rows
        if is_date_in_range(row["payment_date"], start_date, end_date)
    )

    current_receivables_by_client: dict[tuple[str, str], dict[str, Any]] = {}
    for row in collection_ready_orders:
        client_name = _display_name(row["client_name"], "Cliente sin nombre")
        bucket_key = _entity_key(row["client_id"], client_name)
        bucket = current_receivables_by_client.setdefault(
            bucket_key,
            {
                "client_id": row["client_id"],
                "client_name": client_name,
                "accounts_receivable_cop": 0.0,
                "open_orders_count": 0,
                "last_order_at": "",
            },
        )
        bucket["accounts_receivable_cop"] += float(row["balance_due_cop"] or 0)
        bucket["open_orders_count"] += 1
        bucket["last_order_at"] = max(bucket["last_order_at"], str(row["created_at"] or ""))

    client_buckets: dict[tuple[str, str], dict[str, Any]] = {}
    product_buckets: dict[tuple[str, str], dict[str, Any]] = {}
    for row in period_orders:
        snapshot = json.loads(row["snapshot_json"])
        order_profit_cop = float(
            snapshot.get("result", {}).get("final", {}).get("profit_cop") or 0
        )
        order_sale_price_cop = float(row["sale_price_cop"] or 0)
        order_balance_due_cop = float(row["balance_due_cop"] or 0)
        order_cash_in_cop = period_payment_by_order_id.get(int(row["id"] or 0), 0.0)

        client_name = _display_name(row["client_name"], "Cliente sin nombre")
        client_key = _entity_key(row["client_id"], client_name)
        client_bucket = client_buckets.setdefault(
            client_key,
            {
                "client_id": row["client_id"],
                "client_name": client_name,
                "orders_count": 0,
                "sales_total_cop": 0.0,
                "cash_in_total_cop": 0.0,
                "period_balance_due_cop": 0.0,
                "gross_profit_cop": 0.0,
                "average_ticket_cop": 0.0,
                "accounts_receivable_cop": 0.0,
                "last_order_at": "",
            },
        )
        client_bucket["orders_count"] += 1
        client_bucket["sales_total_cop"] += order_sale_price_cop
        client_bucket["cash_in_total_cop"] += order_cash_in_cop
        client_bucket["period_balance_due_cop"] += order_balance_due_cop
        client_bucket["gross_profit_cop"] += order_profit_cop
        client_bucket["last_order_at"] = max(
            client_bucket["last_order_at"], str(row["created_at"] or "")
        )

        snapshot_line_items = _quote_result_line_items(snapshot)
        total_snapshot_sales = sum(float(item.get("sale_price_cop") or 0) for item in snapshot_line_items)
        for line_item in snapshot_line_items:
            product_name = _display_name(line_item.get("product_name"), "Producto sin nombre")
            product_key = _entity_key(line_item.get("product_id"), product_name)
            product_bucket = product_buckets.setdefault(
                product_key,
                {
                    "product_id": line_item.get("product_id"),
                    "product_name": product_name,
                    "orders_count": 0,
                    "units_sold": 0,
                    "sales_total_cop": 0.0,
                    "cash_in_total_cop": 0.0,
                    "period_balance_due_cop": 0.0,
                    "gross_profit_cop": 0.0,
                    "average_sale_price_cop": 0.0,
                    "gross_margin_percent": 0.0,
                    "last_order_at": "",
                },
            )
            line_share = (
                float(line_item.get("sale_price_cop") or 0) / total_snapshot_sales
                if total_snapshot_sales
                else 0.0
            )
            product_bucket["orders_count"] += 1
            product_bucket["units_sold"] += int(line_item.get("quantity") or 1)
            product_bucket["sales_total_cop"] += float(line_item.get("sale_price_cop") or 0)
            product_bucket["cash_in_total_cop"] += order_cash_in_cop * line_share
            product_bucket["period_balance_due_cop"] += order_balance_due_cop * line_share
            product_bucket["gross_profit_cop"] += float(line_item.get("profit_cop") or 0)
            product_bucket["last_order_at"] = max(
                product_bucket["last_order_at"], str(row["created_at"] or "")
            )

    for client_key, bucket in client_buckets.items():
        bucket["average_ticket_cop"] = (
            bucket["sales_total_cop"] / bucket["orders_count"]
            if bucket["orders_count"]
            else 0.0
        )
        bucket["accounts_receivable_cop"] = float(
            current_receivables_by_client.get(client_key, {}).get("accounts_receivable_cop") or 0
        )

    for bucket in product_buckets.values():
        bucket["average_sale_price_cop"] = (
            bucket["sales_total_cop"] / bucket["orders_count"]
            if bucket["orders_count"]
            else 0.0
        )
        bucket["gross_margin_percent"] = (
            bucket["gross_profit_cop"] / bucket["sales_total_cop"]
            if bucket["sales_total_cop"]
            else 0.0
        )

    top_clients_by_sales = sorted(
        client_buckets.values(),
        key=lambda item: (
            -item["sales_total_cop"],
            -item["gross_profit_cop"],
            item["client_name"].casefold(),
        ),
    )
    clients_by_receivable = sorted(
        (
            bucket
            for bucket in current_receivables_by_client.values()
            if bucket["accounts_receivable_cop"] > 0
        ),
        key=lambda item: (
            -item["accounts_receivable_cop"],
            -item["open_orders_count"],
            item["client_name"].casefold(),
        ),
    )
    top_products_by_sales = sorted(
        product_buckets.values(),
        key=lambda item: (
            -item["sales_total_cop"],
            -item["gross_profit_cop"],
            item["product_name"].casefold(),
        ),
    )
    top_products_by_profit = sorted(
        product_buckets.values(),
        key=lambda item: (
            -item["gross_profit_cop"],
            -item["sales_total_cop"],
            item["product_name"].casefold(),
        ),
    )

    period_expenses = [
        row for row in expense_rows if is_date_in_range(row["expense_date"], start_date, end_date)
    ]
    expenses_total_cop = sum(float(row["amount_cop"] or 0) for row in period_expenses)

    expenses_by_category: dict[str, dict[str, Any]] = {}
    for row in period_expenses:
        bucket = expenses_by_category.setdefault(
            row["category_key"],
            {
                "category_key": row["category_key"],
                "category_label": get_expense_category_label(row["category_key"]),
                "amount_cop": 0.0,
                "count": 0,
            },
        )
        bucket["amount_cop"] += float(row["amount_cop"] or 0)
        bucket["count"] += 1

    sorted_expense_buckets = sorted(
        expenses_by_category.values(),
        key=lambda item: (-item["amount_cop"], item["category_label"]),
    )

    return {
        "period": period,
        "metrics": {
            "orders_count": len(period_orders),
            "open_orders_count": len(open_orders),
            "sales_total_cop": sales_total_cop,
            "cash_in_total_cop": cash_in_total_cop,
            "period_balance_due_cop": period_balance_due_cop,
            "accounts_receivable_cop": accounts_receivable_cop,
            "gross_profit_cop": gross_profit_cop,
            "expenses_total_cop": expenses_total_cop,
            "net_profit_cop": gross_profit_cop - expenses_total_cop,
        },
        "client_insights": {
            "top_buyers": top_clients_by_sales,
            "receivables": clients_by_receivable,
        },
        "product_insights": {
            "top_sellers": top_products_by_sales,
            "most_profitable": top_products_by_profit,
        },
        "expenses_by_category": sorted_expense_buckets,
        "recent_expenses": [_serialize_expense_row(row) for row in expense_rows[:8]],
    }


def build_followup_summary(
    company_id: int | None = None,
    reference_date: str | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    today = normalize_date_input(reference_date) if reference_date else datetime.now(timezone.utc).date()
    due_soon_limit = today.fromordinal(today.toordinal() + 3)
    quote_followup_days = 2
    order_stale_days = 4

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        pending_rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                client_id,
                client_name,
                title,
                category,
                desired_store,
                desired_size,
                desired_color,
                quantity,
                budget_cop,
                priority_key,
                status_key,
                due_date,
                reference_url,
                reference_notes,
                notes,
                linked_quote_id
            FROM pending_requests
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        quote_rows = connection.execute(
            """
            SELECT id, created_at, company_id, client_name, product_name, notes, input_json, result_json
            FROM quotes
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        order_rows = connection.execute(
            """
            SELECT *
            FROM orders
            WHERE company_id = ?
            ORDER BY id DESC
            """,
            (company_id,),
        ).fetchall()
        order_event_rows = connection.execute(
            """
            SELECT order_id, MAX(created_at) AS last_event_at
            FROM order_events
            WHERE company_id = ?
            GROUP BY order_id
            """,
            (company_id,),
        ).fetchall()

    order_ids_by_quote_id: dict[int, int] = {}
    for row in order_rows:
        try:
            order_ids_by_quote_id[int(row["quote_id"])] = int(row["id"])
        except (TypeError, ValueError):
            continue

    last_event_by_order_id = {
        int(row["order_id"]): str(row["last_event_at"] or "")
        for row in order_event_rows
        if row["order_id"] not in (None, "")
    }

    def _parse_iso_date(value: Any) -> datetime | None:
        clean_value = str(value or "").strip()
        if not clean_value:
            return None
        try:
            return datetime.fromisoformat(clean_value.replace("Z", "+00:00"))
        except ValueError:
            return None

    def _parse_due_date(value: Any):
        clean_value = str(value or "").strip()
        if not clean_value:
            return None
        try:
            return normalize_date_input(clean_value)
        except ValueError:
            return None

    def _priority_rank(priority_key: str) -> int:
        return {
            "urgent": 0,
            "high": 1,
            "normal": 2,
            "low": 3,
        }.get(str(priority_key or "").strip().lower(), 4)

    pending_items = [_serialize_pending_request_row(row) for row in pending_rows]
    active_pending_items = [
        item for item in pending_items if item["status_key"] not in {"quoted", "discarded"}
    ]
    overdue_pending: list[dict[str, Any]] = []
    due_today_pending: list[dict[str, Any]] = []
    due_soon_pending: list[dict[str, Any]] = []
    ready_to_quote_pending: list[dict[str, Any]] = []

    for item in active_pending_items:
        due_date = _parse_due_date(item.get("due_date"))
        if item["status_key"] == "ready_to_quote":
            ready_to_quote_pending.append(item)
        if due_date is None:
            continue
        if due_date < today:
            overdue_pending.append(item)
        elif due_date == today:
            due_today_pending.append(item)
        elif due_date <= due_soon_limit:
            due_soon_pending.append(item)

    def _sort_pending(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(
            items,
            key=lambda item: (
                _priority_rank(item.get("priority_key", "")),
                item.get("due_date") or "9999-12-31",
                str(item.get("title") or "").casefold(),
            ),
        )

    open_quotes: list[dict[str, Any]] = []
    quotes_needing_followup: list[dict[str, Any]] = []
    for row in quote_rows:
        quote_id = int(row["id"])
        if quote_id in order_ids_by_quote_id:
            continue
        created_at = str(row["created_at"] or "")
        created_dt = _parse_iso_date(created_at)
        age_days = 0
        if created_dt is not None:
            age_days = max((today - created_dt.date()).days, 0)
        input_data = json.loads(row["input_json"])
        result_data = json.loads(row["result_json"])
        quote_item = {
            "id": quote_id,
            "created_at": created_at,
            "client_name": row["client_name"],
            "product_name": row["product_name"],
            "sale_price_cop": float(result_data.get("final", {}).get("sale_price_cop") or 0),
            "notes": row["notes"],
            "client_id": input_data.get("client_id"),
            "age_days": age_days,
        }
        open_quotes.append(quote_item)
        if age_days >= quote_followup_days:
            quotes_needing_followup.append(quote_item)

    open_quotes.sort(key=lambda item: (-item["age_days"], item["created_at"]), reverse=False)
    quotes_needing_followup.sort(
        key=lambda item: (-item["age_days"], str(item["client_name"] or "").casefold())
    )

    active_orders: list[dict[str, Any]] = []
    stalled_orders: list[dict[str, Any]] = []
    receivable_orders: list[dict[str, Any]] = []
    clients_with_balance: dict[tuple[str, str], dict[str, Any]] = {}

    for row in order_rows:
        status_key = str(row["status_key"] or "").strip()
        if status_key == CLOSED_ORDER_STATUS_KEY:
            continue

        order_id = int(row["id"])
        last_change_at = last_event_by_order_id.get(order_id) or str(row["created_at"] or "")
        last_change_dt = _parse_iso_date(last_change_at)
        stale_days = 0
        if last_change_dt is not None:
            stale_days = max((today - last_change_dt.date()).days, 0)

        snapshot = json.loads(row["snapshot_json"])
        order_item = {
            "id": order_id,
            "quote_id": row["quote_id"],
            "client_id": row["client_id"],
            "client_name": row["client_name"],
            "product_name": row["product_name"],
            "status_key": status_key,
            "status_label": get_status_label(status_key),
            "balance_due_cop": float(row["balance_due_cop"] or 0),
            "sale_price_cop": float(row["sale_price_cop"] or 0),
            "last_status_changed_at": last_change_at,
            "stale_days": stale_days,
            "purchase_type": str(snapshot.get("input", {}).get("purchase_type") or ""),
        }
        active_orders.append(order_item)
        if stale_days >= order_stale_days:
            stalled_orders.append(order_item)
        if is_order_pending_collection(status_key, order_item["balance_due_cop"]):
            receivable_orders.append(order_item)
            client_name = str(order_item["client_name"] or "").strip() or "Cliente sin nombre"
            bucket_key = (
                str(order_item["client_id"] or ""),
                client_name.casefold(),
            )
            bucket = clients_with_balance.setdefault(
                bucket_key,
                {
                    "client_id": order_item["client_id"],
                    "client_name": client_name,
                    "balance_due_cop": 0.0,
                    "orders_count": 0,
                    "last_status_changed_at": order_item["last_status_changed_at"],
                },
            )
            bucket["balance_due_cop"] += order_item["balance_due_cop"]
            bucket["orders_count"] += 1
            bucket["last_status_changed_at"] = max(
                bucket["last_status_changed_at"], order_item["last_status_changed_at"]
            )

    stalled_orders.sort(key=lambda item: (-item["stale_days"], str(item["client_name"] or "").casefold()))
    receivable_clients = sorted(
        clients_with_balance.values(),
        key=lambda item: (-item["balance_due_cop"], -item["orders_count"], item["client_name"].casefold()),
    )

    agenda_items: list[dict[str, Any]] = []

    for item in _sort_pending(overdue_pending)[:6]:
        agenda_items.append(
            {
                "kind": "pending_overdue",
                "priority_key": item["priority_key"],
                "priority_label": item["priority_label"],
                "title": item["title"],
                "summary": f"{item['client_name']} · compromiso {item['due_date']}",
                "action_label": "Abrir pendiente",
                "target_module": "pendientes",
                "status_label": item["status_label"],
            }
        )

    for item in _sort_pending(ready_to_quote_pending)[:4]:
        agenda_items.append(
            {
                "kind": "pending_ready_to_quote",
                "priority_key": item["priority_key"],
                "priority_label": item["priority_label"],
                "title": item["title"],
                "summary": f"{item['client_name']} · listo para pasar a cotizacion",
                "action_label": "Cotizar",
                "target_module": "pendientes",
                "status_label": item["status_label"],
            }
        )

    for item in quotes_needing_followup[:4]:
        agenda_items.append(
            {
                "kind": "quote_followup",
                "priority_key": "high" if item["age_days"] >= 4 else "normal",
                "priority_label": "Alta" if item["age_days"] >= 4 else "Normal",
                "title": item["product_name"] or "Cotizacion abierta",
                "summary": f"{item['client_name']} · sin respuesta hace {item['age_days']} dia(s)",
                "action_label": "Abrir cotizacion",
                "target_module": "comercial",
                "status_label": "Cotizacion abierta",
            }
        )

    for item in stalled_orders[:4]:
        agenda_items.append(
            {
                "kind": "stalled_order",
                "priority_key": "urgent" if item["stale_days"] >= 7 else "high",
                "priority_label": "Urgente" if item["stale_days"] >= 7 else "Alta",
                "title": item["product_name"] or "Compra activa",
                "summary": f"{item['client_name']} · {item['status_label']} sin movimiento hace {item['stale_days']} dia(s)",
                "action_label": "Revisar compra",
                "target_module": "compras",
                "status_label": item["status_label"],
            }
        )

    for item in receivable_clients[:4]:
        agenda_items.append(
            {
                "kind": "receivable_followup",
                "priority_key": "high",
                "priority_label": "Alta",
                "title": item["client_name"],
                "summary": f"Segundo pago pendiente por { _format_cop_plain(item['balance_due_cop']) } en {item['orders_count']} compra(s)",
                "action_label": "Cobrar",
                "target_module": "compras",
                "status_label": "Segundo pago pendiente",
            }
        )

    agenda_items.sort(
        key=lambda item: (
            _priority_rank(item["priority_key"]),
            item["title"].casefold(),
        )
    )

    return {
        "reference_date": today.isoformat(),
        "metrics": {
            "active_pending_count": len(active_pending_items),
            "overdue_pending_count": len(overdue_pending),
            "due_today_count": len(due_today_pending),
            "due_soon_count": len(due_soon_pending),
            "ready_to_quote_count": len(ready_to_quote_pending),
            "open_quotes_count": len(open_quotes),
            "quotes_followup_count": len(quotes_needing_followup),
            "active_orders_count": len(active_orders),
            "stalled_orders_count": len(stalled_orders),
            "clients_with_balance_count": len(receivable_clients),
            "accounts_receivable_cop": sum(item["balance_due_cop"] for item in receivable_clients),
        },
        "pending_dashboard": {
            "overdue": _sort_pending(overdue_pending)[:6],
            "due_today": _sort_pending(due_today_pending)[:6],
            "due_soon": _sort_pending(due_soon_pending)[:6],
            "ready_to_quote": _sort_pending(ready_to_quote_pending)[:6],
        },
        "quote_dashboard": {
            "open_quotes": open_quotes[:8],
            "needs_followup": quotes_needing_followup[:8],
        },
        "order_dashboard": {
            "stalled_orders": stalled_orders[:8],
            "receivables": receivable_clients[:8],
        },
        "agenda": {
            "today": agenda_items[:16],
        },
    }
