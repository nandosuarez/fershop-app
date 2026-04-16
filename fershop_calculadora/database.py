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
from .calculations import QuoteInput, calculate_quote, calculate_quote_bundle
from .db_runtime import CompatConnection, connect_postgres, get_database_url, is_postgres_enabled
from .finance import (
    LEGACY_INVENTORY_RESTOCK_CATEGORY_KEY,
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
from .whatsapp import (
    DEFAULT_WHATSAPP_COUNTRY_CODE,
    build_whatsapp_trigger_catalog,
    default_whatsapp_templates,
    mask_whatsapp_phone,
    normalize_whatsapp_phone,
    render_content_variables,
    render_template_text,
    send_twilio_whatsapp_message,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = Path(
    os.environ.get("FERSHOP_DB_PATH", str(DATA_DIR / "fershop_app.sqlite3"))
).expanduser()

DEFAULT_COMPANY_SLUG = "fershop"
DEFAULT_COMPANY_NAME = "FerShop"
DEFAULT_COMPANY_BRAND_NAME = "FerShop USA"
DEFAULT_COMPANY_TAGLINE = ""
LEGACY_COMPANY_TAGLINE = "Cotizaciones elegantes para importacion y cierre comercial"
DEFAULT_COMPANY_LOGO_PATH = "/static/assets/fershop-logo-crop.jpg"
DEFAULT_ADMIN_USERNAME = os.environ.get("FERSHOP_DEFAULT_ADMIN_USERNAME", "fershop_admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("FERSHOP_DEFAULT_ADMIN_PASSWORD", "FerShop2026!")
CLOSED_ORDER_STATUS_KEY = "cycle_closed"
_INIT_LOCK = threading.Lock()
_INITIALIZED_TARGETS: dict[tuple[Any, ...], bool] = {}
INVENTORY_MOVEMENT_STOCK_IN = "stock_in"
INVENTORY_MOVEMENT_STOCK_OUT = "stock_out"
INVENTORY_MOVEMENT_SALE_OUT = "sale_out"
INVENTORY_MOVEMENT_SET_STOCK = "set_stock"
INVENTORY_MOVEMENT_LABELS = {
    INVENTORY_MOVEMENT_STOCK_IN: "Entrada de inventario",
    INVENTORY_MOVEMENT_STOCK_OUT: "Salida manual",
    INVENTORY_MOVEMENT_SALE_OUT: "Venta desde inventario",
    INVENTORY_MOVEMENT_SET_STOCK: "Ajuste de stock",
}
INVENTORY_COST_EPSILON = 0.005


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


def _safe_ratio(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    return numerator / denominator


def _normalize_catalog_name(value: Any) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""
    normalized = unicodedata.normalize("NFKD", raw_value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.casefold().split())


def _normalize_client_identification(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _sanitize_image_data_url(value: Any) -> str:
    image_data_url = str(value or "").strip()
    if not image_data_url:
        return ""
    if not image_data_url.startswith("data:image/"):
        raise ValueError("La imagen debe enviarse como una imagen valida.")
    return image_data_url


def _row_value(row: Any, key: str, default: Any = None) -> Any:
    try:
        return row[key]
    except (KeyError, IndexError, TypeError):
        return default


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    if isinstance(row, dict):
        return dict(row)
    keys = getattr(row, "keys", None)
    if callable(keys):
        return {key: row[key] for key in keys()}
    return {}


def _to_bool_flag(value: Any) -> int:
    if isinstance(value, str):
        return 1 if value.strip().lower() in {"1", "true", "yes", "si", "on"} else 0
    return 1 if bool(value) else 0


def get_inventory_movement_label(movement_type: Any) -> str:
    key = str(movement_type or "").strip().lower()
    return INVENTORY_MOVEMENT_LABELS.get(key, key or "Movimiento")


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
                    "uses_inventory_stock": bool(
                        item.get("uses_inventory_stock")
                        or item_input.get("uses_inventory_stock")
                    ),
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
            "quantity": max(int(input_data.get("quantity") or 1), 1),
            "uses_inventory_stock": bool(input_data.get("uses_inventory_stock")),
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
                    "uses_inventory_stock": bool(
                        item.get("uses_inventory_stock")
                        or item_final.get("uses_inventory_stock")
                    ),
                    "sale_price_cop": float(
                        item.get("sale_price_cop") or item_final.get("sale_price_cop") or 0
                    ),
                    "real_cost_cop": float(
                        item.get("real_cost_cop")
                        or item_result.get("costs", {}).get("real_total_cost_cop")
                        or 0
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
    costs_data = result_data.get("costs", {})
    fallback_item["sale_price_cop"] = float(final_data.get("sale_price_cop") or 0)
    fallback_item["real_cost_cop"] = float(costs_data.get("real_total_cost_cop") or 0)
    fallback_item["profit_cop"] = float(final_data.get("profit_cop") or 0)
    return [fallback_item]


def _normalize_actual_purchase_prices(
    raw_items: Any,
) -> list[dict[str, Any]]:
    if raw_items in (None, ""):
        return []
    if not isinstance(raw_items, list):
        raise ValueError("Los precios reales de compra deben enviarse como una lista valida.")

    normalized_items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError("Cada precio real de compra debe tener un formato valido.")
        try:
            price_usd_net = float(raw_item.get("price_usd_net"))
        except (TypeError, ValueError) as exc:
            raise ValueError("El precio real de compra debe ser numerico.") from exc
        if price_usd_net <= 0:
            raise ValueError("El precio real de compra debe ser mayor a cero.")

        quote_item_index = raw_item.get("quote_item_index")
        if quote_item_index in (None, ""):
            normalized_index = None
        else:
            try:
                normalized_index = int(quote_item_index)
            except (TypeError, ValueError) as exc:
                raise ValueError("El indice del producto ajustado no es valido.") from exc
            if normalized_index < 0:
                raise ValueError("El indice del producto ajustado no es valido.")

        product_id = raw_item.get("product_id")
        if product_id in (None, "", 0):
            normalized_product_id = None
        else:
            try:
                normalized_product_id = int(product_id)
            except (TypeError, ValueError) as exc:
                raise ValueError("El producto ajustado no es valido.") from exc

        normalized_items.append(
            {
                "quote_item_index": normalized_index,
                "product_id": normalized_product_id,
                "product_name": str(raw_item.get("product_name") or "").strip(),
                "price_usd_net": price_usd_net,
            }
        )
    return normalized_items


def _normalize_order_item_updates(raw_items: Any) -> list[dict[str, Any]]:
    if raw_items in (None, ""):
        return []
    if not isinstance(raw_items, list):
        raise ValueError("Los ajustes por producto deben enviarse como una lista valida.")

    normalized_items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError("Cada ajuste por producto debe tener un formato valido.")

        quote_item_index = raw_item.get("quote_item_index")
        if quote_item_index in (None, ""):
            normalized_index = None
        else:
            try:
                normalized_index = int(quote_item_index)
            except (TypeError, ValueError) as exc:
                raise ValueError("El indice del producto ajustado no es valido.") from exc
            if normalized_index < 0:
                raise ValueError("El indice del producto ajustado no es valido.")

        product_id = raw_item.get("product_id")
        if product_id in (None, "", 0):
            normalized_product_id = None
        else:
            try:
                normalized_product_id = int(product_id)
            except (TypeError, ValueError) as exc:
                raise ValueError("El producto ajustado no es valido.") from exc

        normalized_item: dict[str, Any] = {
            "quote_item_index": normalized_index,
            "product_id": normalized_product_id,
            "product_name": str(raw_item.get("product_name") or "").strip(),
        }

        numeric_fields = {
            "price_usd_net": "El precio USD ajustado debe ser numerico.",
            "tax_usa_percent": "El tax ajustado debe ser numerico.",
            "travel_cost_usd": "El costo de viaje ajustado debe ser numerico.",
            "locker_shipping_usd": "El envio/casillero ajustado debe ser numerico.",
            "final_sale_price_cop": "El precio final ajustado debe ser numerico.",
        }
        for field_name, error_message in numeric_fields.items():
            raw_value = raw_item.get(field_name)
            if raw_value in (None, ""):
                continue
            try:
                normalized_value = float(raw_value)
            except (TypeError, ValueError) as exc:
                raise ValueError(error_message) from exc
            if normalized_value < 0:
                raise ValueError(f"El campo '{field_name}' no puede ser negativo.")
            if field_name == "final_sale_price_cop" and normalized_value <= 0:
                raise ValueError("El precio final ajustado debe ser mayor a cero.")
            normalized_item[field_name] = normalized_value

        normalized_items.append(normalized_item)

    return normalized_items


def _find_order_item_update(
    item_updates: list[dict[str, Any]],
    *,
    quote_item_index: int,
    product_id: Any,
    product_name: Any,
) -> dict[str, Any] | None:
    for update in item_updates:
        candidate_index = update.get("quote_item_index")
        if candidate_index is not None and int(candidate_index) == quote_item_index:
            return update

    clean_product_id = str(product_id or "").strip()
    clean_product_name = str(product_name or "").strip().casefold()
    for update in item_updates:
        candidate_product_id = str(update.get("product_id") or "").strip()
        if clean_product_id and candidate_product_id and candidate_product_id == clean_product_id:
            return update
        candidate_product_name = str(update.get("product_name") or "").strip().casefold()
        if clean_product_name and candidate_product_name and candidate_product_name == clean_product_name:
            return update
    return None


def _apply_actual_purchase_prices_to_quote_record(
    quote_record: dict[str, Any],
    actual_purchase_prices: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    normalized_prices = _normalize_actual_purchase_prices(actual_purchase_prices)
    if not normalized_prices:
        return quote_record

    updated_record = json.loads(json.dumps(quote_record, ensure_ascii=False))
    input_data = updated_record.get("input", {})
    quote_items = input_data.get("quote_items")

    if isinstance(quote_items, list) and quote_items:
        updated_quote_items = json.loads(json.dumps(quote_items, ensure_ascii=False))
        used_indexes: set[int] = set()
        for price_override in normalized_prices:
            target_index = price_override.get("quote_item_index")
            if target_index is not None and 0 <= target_index < len(updated_quote_items):
                used_indexes.add(target_index)
                target_item = updated_quote_items[target_index]
            else:
                target_item = None
                for index, candidate in enumerate(updated_quote_items):
                    if index in used_indexes:
                        continue
                    candidate_input = (
                        candidate.get("input", {})
                        if isinstance(candidate.get("input"), dict)
                        else candidate
                    )
                    candidate_product_id = candidate.get("product_id") or candidate_input.get("product_id")
                    if (
                        price_override.get("product_id") is not None
                        and candidate_product_id not in (None, "", 0)
                        and str(candidate_product_id) == str(price_override["product_id"])
                    ):
                        target_item = candidate
                        used_indexes.add(index)
                        break
                    candidate_name = str(
                        candidate.get("product_name")
                        or candidate_input.get("product_name")
                        or ""
                    ).strip()
                    if (
                        candidate_name
                        and candidate_name.casefold()
                        == str(price_override.get("product_name") or "").strip().casefold()
                    ):
                        target_item = candidate
                        used_indexes.add(index)
                        break
            if target_item is None:
                raise ValueError("No fue posible ubicar uno de los productos para aplicar el precio real.")

            candidate_input = (
                target_item.get("input", {})
                if isinstance(target_item.get("input"), dict)
                else target_item
            )
            candidate_input["price_usd_net"] = price_override["price_usd_net"]
            if isinstance(target_item.get("input"), dict):
                target_item["input"] = candidate_input
            else:
                target_item["price_usd_net"] = price_override["price_usd_net"]

        recalculated = calculate_quote_bundle(
            {
                "pending_request_id": input_data.get("pending_request_id"),
                "client_id": input_data.get("client_id"),
                "client_name": input_data.get("client_name"),
                "notes": input_data.get("notes"),
                "client_quote_items_text": input_data.get("client_quote_items_text"),
                "quote_items": updated_quote_items,
            }
        )
        updated_record["input"] = recalculated["input"]
        updated_record["result"] = recalculated
        updated_record["client_name"] = recalculated.get("input", {}).get(
            "client_name", updated_record.get("client_name", "")
        )
        updated_record["product_name"] = recalculated.get("input", {}).get(
            "product_name", updated_record.get("product_name", "")
        )
        return updated_record

    single_input = json.loads(json.dumps(input_data, ensure_ascii=False))
    first_override = normalized_prices[0]
    single_input["price_usd_net"] = first_override["price_usd_net"]
    recalculated_quote = QuoteInput.from_dict(single_input)
    recalculated_result = calculate_quote(recalculated_quote)
    updated_record["input"] = recalculated_quote.to_dict()
    updated_record["result"] = recalculated_result
    updated_record["client_name"] = recalculated_quote.client_name
    updated_record["product_name"] = recalculated_quote.product_name
    return updated_record


def _recalculate_confirmed_order_quote_record(
    quote_record: dict[str, Any],
    *,
    exchange_rate_cop: float | None = None,
    notes: str | None = None,
    general_discount_cop: float | None = None,
    actual_purchase_prices: list[dict[str, Any]] | None = None,
    quote_item_updates: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    updated_record = json.loads(json.dumps(quote_record, ensure_ascii=False))
    input_data = (
        updated_record.get("input", {})
        if isinstance(updated_record.get("input"), dict)
        else {}
    )

    if notes is not None:
        clean_notes = str(notes or "").strip()
        updated_record["notes"] = clean_notes
        input_data["notes"] = clean_notes
    if general_discount_cop is not None:
        input_data["general_discount_cop"] = float(general_discount_cop)

    quote_items = input_data.get("quote_items")
    if isinstance(quote_items, list) and quote_items:
        updated_quote_items = json.loads(json.dumps(quote_items, ensure_ascii=False))
        normalized_item_updates = _normalize_order_item_updates(quote_item_updates)
        normalized_purchase_prices = _normalize_actual_purchase_prices(actual_purchase_prices)
        for index, quote_item in enumerate(updated_quote_items):
            if not isinstance(quote_item, dict):
                continue
            item_input = (
                json.loads(json.dumps(quote_item.get("input"), ensure_ascii=False))
                if isinstance(quote_item.get("input"), dict)
                else json.loads(json.dumps(quote_item, ensure_ascii=False))
            )
            if exchange_rate_cop is not None:
                item_input["exchange_rate_cop"] = exchange_rate_cop

            current_sale_price_cop = float(
                quote_item.get("sale_price_cop")
                or item_input.get("final_sale_price_cop")
                or 0
            )
            current_advance_cop = float(
                quote_item.get("advance_cop")
                or item_input.get("final_advance_cop")
                or 0
            )

            matching_update = _find_order_item_update(
                normalized_item_updates,
                quote_item_index=index,
                product_id=quote_item.get("product_id") or item_input.get("product_id"),
                product_name=quote_item.get("product_name") or item_input.get("product_name"),
            )
            matching_purchase_override = _find_order_item_update(
                normalized_purchase_prices,
                quote_item_index=index,
                product_id=quote_item.get("product_id") or item_input.get("product_id"),
                product_name=quote_item.get("product_name") or item_input.get("product_name"),
            )

            if matching_purchase_override and "price_usd_net" in matching_purchase_override:
                item_input["price_usd_net"] = matching_purchase_override["price_usd_net"]

            if matching_update:
                for field_name in (
                    "price_usd_net",
                    "tax_usa_percent",
                    "travel_cost_usd",
                    "locker_shipping_usd",
                ):
                    if field_name in matching_update:
                        item_input[field_name] = matching_update[field_name]

            effective_sale_price_cop = current_sale_price_cop
            if matching_update and "final_sale_price_cop" in matching_update:
                effective_sale_price_cop = float(matching_update["final_sale_price_cop"] or 0)

            current_advance_rate = (
                _safe_ratio(current_advance_cop, current_sale_price_cop)
                if current_sale_price_cop > 0
                else _safe_ratio(item_input.get("final_advance_cop") or 0, item_input.get("final_sale_price_cop") or 0)
            )
            if current_advance_rate is None:
                current_advance_rate = float(item_input.get("advance_percent") or 50.0) / 100

            if effective_sale_price_cop > 0:
                item_input["final_sale_price_cop"] = effective_sale_price_cop
            item_input["final_advance_cop"] = effective_sale_price_cop * current_advance_rate
            quote_item["input"] = item_input

        updated_record["input"]["quote_items"] = updated_quote_items
        recalculated = calculate_quote_bundle(
            {
                "pending_request_id": input_data.get("pending_request_id"),
                "client_id": input_data.get("client_id"),
                "client_name": input_data.get("client_name"),
                "notes": input_data.get("notes"),
                "client_quote_items_text": input_data.get("client_quote_items_text"),
                "general_discount_cop": input_data.get("general_discount_cop"),
                "quote_items": updated_quote_items,
            }
        )
        updated_record["input"] = recalculated["input"]
        updated_record["result"] = recalculated
        updated_record["client_name"] = recalculated.get("input", {}).get(
            "client_name", updated_record.get("client_name", "")
        )
        updated_record["product_name"] = recalculated.get("input", {}).get(
            "product_name", updated_record.get("product_name", "")
        )

        if notes is not None:
            updated_record["notes"] = str(notes or "").strip()
            updated_record.setdefault("input", {})["notes"] = str(notes or "").strip()
        return updated_record

    single_input = json.loads(json.dumps(input_data, ensure_ascii=False))
    if exchange_rate_cop is not None:
        single_input["exchange_rate_cop"] = exchange_rate_cop
    if notes is not None:
        single_input["notes"] = str(notes or "").strip()

    existing_final = updated_record.get("result", {}).get("final", {})
    final_sale_price_cop = float(existing_final.get("sale_price_cop") or 0)
    final_advance_cop = float(existing_final.get("advance_cop") or 0)
    if final_sale_price_cop > 0:
        single_input["final_sale_price_cop"] = final_sale_price_cop
    single_input["final_advance_cop"] = final_advance_cop

    normalized_prices = _normalize_actual_purchase_prices(actual_purchase_prices)
    if normalized_prices:
        single_input["price_usd_net"] = normalized_prices[0]["price_usd_net"]
    normalized_item_updates = _normalize_order_item_updates(quote_item_updates)
    if normalized_item_updates:
        single_update = normalized_item_updates[0]
        for field_name in (
            "price_usd_net",
            "tax_usa_percent",
            "travel_cost_usd",
            "locker_shipping_usd",
            "final_sale_price_cop",
        ):
            if field_name in single_update:
                single_input[field_name] = single_update[field_name]

    recalculated_quote = QuoteInput.from_dict(single_input)
    recalculated_result = calculate_quote(recalculated_quote)
    updated_record["input"] = recalculated_quote.to_dict()
    updated_record["result"] = recalculated_result
    updated_record["client_name"] = recalculated_quote.client_name
    updated_record["product_name"] = recalculated_quote.product_name
    if notes is not None:
        updated_record["notes"] = str(notes or "").strip()
        updated_record.setdefault("input", {})["notes"] = str(notes or "").strip()
    return updated_record


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


def _ensure_orders_runtime_columns(
    connection: sqlite3.Connection | CompatConnection,
) -> None:
    if not _table_exists(connection, "orders"):
        return
    _ensure_table_columns(
        connection,
        "orders",
        {
            "image_data_url": "TEXT NOT NULL DEFAULT ''",
        },
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

    connection.execute(
        "UPDATE companies SET tagline = ? WHERE tagline = ?",
        (DEFAULT_COMPANY_TAGLINE, LEGACY_COMPANY_TAGLINE),
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


def _serialize_whatsapp_settings_row(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {
            "company_id": None,
            "updated_at": "",
            "twilio_account_sid": "",
            "twilio_auth_token": "",
            "whatsapp_sender": "",
            "messaging_service_sid": "",
            "status_callback_url": "",
            "default_country_code": DEFAULT_WHATSAPP_COUNTRY_CODE,
            "auto_send_enabled": False,
            "is_configured": False,
        }
    return {
        "company_id": row["company_id"],
        "updated_at": row["updated_at"],
        "twilio_account_sid": row["twilio_account_sid"],
        "twilio_auth_token": row["twilio_auth_token"],
        "whatsapp_sender": row["whatsapp_sender"],
        "messaging_service_sid": row["messaging_service_sid"],
        "status_callback_url": row["status_callback_url"],
        "default_country_code": row["default_country_code"] or DEFAULT_WHATSAPP_COUNTRY_CODE,
        "auto_send_enabled": bool(row["auto_send_enabled"]),
        "is_configured": bool(row["twilio_account_sid"] and row["twilio_auth_token"]),
    }


def _ensure_company_whatsapp_settings(
    connection: sqlite3.Connection | CompatConnection,
    company_id: int,
) -> dict[str, Any]:
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT
            company_id,
            updated_at,
            twilio_account_sid,
            twilio_auth_token,
            whatsapp_sender,
            messaging_service_sid,
            status_callback_url,
            default_country_code,
            auto_send_enabled
        FROM company_whatsapp_settings
        WHERE company_id = ?
        """,
        (company_id,),
    ).fetchone()
    if row is not None:
        return _serialize_whatsapp_settings_row(row)

    created_at = datetime.now(timezone.utc).isoformat()
    connection.execute(
        """
        INSERT INTO company_whatsapp_settings (
            company_id,
            updated_at,
            twilio_account_sid,
            twilio_auth_token,
            whatsapp_sender,
            messaging_service_sid,
            status_callback_url,
            default_country_code,
            auto_send_enabled
        )
        VALUES (?, ?, '', '', '', '', '', ?, 0)
        """,
        (company_id, created_at, DEFAULT_WHATSAPP_COUNTRY_CODE),
    )
    row = connection.execute(
        """
        SELECT
            company_id,
            updated_at,
            twilio_account_sid,
            twilio_auth_token,
            whatsapp_sender,
            messaging_service_sid,
            status_callback_url,
            default_country_code,
            auto_send_enabled
        FROM company_whatsapp_settings
        WHERE company_id = ?
        """,
        (company_id,),
    ).fetchone()
    return _serialize_whatsapp_settings_row(row)


def _serialize_whatsapp_template_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "company_id": row["company_id"],
        "trigger_key": row["trigger_key"],
        "label": row["label"],
        "body_text": row["body_text"],
        "content_sid": row["content_sid"],
        "content_variables_json": row["content_variables_json"],
        "is_active": bool(row["is_active"]),
        "auto_send_enabled": bool(row["auto_send_enabled"]),
    }


def _seed_default_whatsapp_templates(
    connection: sqlite3.Connection | CompatConnection,
    company_id: int,
) -> None:
    connection.row_factory = sqlite3.Row
    existing_rows = connection.execute(
        """
        SELECT trigger_key
        FROM whatsapp_templates
        WHERE company_id = ?
        """,
        (company_id,),
    ).fetchall()
    existing_keys = {str(row["trigger_key"]) for row in existing_rows}
    statuses = _list_status_rows(connection, company_id=company_id, include_inactive=False)
    now = datetime.now(timezone.utc).isoformat()
    for template in default_whatsapp_templates(statuses):
        if template["trigger_key"] in existing_keys:
            continue
        connection.execute(
            """
            INSERT INTO whatsapp_templates (
                created_at,
                updated_at,
                company_id,
                trigger_key,
                label,
                body_text,
                content_sid,
                content_variables_json,
                is_active,
                auto_send_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                now,
                company_id,
                template["trigger_key"],
                template["label"],
                template["body_text"],
                template["content_sid"],
                template["content_variables_json"],
                1 if template["is_active"] else 0,
                1 if template["auto_send_enabled"] else 0,
            ),
        )


def _serialize_whatsapp_notification_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "company_id": row["company_id"],
        "order_id": row["order_id"],
        "quote_id": row["quote_id"],
        "client_id": row["client_id"],
        "trigger_key": row["trigger_key"],
        "template_id": row["template_id"],
        "template_label": row["template_label"],
        "recipient_phone": row["recipient_phone"],
        "recipient_phone_masked": mask_whatsapp_phone(row["recipient_phone"]),
        "message_text": row["message_text"],
        "provider": row["provider"],
        "external_message_id": row["external_message_id"],
        "status": row["status"],
        "error_message": row["error_message"],
        "source": row["source"],
        "sent_at": row["sent_at"],
        "delivered_at": row["delivered_at"],
        "read_at": row["read_at"],
        "failed_at": row["failed_at"],
    }


def _ensure_product_dimension_value(
    connection: sqlite3.Connection | CompatConnection,
    table_name: str,
    name: str,
    company_id: int,
    description: str = "",
) -> dict[str, Any] | None:
    clean_name = str(name or "").strip()
    normalized_name = _normalize_catalog_name(clean_name)
    if not normalized_name:
        return None

    connection.row_factory = sqlite3.Row
    existing = connection.execute(
        f"""
        SELECT id, created_at, company_id, name, description, is_active
        FROM {table_name}
        WHERE company_id = ? AND normalized_name = ?
        """,
        (company_id, normalized_name),
    ).fetchone()
    if existing is not None:
        return _serialize_dimension_row(existing)

    created_at = datetime.now(timezone.utc).isoformat()
    item_id = _insert_and_get_id(
        connection,
        f"""
        INSERT INTO {table_name} (
            created_at,
            company_id,
            name,
            normalized_name,
            description,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            created_at,
            company_id,
            clean_name,
            normalized_name,
            str(description or "").strip(),
            1,
        ),
    )
    return {
        "id": item_id,
        "created_at": created_at,
        "company_id": company_id,
        "name": clean_name,
        "description": str(description or "").strip(),
        "is_active": True,
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
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        sql = f"""
            SELECT id, created_at, company_id, name, normalized_name, description, is_active
            FROM {table_name}
            WHERE company_id = ?
        """
        params: list[Any] = [company_id]
        if not include_inactive:
            sql += " AND is_active = 1"
        sql += " ORDER BY is_active DESC, normalized_name ASC, id ASC"
        rows = connection.execute(
            sql,
            tuple(params),
        ).fetchall()

    return [_serialize_dimension_row(row) for row in rows]


def _create_product_dimension_row(
    table_name: str,
    name: str,
    *,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        record = _ensure_product_dimension_value(
            connection,
            table_name,
            name,
            company_id,
            description=description,
        )
        connection.commit()
    if record is None:
        raise ValueError("Debes enviar un nombre valido.")
    return record


def _get_product_dimension_row(
    table_name: str,
    item_id: int,
    *,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            f"""
            SELECT id, created_at, company_id, name, normalized_name, description, is_active
            FROM {table_name}
            WHERE id = ? AND company_id = ?
            """,
            (item_id, company_id),
        ).fetchone()
    if row is None:
        raise ValueError("Elemento no encontrado.")
    return _serialize_dimension_row(row)


def _update_product_dimension_row(
    table_name: str,
    item_id: int,
    *,
    name: str,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    clean_name = str(name or "").strip()
    normalized_name = _normalize_catalog_name(clean_name)
    if not normalized_name:
        raise ValueError("Debes enviar un nombre valido.")

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            f"""
            SELECT id
            FROM {table_name}
            WHERE id = ? AND company_id = ?
            """,
            (item_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("Elemento no encontrado.")

        duplicate = connection.execute(
            f"""
            SELECT id
            FROM {table_name}
            WHERE company_id = ? AND normalized_name = ? AND id <> ?
            """,
            (company_id, normalized_name, item_id),
        ).fetchone()
        if duplicate is not None:
            raise ValueError("Ya existe un registro con ese nombre.")

        connection.execute(
            f"""
            UPDATE {table_name}
            SET name = ?, normalized_name = ?, description = ?
            WHERE id = ? AND company_id = ?
            """,
            (clean_name, normalized_name, str(description or "").strip(), item_id, company_id),
        )
        connection.commit()

    return _get_product_dimension_row(table_name, item_id, company_id=company_id)


def _set_product_dimension_active(
    table_name: str,
    item_id: int,
    *,
    is_active: bool,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.execute(
            f"""
            UPDATE {table_name}
            SET is_active = ?
            WHERE id = ? AND company_id = ?
            """,
            (_to_bool_flag(is_active), item_id, company_id),
        )
        connection.commit()
    return _get_product_dimension_row(table_name, item_id, company_id=company_id)


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


def _serialize_inventory_purchase_item_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "purchase_id": row["purchase_id"],
        "product_id": row["product_id"],
        "product_name": row["product_name"],
        "quantity": int(row["quantity"] or 0),
        "unit_cost_cop": float(row["unit_cost_cop"] or 0),
        "line_total_cop": float(row["line_total_cop"] or 0),
        "notes": row["notes"],
    }


def _serialize_inventory_purchase_row(
    row: sqlite3.Row,
    items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    normalized_items = list(items or [])
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "purchase_date": row["purchase_date"],
        "supplier_name": row["supplier_name"],
        "total_amount_cop": float(row["total_amount_cop"] or 0),
        "cash_out_cop": float(row["total_amount_cop"] or 0),
        "expense_id": row["expense_id"],
        "notes": row["notes"],
        "items_count": len(normalized_items),
        "total_units": sum(int(item.get("quantity") or 0) for item in normalized_items),
        "items": normalized_items,
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


def _sync_advance_payment_event(
    connection: sqlite3.Connection | CompatConnection,
    *,
    company_id: int,
    order_id: int,
    amount_cop: float,
    payment_date: str,
) -> None:
    connection.row_factory = sqlite3.Row
    existing = connection.execute(
        """
        SELECT id
        FROM payment_events
        WHERE order_id = ? AND company_id = ? AND payment_kind = 'advance'
        ORDER BY id ASC
        LIMIT 1
        """,
        (order_id, company_id),
    ).fetchone()

    if amount_cop <= 0:
        if existing is not None:
            connection.execute(
                "DELETE FROM payment_events WHERE order_id = ? AND company_id = ? AND payment_kind = 'advance'",
                (order_id, company_id),
            )
        return

    if existing is None:
        _record_payment_event(
            connection,
            company_id=company_id,
            order_id=order_id,
            payment_kind="advance",
            amount_cop=amount_cop,
            payment_date=payment_date,
            note="Anticipo actualizado desde la compra.",
        )
        return

    connection.execute(
        """
        UPDATE payment_events
        SET amount_cop = ?, payment_date = ?, note = ?
        WHERE id = ?
        """,
        (
            amount_cop,
            payment_date,
            "Anticipo actualizado desde la compra.",
            existing["id"],
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
                    identification TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    phone TEXT NOT NULL,
                    email TEXT NOT NULL,
                    city TEXT NOT NULL,
                    address TEXT NOT NULL DEFAULT '',
                    neighborhood TEXT NOT NULL DEFAULT '',
                    whatsapp_phone TEXT NOT NULL DEFAULT '',
                    whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
                    whatsapp_opt_in_at TEXT NOT NULL DEFAULT '',
                    preferred_contact_channel TEXT NOT NULL DEFAULT '',
                    preferred_payment_method TEXT NOT NULL DEFAULT '',
                    interests TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1
                )
                """
            )
            _ensure_table_columns(
                connection,
                "clients",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "identification": "TEXT NOT NULL DEFAULT ''",
                    "description": "TEXT NOT NULL DEFAULT ''",
                    "address": "TEXT NOT NULL DEFAULT ''",
                    "neighborhood": "TEXT NOT NULL DEFAULT ''",
                    "whatsapp_phone": "TEXT NOT NULL DEFAULT ''",
                    "whatsapp_opt_in": "INTEGER NOT NULL DEFAULT 0",
                    "whatsapp_opt_in_at": "TEXT NOT NULL DEFAULT ''",
                    "preferred_contact_channel": "TEXT NOT NULL DEFAULT ''",
                    "preferred_payment_method": "TEXT NOT NULL DEFAULT ''",
                    "interests": "TEXT NOT NULL DEFAULT ''",
                    "is_active": "INTEGER NOT NULL DEFAULT 1",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS company_whatsapp_settings (
                    company_id INTEGER PRIMARY KEY,
                    updated_at TEXT NOT NULL,
                    twilio_account_sid TEXT NOT NULL DEFAULT '',
                    twilio_auth_token TEXT NOT NULL DEFAULT '',
                    whatsapp_sender TEXT NOT NULL DEFAULT '',
                    messaging_service_sid TEXT NOT NULL DEFAULT '',
                    status_callback_url TEXT NOT NULL DEFAULT '',
                    default_country_code TEXT NOT NULL DEFAULT '+57',
                    auto_send_enabled INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS whatsapp_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    trigger_key TEXT NOT NULL,
                    label TEXT NOT NULL,
                    body_text TEXT NOT NULL DEFAULT '',
                    content_sid TEXT NOT NULL DEFAULT '',
                    content_variables_json TEXT NOT NULL DEFAULT '',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    auto_send_enabled INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(company_id, trigger_key)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS whatsapp_notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    order_id INTEGER,
                    quote_id INTEGER,
                    client_id INTEGER,
                    trigger_key TEXT NOT NULL DEFAULT '',
                    template_id INTEGER,
                    template_label TEXT NOT NULL DEFAULT '',
                    recipient_phone TEXT NOT NULL DEFAULT '',
                    message_text TEXT NOT NULL DEFAULT '',
                    provider TEXT NOT NULL DEFAULT 'twilio',
                    external_message_id TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'queued',
                    error_message TEXT NOT NULL DEFAULT '',
                    source TEXT NOT NULL DEFAULT '',
                    sent_at TEXT NOT NULL DEFAULT '',
                    delivered_at TEXT NOT NULL DEFAULT '',
                    read_at TEXT NOT NULL DEFAULT '',
                    failed_at TEXT NOT NULL DEFAULT '',
                    response_json TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    image_data_url TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    reference TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    store TEXT NOT NULL DEFAULT '',
                    inventory_enabled INTEGER NOT NULL DEFAULT 0,
                    current_stock INTEGER NOT NULL DEFAULT 0,
                    inventory_unit_cost_cop REAL NOT NULL DEFAULT 0,
                    current_stock_value_cop REAL NOT NULL DEFAULT 0,
                    price_usd_net REAL NOT NULL,
                    tax_usa_percent REAL NOT NULL,
                    locker_shipping_usd REAL NOT NULL,
                    notes TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1
                )
                """
            )
            _ensure_table_columns(
                connection,
                "products",
                {
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "image_data_url": "TEXT NOT NULL DEFAULT ''",
                    "description": "TEXT NOT NULL DEFAULT ''",
                    "category": "TEXT NOT NULL DEFAULT ''",
                    "store": "TEXT NOT NULL DEFAULT ''",
                    "inventory_enabled": "INTEGER NOT NULL DEFAULT 0",
                    "current_stock": "INTEGER NOT NULL DEFAULT 0",
                    "inventory_unit_cost_cop": "REAL NOT NULL DEFAULT 0",
                    "current_stock_value_cop": "REAL NOT NULL DEFAULT 0",
                    "is_active": "INTEGER NOT NULL DEFAULT 1",
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
                    description TEXT NOT NULL DEFAULT '',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(company_id, normalized_name)
                )
                """
            )
            _ensure_table_columns(
                connection,
                "product_categories",
                {
                    "description": "TEXT NOT NULL DEFAULT ''",
                    "is_active": "INTEGER NOT NULL DEFAULT 1",
                },
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS product_stores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    name TEXT NOT NULL,
                    normalized_name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(company_id, normalized_name)
                )
                """
            )
            _ensure_table_columns(
                connection,
                "product_stores",
                {
                    "description": "TEXT NOT NULL DEFAULT ''",
                    "is_active": "INTEGER NOT NULL DEFAULT 1",
                },
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
                    image_data_url TEXT NOT NULL DEFAULT '',
                    balance_due_cop REAL NOT NULL,
                    notes TEXT NOT NULL,
                    snapshot_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS order_archives (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    original_order_id INTEGER NOT NULL,
                    original_quote_id INTEGER,
                    archive_action TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '',
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS inventory_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    product_id INTEGER NOT NULL,
                    movement_type TEXT NOT NULL,
                    quantity_delta INTEGER NOT NULL DEFAULT 0,
                    quantity_after INTEGER NOT NULL DEFAULT 0,
                    unit_cost_cop REAL NOT NULL DEFAULT 0,
                    total_cost_delta_cop REAL NOT NULL DEFAULT 0,
                    stock_value_after_cop REAL NOT NULL DEFAULT 0,
                    note TEXT NOT NULL DEFAULT '',
                    related_order_id INTEGER,
                    source TEXT NOT NULL DEFAULT ''
                )
                """
            )
            _ensure_table_columns(
                connection,
                "inventory_movements",
                {
                    "image_data_url": "TEXT NOT NULL DEFAULT ''",
                    "company_id": "INTEGER NOT NULL DEFAULT 1",
                    "unit_cost_cop": "REAL NOT NULL DEFAULT 0",
                    "total_cost_delta_cop": "REAL NOT NULL DEFAULT 0",
                    "stock_value_after_cop": "REAL NOT NULL DEFAULT 0",
                    "source": "TEXT NOT NULL DEFAULT ''",
                },
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
                """
                CREATE TABLE IF NOT EXISTS inventory_purchases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    purchase_date TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    total_amount_cop REAL NOT NULL,
                    expense_id INTEGER,
                    notes TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS inventory_purchase_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    company_id INTEGER NOT NULL DEFAULT 1,
                    purchase_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    unit_cost_cop REAL NOT NULL DEFAULT 0,
                    line_total_cop REAL NOT NULL DEFAULT 0,
                    notes TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_clients_company_created ON clients (company_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company_trigger ON whatsapp_templates (company_id, trigger_key)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_company_order ON whatsapp_notifications (company_id, order_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_sid ON whatsapp_notifications (external_message_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_products_company_created ON products (company_id, id DESC)"
            )
            connection.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_company_identification_unique ON clients (company_id, identification) WHERE identification <> ''"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_product ON inventory_movements (company_id, product_id, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_order ON inventory_movements (company_id, related_order_id, id DESC)"
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
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_purchases_company_date ON inventory_purchases (company_id, purchase_date DESC, id DESC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_purchase_items_company_purchase ON inventory_purchase_items (company_id, purchase_id, id ASC)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_purchase_items_company_product ON inventory_purchase_items (company_id, product_id, id DESC)"
            )

            default_company_id = 1
            if not skip_defaults:
                default_company = _ensure_default_company_and_admin(connection)
                default_company_id = int(default_company["id"])

            _ensure_company_id_column(connection, "clients", default_company_id)
            _ensure_company_id_column(connection, "whatsapp_templates", default_company_id)
            _ensure_company_id_column(connection, "whatsapp_notifications", default_company_id)
            _ensure_company_id_column(connection, "products", default_company_id)
            _ensure_company_id_column(connection, "product_categories", default_company_id)
            _ensure_company_id_column(connection, "product_stores", default_company_id)
            _ensure_company_id_column(connection, "pending_requests", default_company_id)
            _ensure_company_id_column(connection, "quotes", default_company_id)
            _ensure_company_id_column(connection, "orders", default_company_id)
            _ensure_company_id_column(connection, "order_events", default_company_id)
            _ensure_company_id_column(connection, "payment_events", default_company_id)
            _ensure_company_id_column(connection, "inventory_movements", default_company_id)
            _ensure_company_id_column(connection, "expenses", default_company_id)
            _ensure_company_id_column(connection, "inventory_purchases", default_company_id)
            _ensure_company_id_column(connection, "inventory_purchase_items", default_company_id)
            _seed_product_dimension_catalogs(connection)
            if not skip_defaults:
                _ensure_company_whatsapp_settings(connection, default_company_id)
                _seed_default_whatsapp_templates(connection, default_company_id)
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


def get_company_by_slug(slug: str) -> dict[str, Any] | None:
    init_db()
    clean_slug = build_status_key(str(slug or "").strip()).replace("_", "-")
    if not clean_slug:
        return None

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT id, slug, name, brand_name, tagline, logo_path, is_active
            FROM companies
            WHERE slug = ?
            """,
            (clean_slug,),
        ).fetchone()

    if row is None:
        return None
    return _serialize_company_row(row)


def get_company_whatsapp_settings(company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        settings = _ensure_company_whatsapp_settings(connection, company_id)
        connection.commit()
    return settings


def save_company_whatsapp_settings(
    settings_data: dict[str, Any], company_id: int | None = None
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    updated_at = datetime.now(timezone.utc).isoformat()

    clean_default_country_code = str(
        settings_data.get("default_country_code") or DEFAULT_WHATSAPP_COUNTRY_CODE
    ).strip()
    if clean_default_country_code and not clean_default_country_code.startswith("+"):
        clean_default_country_code = f"+{clean_default_country_code}"

    with closing(_connect()) as connection:
        _ensure_company_whatsapp_settings(connection, company_id)
        connection.execute(
            """
            UPDATE company_whatsapp_settings
            SET updated_at = ?,
                twilio_account_sid = ?,
                twilio_auth_token = ?,
                whatsapp_sender = ?,
                messaging_service_sid = ?,
                status_callback_url = ?,
                default_country_code = ?,
                auto_send_enabled = ?
            WHERE company_id = ?
            """,
            (
                updated_at,
                str(settings_data.get("twilio_account_sid", "")).strip(),
                str(settings_data.get("twilio_auth_token", "")).strip(),
                str(settings_data.get("whatsapp_sender", "")).strip(),
                str(settings_data.get("messaging_service_sid", "")).strip(),
                str(settings_data.get("status_callback_url", "")).strip(),
                clean_default_country_code or DEFAULT_WHATSAPP_COUNTRY_CODE,
                _to_bool_flag(settings_data.get("auto_send_enabled")),
                company_id,
            ),
        )
        connection.commit()

    return get_company_whatsapp_settings(company_id=company_id)


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
        _ensure_company_whatsapp_settings(connection, company_id)
        _seed_default_whatsapp_templates(connection, company_id)
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


def _serialize_client_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "name": row["name"],
        "identification": row["identification"],
        "description": row["description"],
        "phone": row["phone"],
        "email": row["email"],
        "city": row["city"],
        "address": row["address"],
        "neighborhood": row["neighborhood"],
        "whatsapp_phone": row["whatsapp_phone"],
        "whatsapp_phone_masked": mask_whatsapp_phone(row["whatsapp_phone"]),
        "whatsapp_opt_in": bool(row["whatsapp_opt_in"]),
        "whatsapp_opt_in_at": row["whatsapp_opt_in_at"],
        "preferred_contact_channel": row["preferred_contact_channel"],
        "preferred_payment_method": row["preferred_payment_method"],
        "interests": row["interests"],
        "notes": row["notes"],
        "is_active": bool(row["is_active"]),
    }


def _serialize_product_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "name": row["name"],
        "image_data_url": row["image_data_url"],
        "description": row["description"],
        "reference": row["reference"],
        "category": row["category"],
        "store": row["store"],
        "inventory_enabled": bool(row["inventory_enabled"]),
        "current_stock": int(row["current_stock"] or 0),
        "inventory_unit_cost_cop": float(row["inventory_unit_cost_cop"] or 0),
        "current_stock_value_cop": float(row["current_stock_value_cop"] or 0),
        "price_usd_net": row["price_usd_net"],
        "tax_usa_percent": row["tax_usa_percent"],
        "locker_shipping_usd": row["locker_shipping_usd"],
        "notes": row["notes"],
        "is_active": bool(row["is_active"]),
    }


def _serialize_dimension_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "name": row["name"],
        "description": row["description"],
        "is_active": bool(row["is_active"]),
    }


def save_client(client_data: dict[str, Any], company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    identification = _normalize_client_identification(client_data.get("identification", ""))
    whatsapp_phone = normalize_whatsapp_phone(client_data.get("whatsapp_phone", ""))
    whatsapp_opt_in = bool(client_data.get("whatsapp_opt_in")) and bool(whatsapp_phone)
    if client_data.get("whatsapp_opt_in") and not whatsapp_phone:
        raise ValueError("Debes registrar el WhatsApp del cliente para activar notificaciones.")
    whatsapp_opt_in_at = created_at if whatsapp_opt_in else ""

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        if identification:
            existing = connection.execute(
                """
                SELECT id
                FROM clients
                WHERE company_id = ? AND identification = ?
                LIMIT 1
                """,
                (company_id, identification),
            ).fetchone()
            if existing is not None:
                raise ValueError("Ya existe un cliente con esa identificacion.")

        client_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO clients (
                created_at,
                company_id,
                name,
                identification,
                description,
                phone,
                email,
                city,
                address,
                neighborhood,
                whatsapp_phone,
                whatsapp_opt_in,
                whatsapp_opt_in_at,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                client_data.get("name", ""),
                identification,
                client_data.get("description", ""),
                client_data.get("phone", ""),
                client_data.get("email", ""),
                client_data.get("city", ""),
                client_data.get("address", ""),
                client_data.get("neighborhood", ""),
                whatsapp_phone,
                1 if whatsapp_opt_in else 0,
                whatsapp_opt_in_at,
                client_data.get("preferred_contact_channel", ""),
                client_data.get("preferred_payment_method", ""),
                client_data.get("interests", ""),
                client_data.get("notes", ""),
                1,
            ),
        )
        connection.commit()

    return get_client_summary(client_id, company_id=company_id)


def get_client_summary(client_id: int, company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                identification,
                description,
                phone,
                email,
                city,
                address,
                neighborhood,
                whatsapp_phone,
                whatsapp_opt_in,
                whatsapp_opt_in_at,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes,
                is_active
            FROM clients
            WHERE id = ? AND company_id = ?
            """,
            (client_id, company_id),
        ).fetchone()
    if row is None:
        raise ValueError("Cliente no encontrado.")
    return _serialize_client_row(row)


def update_client(
    client_id: int,
    client_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    updated_at = datetime.now(timezone.utc).isoformat()
    identification = _normalize_client_identification(client_data.get("identification", ""))

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            """
            SELECT id, whatsapp_phone, whatsapp_opt_in, whatsapp_opt_in_at, is_active
            FROM clients
            WHERE id = ? AND company_id = ?
            """,
            (client_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("Cliente no encontrado.")

        if identification:
            duplicate = connection.execute(
                """
                SELECT id
                FROM clients
                WHERE company_id = ? AND identification = ? AND id <> ?
                LIMIT 1
                """,
                (company_id, identification, client_id),
            ).fetchone()
            if duplicate is not None:
                raise ValueError("Ya existe un cliente con esa identificacion.")

        whatsapp_phone = normalize_whatsapp_phone(client_data.get("whatsapp_phone", ""))
        whatsapp_opt_in = bool(client_data.get("whatsapp_opt_in")) and bool(whatsapp_phone)
        if client_data.get("whatsapp_opt_in") and not whatsapp_phone:
            raise ValueError("Debes registrar el WhatsApp del cliente para activar notificaciones.")

        existing_opt_in = bool(existing["whatsapp_opt_in"])
        existing_opt_in_at = str(existing["whatsapp_opt_in_at"] or "").strip()
        if whatsapp_opt_in:
            whatsapp_opt_in_at = existing_opt_in_at or updated_at
        else:
            whatsapp_opt_in_at = ""

        connection.execute(
            """
            UPDATE clients
            SET
                name = ?,
                identification = ?,
                description = ?,
                phone = ?,
                email = ?,
                city = ?,
                address = ?,
                neighborhood = ?,
                whatsapp_phone = ?,
                whatsapp_opt_in = ?,
                whatsapp_opt_in_at = ?,
                preferred_contact_channel = ?,
                preferred_payment_method = ?,
                interests = ?,
                notes = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                client_data.get("name", ""),
                identification,
                client_data.get("description", ""),
                client_data.get("phone", ""),
                client_data.get("email", ""),
                client_data.get("city", ""),
                client_data.get("address", ""),
                client_data.get("neighborhood", ""),
                whatsapp_phone,
                1 if whatsapp_opt_in else 0,
                whatsapp_opt_in_at,
                client_data.get("preferred_contact_channel", ""),
                client_data.get("preferred_payment_method", ""),
                client_data.get("interests", ""),
                client_data.get("notes", ""),
                client_id,
                company_id,
            ),
        )
        connection.commit()

    return get_client_summary(client_id, company_id=company_id)


def set_client_active(
    client_id: int,
    is_active: bool,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.execute(
            """
            UPDATE clients
            SET is_active = ?
            WHERE id = ? AND company_id = ?
            """,
            (_to_bool_flag(is_active), client_id, company_id),
        )
        connection.commit()
    return get_client_summary(client_id, company_id=company_id)


def list_clients(
    limit: int = 100,
    company_id: int | None = None,
    *,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        sql = """
            SELECT
                id,
                created_at,
                company_id,
                name,
                identification,
                description,
                phone,
                email,
                city,
                address,
                neighborhood,
                whatsapp_phone,
                whatsapp_opt_in,
                whatsapp_opt_in_at,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes,
                is_active
            FROM clients
            WHERE company_id = ?
        """
        params: list[Any] = [company_id]
        if not include_inactive:
            sql += " AND is_active = 1"
        sql += " ORDER BY is_active DESC, id DESC LIMIT ?"
        params.append(limit)
        rows = connection.execute(
            sql,
            tuple(params),
        ).fetchall()

    return [_serialize_client_row(row) for row in rows]


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
                identification,
                description,
                phone,
                email,
                city,
                address,
                neighborhood,
                whatsapp_phone,
                whatsapp_opt_in,
                whatsapp_opt_in_at,
                preferred_contact_channel,
                preferred_payment_method,
                interests,
                notes,
                is_active
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
        "client": _serialize_client_row(client_row),
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


def list_product_categories(
    company_id: int | None = None,
    *,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    return _list_product_dimension_rows(
        "product_categories",
        company_id=company_id,
        include_inactive=include_inactive,
    )


def create_product_category(
    name: str,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    return _create_product_dimension_row(
        "product_categories",
        name,
        description=description,
        company_id=company_id,
    )


def update_product_category(
    category_id: int,
    *,
    name: str,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    return _update_product_dimension_row(
        "product_categories",
        category_id,
        name=name,
        description=description,
        company_id=company_id,
    )


def set_product_category_active(
    category_id: int,
    *,
    is_active: bool,
    company_id: int | None = None,
) -> dict[str, Any]:
    return _set_product_dimension_active(
        "product_categories",
        category_id,
        is_active=is_active,
        company_id=company_id,
    )


def list_product_stores(
    company_id: int | None = None,
    *,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    return _list_product_dimension_rows(
        "product_stores",
        company_id=company_id,
        include_inactive=include_inactive,
    )


def create_product_store(
    name: str,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    return _create_product_dimension_row(
        "product_stores",
        name,
        description=description,
        company_id=company_id,
    )


def update_product_store(
    store_id: int,
    *,
    name: str,
    description: str = "",
    company_id: int | None = None,
) -> dict[str, Any]:
    return _update_product_dimension_row(
        "product_stores",
        store_id,
        name=name,
        description=description,
        company_id=company_id,
    )


def set_product_store_active(
    store_id: int,
    *,
    is_active: bool,
    company_id: int | None = None,
) -> dict[str, Any]:
    return _set_product_dimension_active(
        "product_stores",
        store_id,
        is_active=is_active,
        company_id=company_id,
    )


def _serialize_inventory_movement_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "company_id": row["company_id"],
        "product_id": row["product_id"],
        "movement_type": row["movement_type"],
        "movement_label": get_inventory_movement_label(row["movement_type"]),
        "quantity_delta": int(row["quantity_delta"] or 0),
        "quantity_after": int(row["quantity_after"] or 0),
        "unit_cost_cop": float(row["unit_cost_cop"] or 0),
        "total_cost_delta_cop": float(row["total_cost_delta_cop"] or 0),
        "stock_value_after_cop": float(row["stock_value_after_cop"] or 0),
        "note": row["note"],
        "related_order_id": row["related_order_id"],
        "source": row["source"],
    }


def _get_product_row(
    connection: sqlite3.Connection | CompatConnection,
    *,
    product_id: int,
    company_id: int,
) -> sqlite3.Row | None:
    connection.row_factory = sqlite3.Row
    return connection.execute(
        """
        SELECT
            id,
            created_at,
            company_id,
            name,
            image_data_url,
            description,
            reference,
            category,
            store,
            inventory_enabled,
            current_stock,
            inventory_unit_cost_cop,
            current_stock_value_cop,
            price_usd_net,
            tax_usa_percent,
            locker_shipping_usd,
            notes,
            is_active
        FROM products
        WHERE id = ? AND company_id = ?
        """,
        (product_id, company_id),
    ).fetchone()


def _coerce_inventory_quantity(quantity: Any, *, field_name: str = "quantity") -> int:
    try:
        value = int(quantity)
    except (TypeError, ValueError) as exc:
        raise ValueError("La cantidad de inventario debe ser un numero entero.") from exc
    if value < 0:
        raise ValueError(f"El campo '{field_name}' no puede ser negativo.")
    return value


def _record_inventory_movement(
    connection: sqlite3.Connection | CompatConnection,
    *,
    product_id: int,
    company_id: int,
    movement_type: str,
    quantity: int,
    unit_cost_cop: float | None = None,
    note: str = "",
    related_order_id: int | None = None,
    source: str = "manual",
) -> tuple[dict[str, Any], dict[str, Any]]:
    clean_movement_type = str(movement_type or "").strip().lower()
    if clean_movement_type not in INVENTORY_MOVEMENT_LABELS:
        raise ValueError("El tipo de movimiento de inventario no es valido.")

    clean_note = str(note or "").strip()
    clean_source = str(source or "").strip() or "manual"
    normalized_quantity = _coerce_inventory_quantity(quantity)

    product_row = _get_product_row(connection, product_id=product_id, company_id=company_id)
    if product_row is None:
        raise ValueError("El producto no existe.")

    current_stock = int(product_row["current_stock"] or 0)
    inventory_enabled = bool(product_row["inventory_enabled"])
    current_unit_cost_cop = float(product_row["inventory_unit_cost_cop"] or 0)
    current_stock_value_cop = float(product_row["current_stock_value_cop"] or 0)
    if current_stock_value_cop < INVENTORY_COST_EPSILON:
        current_stock_value_cop = 0.0
    if current_stock > 0 and current_unit_cost_cop <= 0 and current_stock_value_cop > 0:
        current_unit_cost_cop = current_stock_value_cop / current_stock
    normalized_unit_cost = None if unit_cost_cop in (None, "") else float(unit_cost_cop)
    if normalized_unit_cost is not None and normalized_unit_cost < 0:
        raise ValueError("El costo unitario del inventario no puede ser negativo.")

    quantity_delta = 0
    quantity_after = current_stock
    effective_unit_cost_cop = 0.0
    total_cost_delta_cop = 0.0
    stock_value_after_cop = current_stock_value_cop

    if clean_movement_type == INVENTORY_MOVEMENT_STOCK_IN:
        if normalized_quantity <= 0:
            raise ValueError("La entrada de inventario debe ser mayor a cero.")
        quantity_delta = normalized_quantity
        quantity_after = current_stock + normalized_quantity
        inventory_enabled = True
        effective_unit_cost_cop = (
            float(normalized_unit_cost)
            if normalized_unit_cost is not None
            else float(current_unit_cost_cop or 0)
        )
        base_stock_value_cop = current_stock_value_cop
        if current_stock > 0 and base_stock_value_cop <= 0 and effective_unit_cost_cop > 0:
            base_stock_value_cop = current_stock * effective_unit_cost_cop
        total_cost_delta_cop = effective_unit_cost_cop * normalized_quantity
        stock_value_after_cop = base_stock_value_cop + total_cost_delta_cop
    elif clean_movement_type in {INVENTORY_MOVEMENT_STOCK_OUT, INVENTORY_MOVEMENT_SALE_OUT}:
        if not inventory_enabled:
            raise ValueError("Este producto no tiene inventario de tienda habilitado.")
        if normalized_quantity <= 0:
            raise ValueError("La salida de inventario debe ser mayor a cero.")
        quantity_delta = -normalized_quantity
        quantity_after = current_stock - normalized_quantity
        if quantity_after < 0:
            raise ValueError(
                f"No hay suficiente inventario para {product_row['name']}. Stock actual: {current_stock}."
            )
        effective_unit_cost_cop = float(current_unit_cost_cop or 0)
        if effective_unit_cost_cop <= 0 and current_stock > 0 and current_stock_value_cop > 0:
            effective_unit_cost_cop = current_stock_value_cop / current_stock
        total_cost_delta_cop = -(effective_unit_cost_cop * normalized_quantity)
        stock_value_after_cop = current_stock_value_cop + total_cost_delta_cop
    else:
        inventory_enabled = True
        quantity_delta = normalized_quantity - current_stock
        quantity_after = normalized_quantity
        if quantity_delta > 0:
            effective_unit_cost_cop = (
                float(normalized_unit_cost)
                if normalized_unit_cost is not None
                else float(current_unit_cost_cop or 0)
            )
            base_stock_value_cop = current_stock_value_cop
            if current_stock > 0 and base_stock_value_cop <= 0 and effective_unit_cost_cop > 0:
                base_stock_value_cop = current_stock * effective_unit_cost_cop
            total_cost_delta_cop = effective_unit_cost_cop * quantity_delta
            stock_value_after_cop = base_stock_value_cop + total_cost_delta_cop
        elif quantity_delta < 0:
            effective_unit_cost_cop = float(current_unit_cost_cop or 0)
            if effective_unit_cost_cop <= 0 and current_stock > 0 and current_stock_value_cop > 0:
                effective_unit_cost_cop = current_stock_value_cop / current_stock
            total_cost_delta_cop = effective_unit_cost_cop * quantity_delta
            stock_value_after_cop = current_stock_value_cop + total_cost_delta_cop
        else:
            effective_unit_cost_cop = float(current_unit_cost_cop or 0)

    if abs(stock_value_after_cop) < INVENTORY_COST_EPSILON:
        stock_value_after_cop = 0.0
    if stock_value_after_cop < -INVENTORY_COST_EPSILON:
        raise ValueError("El valor del inventario no puede quedar negativo.")
    if stock_value_after_cop < 0:
        stock_value_after_cop = 0.0

    average_unit_cost_cop = (
        stock_value_after_cop / quantity_after
        if quantity_after > 0 and stock_value_after_cop > 0
        else 0.0
    )

    now = datetime.now(timezone.utc).isoformat()
    connection.execute(
        """
        UPDATE products
        SET inventory_enabled = ?,
            current_stock = ?,
            inventory_unit_cost_cop = ?,
            current_stock_value_cop = ?
        WHERE id = ? AND company_id = ?
        """,
        (
            1 if inventory_enabled else 0,
            quantity_after,
            average_unit_cost_cop,
            stock_value_after_cop,
            product_id,
            company_id,
        ),
    )
    movement_id = _insert_and_get_id(
        connection,
        """
        INSERT INTO inventory_movements (
            created_at,
            company_id,
            product_id,
            movement_type,
            quantity_delta,
            quantity_after,
            unit_cost_cop,
            total_cost_delta_cop,
            stock_value_after_cop,
            note,
            related_order_id,
            source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now,
            company_id,
            product_id,
            clean_movement_type,
            quantity_delta,
            quantity_after,
            effective_unit_cost_cop,
            total_cost_delta_cop,
            stock_value_after_cop,
            clean_note,
            related_order_id,
            clean_source,
        ),
    )
    movement_row = connection.execute(
        """
        SELECT
            id,
            created_at,
            company_id,
            product_id,
            movement_type,
            quantity_delta,
            quantity_after,
            unit_cost_cop,
            total_cost_delta_cop,
            stock_value_after_cop,
            note,
            related_order_id,
            source
        FROM inventory_movements
        WHERE id = ?
        """,
        (movement_id,),
    ).fetchone()
    updated_product_row = _get_product_row(connection, product_id=product_id, company_id=company_id)
    if updated_product_row is None:
        raise ValueError("No fue posible cargar el producto actualizado.")
    return _serialize_inventory_movement_row(movement_row), _serialize_product_row(updated_product_row)


def record_product_inventory_movement(
    product_id: int,
    *,
    movement_type: str,
    quantity: int,
    unit_cost_cop: float | None = None,
    note: str = "",
    related_order_id: int | None = None,
    source: str = "manual",
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        movement, product = _record_inventory_movement(
            connection,
            product_id=product_id,
            company_id=company_id,
            movement_type=movement_type,
            quantity=quantity,
            unit_cost_cop=unit_cost_cop,
            note=note,
            related_order_id=related_order_id,
            source=source,
        )
        connection.commit()
    return {"movement": movement, "product": product}


def save_product(product_data: dict[str, Any], company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    image_data_url = _sanitize_image_data_url(product_data.get("image_data_url", ""))
    initial_stock_quantity = _coerce_inventory_quantity(
        product_data.get("initial_stock_quantity") or 0,
        field_name="initial_stock_quantity",
    )
    inventory_enabled = bool(product_data.get("inventory_enabled")) or initial_stock_quantity > 0

    with closing(_connect()) as connection:
        product_columns = [
            "created_at",
            "company_id",
            "name",
            "image_data_url",
            "description",
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
            image_data_url,
            product_data.get("description", ""),
            product_data.get("reference", ""),
            product_data.get("category", ""),
            product_data.get("store", ""),
            product_data.get("price_usd_net", 0),
            product_data.get("tax_usa_percent", 0),
            product_data.get("locker_shipping_usd", 0),
            product_data.get("notes", ""),
        ]
        existing_columns = _get_table_columns(connection, "products")
        for column_name, default_value in (
            ("inventory_enabled", 1 if inventory_enabled else 0),
            ("current_stock", 0),
            ("inventory_unit_cost_cop", 0),
            ("current_stock_value_cop", 0),
            ("is_active", 1),
        ):
            if column_name in existing_columns:
                product_columns.append(column_name)
                product_values.append(default_value)
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
        if inventory_enabled and initial_stock_quantity > 0:
            _record_inventory_movement(
                connection,
                product_id=product_id,
                company_id=company_id,
                movement_type=INVENTORY_MOVEMENT_STOCK_IN,
                quantity=initial_stock_quantity,
                note="Stock inicial registrado al crear el producto.",
                source="product_create",
            )
        connection.commit()

    return get_product_summary(product_id, company_id=company_id)


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


def get_product_summary(product_id: int, company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                name,
                image_data_url,
                description,
                reference,
                category,
                store,
                inventory_enabled,
                current_stock,
                inventory_unit_cost_cop,
                current_stock_value_cop,
                price_usd_net,
                tax_usa_percent,
                locker_shipping_usd,
                notes,
                is_active
            FROM products
            WHERE id = ? AND company_id = ?
            """,
            (product_id, company_id),
        ).fetchone()
    if row is None:
        raise ValueError("Producto no encontrado.")
    return _serialize_product_row(row)


def update_product(
    product_id: int,
    product_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    image_data_url = _sanitize_image_data_url(product_data.get("image_data_url", ""))
    initial_stock_quantity = _coerce_inventory_quantity(
        product_data.get("initial_stock_quantity") or 0,
        field_name="initial_stock_quantity",
    )

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        existing = connection.execute(
            """
            SELECT inventory_enabled, current_stock, inventory_unit_cost_cop, current_stock_value_cop
            FROM products
            WHERE id = ? AND company_id = ?
            """,
            (product_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("Producto no encontrado.")

        current_stock = int(existing["current_stock"] or 0)
        inventory_enabled = bool(product_data.get("inventory_enabled")) or current_stock > 0 or initial_stock_quantity > 0

        connection.execute(
            """
            UPDATE products
            SET
                name = ?,
                image_data_url = ?,
                description = ?,
                reference = ?,
                category = ?,
                store = ?,
                inventory_enabled = ?,
                price_usd_net = ?,
                tax_usa_percent = ?,
                locker_shipping_usd = ?,
                notes = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                product_data.get("name", ""),
                image_data_url,
                product_data.get("description", ""),
                product_data.get("reference", ""),
                product_data.get("category", ""),
                product_data.get("store", ""),
                1 if inventory_enabled else 0,
                product_data.get("price_usd_net", 0),
                product_data.get("tax_usa_percent", 0),
                product_data.get("locker_shipping_usd", 0),
                product_data.get("notes", ""),
                product_id,
                company_id,
            ),
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

    return get_product_summary(product_id, company_id=company_id)


def set_product_active(
    product_id: int,
    is_active: bool,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.execute(
            """
            UPDATE products
            SET is_active = ?
            WHERE id = ? AND company_id = ?
            """,
            (_to_bool_flag(is_active), product_id, company_id),
        )
        connection.commit()
    return get_product_summary(product_id, company_id=company_id)


def list_products(
    limit: int = 100,
    company_id: int | None = None,
    *,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        sql = """
            SELECT
                id,
                created_at,
                company_id,
                name,
                image_data_url,
                description,
                reference,
                category,
                store,
                inventory_enabled,
                current_stock,
                inventory_unit_cost_cop,
                current_stock_value_cop,
                price_usd_net,
                tax_usa_percent,
                locker_shipping_usd,
                notes,
                is_active
            FROM products
            WHERE company_id = ?
        """
        params: list[Any] = [company_id]
        if not include_inactive:
            sql += " AND is_active = 1"
        sql += " ORDER BY is_active DESC, id DESC LIMIT ?"
        params.append(limit)
        rows = connection.execute(
            sql,
            tuple(params),
        ).fetchall()

    return [_serialize_product_row(row) for row in rows]


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
                image_data_url,
                description,
                reference,
                category,
                store,
                inventory_enabled,
                current_stock,
                inventory_unit_cost_cop,
                current_stock_value_cop,
                price_usd_net,
                tax_usa_percent,
                locker_shipping_usd,
                notes,
                is_active
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
        inventory_rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                product_id,
                movement_type,
                quantity_delta,
                quantity_after,
                unit_cost_cop,
                total_cost_delta_cop,
                stock_value_after_cop,
                note,
                related_order_id,
                source
            FROM inventory_movements
            WHERE company_id = ? AND product_id = ?
            ORDER BY id DESC
            LIMIT 8
            """,
            (company_id, product_id),
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
        "product": _serialize_product_row(product_row),
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
            "current_stock": int(product_row["current_stock"] or 0),
            "inventory_enabled": bool(product_row["inventory_enabled"]),
            "inventory_unit_cost_cop": float(product_row["inventory_unit_cost_cop"] or 0),
            "current_stock_value_cop": float(product_row["current_stock_value_cop"] or 0),
        },
        "top_clients": sorted_clients[:6],
        "recent_quotes": matching_quotes[:6],
        "recent_orders": recent_orders,
        "inventory_movements": [_serialize_inventory_movement_row(row) for row in inventory_rows],
    }


def list_expense_categories() -> list[dict[str, str]]:
    return _list_expense_categories()


def _insert_expense_row(
    connection: sqlite3.Connection | CompatConnection,
    *,
    company_id: int,
    expense_date: str,
    category_key: str,
    concept: str,
    amount_cop: float,
    notes: str = "",
    created_at: str | None = None,
) -> dict[str, Any]:
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
            created_at or datetime.now(timezone.utc).isoformat(),
            company_id,
            expense_date,
            category_key,
            concept,
            amount_cop,
            notes,
        ),
    )
    row = connection.execute(
        """
        SELECT id, created_at, company_id, expense_date, category_key, concept, amount_cop, notes
        FROM expenses
        WHERE id = ?
        """,
        (expense_id,),
    ).fetchone()
    if row is None:
        raise RuntimeError("No fue posible cargar el gasto recien creado.")
    return _serialize_expense_row(row)


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
        item = _insert_expense_row(
            connection,
            company_id=company_id,
            expense_date=expense_date,
            category_key=category_key,
            concept=concept,
            amount_cop=amount_cop,
            notes=notes,
            created_at=created_at,
        )
        connection.commit()
    return item


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
              AND category_key <> ?
            ORDER BY expense_date DESC, id DESC
            LIMIT ?
            """,
            (company_id, LEGACY_INVENTORY_RESTOCK_CATEGORY_KEY, limit),
        ).fetchall()
    return [_serialize_expense_row(row) for row in rows]


def save_inventory_purchase(
    purchase_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    created_at = datetime.now(timezone.utc).isoformat()
    purchase_date = parse_business_date(
        purchase_data.get("purchase_date"),
        field_name="fecha del abastecimiento",
    ).isoformat()
    supplier_name = str(purchase_data.get("supplier_name", "")).strip()
    if not supplier_name:
        raise ValueError("El proveedor, tienda u origen del abastecimiento es obligatorio.")

    notes = str(purchase_data.get("notes", "")).strip()
    raw_items = purchase_data.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Debes agregar al menos un producto al abastecimiento.")

    normalized_items: list[dict[str, Any]] = []
    total_amount_cop = 0.0

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row

        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                raise ValueError("Cada producto del abastecimiento debe tener un formato valido.")

            try:
                product_id = int(raw_item.get("product_id") or 0)
            except (TypeError, ValueError) as exc:
                raise ValueError("Cada item del abastecimiento debe tener un producto valido.") from exc
            if product_id <= 0:
                raise ValueError("Cada item del abastecimiento debe tener un producto valido.")

            product_row = _get_product_row(connection, product_id=product_id, company_id=company_id)
            if product_row is None:
                raise ValueError("Uno de los productos del abastecimiento ya no existe.")

            quantity = _coerce_inventory_quantity(raw_item.get("quantity"), field_name="quantity")
            if quantity <= 0:
                raise ValueError("La cantidad de cada producto debe ser mayor a cero.")

            try:
                unit_cost_cop = float(raw_item.get("unit_cost_cop") or 0)
            except (TypeError, ValueError) as exc:
                raise ValueError("El costo unitario del abastecimiento debe ser numerico.") from exc
            if unit_cost_cop <= 0:
                raise ValueError("El costo unitario del abastecimiento debe ser mayor a cero.")

            item_notes = str(raw_item.get("notes", "")).strip()
            line_total_cop = float(quantity) * unit_cost_cop
            total_amount_cop += line_total_cop
            normalized_items.append(
                {
                    "product_id": product_id,
                    "product_name": str(product_row["name"] or "").strip() or "Producto sin nombre",
                    "quantity": quantity,
                    "unit_cost_cop": unit_cost_cop,
                    "line_total_cop": line_total_cop,
                    "notes": item_notes,
                }
            )

        purchase_id = _insert_and_get_id(
            connection,
            """
            INSERT INTO inventory_purchases (
                created_at,
                company_id,
                purchase_date,
                supplier_name,
                total_amount_cop,
                expense_id,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                company_id,
                purchase_date,
                supplier_name,
                total_amount_cop,
                None,
                notes,
            ),
        )

        for item in normalized_items:
            item_id = _insert_and_get_id(
                connection,
                """
                INSERT INTO inventory_purchase_items (
                    created_at,
                    company_id,
                    purchase_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_cost_cop,
                    line_total_cop,
                    notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    created_at,
                    company_id,
                    purchase_id,
                    item["product_id"],
                    item["product_name"],
                    item["quantity"],
                    item["unit_cost_cop"],
                    item["line_total_cop"],
                    item["notes"],
                ),
            )
            movement_note = (
                f"Entrada por abastecimiento #{purchase_id} desde {supplier_name}."
                if not item["notes"]
                else f"Entrada por abastecimiento #{purchase_id}: {item['notes']}"
            )
            _record_inventory_movement(
                connection,
                product_id=item["product_id"],
                company_id=company_id,
                movement_type=INVENTORY_MOVEMENT_STOCK_IN,
                quantity=item["quantity"],
                unit_cost_cop=item["unit_cost_cop"],
                note=movement_note,
                source=f"inventory_purchase:{purchase_id}",
            )
            item["id"] = item_id
            item["created_at"] = created_at
            item["company_id"] = company_id
            item["purchase_id"] = purchase_id

        connection.commit()

    return {
        "id": purchase_id,
        "created_at": created_at,
        "company_id": company_id,
        "purchase_date": purchase_date,
        "supplier_name": supplier_name,
        "total_amount_cop": total_amount_cop,
        "cash_out_cop": total_amount_cop,
        "expense_id": None,
        "notes": notes,
        "items_count": len(normalized_items),
        "total_units": sum(int(item["quantity"]) for item in normalized_items),
        "items": normalized_items,
        "expense": None,
    }


def list_inventory_purchases(
    limit: int = 40,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        purchase_rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                company_id,
                purchase_date,
                supplier_name,
                total_amount_cop,
                expense_id,
                notes
            FROM inventory_purchases
            WHERE company_id = ?
            ORDER BY purchase_date DESC, id DESC
            LIMIT ?
            """,
            (company_id, limit),
        ).fetchall()
        if not purchase_rows:
            return []

        purchase_ids = [int(row["id"]) for row in purchase_rows]
        placeholders = ", ".join("?" for _ in purchase_ids)
        item_rows = connection.execute(
            f"""
            SELECT
                id,
                created_at,
                company_id,
                purchase_id,
                product_id,
                product_name,
                quantity,
                unit_cost_cop,
                line_total_cop,
                notes
            FROM inventory_purchase_items
            WHERE company_id = ? AND purchase_id IN ({placeholders})
            ORDER BY purchase_id DESC, id ASC
            """,
            (company_id, *purchase_ids),
        ).fetchall()

    items_by_purchase_id: dict[int, list[dict[str, Any]]] = {}
    for row in item_rows:
        serialized = _serialize_inventory_purchase_item_row(row)
        items_by_purchase_id.setdefault(int(serialized["purchase_id"]), []).append(serialized)

    return [
        _serialize_inventory_purchase_row(
            row,
            items=items_by_purchase_id.get(int(row["id"]), []),
        )
        for row in purchase_rows
    ]


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


def list_whatsapp_templates(company_id: int | None = None) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_company_whatsapp_settings(connection, company_id)
        _seed_default_whatsapp_templates(connection, company_id)
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                trigger_key,
                label,
                body_text,
                content_sid,
                content_variables_json,
                is_active,
                auto_send_enabled
            FROM whatsapp_templates
            WHERE company_id = ?
            ORDER BY trigger_key ASC
            """,
            (company_id,),
        ).fetchall()
        statuses = _list_status_rows(connection, company_id=company_id, include_inactive=False)
        connection.commit()

    return {
        "items": [_serialize_whatsapp_template_row(row) for row in rows],
        "triggers": build_whatsapp_trigger_catalog(statuses),
    }


def save_whatsapp_template(
    template_data: dict[str, Any],
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    trigger_key = str(template_data.get("trigger_key", "")).strip()
    label = str(template_data.get("label", "")).strip()
    body_text = str(template_data.get("body_text", "")).strip()
    content_sid = str(template_data.get("content_sid", "")).strip()
    content_variables_json = str(template_data.get("content_variables_json", "")).strip()

    if not trigger_key:
        raise ValueError("Debes seleccionar el disparador de WhatsApp.")
    if not label:
        raise ValueError("El nombre de la plantilla es obligatorio.")
    if not body_text and not content_sid:
        raise ValueError("Debes definir un cuerpo de mensaje o un Content SID.")

    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_company_whatsapp_settings(connection, company_id)
        _seed_default_whatsapp_templates(connection, company_id)
        existing = connection.execute(
            """
            SELECT id
            FROM whatsapp_templates
            WHERE company_id = ? AND trigger_key = ?
            """,
            (company_id, trigger_key),
        ).fetchone()
        if existing is None:
            template_id = _insert_and_get_id(
                connection,
                """
                INSERT INTO whatsapp_templates (
                    created_at,
                    updated_at,
                    company_id,
                    trigger_key,
                    label,
                    body_text,
                    content_sid,
                    content_variables_json,
                    is_active,
                    auto_send_enabled
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now,
                    now,
                    company_id,
                    trigger_key,
                    label,
                    body_text,
                    content_sid,
                    content_variables_json,
                    _to_bool_flag(template_data.get("is_active", True)),
                    _to_bool_flag(template_data.get("auto_send_enabled", False)),
                ),
            )
        else:
            template_id = int(existing["id"])
            connection.execute(
                """
                UPDATE whatsapp_templates
                SET updated_at = ?,
                    label = ?,
                    body_text = ?,
                    content_sid = ?,
                    content_variables_json = ?,
                    is_active = ?,
                    auto_send_enabled = ?
                WHERE id = ? AND company_id = ?
                """,
                (
                    now,
                    label,
                    body_text,
                    content_sid,
                    content_variables_json,
                    _to_bool_flag(template_data.get("is_active", True)),
                    _to_bool_flag(template_data.get("auto_send_enabled", False)),
                    template_id,
                    company_id,
                ),
            )
        connection.commit()
        row = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                trigger_key,
                label,
                body_text,
                content_sid,
                content_variables_json,
                is_active,
                auto_send_enabled
            FROM whatsapp_templates
            WHERE id = ? AND company_id = ?
            """,
            (template_id, company_id),
        ).fetchone()
    return _serialize_whatsapp_template_row(row)


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
        "image_data_url": _row_value(row, "image_data_url", ""),
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


def _consume_inventory_for_quote_order(
    connection: sqlite3.Connection | CompatConnection,
    *,
    quote_record: dict[str, Any],
    order_id: int,
    company_id: int,
) -> list[dict[str, Any]]:
    quote_input = quote_record.get("input", {})
    consumed_items: list[dict[str, Any]] = []
    for item in _quote_input_line_items(quote_input):
        if not bool(item.get("uses_inventory_stock")):
            continue

        raw_product_id = item.get("product_id")
        if raw_product_id in (None, "", 0):
            raise ValueError(
                f"No puedes descontar inventario para '{item.get('product_name', 'Producto')}' porque no esta ligado a un producto guardado."
            )
        try:
            product_id = int(raw_product_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("El producto ligado al inventario no es valido.") from exc

        quantity = _coerce_inventory_quantity(item.get("quantity") or 1)
        movement, _ = _record_inventory_movement(
            connection,
            product_id=product_id,
            company_id=company_id,
            movement_type=INVENTORY_MOVEMENT_SALE_OUT,
            quantity=quantity,
            note=f"Salida por compra #{order_id} para {quote_record.get('client_name', 'cliente')}.",
            related_order_id=order_id,
            source="order",
        )
        consumed_items.append(
            {
                "product_id": product_id,
                "product_name": str(item.get("product_name") or "").strip() or "Producto",
                "quantity": quantity,
                "unit_cost_cop": float(movement.get("unit_cost_cop") or 0),
                "real_cost_cop": abs(float(movement.get("total_cost_delta_cop") or 0)),
            }
        )
    return consumed_items


def _inventory_snapshot_item_matches(
    snapshot_item: dict[str, Any],
    consumed_item: dict[str, Any],
) -> bool:
    snapshot_product_id = snapshot_item.get("product_id")
    consumed_product_id = consumed_item.get("product_id")
    if snapshot_product_id not in (None, "", 0) and consumed_product_id not in (None, "", 0):
        return str(snapshot_product_id) == str(consumed_product_id)
    return (
        str(snapshot_item.get("product_name") or "").strip().casefold()
        == str(consumed_item.get("product_name") or "").strip().casefold()
    )


def _consume_matching_inventory_snapshot_item(
    remaining_items: list[dict[str, Any]],
    snapshot_item: dict[str, Any],
) -> dict[str, Any] | None:
    for index, consumed_item in enumerate(remaining_items):
        if _inventory_snapshot_item_matches(snapshot_item, consumed_item):
            return remaining_items.pop(index)
    return None


def _recalculate_snapshot_profit(snapshot: dict[str, Any]) -> dict[str, Any]:
    result_data = snapshot.setdefault("result", {})
    costs_data = result_data.setdefault("costs", {})
    final_data = result_data.setdefault("final", {})
    line_items = result_data.get("line_items", [])
    if not isinstance(line_items, list):
        return snapshot

    total_real_cost_cop = 0.0
    total_sale_price_cop = 0.0
    total_inventory_cost_cop = 0.0
    for line_item in line_items:
        total_real_cost_cop += float(line_item.get("real_cost_cop") or 0)
        total_sale_price_cop += float(line_item.get("sale_price_cop") or 0)
        if bool(line_item.get("uses_inventory_stock")):
            total_inventory_cost_cop += float(line_item.get("real_cost_cop") or 0)

    final_profit_cop = total_sale_price_cop - total_real_cost_cop
    advance_cop = float(final_data.get("advance_cop") or 0)
    own_capital_cop = total_real_cost_cop - advance_cop

    costs_data["inventory_cost_cop"] = total_inventory_cost_cop
    costs_data["real_total_cost_cop"] = total_real_cost_cop
    final_data["sale_price_cop"] = total_sale_price_cop
    final_data["profit_cop"] = final_profit_cop
    final_data["margin_percent"] = (
        1 - (total_real_cost_cop / total_sale_price_cop)
        if total_sale_price_cop
        else None
    )
    final_data["own_capital_cop"] = own_capital_cop
    final_data["own_capital_percent"] = _safe_ratio(own_capital_cop, total_real_cost_cop)
    final_data["markup_percent"] = _safe_ratio(final_profit_cop, total_real_cost_cop)
    final_data["roi_percent"] = _safe_ratio(final_profit_cop, own_capital_cop)
    return snapshot


def _apply_inventory_costs_to_order_snapshot(
    snapshot: dict[str, Any],
    consumed_items: list[dict[str, Any]],
) -> dict[str, Any]:
    adjusted_snapshot = json.loads(json.dumps(snapshot, ensure_ascii=False))
    remaining_items = [dict(item) for item in consumed_items]
    result_data = adjusted_snapshot.setdefault("result", {})

    updated_result_line_items: list[dict[str, Any]] = []
    for raw_line_item in result_data.get("line_items", []) if isinstance(result_data.get("line_items"), list) else []:
        line_item = dict(raw_line_item)
        if bool(line_item.get("uses_inventory_stock")):
            consumed_item = _consume_matching_inventory_snapshot_item(remaining_items, line_item)
            if consumed_item is not None:
                real_cost_cop = float(consumed_item.get("real_cost_cop") or 0)
                line_item["inventory_unit_cost_cop"] = float(consumed_item.get("unit_cost_cop") or 0)
                line_item["real_cost_cop"] = real_cost_cop
                line_item["profit_cop"] = float(line_item.get("sale_price_cop") or 0) - real_cost_cop
        updated_result_line_items.append(line_item)
    result_data["line_items"] = updated_result_line_items

    quote_items = result_data.get("quote_items")
    if isinstance(quote_items, list):
        updated_quote_items: list[dict[str, Any]] = []
        quote_item_remaining = [dict(item) for item in consumed_items]
        for raw_quote_item in quote_items:
            if not isinstance(raw_quote_item, dict):
                updated_quote_items.append(raw_quote_item)
                continue
            quote_item = dict(raw_quote_item)
            if bool(quote_item.get("uses_inventory_stock")):
                consumed_item = _consume_matching_inventory_snapshot_item(quote_item_remaining, quote_item)
                if consumed_item is not None:
                    real_cost_cop = float(consumed_item.get("real_cost_cop") or 0)
                    quote_item["inventory_unit_cost_cop"] = float(consumed_item.get("unit_cost_cop") or 0)
                    quote_item["real_cost_cop"] = real_cost_cop
                    quote_item["profit_cop"] = float(quote_item.get("sale_price_cop") or 0) - real_cost_cop
                    if isinstance(quote_item.get("result"), dict):
                        quote_item["result"].setdefault("costs", {})["real_total_cost_cop"] = real_cost_cop
                        quote_item["result"].setdefault("costs", {})["inventory_cost_cop"] = real_cost_cop
                        quote_item["result"].setdefault("final", {})["profit_cop"] = quote_item["profit_cop"]
            updated_quote_items.append(quote_item)
        result_data["quote_items"] = updated_quote_items

    return _recalculate_snapshot_profit(adjusted_snapshot)


def create_order_from_quote(
    quote_id: int,
    advance_paid_cop: float | None = None,
    actual_purchase_prices: list[dict[str, Any]] | None = None,
    company_id: int | None = None,
) -> tuple[dict[str, Any], bool]:
    init_db()
    company_id = _normalize_company_id(company_id)
    quote_record = get_quote(quote_id, company_id=company_id)
    if quote_record is None:
        raise ValueError("La cotización no existe.")

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_orders_runtime_columns(connection)
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

        effective_quote_record = _apply_actual_purchase_prices_to_quote_record(
            quote_record,
            actual_purchase_prices,
        )
        order_data = build_order_from_quote(
            effective_quote_record,
            advance_paid_cop=advance_paid_cop,
        )
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
        consumed_inventory_items = _consume_inventory_for_quote_order(
            connection,
            quote_record=effective_quote_record,
            order_id=order_id,
            company_id=company_id,
        )
        if consumed_inventory_items:
            adjusted_snapshot = _apply_inventory_costs_to_order_snapshot(
                order_data["snapshot"],
                consumed_inventory_items,
            )
            connection.execute(
                """
                UPDATE orders
                SET snapshot_json = ?
                WHERE id = ? AND company_id = ?
                """,
                (
                    json.dumps(adjusted_snapshot, ensure_ascii=False),
                    order_id,
                    company_id,
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


def create_direct_order(
    input_data: dict[str, Any],
    result_data: dict[str, Any],
    *,
    advance_paid_cop: float | None = None,
    company_id: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    quote_record = save_quote(input_data, result_data, company_id=company_id)
    order_record, _ = create_order_from_quote(
        int(quote_record["id"]),
        advance_paid_cop=advance_paid_cop,
        company_id=company_id,
    )
    return order_record, quote_record


def _get_client_whatsapp_row(
    connection: sqlite3.Connection | CompatConnection,
    client_id: int | None,
    company_id: int,
) -> sqlite3.Row | None:
    if not client_id:
        return None
    connection.row_factory = sqlite3.Row
    return connection.execute(
        """
        SELECT id, name, whatsapp_phone, whatsapp_opt_in, whatsapp_opt_in_at
        FROM clients
        WHERE id = ? AND company_id = ?
        """,
        (client_id, company_id),
    ).fetchone()


def _get_whatsapp_template_row(
    connection: sqlite3.Connection | CompatConnection,
    *,
    company_id: int,
    trigger_key: str,
) -> sqlite3.Row | None:
    connection.row_factory = sqlite3.Row
    return connection.execute(
        """
        SELECT
            id,
            created_at,
            updated_at,
            company_id,
            trigger_key,
            label,
            body_text,
            content_sid,
            content_variables_json,
            is_active,
            auto_send_enabled
        FROM whatsapp_templates
        WHERE company_id = ? AND trigger_key = ?
        """,
        (company_id, trigger_key),
    ).fetchone()


def _build_order_whatsapp_context(
    order_record: dict[str, Any],
    *,
    client_row: sqlite3.Row | None,
    company_row: sqlite3.Row,
    trigger_key: str,
) -> dict[str, Any]:
    status_label = str(order_record.get("status_label") or "").strip()
    if trigger_key == "second_payment_registered":
        status_label = "Segundo pago registrado"

    return {
        "company_name": company_row["brand_name"] or company_row["name"],
        "client_name": (
            client_row["name"]
            if client_row is not None and str(client_row["name"] or "").strip()
            else order_record.get("client_name", "")
        ),
        "product_name": order_record.get("product_name", ""),
        "status_label": status_label,
        "sale_price_cop": _format_cop_plain(order_record.get("sale_price_cop") or 0),
        "advance_paid_cop": _format_cop_plain(order_record.get("advance_paid_cop") or 0),
        "balance_due_cop": _format_cop_plain(order_record.get("balance_due_cop") or 0),
        "second_payment_amount_cop": _format_cop_plain(
            order_record.get("second_payment_amount_cop") or 0
        ),
        "second_payment_received_at": order_record.get("second_payment_received_at") or "",
        "travel_transport_label": order_record.get("travel_transport_label") or "",
        "order_id": order_record.get("id"),
        "quote_id": order_record.get("quote_id"),
    }


def _create_whatsapp_notification_record(
    connection: sqlite3.Connection | CompatConnection,
    *,
    company_id: int,
    order_id: int | None,
    quote_id: int | None,
    client_id: int | None,
    trigger_key: str,
    template_row: sqlite3.Row | None,
    recipient_phone: str,
    message_text: str,
    source: str,
) -> int:
    now = datetime.now(timezone.utc).isoformat()
    return _insert_and_get_id(
        connection,
        """
        INSERT INTO whatsapp_notifications (
            created_at,
            updated_at,
            company_id,
            order_id,
            quote_id,
            client_id,
            trigger_key,
            template_id,
            template_label,
            recipient_phone,
            message_text,
            provider,
            external_message_id,
            status,
            error_message,
            source,
            sent_at,
            delivered_at,
            read_at,
            failed_at,
            response_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'twilio', '', 'queued', '', ?, '', '', '', '', '')
        """,
        (
            now,
            now,
            company_id,
            order_id,
            quote_id,
            client_id,
            trigger_key,
            template_row["id"] if template_row is not None else None,
            template_row["label"] if template_row is not None else "",
            recipient_phone,
            message_text,
            source,
        ),
    )


def _load_whatsapp_notification_row(
    connection: sqlite3.Connection | CompatConnection,
    notification_id: int,
) -> sqlite3.Row | None:
    connection.row_factory = sqlite3.Row
    return connection.execute(
        """
        SELECT
            id,
            created_at,
            updated_at,
            company_id,
            order_id,
            quote_id,
            client_id,
            trigger_key,
            template_id,
            template_label,
            recipient_phone,
            message_text,
            provider,
            external_message_id,
            status,
            error_message,
            source,
            sent_at,
            delivered_at,
            read_at,
            failed_at,
            response_json
        FROM whatsapp_notifications
        WHERE id = ?
        """,
        (notification_id,),
    ).fetchone()


def send_order_whatsapp_notification(
    order_id: int,
    *,
    trigger_key: str | None = None,
    source: str = "manual",
    company_id: int | None = None,
    raise_errors: bool = True,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    clean_trigger_key = str(trigger_key or "").strip()
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_company_whatsapp_settings(connection, company_id)
        _seed_default_whatsapp_templates(connection, company_id)
        order_row = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        if order_row is None:
            raise ValueError("La compra no existe.")

        settings_row = connection.execute(
            """
            SELECT
                company_id,
                updated_at,
                twilio_account_sid,
                twilio_auth_token,
                whatsapp_sender,
                messaging_service_sid,
                status_callback_url,
                default_country_code,
                auto_send_enabled
            FROM company_whatsapp_settings
            WHERE company_id = ?
            """,
            (company_id,),
        ).fetchone()
        settings = _serialize_whatsapp_settings_row(settings_row)
        if not settings["is_configured"]:
            raise ValueError("Configura primero las credenciales de Twilio en Administracion.")

        all_statuses = _list_status_rows(connection, company_id=company_id, include_inactive=True)
        active_statuses = [status for status in all_statuses if status["is_active"]]
        order_events = _list_order_events(connection, [order_id], all_statuses, company_id).get(order_id, [])
        order_record = _serialize_order(order_row, order_events, all_statuses, active_statuses)

        if not clean_trigger_key:
            clean_trigger_key = f"order_status:{order_record['status_key']}"

        template_row = _get_whatsapp_template_row(
            connection,
            company_id=company_id,
            trigger_key=clean_trigger_key,
        )
        if template_row is None:
            raise ValueError("No existe una plantilla de WhatsApp para este disparador.")
        if not bool(template_row["is_active"]):
            raise ValueError("La plantilla de WhatsApp elegida está inactiva.")

        client_row = _get_client_whatsapp_row(connection, order_row["client_id"], company_id)
        if client_row is None:
            raise ValueError("Esta compra no tiene un cliente guardado para notificar por WhatsApp.")
        if not bool(client_row["whatsapp_opt_in"]):
            raise ValueError("El cliente no autorizó notificaciones por WhatsApp.")

        company_row = connection.execute(
            "SELECT id, name, brand_name FROM companies WHERE id = ?",
            (company_id,),
        ).fetchone()
        context = _build_order_whatsapp_context(
            order_record,
            client_row=client_row,
            company_row=company_row,
            trigger_key=clean_trigger_key,
        )
        body_text = render_template_text(template_row["body_text"], context)
        content_variables_json = render_content_variables(
            template_row["content_variables_json"],
            context,
        )
        recipient_phone = normalize_whatsapp_phone(
            client_row["whatsapp_phone"],
            settings["default_country_code"],
        )

        notification_id = _create_whatsapp_notification_record(
            connection,
            company_id=company_id,
            order_id=order_id,
            quote_id=order_row["quote_id"],
            client_id=order_row["client_id"],
            trigger_key=clean_trigger_key,
            template_row=template_row,
            recipient_phone=recipient_phone,
            message_text=body_text,
            source=source,
        )

        try:
            send_result = send_twilio_whatsapp_message(
                account_sid=settings["twilio_account_sid"],
                auth_token=settings["twilio_auth_token"],
                to_phone=recipient_phone,
                sender_phone=settings["whatsapp_sender"],
                messaging_service_sid=settings["messaging_service_sid"],
                body_text=body_text,
                content_sid=template_row["content_sid"],
                content_variables_json=content_variables_json,
                status_callback_url=settings["status_callback_url"],
            )
            now = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE whatsapp_notifications
                SET updated_at = ?,
                    external_message_id = ?,
                    status = ?,
                    error_message = ?,
                    sent_at = ?,
                    response_json = ?
                WHERE id = ?
                """,
                (
                    now,
                    str(send_result.get("sid") or "").strip(),
                    str(send_result.get("status") or "sent").strip(),
                    str(send_result.get("error_message") or "").strip(),
                    now,
                    json.dumps(send_result.get("raw") or {}, ensure_ascii=False),
                    notification_id,
                ),
            )
            connection.commit()
        except Exception as exc:
            now = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE whatsapp_notifications
                SET updated_at = ?,
                    status = 'failed',
                    error_message = ?,
                    failed_at = ?
                WHERE id = ?
                """,
                (
                    now,
                    str(exc),
                    now,
                    notification_id,
                ),
            )
            connection.commit()
            if raise_errors:
                raise

        row = _load_whatsapp_notification_row(connection, notification_id)
        return _serialize_whatsapp_notification_row(row)


def maybe_auto_send_order_whatsapp_notification(
    order_id: int,
    *,
    trigger_key: str,
    company_id: int | None = None,
) -> dict[str, Any] | None:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        settings = _ensure_company_whatsapp_settings(connection, company_id)
        if not settings["auto_send_enabled"] or not settings["is_configured"]:
            connection.commit()
            return None
        template_row = _get_whatsapp_template_row(
            connection,
            company_id=company_id,
            trigger_key=trigger_key,
        )
        connection.commit()

    if template_row is None or not bool(template_row["is_active"]) or not bool(
        template_row["auto_send_enabled"]
    ):
        return None

    try:
        return send_order_whatsapp_notification(
            order_id,
            trigger_key=trigger_key,
            source="automatic",
            company_id=company_id,
            raise_errors=False,
        )
    except Exception:
        return None


def list_whatsapp_notifications(
    limit: int = 50,
    *,
    order_id: int | None = None,
    company_id: int | None = None,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    sql = """
        SELECT
            id,
            created_at,
            updated_at,
            company_id,
            order_id,
            quote_id,
            client_id,
            trigger_key,
            template_id,
            template_label,
            recipient_phone,
            message_text,
            provider,
            external_message_id,
            status,
            error_message,
            source,
            sent_at,
            delivered_at,
            read_at,
            failed_at,
            response_json
        FROM whatsapp_notifications
        WHERE company_id = ?
    """
    params: list[Any] = [company_id]
    if order_id is not None:
        sql += " AND order_id = ?"
        params.append(order_id)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(sql, tuple(params)).fetchall()
    return [_serialize_whatsapp_notification_row(row) for row in rows]


def update_whatsapp_notification_status(
    message_sid: str,
    message_status: str,
    *,
    error_message: str = "",
) -> dict[str, Any] | None:
    init_db()
    clean_sid = str(message_sid or "").strip()
    clean_status = str(message_status or "").strip().lower()
    if not clean_sid:
        return None

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT
                id,
                created_at,
                updated_at,
                company_id,
                order_id,
                quote_id,
                client_id,
                trigger_key,
                template_id,
                template_label,
                recipient_phone,
                message_text,
                provider,
                external_message_id,
                status,
                error_message,
                source,
                sent_at,
                delivered_at,
                read_at,
                failed_at,
                response_json
            FROM whatsapp_notifications
            WHERE external_message_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (clean_sid,),
        ).fetchone()
        if row is None:
            return None

        now = datetime.now(timezone.utc).isoformat()
        delivered_at = row["delivered_at"]
        read_at = row["read_at"]
        failed_at = row["failed_at"]
        sent_at = row["sent_at"] or now

        if clean_status == "delivered" and not delivered_at:
            delivered_at = now
        if clean_status == "read" and not read_at:
            read_at = now
            if not delivered_at:
                delivered_at = now
        if clean_status in {"failed", "undelivered"} and not failed_at:
            failed_at = now

        connection.execute(
            """
            UPDATE whatsapp_notifications
            SET updated_at = ?,
                status = ?,
                error_message = ?,
                sent_at = ?,
                delivered_at = ?,
                read_at = ?,
                failed_at = ?
            WHERE id = ?
            """,
            (
                now,
                clean_status or row["status"],
                str(error_message or row["error_message"] or "").strip(),
                sent_at,
                delivered_at,
                read_at,
                failed_at,
                row["id"],
            ),
        )
        connection.commit()
        updated = _load_whatsapp_notification_row(connection, int(row["id"]))
    return _serialize_whatsapp_notification_row(updated) if updated is not None else None


def list_orders(
    limit: int = 100,
    company_id: int | None = None,
    include_closed: bool = False,
) -> list[dict[str, Any]]:
    init_db()
    company_id = _normalize_company_id(company_id)
    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_orders_runtime_columns(connection)
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
        _ensure_orders_runtime_columns(connection)
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
        _ensure_orders_runtime_columns(connection)
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


def update_order_image(
    order_id: int,
    image_data_url: str,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    normalized_image = _sanitize_image_data_url(image_data_url)

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_orders_runtime_columns(connection)
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

        connection.execute(
            """
            UPDATE orders
            SET image_data_url = ?
            WHERE id = ? AND company_id = ?
            """,
            (normalized_image, order_id, company_id),
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


def _list_payment_events_for_order(
    connection: sqlite3.Connection | CompatConnection,
    *,
    order_id: int,
    company_id: int,
) -> list[dict[str, Any]]:
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT id, created_at, company_id, order_id, payment_kind, amount_cop, payment_date, note
        FROM payment_events
        WHERE company_id = ? AND order_id = ?
        ORDER BY id ASC
        """,
        (company_id, order_id),
    ).fetchall()
    return [_row_to_dict(row) for row in rows]


def _list_inventory_movements_for_order(
    connection: sqlite3.Connection | CompatConnection,
    *,
    order_id: int,
    company_id: int,
) -> list[dict[str, Any]]:
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT
            id,
            created_at,
            company_id,
            product_id,
            movement_type,
            quantity_delta,
            quantity_after,
            unit_cost_cop,
            total_cost_delta_cop,
            stock_value_after_cop,
            note,
            related_order_id,
            source
        FROM inventory_movements
        WHERE company_id = ? AND related_order_id = ?
        ORDER BY id ASC
        """,
        (company_id, order_id),
    ).fetchall()
    return [_row_to_dict(row) for row in rows]


def _list_whatsapp_notifications_for_order(
    connection: sqlite3.Connection | CompatConnection,
    *,
    order_id: int,
    company_id: int,
) -> list[dict[str, Any]]:
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT
            id,
            created_at,
            updated_at,
            company_id,
            order_id,
            quote_id,
            client_id,
            trigger_key,
            template_id,
            template_label,
            recipient_phone,
            message_text,
            provider,
            external_message_id,
            status,
            error_message,
            source,
            sent_at,
            delivered_at,
            read_at,
            failed_at,
            response_json
        FROM whatsapp_notifications
        WHERE company_id = ? AND order_id = ?
        ORDER BY id ASC
        """,
        (company_id, order_id),
    ).fetchall()
    return [_row_to_dict(row) for row in rows]


def _restore_inventory_after_order_exception(
    connection: sqlite3.Connection | CompatConnection,
    *,
    order_id: int,
    company_id: int,
    action_label: str,
    reason: str,
) -> list[dict[str, Any]]:
    original_movements = _list_inventory_movements_for_order(
        connection,
        order_id=order_id,
        company_id=company_id,
    )
    reversal_rows: list[dict[str, Any]] = []
    for movement in original_movements:
        if str(movement.get("movement_type") or "").strip().lower() != INVENTORY_MOVEMENT_SALE_OUT:
            continue
        quantity = abs(int(movement.get("quantity_delta") or 0))
        if quantity <= 0:
            continue
        reversal_note = f"Reversion por {action_label.lower()} de compra #{order_id}."
        if reason:
            reversal_note = f"{reversal_note} Motivo: {reason}."
        reversal_row, _ = _record_inventory_movement(
            connection,
            product_id=int(movement.get("product_id") or 0),
            company_id=company_id,
            movement_type=INVENTORY_MOVEMENT_STOCK_IN,
            quantity=quantity,
            unit_cost_cop=float(movement.get("unit_cost_cop") or 0),
            note=reversal_note,
            related_order_id=order_id,
            source=f"order_{action_label.lower()}",
        )
        reversal_rows.append(reversal_row)
    return reversal_rows


def _archive_and_remove_order(
    order_id: int,
    *,
    archive_action: str,
    reason: str,
    company_id: int,
) -> dict[str, Any]:
    clean_action = str(archive_action or "").strip().lower()
    if clean_action not in {"invalidated", "deleted"}:
        raise ValueError("La accion extraordinaria de la compra no es valida.")

    clean_reason = str(reason or "").strip()
    if not clean_reason:
        raise ValueError("Debes indicar el motivo de la accion extraordinaria.")

    action_label = "invalidacion" if clean_action == "invalidated" else "eliminacion"
    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_orders_runtime_columns(connection)
        existing = connection.execute(
            "SELECT * FROM orders WHERE id = ? AND company_id = ?",
            (order_id, company_id),
        ).fetchone()
        if existing is None:
            raise ValueError("La compra no existe.")

        all_statuses = _list_status_rows(
            connection,
            company_id=company_id,
            include_inactive=True,
        )
        events = _list_order_events(connection, [order_id], all_statuses, company_id).get(order_id, [])
        payment_rows = _list_payment_events_for_order(
            connection,
            order_id=order_id,
            company_id=company_id,
        )
        inventory_rows = _list_inventory_movements_for_order(
            connection,
            order_id=order_id,
            company_id=company_id,
        )
        whatsapp_rows = _list_whatsapp_notifications_for_order(
            connection,
            order_id=order_id,
            company_id=company_id,
        )
        reversal_rows = _restore_inventory_after_order_exception(
            connection,
            order_id=order_id,
            company_id=company_id,
            action_label=action_label,
            reason=clean_reason,
        )

        archived_payload = {
            "order": _row_to_dict(existing),
            "events": events,
            "payment_events": payment_rows,
            "inventory_movements": inventory_rows,
            "inventory_reversals": reversal_rows,
            "whatsapp_notifications": whatsapp_rows,
        }
        _insert_and_get_id(
            connection,
            """
            INSERT INTO order_archives (
                created_at,
                company_id,
                original_order_id,
                original_quote_id,
                archive_action,
                reason,
                payload_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                company_id,
                order_id,
                existing["quote_id"],
                clean_action,
                clean_reason,
                json.dumps(archived_payload, ensure_ascii=False),
            ),
        )

        connection.execute(
            "DELETE FROM whatsapp_notifications WHERE company_id = ? AND order_id = ?",
            (company_id, order_id),
        )
        connection.execute(
            "DELETE FROM payment_events WHERE company_id = ? AND order_id = ?",
            (company_id, order_id),
        )
        connection.execute(
            "DELETE FROM order_events WHERE company_id = ? AND order_id = ?",
            (company_id, order_id),
        )
        connection.execute(
            "DELETE FROM orders WHERE company_id = ? AND id = ?",
            (company_id, order_id),
        )
        connection.commit()

    return {
        "order_id": order_id,
        "quote_id": _row_value(existing, "quote_id"),
        "client_name": _row_value(existing, "client_name", ""),
        "product_name": _row_value(existing, "product_name", ""),
        "archive_action": clean_action,
        "reason": clean_reason,
    }


def invalidate_order(
    order_id: int,
    *,
    reason: str,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    return _archive_and_remove_order(
        order_id,
        archive_action="invalidated",
        reason=reason,
        company_id=_normalize_company_id(company_id),
    )


def delete_order(
    order_id: int,
    *,
    reason: str,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    return _archive_and_remove_order(
        order_id,
        archive_action="deleted",
        reason=reason,
        company_id=_normalize_company_id(company_id),
    )


def update_confirmed_order(
    order_id: int,
    *,
    exchange_rate_cop: float | None = None,
    advance_paid_cop: float | None = None,
    notes: str | None = None,
    general_discount_cop: float | None = None,
    actual_purchase_prices: list[dict[str, Any]] | None = None,
    quote_item_updates: list[dict[str, Any]] | None = None,
    company_id: int | None = None,
) -> dict[str, Any]:
    init_db()
    company_id = _normalize_company_id(company_id)
    now = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        _ensure_orders_runtime_columns(connection)
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
        normalized_notes = str(existing["notes"] or "").strip() if notes is None else str(notes or "").strip()

        normalized_exchange_rate: float | None = None
        if exchange_rate_cop is not None:
            try:
                normalized_exchange_rate = float(exchange_rate_cop)
            except (TypeError, ValueError) as exc:
                raise ValueError("La TRM debe ser numerica.") from exc
            if normalized_exchange_rate <= 0:
                raise ValueError("La TRM debe ser mayor a cero.")

        normalized_general_discount: float | None = None
        if general_discount_cop is not None:
            try:
                normalized_general_discount = float(general_discount_cop)
            except (TypeError, ValueError) as exc:
                raise ValueError("El descuento general debe ser numerico.") from exc
            if normalized_general_discount < 0:
                raise ValueError("El descuento general no puede ser negativo.")

        recalculated_snapshot = _recalculate_confirmed_order_quote_record(
            snapshot,
            exchange_rate_cop=normalized_exchange_rate,
            notes=normalized_notes,
            general_discount_cop=normalized_general_discount,
            actual_purchase_prices=actual_purchase_prices,
            quote_item_updates=quote_item_updates,
        )
        order_data = build_order_from_quote(
            recalculated_snapshot,
            advance_paid_cop=advance_paid_cop if advance_paid_cop is not None else float(existing["advance_paid_cop"] or 0),
        )

        second_payment_amount_cop = float(existing["second_payment_amount_cop"] or 0)
        total_paid_cop = float(order_data["advance_paid_cop"] or 0) + second_payment_amount_cop
        sale_price_cop = float(order_data["sale_price_cop"] or 0)
        if total_paid_cop > sale_price_cop:
            raise ValueError("La suma del anticipo y el segundo pago no puede ser mayor al valor de la compra.")

        balance_due_cop = max(sale_price_cop - total_paid_cop, 0)
        locked_statuses = {"second_payment_received", "shipped_to_client", "delivered_to_client", "cycle_closed"}
        if str(existing["status_key"] or "").strip() in locked_statuses and balance_due_cop > 0:
            raise ValueError(
                "No puedes dejar saldo pendiente en una compra que ya avanzo mas alla del segundo pago recibido."
            )

        connection.execute(
            """
            UPDATE orders
            SET client_id = ?,
                product_id = ?,
                client_name = ?,
                product_name = ?,
                sale_price_cop = ?,
                advance_paid_cop = ?,
                balance_due_cop = ?,
                notes = ?,
                snapshot_json = ?
            WHERE id = ? AND company_id = ?
            """,
            (
                order_data.get("client_id"),
                order_data.get("product_id"),
                order_data["client_name"],
                order_data["product_name"],
                sale_price_cop,
                float(order_data["advance_paid_cop"] or 0),
                balance_due_cop,
                normalized_notes,
                json.dumps(recalculated_snapshot, ensure_ascii=False),
                order_id,
                company_id,
            ),
        )
        _sync_advance_payment_event(
            connection,
            company_id=company_id,
            order_id=order_id,
            amount_cop=float(order_data["advance_paid_cop"] or 0),
            payment_date=normalize_date_input(existing["created_at"]).isoformat(),
        )

        changes: list[str] = []
        if normalized_exchange_rate is not None:
            changes.append(f"TRM: {int(round(normalized_exchange_rate))}")
        if advance_paid_cop is not None:
            changes.append(
                f"Anticipo real: {_format_cop_plain(float(order_data['advance_paid_cop'] or 0))}"
            )
        if normalized_general_discount is not None:
            changes.append(
                f"Descuento general: {_format_cop_plain(normalized_general_discount)}"
            )
        if actual_purchase_prices:
            changes.append("Precios reales de compra ajustados")
        if quote_item_updates:
            changes.append("Detalle comercial ajustado")
        if notes is not None:
            changes.append("Notas actualizadas")
        change_note = "Compra editada."
        if changes:
            change_note = f"Compra editada. {' | '.join(changes)}."
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
                change_note,
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
        _ensure_orders_runtime_columns(connection)
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
        inventory_purchase_rows = connection.execute(
            """
            SELECT id, created_at, company_id, purchase_date, supplier_name, total_amount_cop, expense_id, notes
            FROM inventory_purchases
            WHERE company_id = ?
            ORDER BY purchase_date DESC, id DESC
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
    product_cost_total_cop = 0.0
    locker_shipping_total_cop = 0.0
    travel_cost_total_cop = 0.0
    for row in period_orders:
        snapshot = json.loads(row["snapshot_json"])
        costs = snapshot.get("result", {}).get("costs", {})
        travel_cost_cop = float(costs.get("travel_cost_cop") or 0)
        locker_shipping_cop = float(costs.get("locker_shipping_cop") or 0)
        inventory_cost_cop = float(costs.get("inventory_cost_cop") or 0)
        import_cost_cop = float(costs.get("cost_in_cop") or 0)
        product_cost_cop = max(import_cost_cop - travel_cost_cop - locker_shipping_cop, 0.0)
        product_cost_total_cop += product_cost_cop + inventory_cost_cop
        locker_shipping_total_cop += locker_shipping_cop
        travel_cost_total_cop += travel_cost_cop
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

    operating_expense_rows = [
        row
        for row in expense_rows
        if str(row["category_key"] or "").strip() != LEGACY_INVENTORY_RESTOCK_CATEGORY_KEY
    ]
    period_expenses = [
        row
        for row in operating_expense_rows
        if is_date_in_range(row["expense_date"], start_date, end_date)
    ]
    expenses_total_cop = sum(float(row["amount_cop"] or 0) for row in period_expenses)
    period_inventory_purchases = [
        row
        for row in inventory_purchase_rows
        if is_date_in_range(row["purchase_date"], start_date, end_date)
    ]
    inventory_investment_cop = sum(
        float(row["total_amount_cop"] or 0) for row in period_inventory_purchases
    )

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
            "product_cost_total_cop": product_cost_total_cop,
            "locker_shipping_total_cop": locker_shipping_total_cop,
            "travel_cost_total_cop": travel_cost_total_cop,
            "period_balance_due_cop": period_balance_due_cop,
            "accounts_receivable_cop": accounts_receivable_cop,
            "gross_profit_cop": gross_profit_cop,
            "inventory_investment_cop": inventory_investment_cop,
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
        "recent_expenses": [_serialize_expense_row(row) for row in operating_expense_rows[:8]],
        "recent_inventory_purchases": [
            _serialize_inventory_purchase_row(row, [])
            for row in inventory_purchase_rows[:8]
        ],
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
