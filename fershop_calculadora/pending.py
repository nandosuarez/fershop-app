from __future__ import annotations

from typing import Any


DEFAULT_PENDING_STATUS_KEY = "new"
DEFAULT_PENDING_PRIORITY_KEY = "normal"

PENDING_STATUSES = [
    {
        "key": "new",
        "label": "Nuevo",
        "description": "La solicitud acaba de entrar y aun no se ha empezado a buscar.",
    },
    {
        "key": "searching",
        "label": "Buscando opciones",
        "description": "Estas revisando tiendas, referencias o alternativas para el cliente.",
    },
    {
        "key": "option_found",
        "label": "Producto encontrado",
        "description": "Ya encontraste una opcion viable y falta revisar cierre comercial.",
    },
    {
        "key": "ready_to_quote",
        "label": "Listo para cotizar",
        "description": "La solicitud ya tiene contexto suficiente para pasar a cotizacion.",
    },
    {
        "key": "quoted",
        "label": "Cotizado",
        "description": "La solicitud ya se convirtio en una cotizacion formal.",
    },
    {
        "key": "on_hold",
        "label": "En espera",
        "description": "La solicitud quedo pausada mientras el cliente decide o responde.",
    },
    {
        "key": "discarded",
        "label": "Descartado",
        "description": "La oportunidad se cerro sin avanzar a cotizacion.",
    },
]

PENDING_PRIORITIES = [
    {
        "key": "low",
        "label": "Baja",
        "description": "No requiere respuesta inmediata.",
    },
    {
        "key": "normal",
        "label": "Normal",
        "description": "Se trabaja dentro del flujo habitual del dia.",
    },
    {
        "key": "high",
        "label": "Alta",
        "description": "Conviene darle seguimiento cercano en esta jornada.",
    },
    {
        "key": "urgent",
        "label": "Urgente",
        "description": "Tiene compromiso cercano o alta probabilidad de cierre.",
    },
]


def list_pending_statuses() -> list[dict[str, str]]:
    return [status.copy() for status in PENDING_STATUSES]


def list_pending_priorities() -> list[dict[str, str]]:
    return [priority.copy() for priority in PENDING_PRIORITIES]


def is_valid_pending_status(status_key: str) -> bool:
    normalized = str(status_key or "").strip().lower()
    return any(item["key"] == normalized for item in PENDING_STATUSES)


def is_valid_pending_priority(priority_key: str) -> bool:
    normalized = str(priority_key or "").strip().lower()
    return any(item["key"] == normalized for item in PENDING_PRIORITIES)


def get_pending_status_label(status_key: str) -> str:
    normalized = str(status_key or "").strip().lower()
    for item in PENDING_STATUSES:
        if item["key"] == normalized:
            return item["label"]
    return normalized or DEFAULT_PENDING_STATUS_KEY


def get_pending_priority_label(priority_key: str) -> str:
    normalized = str(priority_key or "").strip().lower()
    for item in PENDING_PRIORITIES:
        if item["key"] == normalized:
            return item["label"]
    return normalized or DEFAULT_PENDING_PRIORITY_KEY


def normalize_pending_status(status_key: Any) -> str:
    normalized = str(status_key or DEFAULT_PENDING_STATUS_KEY).strip().lower()
    if not is_valid_pending_status(normalized):
        raise ValueError("El estado del pendiente no es valido.")
    return normalized


def normalize_pending_priority(priority_key: Any) -> str:
    normalized = str(priority_key or DEFAULT_PENDING_PRIORITY_KEY).strip().lower()
    if not is_valid_pending_priority(normalized):
        raise ValueError("La prioridad del pendiente no es valida.")
    return normalized
