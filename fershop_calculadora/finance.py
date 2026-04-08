from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any


LEGACY_INVENTORY_RESTOCK_CATEGORY_KEY = "inventory_restock"
LEGACY_EXPENSE_CATEGORY_LABELS = {
    LEGACY_INVENTORY_RESTOCK_CATEGORY_KEY: "Abastecimiento de inventario",
}

EXPENSE_CATEGORIES = [
    {"key": "airfare", "label": "Pasajes"},
    {"key": "ground_transport", "label": "Transporte"},
    {"key": "lodging", "label": "Hospedaje"},
    {"key": "food", "label": "Alimentacion"},
    {"key": "online_shipping", "label": "Envio de compras online"},
    {"key": "delivery_bags", "label": "Bolsas de entrega"},
    {"key": "advertising", "label": "Publicidad"},
    {"key": "brand_imagery", "label": "Imagenes de marca"},
    {"key": "other", "label": "Otros"},
]

PERIOD_LABELS = {
    "daily": "Diario",
    "weekly": "Semanal",
    "biweekly": "Quincenal",
    "monthly": "Mensual",
    "quarterly": "Trimestral",
}


def list_expense_categories() -> list[dict[str, str]]:
    return [item.copy() for item in EXPENSE_CATEGORIES]


def get_expense_category_label(category_key: str) -> str:
    clean_key = str(category_key or "").strip()
    if clean_key in LEGACY_EXPENSE_CATEGORY_LABELS:
        return LEGACY_EXPENSE_CATEGORY_LABELS[clean_key]
    for item in EXPENSE_CATEGORIES:
        if item["key"] == clean_key:
            return item["label"]
    return clean_key or "Otros"


def normalize_expense_category_key(category_key: str) -> str:
    clean_key = str(category_key or "").strip()
    if not clean_key:
        raise ValueError("La categoria del gasto es obligatoria.")

    valid_keys = {item["key"] for item in EXPENSE_CATEGORIES}
    if clean_key not in valid_keys:
        raise ValueError("La categoria del gasto no es valida.")
    return clean_key


def parse_business_date(value: Any, field_name: str = "fecha") -> date:
    normalized = str(value or "").strip()
    if not normalized:
        raise ValueError(f"La {field_name} es obligatoria.")

    try:
        return datetime.strptime(normalized, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"La {field_name} debe tener formato AAAA-MM-DD.") from exc


def normalize_date_input(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    normalized = str(value or "").strip()
    if not normalized:
        raise ValueError("La fecha es obligatoria.")

    if len(normalized) == 10:
        return parse_business_date(normalized)

    try:
        return datetime.fromisoformat(normalized.replace("Z", "+00:00")).date()
    except ValueError as exc:
        raise ValueError("La fecha no tiene un formato valido.") from exc


def get_period_bounds(
    period_key: str = "daily",
    reference_date: Any | None = None,
) -> dict[str, str]:
    clean_period = str(period_key or "daily").strip().lower()
    if clean_period not in PERIOD_LABELS:
        raise ValueError("El periodo solicitado no es valido.")

    today = normalize_date_input(reference_date) if reference_date else datetime.now().date()

    if clean_period == "daily":
        start_date = today
        end_date = today
    elif clean_period == "weekly":
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif clean_period == "biweekly":
        if today.day <= 15:
            start_date = today.replace(day=1)
            end_date = today.replace(day=15)
        else:
            start_date = today.replace(day=16)
            if today.month == 12:
                next_month = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month = today.replace(month=today.month + 1, day=1)
            end_date = next_month - timedelta(days=1)
    elif clean_period == "monthly":
        start_date = today.replace(day=1)
        if today.month == 12:
            next_month = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
        end_date = next_month - timedelta(days=1)
    else:
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start_date = today.replace(month=quarter_start_month, day=1)
        if quarter_start_month == 10:
            next_quarter = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_quarter = today.replace(month=quarter_start_month + 3, day=1)
        end_date = next_quarter - timedelta(days=1)

    return {
        "period_key": clean_period,
        "period_label": PERIOD_LABELS[clean_period],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }


def is_date_in_range(value: Any, start_date: date, end_date: date) -> bool:
    current = normalize_date_input(value)
    return start_date <= current <= end_date
