from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .pending import normalize_pending_priority, normalize_pending_status


def _to_float(value: Any, field_name: str, *, required: bool = True) -> float | None:
    if value in (None, ""):
        if required:
            raise ValueError(f"El campo '{field_name}' es obligatorio.")
        return None

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"El campo '{field_name}' debe ser numérico.") from exc
def _to_int(value: Any, field_name: str, *, required: bool = True) -> int | None:
    if value in (None, ""):
        if required:
            raise ValueError(f"El campo '{field_name}' es obligatorio.")
        return None

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"El campo '{field_name}' debe ser entero.") from exc


@dataclass(slots=True)
class ClientInput:
    name: str
    phone: str = ""
    email: str = ""
    city: str = ""
    address: str = ""
    neighborhood: str = ""
    whatsapp_phone: str = ""
    whatsapp_opt_in: bool = False
    preferred_contact_channel: str = ""
    preferred_payment_method: str = ""
    interests: str = ""
    notes: str = ""

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ClientInput":
        name = str(payload.get("name", "")).strip()
        if not name:
            raise ValueError("El nombre del cliente es obligatorio.")

        return cls(
            name=name,
            phone=str(payload.get("phone", "")).strip(),
            email=str(payload.get("email", "")).strip(),
            city=str(payload.get("city", "")).strip(),
            address=str(payload.get("address", "")).strip(),
            neighborhood=str(payload.get("neighborhood", "")).strip(),
            whatsapp_phone=str(payload.get("whatsapp_phone", "")).strip(),
            whatsapp_opt_in=bool(payload.get("whatsapp_opt_in")),
            preferred_contact_channel=str(payload.get("preferred_contact_channel", "")).strip(),
            preferred_payment_method=str(payload.get("preferred_payment_method", "")).strip(),
            interests=str(payload.get("interests", "")).strip(),
            notes=str(payload.get("notes", "")).strip(),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ProductInput:
    name: str
    reference: str = ""
    category: str = ""
    store: str = ""
    inventory_enabled: bool = False
    initial_stock_quantity: int = 0
    price_usd_net: float = 0.0
    tax_usa_percent: float = 0.0
    locker_shipping_usd: float = 0.0
    notes: str = ""

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ProductInput":
        name = str(payload.get("name", "")).strip()
        if not name:
            raise ValueError("El nombre del producto es obligatorio.")

        product = cls(
            name=name,
            reference=str(payload.get("reference", "")).strip(),
            category=str(payload.get("category", "")).strip(),
            store=str(payload.get("store", "")).strip(),
            inventory_enabled=bool(payload.get("inventory_enabled")),
            initial_stock_quantity=_to_int(
                payload.get("initial_stock_quantity"),
                "initial_stock_quantity",
                required=False,
            )
            or 0,
            price_usd_net=_to_float(payload.get("price_usd_net"), "price_usd_net") or 0.0,
            tax_usa_percent=_to_float(payload.get("tax_usa_percent"), "tax_usa_percent") or 0.0,
            locker_shipping_usd=_to_float(
                payload.get("locker_shipping_usd"), "locker_shipping_usd"
            )
            or 0.0,
            notes=str(payload.get("notes", "")).strip(),
        )
        product.validate()
        return product

    def validate(self) -> None:
        for field_name in ("price_usd_net", "tax_usa_percent", "locker_shipping_usd"):
            if getattr(self, field_name) < 0:
                raise ValueError(f"El campo '{field_name}' no puede ser negativo.")
        if self.initial_stock_quantity < 0:
            raise ValueError("El stock inicial no puede ser negativo.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class PendingRequestInput:
    client_id: int
    client_name: str = ""
    title: str = ""
    category: str = ""
    desired_store: str = ""
    desired_size: str = ""
    desired_color: str = ""
    quantity: int = 1
    budget_cop: float = 0.0
    priority_key: str = "normal"
    status_key: str = "new"
    due_date: str = ""
    reference_url: str = ""
    reference_notes: str = ""
    notes: str = ""

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "PendingRequestInput":
        title = str(payload.get("title", "")).strip()
        if not title:
            raise ValueError("El nombre corto del pendiente es obligatorio.")

        pending = cls(
            client_id=_to_int(payload.get("client_id"), "client_id") or 0,
            client_name=str(payload.get("client_name", "")).strip(),
            title=title,
            category=str(payload.get("category", "")).strip(),
            desired_store=str(payload.get("desired_store", "")).strip(),
            desired_size=str(payload.get("desired_size", "")).strip(),
            desired_color=str(payload.get("desired_color", "")).strip(),
            quantity=_to_int(payload.get("quantity"), "quantity") or 1,
            budget_cop=_to_float(payload.get("budget_cop"), "budget_cop", required=False) or 0.0,
            priority_key=normalize_pending_priority(payload.get("priority_key")),
            status_key=normalize_pending_status(payload.get("status_key")),
            due_date=str(payload.get("due_date", "")).strip(),
            reference_url=str(payload.get("reference_url", "")).strip(),
            reference_notes=str(payload.get("reference_notes", "")).strip(),
            notes=str(payload.get("notes", "")).strip(),
        )
        pending.validate()
        return pending

    def validate(self) -> None:
        if self.client_id <= 0:
            raise ValueError("Selecciona un cliente valido para este pendiente.")
        if self.quantity <= 0:
            raise ValueError("La cantidad del pendiente debe ser mayor a cero.")
        if self.budget_cop < 0:
            raise ValueError("El presupuesto objetivo no puede ser negativo.")
        if self.due_date and len(self.due_date) != 10:
            raise ValueError("La fecha compromiso debe tener formato AAAA-MM-DD.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
