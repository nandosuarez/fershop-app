from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


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


def _safe_div(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    return numerator / denominator


PURCHASE_TYPE_ONLINE = "online"
PURCHASE_TYPE_TRAVEL = "travel"
PURCHASE_TYPE_MIXED = "mixed"
PURCHASE_TYPE_LABELS = {
    PURCHASE_TYPE_ONLINE: "Compra online",
    PURCHASE_TYPE_TRAVEL: "Compra en viaje",
    PURCHASE_TYPE_MIXED: "Cotizacion mixta",
}


@dataclass(slots=True)
class QuoteInput:
    product_name: str
    client_name: str = ""
    product_id: int | None = None
    client_id: int | None = None
    purchase_type: str = PURCHASE_TYPE_ONLINE
    notes: str = ""
    client_quote_items_text: str = ""
    price_usd_net: float = 0.0
    tax_usa_percent: float = 0.0
    travel_cost_usd: float = 0.0
    locker_shipping_usd: float = 0.0
    exchange_rate_cop: float = 0.0
    local_costs_cop: float = 0.0
    desired_margin_percent: float = 0.0
    advance_percent: float = 50.0
    final_sale_price_cop: float | None = None
    final_advance_cop: float | None = None

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "QuoteInput":
        product_name = str(payload.get("product_name", "")).strip()
        if not product_name:
            raise ValueError("El nombre del producto es obligatorio.")

        quote = cls(
            product_name=product_name,
            client_name=str(payload.get("client_name", "")).strip(),
            product_id=_to_int(payload.get("product_id"), "product_id", required=False),
            client_id=_to_int(payload.get("client_id"), "client_id", required=False),
            purchase_type=str(payload.get("purchase_type", PURCHASE_TYPE_ONLINE)).strip().lower()
            or PURCHASE_TYPE_ONLINE,
            notes=str(payload.get("notes", "")).strip(),
            client_quote_items_text=str(payload.get("client_quote_items_text", "")).strip(),
            price_usd_net=_to_float(payload.get("price_usd_net"), "price_usd_net") or 0.0,
            tax_usa_percent=_to_float(payload.get("tax_usa_percent"), "tax_usa_percent") or 0.0,
            travel_cost_usd=_to_float(payload.get("travel_cost_usd"), "travel_cost_usd") or 0.0,
            locker_shipping_usd=_to_float(
                payload.get("locker_shipping_usd"), "locker_shipping_usd"
            )
            or 0.0,
            exchange_rate_cop=_to_float(payload.get("exchange_rate_cop"), "exchange_rate_cop")
            or 0.0,
            local_costs_cop=_to_float(payload.get("local_costs_cop"), "local_costs_cop") or 0.0,
            desired_margin_percent=_to_float(
                payload.get("desired_margin_percent"), "desired_margin_percent"
            )
            or 0.0,
            advance_percent=_to_float(payload.get("advance_percent"), "advance_percent") or 0.0,
            final_sale_price_cop=_to_float(
                payload.get("final_sale_price_cop"), "final_sale_price_cop", required=False
            ),
            final_advance_cop=_to_float(
                payload.get("final_advance_cop"), "final_advance_cop", required=False
            ),
        )
        quote.validate()
        return quote

    def validate(self) -> None:
        numeric_fields = (
            "price_usd_net",
            "tax_usa_percent",
            "travel_cost_usd",
            "locker_shipping_usd",
            "exchange_rate_cop",
            "local_costs_cop",
            "desired_margin_percent",
            "advance_percent",
        )
        for field_name in numeric_fields:
            value = getattr(self, field_name)
            if value < 0:
                raise ValueError(f"El campo '{field_name}' no puede ser negativo.")

        if self.exchange_rate_cop <= 0:
            raise ValueError("La TRM debe ser mayor que cero.")

        if self.desired_margin_percent >= 100:
            raise ValueError("El margen deseado debe ser menor al 100%.")

        if self.advance_percent > 100:
            raise ValueError("El anticipo no puede superar el 100%.")

        if self.final_sale_price_cop is not None and self.final_sale_price_cop <= 0:
            raise ValueError("El precio final de venta debe ser mayor que cero.")

        if self.final_advance_cop is not None and self.final_advance_cop < 0:
            raise ValueError("El anticipo final no puede ser negativo.")

        for field_name in ("product_id", "client_id"):
            value = getattr(self, field_name)
            if value is not None and value <= 0:
                raise ValueError(f"El campo '{field_name}' debe ser mayor que cero.")

        if self.purchase_type not in PURCHASE_TYPE_LABELS:
            raise ValueError("El tipo de compra no es valido.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def calculate_quote(quote: QuoteInput) -> dict[str, Any]:
    tax_rate = quote.tax_usa_percent / 100
    desired_margin = quote.desired_margin_percent / 100
    advance_rate = quote.advance_percent / 100

    price_with_tax_usd = quote.price_usd_net * (1 + tax_rate)
    if quote.purchase_type == PURCHASE_TYPE_TRAVEL:
        applied_travel_cost_usd = quote.travel_cost_usd
        applied_locker_shipping_usd = 0.0
        applied_local_costs_cop = quote.local_costs_cop
    else:
        applied_travel_cost_usd = 0.0
        applied_locker_shipping_usd = quote.locker_shipping_usd
        applied_local_costs_cop = 0.0

    total_usd = price_with_tax_usd + applied_travel_cost_usd + applied_locker_shipping_usd

    travel_cost_cop = applied_travel_cost_usd * quote.exchange_rate_cop
    locker_shipping_cop = applied_locker_shipping_usd * quote.exchange_rate_cop
    cost_in_cop = total_usd * quote.exchange_rate_cop
    real_total_cost_cop = cost_in_cop + applied_local_costs_cop

    suggested_sale_price_cop = real_total_cost_cop / (1 - desired_margin)
    suggested_profit_cop = suggested_sale_price_cop - real_total_cost_cop
    suggested_advance_cop = suggested_sale_price_cop * advance_rate
    suggested_own_capital_cop = real_total_cost_cop - suggested_advance_cop
    suggested_own_capital_percent = _safe_div(suggested_own_capital_cop, real_total_cost_cop)
    suggested_markup_percent = _safe_div(suggested_profit_cop, real_total_cost_cop)
    suggested_roi_percent = _safe_div(suggested_profit_cop, suggested_own_capital_cop)

    final_sale_price_cop = quote.final_sale_price_cop or suggested_sale_price_cop
    final_advance_cop = quote.final_advance_cop
    if final_advance_cop is None:
        final_advance_cop = final_sale_price_cop * advance_rate

    final_profit_cop = final_sale_price_cop - real_total_cost_cop
    final_margin_percent = 1 - (real_total_cost_cop / final_sale_price_cop)
    final_advance_percent = _safe_div(final_advance_cop, final_sale_price_cop)
    final_own_capital_cop = real_total_cost_cop - final_advance_cop
    final_own_capital_percent = _safe_div(final_own_capital_cop, real_total_cost_cop)
    final_markup_percent = _safe_div(final_profit_cop, real_total_cost_cop)
    final_roi_percent = _safe_div(final_profit_cop, final_own_capital_cop)

    return {
        "input": quote.to_dict(),
        "costs": {
            "purchase_type": quote.purchase_type,
            "purchase_type_label": PURCHASE_TYPE_LABELS[quote.purchase_type],
            "price_with_tax_usd": price_with_tax_usd,
            "applied_travel_cost_usd": applied_travel_cost_usd,
            "applied_locker_shipping_usd": applied_locker_shipping_usd,
            "applied_local_costs_cop": applied_local_costs_cop,
            "travel_cost_cop": travel_cost_cop,
            "locker_shipping_cop": locker_shipping_cop,
            "total_usd": total_usd,
            "cost_in_cop": cost_in_cop,
            "real_total_cost_cop": real_total_cost_cop,
        },
        "suggested": {
            "sale_price_cop": suggested_sale_price_cop,
            "profit_cop": suggested_profit_cop,
            "advance_cop": suggested_advance_cop,
            "own_capital_cop": suggested_own_capital_cop,
            "own_capital_percent": suggested_own_capital_percent,
            "markup_percent": suggested_markup_percent,
            "roi_percent": suggested_roi_percent,
        },
        "final": {
            "sale_price_cop": final_sale_price_cop,
            "profit_cop": final_profit_cop,
            "margin_percent": final_margin_percent,
            "advance_cop": final_advance_cop,
            "advance_percent": final_advance_percent,
            "own_capital_cop": final_own_capital_cop,
            "own_capital_percent": final_own_capital_percent,
            "markup_percent": final_markup_percent,
            "roi_percent": final_roi_percent,
            "uses_custom_sale_price": quote.final_sale_price_cop is not None,
            "uses_custom_advance": quote.final_advance_cop is not None,
        },
    }


from dataclasses import field


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _build_line_item_summary(item: "QuoteLineItem") -> str:
    if item.quantity > 1:
        return f"{item.product_name} x{item.quantity}"
    return item.product_name


def _build_quote_product_name(line_items: list["QuoteLineItem"]) -> str:
    if not line_items:
        return ""
    if len(line_items) == 1:
        return _build_line_item_summary(line_items[0])
    if len(line_items) <= 3:
        return " + ".join(_build_line_item_summary(item) for item in line_items)
    return f"{_build_line_item_summary(line_items[0])} + {len(line_items) - 1} productos mas"


@dataclass(slots=True)
class QuoteLineItem:
    product_name: str
    quantity: int = 1
    product_id: int | None = None
    reference: str = ""
    category: str = ""
    store: str = ""
    uses_inventory_stock: bool = False
    inventory_unit_cost_cop: float = 0.0
    unit_price_usd_net: float = 0.0
    unit_tax_usa_percent: float = 0.0
    unit_locker_shipping_usd: float = 0.0

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "QuoteLineItem":
        product_name = _clean_text(payload.get("product_name"))
        if not product_name:
            raise ValueError("Cada item de la cotizacion debe tener nombre de producto.")

        item = cls(
            product_name=product_name,
            quantity=_to_int(payload.get("quantity"), "quantity") or 1,
            product_id=_to_int(payload.get("product_id"), "product_id", required=False),
            reference=_clean_text(payload.get("reference")),
            category=_clean_text(payload.get("category")),
            store=_clean_text(payload.get("store")),
            uses_inventory_stock=bool(payload.get("uses_inventory_stock")),
            inventory_unit_cost_cop=_to_float(
                payload.get("inventory_unit_cost_cop"), "inventory_unit_cost_cop", required=False
            )
            or 0.0,
            unit_price_usd_net=_to_float(payload.get("unit_price_usd_net"), "unit_price_usd_net")
            or 0.0,
            unit_tax_usa_percent=_to_float(
                payload.get("unit_tax_usa_percent"), "unit_tax_usa_percent"
            )
            or 0.0,
            unit_locker_shipping_usd=_to_float(
                payload.get("unit_locker_shipping_usd"), "unit_locker_shipping_usd"
            )
            or 0.0,
        )
        item.validate()
        return item

    def validate(self) -> None:
        if self.quantity <= 0:
            raise ValueError("La cantidad de cada item debe ser mayor que cero.")

        for field_name in (
            "unit_price_usd_net",
            "unit_tax_usa_percent",
            "unit_locker_shipping_usd",
            "inventory_unit_cost_cop",
        ):
            if getattr(self, field_name) < 0:
                raise ValueError(f"El campo '{field_name}' no puede ser negativo.")

        if self.product_id is not None and self.product_id <= 0:
            raise ValueError("El product_id de cada item debe ser mayor que cero.")

    @property
    def line_price_usd_net(self) -> float:
        return self.unit_price_usd_net * self.quantity

    @property
    def line_tax_usd(self) -> float:
        return self.line_price_usd_net * (self.unit_tax_usa_percent / 100)

    @property
    def line_price_with_tax_usd(self) -> float:
        return self.line_price_usd_net + self.line_tax_usd

    @property
    def line_locker_shipping_usd(self) -> float:
        return self.unit_locker_shipping_usd * self.quantity


@dataclass(slots=True)
class QuoteInput:
    product_name: str
    client_name: str = ""
    product_id: int | None = None
    client_id: int | None = None
    reference: str = ""
    category: str = ""
    store: str = ""
    quantity: int = 1
    purchase_type: str = PURCHASE_TYPE_ONLINE
    uses_inventory_stock: bool = False
    inventory_unit_cost_cop: float = 0.0
    notes: str = ""
    client_quote_items_text: str = ""
    line_items: list[QuoteLineItem] = field(default_factory=list)
    price_usd_net: float = 0.0
    tax_usa_percent: float = 0.0
    travel_cost_usd: float = 0.0
    locker_shipping_usd: float = 0.0
    exchange_rate_cop: float = 0.0
    local_costs_cop: float = 0.0
    desired_margin_percent: float = 0.0
    advance_percent: float = 50.0
    final_sale_price_cop: float | None = None
    final_advance_cop: float | None = None

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "QuoteInput":
        raw_line_items = payload.get("line_items")
        line_items = []
        if isinstance(raw_line_items, list):
            line_items = [QuoteLineItem.from_dict(item) for item in raw_line_items if item]

        product_name = _clean_text(payload.get("product_name"))
        product_id = _to_int(payload.get("product_id"), "product_id", required=False)
        quantity = _to_int(payload.get("quantity"), "quantity", required=False) or 1

        if line_items:
            product_name = product_name or _build_quote_product_name(line_items)
            product_id = line_items[0].product_id if len(line_items) == 1 else None
            price_usd_net = sum(item.line_price_usd_net for item in line_items)
            total_tax_usd = sum(item.line_tax_usd for item in line_items)
            locker_shipping_usd = sum(item.line_locker_shipping_usd for item in line_items)
            tax_usa_percent = (total_tax_usd / price_usd_net * 100) if price_usd_net else 0.0
            reference = line_items[0].reference if len(line_items) == 1 else ""
            category = line_items[0].category if len(line_items) == 1 else ""
            store = line_items[0].store if len(line_items) == 1 else ""
            quantity = sum(item.quantity for item in line_items) or 1
        else:
            if not product_name:
                raise ValueError("El nombre del producto es obligatorio.")
            price_usd_net = _to_float(payload.get("price_usd_net"), "price_usd_net") or 0.0
            tax_usa_percent = _to_float(payload.get("tax_usa_percent"), "tax_usa_percent") or 0.0
            locker_shipping_usd = (
                _to_float(payload.get("locker_shipping_usd"), "locker_shipping_usd") or 0.0
            )
            reference = _clean_text(payload.get("reference"))
            category = _clean_text(payload.get("category"))
            store = _clean_text(payload.get("store"))

        quote = cls(
            product_name=product_name,
            client_name=_clean_text(payload.get("client_name")),
            product_id=product_id,
            client_id=_to_int(payload.get("client_id"), "client_id", required=False),
            reference=reference,
            category=category,
            store=store,
            quantity=quantity,
            purchase_type=_clean_text(payload.get("purchase_type", PURCHASE_TYPE_ONLINE)).lower()
            or PURCHASE_TYPE_ONLINE,
            uses_inventory_stock=bool(payload.get("uses_inventory_stock")),
            inventory_unit_cost_cop=_to_float(
                payload.get("inventory_unit_cost_cop"), "inventory_unit_cost_cop", required=False
            )
            or 0.0,
            notes=_clean_text(payload.get("notes")),
            client_quote_items_text=_clean_text(payload.get("client_quote_items_text")),
            line_items=line_items,
            price_usd_net=price_usd_net,
            tax_usa_percent=tax_usa_percent,
            travel_cost_usd=_to_float(payload.get("travel_cost_usd"), "travel_cost_usd") or 0.0,
            locker_shipping_usd=locker_shipping_usd,
            exchange_rate_cop=_to_float(payload.get("exchange_rate_cop"), "exchange_rate_cop")
            or 0.0,
            local_costs_cop=_to_float(payload.get("local_costs_cop"), "local_costs_cop") or 0.0,
            desired_margin_percent=_to_float(
                payload.get("desired_margin_percent"), "desired_margin_percent"
            )
            or 0.0,
            advance_percent=_to_float(payload.get("advance_percent"), "advance_percent") or 0.0,
            final_sale_price_cop=_to_float(
                payload.get("final_sale_price_cop"), "final_sale_price_cop", required=False
            ),
            final_advance_cop=_to_float(
                payload.get("final_advance_cop"), "final_advance_cop", required=False
            ),
        )
        quote.validate()
        return quote

    def validate(self) -> None:
        numeric_fields = (
            "price_usd_net",
            "tax_usa_percent",
            "travel_cost_usd",
            "locker_shipping_usd",
            "exchange_rate_cop",
            "local_costs_cop",
            "desired_margin_percent",
            "advance_percent",
            "inventory_unit_cost_cop",
        )
        for field_name in numeric_fields:
            if getattr(self, field_name) < 0:
                raise ValueError(f"El campo '{field_name}' no puede ser negativo.")

        if self.quantity <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")

        if self.exchange_rate_cop <= 0:
            raise ValueError("La TRM debe ser mayor que cero.")

        if self.desired_margin_percent >= 100:
            raise ValueError("El margen deseado debe ser menor al 100%.")

        if self.advance_percent > 100:
            raise ValueError("El anticipo no puede superar el 100%.")

        if self.final_sale_price_cop is not None and self.final_sale_price_cop <= 0:
            raise ValueError("El precio final de venta debe ser mayor que cero.")

        if self.final_advance_cop is not None and self.final_advance_cop < 0:
            raise ValueError("El anticipo final no puede ser negativo.")

        for field_name in ("product_id", "client_id"):
            value = getattr(self, field_name)
            if value is not None and value <= 0:
                raise ValueError(f"El campo '{field_name}' debe ser mayor que cero.")

        if self.purchase_type not in PURCHASE_TYPE_LABELS:
            raise ValueError("El tipo de compra no es valido.")

        for item in self.line_items:
            item.validate()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _build_calculation_line_items(quote: QuoteInput) -> list[dict[str, Any]]:
    if quote.line_items:
        return [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "reference": item.reference,
                "category": item.category,
                "store": item.store,
                "quantity": item.quantity,
                "uses_inventory_stock": item.uses_inventory_stock,
                "inventory_unit_cost_cop": item.inventory_unit_cost_cop,
                "unit_price_usd_net": item.unit_price_usd_net,
                "unit_tax_usa_percent": item.unit_tax_usa_percent,
                "unit_locker_shipping_usd": item.unit_locker_shipping_usd,
            }
            for item in quote.line_items
        ]

    return [
        {
            "product_id": quote.product_id,
            "product_name": quote.product_name,
            "reference": quote.reference,
            "category": quote.category,
            "store": quote.store,
            "quantity": quote.quantity,
            "uses_inventory_stock": quote.uses_inventory_stock,
            "inventory_unit_cost_cop": quote.inventory_unit_cost_cop,
            "unit_price_usd_net": quote.price_usd_net,
            "unit_tax_usa_percent": quote.tax_usa_percent,
            "unit_locker_shipping_usd": quote.locker_shipping_usd,
        }
    ]


def calculate_quote(quote: QuoteInput) -> dict[str, Any]:
    desired_margin = quote.desired_margin_percent / 100
    advance_rate = quote.advance_percent / 100

    calculation_line_items = _build_calculation_line_items(quote)
    computed_line_items: list[dict[str, Any]] = []
    total_price_with_tax_usd = 0.0
    total_locker_shipping_usd = 0.0
    total_cost_basis_cop = 0.0
    total_inventory_cost_cop = 0.0

    for raw_item in calculation_line_items:
        quantity = int(raw_item["quantity"] or 0)
        unit_price_usd_net = float(raw_item["unit_price_usd_net"] or 0)
        unit_tax_usa_percent = float(raw_item["unit_tax_usa_percent"] or 0)
        unit_locker_shipping_usd = float(raw_item["unit_locker_shipping_usd"] or 0)
        inventory_unit_cost_cop = float(raw_item.get("inventory_unit_cost_cop") or 0)
        uses_inventory_stock = bool(raw_item.get("uses_inventory_stock"))
        uses_inventory_cost_basis = uses_inventory_stock and inventory_unit_cost_cop > 0

        line_price_usd_net = unit_price_usd_net * quantity
        line_tax_usd = line_price_usd_net * (unit_tax_usa_percent / 100)
        line_price_with_tax_usd = line_price_usd_net + line_tax_usd
        line_locker_shipping_usd = unit_locker_shipping_usd * quantity

        line_import_cost_basis_usd = line_price_with_tax_usd + line_locker_shipping_usd
        line_import_cost_basis_cop = line_import_cost_basis_usd * quote.exchange_rate_cop
        line_cost_basis_usd = line_import_cost_basis_usd
        line_cost_basis_cop = line_import_cost_basis_cop
        if uses_inventory_cost_basis:
            line_cost_basis_usd = 0.0
            line_cost_basis_cop = inventory_unit_cost_cop * quantity
            total_inventory_cost_cop += line_cost_basis_cop
        else:
            total_price_with_tax_usd += line_price_with_tax_usd
            total_locker_shipping_usd += line_locker_shipping_usd
        total_cost_basis_cop += line_cost_basis_cop

        computed_line_items.append(
            {
                "product_id": raw_item["product_id"],
                "product_name": raw_item["product_name"],
                "reference": raw_item["reference"],
                "category": raw_item["category"],
                "store": raw_item["store"],
                "quantity": quantity,
                "uses_inventory_stock": uses_inventory_stock,
                "uses_inventory_cost_basis": uses_inventory_cost_basis,
                "inventory_unit_cost_cop": inventory_unit_cost_cop,
                "unit_price_usd_net": unit_price_usd_net,
                "unit_tax_usa_percent": unit_tax_usa_percent,
                "unit_locker_shipping_usd": unit_locker_shipping_usd,
                "line_price_usd_net": line_price_usd_net,
                "line_tax_usd": line_tax_usd,
                "line_price_with_tax_usd": line_price_with_tax_usd,
                "line_locker_shipping_usd": line_locker_shipping_usd,
                "line_cost_basis_usd": line_cost_basis_usd,
                "line_import_cost_basis_cop": line_import_cost_basis_cop,
                "line_cost_basis_cop": line_cost_basis_cop,
            }
        )

    all_inventory_items = bool(computed_line_items) and all(
        bool(item.get("uses_inventory_cost_basis")) for item in computed_line_items
    )

    if all_inventory_items:
        applied_travel_cost_usd = 0.0
        applied_locker_shipping_usd = 0.0
        applied_local_costs_cop = 0.0
    elif quote.purchase_type == PURCHASE_TYPE_TRAVEL:
        applied_travel_cost_usd = quote.travel_cost_usd
        applied_locker_shipping_usd = total_locker_shipping_usd
        applied_local_costs_cop = quote.local_costs_cop
    else:
        applied_travel_cost_usd = 0.0
        applied_locker_shipping_usd = total_locker_shipping_usd
        applied_local_costs_cop = 0.0

    total_usd = total_price_with_tax_usd + applied_travel_cost_usd + applied_locker_shipping_usd

    travel_cost_cop = applied_travel_cost_usd * quote.exchange_rate_cop
    locker_shipping_cop = applied_locker_shipping_usd * quote.exchange_rate_cop
    cost_in_cop = total_usd * quote.exchange_rate_cop
    real_total_cost_cop = cost_in_cop + applied_local_costs_cop + total_inventory_cost_cop

    suggested_sale_price_cop = real_total_cost_cop / (1 - desired_margin)
    suggested_profit_cop = suggested_sale_price_cop - real_total_cost_cop
    suggested_advance_cop = suggested_sale_price_cop * advance_rate
    suggested_own_capital_cop = real_total_cost_cop - suggested_advance_cop
    suggested_own_capital_percent = _safe_div(suggested_own_capital_cop, real_total_cost_cop)
    suggested_markup_percent = _safe_div(suggested_profit_cop, real_total_cost_cop)
    suggested_roi_percent = _safe_div(suggested_profit_cop, suggested_own_capital_cop)

    final_sale_price_cop = quote.final_sale_price_cop or suggested_sale_price_cop
    final_advance_cop = quote.final_advance_cop
    if final_advance_cop is None:
        final_advance_cop = final_sale_price_cop * advance_rate

    final_profit_cop = final_sale_price_cop - real_total_cost_cop
    final_margin_percent = 1 - (real_total_cost_cop / final_sale_price_cop)
    final_advance_percent = _safe_div(final_advance_cop, final_sale_price_cop)
    final_own_capital_cop = real_total_cost_cop - final_advance_cop
    final_own_capital_percent = _safe_div(final_own_capital_cop, real_total_cost_cop)
    final_markup_percent = _safe_div(final_profit_cop, real_total_cost_cop)
    final_roi_percent = _safe_div(final_profit_cop, final_own_capital_cop)

    for item in computed_line_items:
        share_ratio = _safe_div(item["line_cost_basis_cop"], total_cost_basis_cop) or 0.0
        item["share_ratio"] = share_ratio
        item["real_cost_cop"] = real_total_cost_cop * share_ratio
        item["suggested_sale_price_cop"] = suggested_sale_price_cop * share_ratio
        item["suggested_advance_cop"] = suggested_advance_cop * share_ratio
        item["suggested_profit_cop"] = suggested_profit_cop * share_ratio
        item["sale_price_cop"] = final_sale_price_cop * share_ratio
        item["advance_cop"] = final_advance_cop * share_ratio
        item["profit_cop"] = final_profit_cop * share_ratio

    return {
        "input": quote.to_dict(),
        "line_items": computed_line_items,
        "costs": {
            "purchase_type": quote.purchase_type,
            "purchase_type_label": PURCHASE_TYPE_LABELS[quote.purchase_type],
            "price_with_tax_usd": total_price_with_tax_usd,
            "applied_travel_cost_usd": applied_travel_cost_usd,
            "applied_locker_shipping_usd": applied_locker_shipping_usd,
            "applied_local_costs_cop": applied_local_costs_cop,
            "travel_cost_cop": travel_cost_cop,
            "locker_shipping_cop": locker_shipping_cop,
            "total_usd": total_usd,
            "cost_in_cop": cost_in_cop,
            "inventory_cost_cop": total_inventory_cost_cop,
            "real_total_cost_cop": real_total_cost_cop,
        },
        "suggested": {
            "sale_price_cop": suggested_sale_price_cop,
            "profit_cop": suggested_profit_cop,
            "advance_cop": suggested_advance_cop,
            "own_capital_cop": suggested_own_capital_cop,
            "own_capital_percent": suggested_own_capital_percent,
            "markup_percent": suggested_markup_percent,
            "roi_percent": suggested_roi_percent,
        },
        "final": {
            "sale_price_cop": final_sale_price_cop,
            "profit_cop": final_profit_cop,
            "margin_percent": final_margin_percent,
            "advance_cop": final_advance_cop,
            "advance_percent": final_advance_percent,
            "own_capital_cop": final_own_capital_cop,
            "own_capital_percent": final_own_capital_percent,
            "markup_percent": final_markup_percent,
            "roi_percent": final_roi_percent,
            "uses_custom_sale_price": quote.final_sale_price_cop is not None,
            "uses_custom_advance": quote.final_advance_cop is not None,
        },
    }


def build_quote_item_snapshot(quote: QuoteInput, result: dict[str, Any]) -> dict[str, Any]:
    line_items = result.get("line_items", [])
    computed_line = line_items[0] if isinstance(line_items, list) and line_items else {}
    final_data = result.get("final", {})
    suggested_data = result.get("suggested", {})
    costs_data = result.get("costs", {})
    return {
        "product_id": quote.product_id,
        "product_name": quote.product_name,
        "reference": quote.reference,
        "category": quote.category,
        "store": quote.store,
        "quantity": quote.quantity,
        "purchase_type": quote.purchase_type,
        "uses_inventory_stock": quote.uses_inventory_stock,
        "purchase_type_label": PURCHASE_TYPE_LABELS[quote.purchase_type],
        "input": quote.to_dict(),
        "result": result,
        "real_cost_cop": float(costs_data.get("real_total_cost_cop") or 0),
        "sale_price_cop": float(final_data.get("sale_price_cop") or 0),
        "advance_cop": float(final_data.get("advance_cop") or 0),
        "profit_cop": float(final_data.get("profit_cop") or 0),
        "suggested_sale_price_cop": float(suggested_data.get("sale_price_cop") or 0),
        "suggested_advance_cop": float(suggested_data.get("advance_cop") or 0),
        "suggested_profit_cop": float(suggested_data.get("profit_cop") or 0),
        "line_item": computed_line,
    }


def _build_quote_item_name(items: list[dict[str, Any]]) -> str:
    normalized_items = [
        QuoteLineItem(
            product_name=str(item.get("product_name") or "").strip() or "Producto",
            quantity=max(int(item.get("quantity") or 1), 1),
        )
        for item in items
    ]
    return _build_quote_product_name(normalized_items)


def _resolve_bundle_purchase_type(items: list[dict[str, Any]]) -> str:
    purchase_types = {
        str(item.get("purchase_type") or "").strip().lower()
        for item in items
        if str(item.get("purchase_type") or "").strip()
    }
    if len(purchase_types) == 1:
        return next(iter(purchase_types))
    return PURCHASE_TYPE_MIXED


def calculate_quote_bundle(payload: dict[str, Any]) -> dict[str, Any]:
    raw_quote_items = payload.get("quote_items")
    if not isinstance(raw_quote_items, list) or not raw_quote_items:
        raise ValueError("Agrega al menos un producto calculado a la cotizacion.")

    client_id = _to_int(payload.get("client_id"), "client_id", required=False)
    client_name = _clean_text(payload.get("client_name"))
    notes = _clean_text(payload.get("notes"))
    client_quote_items_text = _clean_text(payload.get("client_quote_items_text"))
    general_discount_cop = _to_float(
        payload.get("general_discount_cop"), "general_discount_cop", required=False
    ) or 0.0
    if general_discount_cop < 0:
        raise ValueError("El descuento general no puede ser negativo.")

    quote_items: list[dict[str, Any]] = []
    summary_line_items: list[dict[str, Any]] = []

    total_price_with_tax_usd = 0.0
    total_travel_cost_usd = 0.0
    total_locker_shipping_usd = 0.0
    total_local_costs_cop = 0.0
    total_travel_cost_cop = 0.0
    total_locker_shipping_cop = 0.0
    total_cost_in_cop = 0.0
    total_real_cost_cop = 0.0

    total_suggested_sale_cop = 0.0
    total_suggested_profit_cop = 0.0
    total_suggested_advance_cop = 0.0
    total_suggested_own_capital_cop = 0.0

    total_final_sale_cop = 0.0
    total_final_profit_cop = 0.0
    total_final_advance_cop = 0.0
    total_final_own_capital_cop = 0.0

    uses_custom_sale_price = False
    uses_custom_advance = False

    for raw_item in raw_quote_items:
        if not isinstance(raw_item, dict):
            continue
        item_payload = raw_item.get("input") if isinstance(raw_item.get("input"), dict) else raw_item
        quote = QuoteInput.from_dict(item_payload)
        if client_id is not None:
            quote.client_id = client_id
        if client_name:
            quote.client_name = client_name
        result = calculate_quote(quote)
        item_snapshot = build_quote_item_snapshot(quote, result)
        quote_items.append(item_snapshot)

        item_costs = result.get("costs", {})
        item_suggested = result.get("suggested", {})
        item_final = result.get("final", {})
        item_line = dict(item_snapshot.get("line_item") or {})

        total_price_with_tax_usd += float(item_costs.get("price_with_tax_usd") or 0)
        total_travel_cost_usd += float(item_costs.get("applied_travel_cost_usd") or 0)
        total_locker_shipping_usd += float(item_costs.get("applied_locker_shipping_usd") or 0)
        total_local_costs_cop += float(item_costs.get("applied_local_costs_cop") or 0)
        total_travel_cost_cop += float(item_costs.get("travel_cost_cop") or 0)
        total_locker_shipping_cop += float(item_costs.get("locker_shipping_cop") or 0)
        total_cost_in_cop += float(item_costs.get("cost_in_cop") or 0)
        total_real_cost_cop += float(item_costs.get("real_total_cost_cop") or 0)

        total_suggested_sale_cop += float(item_suggested.get("sale_price_cop") or 0)
        total_suggested_profit_cop += float(item_suggested.get("profit_cop") or 0)
        total_suggested_advance_cop += float(item_suggested.get("advance_cop") or 0)
        total_suggested_own_capital_cop += float(item_suggested.get("own_capital_cop") or 0)

        total_final_sale_cop += float(item_final.get("sale_price_cop") or 0)
        total_final_profit_cop += float(item_final.get("profit_cop") or 0)
        total_final_advance_cop += float(item_final.get("advance_cop") or 0)
        total_final_own_capital_cop += float(item_final.get("own_capital_cop") or 0)

        uses_custom_sale_price = uses_custom_sale_price or bool(item_final.get("uses_custom_sale_price"))
        uses_custom_advance = uses_custom_advance or bool(item_final.get("uses_custom_advance"))

        item_line.update(
            {
                "purchase_type": quote.purchase_type,
                "purchase_type_label": PURCHASE_TYPE_LABELS[quote.purchase_type],
                "sale_price_cop": float(item_final.get("sale_price_cop") or 0),
                "advance_cop": float(item_final.get("advance_cop") or 0),
                "profit_cop": float(item_final.get("profit_cop") or 0),
                "real_cost_cop": float(item_costs.get("real_total_cost_cop") or 0),
                "suggested_sale_price_cop": float(item_suggested.get("sale_price_cop") or 0),
                "suggested_advance_cop": float(item_suggested.get("advance_cop") or 0),
                "suggested_profit_cop": float(item_suggested.get("profit_cop") or 0),
            }
        )
        summary_line_items.append(item_line)

    if not quote_items:
        raise ValueError("Agrega al menos un producto calculado a la cotizacion.")

    if not client_name:
        client_name = str(quote_items[0]["input"].get("client_name") or "").strip()
    if client_id is None:
        first_client_id = quote_items[0]["input"].get("client_id")
        client_id = first_client_id if isinstance(first_client_id, int) else None

    total_usd = total_price_with_tax_usd + total_travel_cost_usd + total_locker_shipping_usd
    purchase_type = _resolve_bundle_purchase_type(quote_items)
    purchase_type_label = PURCHASE_TYPE_LABELS.get(purchase_type, "Cotizacion mixta")
    applied_general_discount_cop = min(general_discount_cop, total_final_sale_cop)
    discounted_total_final_sale_cop = max(total_final_sale_cop - applied_general_discount_cop, 0.0)
    discounted_total_final_profit_cop = total_final_profit_cop - applied_general_discount_cop

    for item in summary_line_items:
        original_sale_price_cop = float(item.get("sale_price_cop") or 0)
        sale_share_ratio = _safe_div(original_sale_price_cop, total_final_sale_cop) or 0.0
        allocated_discount_cop = applied_general_discount_cop * sale_share_ratio
        discounted_sale_price_cop = max(original_sale_price_cop - allocated_discount_cop, 0.0)
        item["general_discount_cop"] = allocated_discount_cop
        item["sale_price_cop"] = discounted_sale_price_cop
        item["profit_cop"] = float(item.get("profit_cop") or 0) - allocated_discount_cop
        item["advance_cop"] = total_final_advance_cop * (
            _safe_div(discounted_sale_price_cop, discounted_total_final_sale_cop) or 0.0
        )
        real_cost = float(item.get("real_cost_cop") or 0)
        item["share_ratio"] = _safe_div(real_cost, total_real_cost_cop) or 0.0

    input_data = {
        "product_name": _build_quote_item_name(quote_items),
        "client_name": client_name,
        "product_id": quote_items[0]["product_id"] if len(quote_items) == 1 else None,
        "client_id": client_id,
        "purchase_type": purchase_type,
        "general_discount_cop": applied_general_discount_cop,
        "notes": notes,
        "client_quote_items_text": client_quote_items_text,
        "quote_items": quote_items,
        "line_items": [
            {
                "product_id": item.get("product_id"),
                "product_name": item.get("product_name"),
                "reference": item.get("reference", ""),
                "category": item.get("category", ""),
                "store": item.get("store", ""),
                "quantity": item.get("quantity", 1),
            }
            for item in quote_items
        ],
    }

    return {
        "input": input_data,
        "quote_items": quote_items,
        "line_items": summary_line_items,
        "costs": {
            "purchase_type": purchase_type,
            "purchase_type_label": purchase_type_label,
            "price_with_tax_usd": total_price_with_tax_usd,
            "applied_travel_cost_usd": total_travel_cost_usd,
            "applied_locker_shipping_usd": total_locker_shipping_usd,
            "applied_local_costs_cop": total_local_costs_cop,
            "travel_cost_cop": total_travel_cost_cop,
            "locker_shipping_cop": total_locker_shipping_cop,
            "total_usd": total_usd,
            "cost_in_cop": total_cost_in_cop,
            "real_total_cost_cop": total_real_cost_cop,
        },
        "suggested": {
            "sale_price_cop": total_suggested_sale_cop,
            "profit_cop": total_suggested_profit_cop,
            "advance_cop": total_suggested_advance_cop,
            "own_capital_cop": total_suggested_own_capital_cop,
            "own_capital_percent": _safe_div(total_suggested_own_capital_cop, total_real_cost_cop),
            "markup_percent": _safe_div(total_suggested_profit_cop, total_real_cost_cop),
            "roi_percent": _safe_div(total_suggested_profit_cop, total_suggested_own_capital_cop),
        },
        "final": {
            "sale_price_cop": discounted_total_final_sale_cop,
            "profit_cop": discounted_total_final_profit_cop,
            "margin_percent": 1 - (total_real_cost_cop / discounted_total_final_sale_cop)
            if discounted_total_final_sale_cop
            else None,
            "general_discount_cop": applied_general_discount_cop,
            "advance_cop": total_final_advance_cop,
            "advance_percent": _safe_div(total_final_advance_cop, discounted_total_final_sale_cop),
            "own_capital_cop": total_final_own_capital_cop,
            "own_capital_percent": _safe_div(total_final_own_capital_cop, total_real_cost_cop),
            "markup_percent": _safe_div(discounted_total_final_profit_cop, total_real_cost_cop),
            "roi_percent": _safe_div(total_final_profit_cop, total_final_own_capital_cop),
            "uses_custom_sale_price": uses_custom_sale_price,
            "uses_custom_advance": uses_custom_advance,
        },
    }
