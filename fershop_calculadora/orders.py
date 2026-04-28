from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from .runtime_time import today_local


DEFAULT_ORDER_STATUSES = [
    {
        "key": "quote_confirmed",
        "label": "Compra confirmada",
        "description": "El cliente confirmó la compra a partir de la cotización.",
    },
    {
        "key": "received_at_locker",
        "label": "Recibido en casillero",
        "description": "El producto ya llegó al casillero en origen.",
    },
    {
        "key": "in_international_transit",
        "label": "En tránsito internacional",
        "description": "El paquete va camino a Colombia.",
    },
    {
        "key": "customs_review",
        "label": "En aduana",
        "description": "El envío está en revisión o proceso aduanero.",
    },
    {
        "key": "in_transit_to_fershop",
        "label": "En transporte a FerShop",
        "description": "Ya salió hacia la operación local de FerShop.",
    },
    {
        "key": "received_by_fershop",
        "label": "Recibido por FerShop",
        "description": "FerShop ya tiene el producto en sus manos.",
    },
    {
        "key": "client_notified",
        "label": "Cliente notificado",
        "description": "El cliente ya fue informado para continuar el cierre.",
    },
    {
        "key": "second_payment_received",
        "label": "Segundo pago recibido",
        "description": "El cliente ya pagó el saldo restante.",
    },
    {
        "key": "shipped_to_client",
        "label": "Enviado al cliente",
        "description": "El producto ya fue despachado al cliente final.",
    },
    {
        "key": "delivered_to_client",
        "label": "Recibido por el cliente",
        "description": "El cliente confirmó la recepción.",
    },
    {
        "key": "cycle_closed",
        "label": "Ciclo cerrado",
        "description": "La operación quedó completada y cerrada.",
    },
]

LEGACY_ORDER_STATUSES = [
    {
        "key": "second_payment_pending",
        "label": "Segundo pago pendiente",
        "description": "Estado legado. Ya no hace parte del flujo activo.",
    }
]

TRAVEL_TRANSPORT_UNDECIDED = "undecided"
TRAVEL_TRANSPORT_LOCKER = "locker"
TRAVEL_TRANSPORT_LUGGAGE = "luggage"
TRAVEL_TRANSPORT_LABELS = {
    TRAVEL_TRANSPORT_UNDECIDED: "Por definir",
    TRAVEL_TRANSPORT_LOCKER: "Casillero",
    TRAVEL_TRANSPORT_LUGGAGE: "Maleta",
}
COLLECTION_READY_STATUS_KEY = "client_notified"


def list_default_order_statuses(include_legacy: bool = False) -> list[dict[str, str]]:
    rows = [status.copy() for status in DEFAULT_ORDER_STATUSES]
    if include_legacy:
        rows.extend(status.copy() for status in LEGACY_ORDER_STATUSES)
    return rows


def build_status_key(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(label or ""))
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_only.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    if not slug:
        raise ValueError("El nombre del estado no genera una clave válida.")
    if not slug[0].isalpha():
        slug = f"status_{slug}"
    return slug


def _order_status_index(statuses: list[dict[str, Any]]) -> dict[str, int]:
    return {str(status["key"]): index for index, status in enumerate(statuses)}


def is_valid_order_status(
    status_key: str, statuses: list[dict[str, Any]] | None = None
) -> bool:
    if statuses is None:
        return bool(str(status_key or "").strip())
    status_rows = statuses
    return status_key in _order_status_index(status_rows)


def get_status_label(
    status_key: str, statuses: list[dict[str, Any]] | None = None
) -> str:
    status_rows = statuses or list_default_order_statuses(include_legacy=True)
    for status in status_rows:
        if status["key"] == status_key:
            return str(status["label"])
    return status_key


def get_next_status(
    status_key: str, statuses: list[dict[str, Any]] | None = None
) -> str | None:
    status_rows = statuses or list_default_order_statuses()
    status_index = _order_status_index(status_rows)
    current_index = status_index.get(status_key)
    if current_index is None:
        return None
    next_index = current_index + 1
    if next_index >= len(status_rows):
        return None
    return str(status_rows[next_index]["key"])


def is_order_pending_collection(status_key: Any, balance_due_cop: Any) -> bool:
    clean_status_key = str(status_key or "").strip()
    try:
        balance_due = float(balance_due_cop or 0)
    except (TypeError, ValueError):
        balance_due = 0.0
    return clean_status_key == COLLECTION_READY_STATUS_KEY and balance_due > 0


def normalize_travel_transport_type(
    value: str | None,
    *,
    purchase_type: str | None = None,
) -> str:
    purchase_type_key = str(purchase_type or "").strip().lower()
    if purchase_type_key and purchase_type_key != "travel":
        return ""

    normalized = str(value or "").strip().lower() or TRAVEL_TRANSPORT_UNDECIDED
    if normalized not in TRAVEL_TRANSPORT_LABELS:
        raise ValueError("La ruta del producto debe ser casillero, maleta o por definir.")
    return normalized


def get_travel_transport_label(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return ""
    return TRAVEL_TRANSPORT_LABELS.get(normalized, normalized)


def build_order_from_quote(
    quote_record: dict[str, Any], advance_paid_cop: float | None = None
) -> dict[str, Any]:
    input_data = quote_record.get("input", {})
    final_data = quote_record.get("result", {}).get("final", {})
    line_items = input_data.get("line_items", [])
    if not line_items and isinstance(input_data.get("quote_items"), list):
        line_items = input_data.get("quote_items", [])
    sale_price = float(final_data.get("sale_price_cop") or 0)
    quoted_advance = float(final_data.get("advance_cop") or 0)
    advance_paid = quoted_advance if advance_paid_cop is None else float(advance_paid_cop)

    if advance_paid < 0:
        raise ValueError("El anticipo real no puede ser negativo.")

    if advance_paid > sale_price:
        raise ValueError("El anticipo real no puede ser mayor al valor total de la compra.")

    balance_due = max(sale_price - advance_paid, 0)
    product_id = input_data.get("product_id")
    product_name = quote_record.get("product_name", "")
    if isinstance(line_items, list) and len(line_items) > 1:
        total_units = 0
        for item in line_items:
            try:
                total_units += int(item.get("quantity") or 0)
            except (TypeError, ValueError, AttributeError):
                continue
        product_id = None
        product_name = f"{len(line_items)} productos / {total_units or len(line_items)} unidades"

    return {
        "quote_id": quote_record["id"],
        "client_id": input_data.get("client_id"),
        "product_id": product_id,
        "client_name": quote_record.get("client_name", ""),
        "product_name": product_name,
        "travel_transport_type": normalize_travel_transport_type(
            TRAVEL_TRANSPORT_UNDECIDED if input_data.get("purchase_type") == "travel" else "",
            purchase_type=input_data.get("purchase_type"),
        ),
        "status_key": "quote_confirmed",
        "sale_price_cop": sale_price,
        "quoted_advance_cop": quoted_advance,
        "advance_paid_cop": advance_paid,
        "balance_due_cop": balance_due,
        "notes": quote_record.get("notes", ""),
        "snapshot": quote_record,
    }


def normalize_second_payment_date(received_at: str | None = None) -> str:
    normalized = str(received_at or "").strip()
    if not normalized:
        return today_local().isoformat()

    try:
        return datetime.strptime(normalized, "%Y-%m-%d").date().isoformat()
    except ValueError as exc:
        raise ValueError("La fecha del segundo pago debe tener formato AAAA-MM-DD.") from exc


def apply_second_payment(
    order_record: dict[str, Any], amount_cop: float, received_at: str | None = None
) -> dict[str, Any]:
    payment_amount = float(amount_cop)
    if payment_amount <= 0:
        raise ValueError("El segundo pago debe ser mayor a cero.")

    current_balance = float(order_record.get("balance_due_cop") or 0)
    if current_balance <= 0:
        raise ValueError("Esta compra ya no tiene saldo pendiente.")

    if payment_amount > current_balance:
        raise ValueError("El segundo pago no puede ser mayor al saldo pendiente.")

    payment_date = normalize_second_payment_date(received_at)
    accumulated_second_payment = float(order_record.get("second_payment_amount_cop") or 0)
    accumulated_second_payment += payment_amount
    remaining_balance = max(current_balance - payment_amount, 0)

    return {
        "second_payment_amount_cop": accumulated_second_payment,
        "second_payment_received_at": payment_date,
        "balance_due_cop": remaining_balance,
        "payment_amount_cop": payment_amount,
        "payment_date": payment_date,
    }
