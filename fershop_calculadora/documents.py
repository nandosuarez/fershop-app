from __future__ import annotations

from datetime import datetime
from pathlib import Path
from textwrap import wrap
from typing import Any


def _format_cop(value: float | None) -> str:
    amount = 0 if value is None else round(value)
    formatted = f"{amount:,}".replace(",", ".")
    return f"${formatted} COP"


def _format_date(value: str) -> str:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return dt.astimezone().strftime("%d/%m/%Y %I:%M %p")


def _resolve_company_brand(company: dict[str, Any] | None = None) -> str:
    if company is None:
        return "FerShop USA"

    brand_name = str(company.get("brand_name") or "").strip()
    if brand_name:
        return brand_name

    name = str(company.get("name") or "").strip()
    if name:
        return name
    return "FerShop USA"


def get_client_quote_lines(record: dict[str, Any]) -> list[str]:
    input_data = record.get("input", {})
    result = record.get("result", {})
    raw_lines = str(input_data.get("client_quote_items_text", "")).strip()

    if raw_lines:
        return [line.strip() for line in raw_lines.splitlines() if line.strip()]

    result_line_items = result.get("line_items", [])
    if isinstance(result_line_items, list) and result_line_items:
        lines: list[str] = []
        for item in result_line_items:
            if not isinstance(item, dict):
                continue
            product_name = str(item.get("product_name") or "Producto").strip()
            quantity = int(item.get("quantity") or 1)
            sale_price = float(item.get("sale_price_cop") or 0)
            quantity_prefix = f"{quantity} x " if quantity > 1 else ""
            lines.append(f"{quantity_prefix}{product_name}: {_format_cop(sale_price)}")
        if lines:
            return lines

    raw_line_items = input_data.get("line_items", [])
    if isinstance(raw_line_items, list) and raw_line_items:
        lines = []
        final_sale = float(result.get("final", {}).get("sale_price_cop") or 0)
        total_basis = 0.0
        normalized_items: list[dict[str, Any]] = []
        for item in raw_line_items:
            if not isinstance(item, dict):
                continue
            quantity = int(item.get("quantity") or 1)
            unit_price = float(item.get("unit_price_usd_net") or 0)
            unit_tax = float(item.get("unit_tax_usa_percent") or 0)
            unit_shipping = float(item.get("unit_locker_shipping_usd") or 0)
            line_basis = (unit_price * quantity * (1 + (unit_tax / 100))) + (unit_shipping * quantity)
            normalized_items.append(
                {
                    "product_name": str(item.get("product_name") or "Producto").strip(),
                    "quantity": quantity,
                    "line_basis": line_basis,
                }
            )
            total_basis += line_basis

        for item in normalized_items:
            share_ratio = (item["line_basis"] / total_basis) if total_basis else 0
            line_sale = final_sale * share_ratio
            quantity_prefix = f"{item['quantity']} x " if item["quantity"] > 1 else ""
            lines.append(f"{quantity_prefix}{item['product_name']}: {_format_cop(line_sale)}")

        if lines:
            return lines

    product_name = input_data.get("product_name") or "Producto"
    final_price = result.get("final", {}).get("sale_price_cop")
    return [f"{product_name}: {_format_cop(final_price)}"]


def build_quote_message_legacy(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> str:
    client_name = (record.get("client_name") or "").strip()
    brand_name = _resolve_company_brand(company)
    intro = (
        f"Hola {client_name}, esta es tu cotización con FerShop USA."
        if client_name
        else "Hola, esta es tu cotización con FerShop USA."
    )
    lines = get_client_quote_lines(record)
    final_data = record.get("result", {}).get("final", {})
    notes = (record.get("notes") or "").strip()

    parts = [intro, "", "Productos y precios:"]
    parts.extend(f"- {line}" for line in lines)
    parts.extend(
        [
            "",
            f"Valor total: {_format_cop(final_data.get('sale_price_cop'))}",
            f"Anticipo para realizar la compra: {_format_cop(final_data.get('advance_cop'))}",
        ]
    )
    if notes:
        parts.extend(["", f"Detalles: {notes}"])
    parts.extend(["", "Si te parece bien, con el anticipo dejamos tu compra en proceso."])
    return "\n".join(parts)


def _pdf_escape_text(text: str) -> bytes:
    encoded = text.encode("cp1252", errors="replace")
    encoded = encoded.replace(b"\\", b"\\\\")
    encoded = encoded.replace(b"(", b"\\(")
    encoded = encoded.replace(b")", b"\\)")
    return b"(" + encoded + b")"


def _pdf_line_commands(
    lines: list[str], *, x: int, y: int, font: str, size: int, leading: int
) -> list[bytes]:
    commands = [b"BT", f"/{font} {size} Tf".encode("ascii"), f"{x} {y} Td".encode("ascii")]
    first = True
    for line in lines:
        if not first:
            commands.append(f"0 -{leading} Td".encode("ascii"))
        commands.append(_pdf_escape_text(line) + b" Tj")
        first = False
    commands.append(b"ET")
    return commands


def generate_quote_pdf_legacy(record: dict[str, Any]) -> bytes:
    client_name = (record.get("client_name") or "Cliente").strip()
    created_at = _format_date(record.get("created_at", ""))
    final_data = record.get("result", {}).get("final", {})
    sale_price = _format_cop(final_data.get("sale_price_cop"))
    advance = _format_cop(final_data.get("advance_cop"))
    lines = get_client_quote_lines(record)
    notes = (record.get("notes") or "").strip()

    body_lines = [
        f"Cliente: {client_name}",
        f"Fecha: {created_at}",
        "",
        "Productos y precios:",
    ]
    body_lines.extend(f"- {line}" for line in lines)
    body_lines.extend(
        [
            "",
            f"Valor total de la cotización: {sale_price}",
            f"Anticipo para realizar la compra: {advance}",
        ]
    )
    if notes:
        body_lines.extend(["", "Detalles:"])
        body_lines.extend(wrap(notes, width=62))
    body_lines.extend(["", "FerShop USA"])

    content_commands = [
        b"0.07 0.06 0.07 rg",
        b"40 760 515 46 re f",
        b"1 1 1 rg",
        *_pdf_line_commands(["FerShop USA", "Cotización comercial"], x=56, y=788, font="F2", size=20, leading=18),
        b"0 0 0 rg",
        b"0.83 0.78 0.72 rg",
        b"40 744 515 3 re f",
        b"0 0 0 rg",
        *_pdf_line_commands(body_lines, x=56, y=712, font="F1", size=12, leading=18),
    ]

    content_stream = b"\n".join(content_commands)

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> "
            b"/Contents 6 0 R >>"
        ),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Length " + str(len(content_stream)).encode("ascii") + b" >>\nstream\n" + content_stream + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(pdf)


def build_quote_message(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> str:
    client_name = (record.get("client_name") or "").strip()
    brand_name = _resolve_company_brand(company)
    intro = (
        f"Hola {client_name}, esta es tu cotizacion con {brand_name}."
        if client_name
        else f"Hola, esta es tu cotizacion con {brand_name}."
    )
    lines = get_client_quote_lines(record)
    final_data = record.get("result", {}).get("final", {})
    notes = (record.get("notes") or "").strip()

    parts = [intro, "", "Productos y precios:"]
    parts.extend(f"- {line}" for line in lines)
    parts.extend(
        [
            "",
            f"Valor total: {_format_cop(final_data.get('sale_price_cop'))}",
            f"Anticipo para realizar la compra: {_format_cop(final_data.get('advance_cop'))}",
        ]
    )
    if notes:
        parts.extend(["", f"Detalles: {notes}"])
    parts.extend(
        [
            "",
            "Si te parece bien, con el anticipo dejamos tu compra en proceso.",
        ]
    )
    return "\n".join(parts)


def generate_quote_pdf(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> bytes:
    client_name = (record.get("client_name") or "Cliente").strip()
    created_at = _format_date(record.get("created_at", ""))
    final_data = record.get("result", {}).get("final", {})
    sale_price_amount = _to_float(final_data.get("sale_price_cop"))
    advance_amount = _to_float(final_data.get("advance_cop"))
    balance_due_amount = max(sale_price_amount - advance_amount, 0.0)
    sale_price = _format_cop(sale_price_amount)
    advance = _format_cop(advance_amount)
    balance_due = _format_cop(balance_due_amount)
    lines = get_client_quote_lines(record)
    notes = (record.get("notes") or "").strip()
    brand_name = _resolve_company_brand(company)

    body_lines = [
        f"Cliente: {client_name}",
        f"Fecha: {created_at}",
        "",
        "Productos y precios:",
    ]
    body_lines.extend(f"- {line}" for line in lines)
    body_lines.extend(
        [
            "",
            f"Valor total de la cotizacion: {sale_price}",
            f"Anticipo para realizar la compra: {advance}",
        ]
    )
    if notes:
        body_lines.extend(["", "Detalles:"])
        body_lines.extend(wrap(notes, width=62))
    body_lines.extend(["", brand_name])

    content_commands = [
        b"0.07 0.06 0.07 rg",
        b"40 760 515 46 re f",
        b"1 1 1 rg",
        *_pdf_line_commands(
            [brand_name, "Cotizacion comercial"],
            x=56,
            y=788,
            font="F2",
            size=20,
            leading=18,
        ),
        b"0 0 0 rg",
        b"0.83 0.78 0.72 rg",
        b"40 744 515 3 re f",
        b"0 0 0 rg",
        *_pdf_line_commands(body_lines, x=56, y=712, font="F1", size=12, leading=18),
    ]

    content_stream = b"\n".join(content_commands)

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> "
            b"/Contents 6 0 R >>"
        ),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" >>\nstream\n"
        + content_stream
        + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(pdf)


_DOCUMENTS_ROOT_DIR = Path(__file__).resolve().parent.parent
_DOCUMENTS_WEB_DIR = _DOCUMENTS_ROOT_DIR / "web"
_DOCUMENTS_WEB_ROOT = _DOCUMENTS_WEB_DIR.resolve()
_BROKEN_QUOTE_TOKENS = ("undefined", "undefine")


def _resolve_company_tagline(company: dict[str, Any] | None = None) -> str:
    if company is None:
        return "Compras internacionales con seguimiento claro"
    tagline = str(company.get("tagline") or "").strip()
    if tagline:
        return tagline
    return "Compras internacionales con seguimiento claro"


def _resolve_record_notes(record: dict[str, Any]) -> str:
    notes = str(record.get("notes") or "").strip()
    if notes:
        return notes
    input_data = record.get("input", {})
    if isinstance(input_data, dict):
        return str(input_data.get("notes") or "").strip()
    return ""


def _has_broken_quote_text(value: str) -> bool:
    lowered = str(value or "").casefold()
    return any(token in lowered for token in _BROKEN_QUOTE_TOKENS)


def _format_product_display_name(product_name: str, reference: str = "") -> str:
    clean_name = str(product_name or "").strip() or "Producto"
    clean_reference = str(reference or "").strip()
    if clean_reference:
        return f"{clean_name} ({clean_reference})"
    return clean_name


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _extract_line_from_item(item: dict[str, Any]) -> str | None:
    if not isinstance(item, dict):
        return None

    item_input = item.get("input") if isinstance(item.get("input"), dict) else {}
    item_result = item.get("result") if isinstance(item.get("result"), dict) else {}
    item_final = item_result.get("final") if isinstance(item_result.get("final"), dict) else {}
    line_item = item.get("line_item") if isinstance(item.get("line_item"), dict) else {}

    product_name = (
        str(item.get("product_name") or "").strip()
        or str(item_input.get("product_name") or "").strip()
        or str(line_item.get("product_name") or "").strip()
        or str(item.get("name") or "").strip()
        or "Producto"
    )
    reference = (
        str(item.get("reference") or "").strip()
        or str(item_input.get("reference") or "").strip()
        or str(line_item.get("reference") or "").strip()
    )
    quantity = max(
        1,
        _to_int(
            item.get("quantity")
            or item_input.get("quantity")
            or line_item.get("quantity")
            or 1,
            1,
        ),
    )
    sale_price_cop = _to_float(
        item.get("sale_price_cop")
        or line_item.get("sale_price_cop")
        or item_final.get("sale_price_cop")
        or 0
    )
    quantity_prefix = f"{quantity} x " if quantity > 1 else ""
    return f"{quantity_prefix}{_format_product_display_name(product_name, reference)}: {_format_cop(sale_price_cop)}"


def _build_lines_from_item_collection(items: Any) -> list[str]:
    if not isinstance(items, list):
        return []

    lines: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        line = _extract_line_from_item(item)
        if line:
            lines.append(line)
    return lines


def _build_lines_from_raw_line_items(
    input_data: dict[str, Any],
    result: dict[str, Any],
) -> list[str]:
    raw_line_items = input_data.get("line_items", [])
    if not isinstance(raw_line_items, list) or not raw_line_items:
        return []

    lines: list[str] = []
    final_sale = _to_float(result.get("final", {}).get("sale_price_cop"))
    total_basis = 0.0
    normalized_items: list[dict[str, Any]] = []

    for item in raw_line_items:
        if not isinstance(item, dict):
            continue
        quantity = max(1, _to_int(item.get("quantity"), 1))
        unit_price = _to_float(item.get("unit_price_usd_net"))
        unit_tax = _to_float(item.get("unit_tax_usa_percent"))
        unit_shipping = _to_float(item.get("unit_locker_shipping_usd"))
        line_basis = (unit_price * quantity * (1 + (unit_tax / 100))) + (unit_shipping * quantity)
        normalized_items.append(
            {
                "product_name": str(item.get("product_name") or "Producto").strip(),
                "reference": str(item.get("reference") or "").strip(),
                "quantity": quantity,
                "line_basis": line_basis,
            }
        )
        total_basis += line_basis

    for item in normalized_items:
        share_ratio = (item["line_basis"] / total_basis) if total_basis else 0.0
        line_sale = final_sale * share_ratio
        quantity_prefix = f"{item['quantity']} x " if item["quantity"] > 1 else ""
        display_name = _format_product_display_name(item["product_name"], item["reference"])
        lines.append(f"{quantity_prefix}{display_name}: {_format_cop(line_sale)}")

    return lines


def _wrap_prefixed_line(prefix: str, text: str, width: int) -> list[str]:
    clean_text = str(text or "").strip()
    if not clean_text:
        return []

    wrapped = wrap(clean_text, width=width) or [clean_text]
    if len(wrapped) == 1:
        return [f"{prefix}{wrapped[0]}"]

    indent = " " * len(prefix)
    return [f"{prefix}{wrapped[0]}"] + [f"{indent}{segment}" for segment in wrapped[1:]]


def _resolve_company_logo(company: dict[str, Any] | None = None) -> Path | None:
    if company is None:
        return None

    raw_path = str(company.get("logo_path") or "").strip()
    if not raw_path:
        return None

    if raw_path.startswith("/static/"):
        candidate = (_DOCUMENTS_WEB_DIR / raw_path.removeprefix("/static/")).resolve()
        try:
            candidate.relative_to(_DOCUMENTS_WEB_ROOT)
        except ValueError:
            return None
    else:
        candidate = Path(raw_path).expanduser()
        if not candidate.is_absolute():
            candidate = (_DOCUMENTS_ROOT_DIR / candidate).resolve()

    if candidate.exists() and candidate.is_file() and candidate.suffix.lower() in {".jpg", ".jpeg"}:
        return candidate
    return None


def _read_jpeg_size(image_bytes: bytes) -> tuple[int, int] | None:
    if len(image_bytes) < 4 or not image_bytes.startswith(b"\xff\xd8"):
        return None

    sof_markers = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    standalone_markers = {0x01, *range(0xD0, 0xDA)}

    offset = 2
    while offset + 3 < len(image_bytes):
        if image_bytes[offset] != 0xFF:
            offset += 1
            continue

        while offset < len(image_bytes) and image_bytes[offset] == 0xFF:
            offset += 1
        if offset >= len(image_bytes):
            break

        marker = image_bytes[offset]
        offset += 1

        if marker in standalone_markers:
            continue

        if offset + 1 >= len(image_bytes):
            break

        segment_length = int.from_bytes(image_bytes[offset : offset + 2], "big")
        if segment_length < 2 or offset + segment_length > len(image_bytes):
            break

        if marker in sof_markers:
            if offset + 7 >= len(image_bytes):
                break
            height = int.from_bytes(image_bytes[offset + 3 : offset + 5], "big")
            width = int.from_bytes(image_bytes[offset + 5 : offset + 7], "big")
            if width > 0 and height > 0:
                return width, height
            break

        offset += segment_length

    return None


def _pdf_image_commands(name: str, *, x: int, y: int, width: int, height: int) -> list[bytes]:
    return [
        b"q",
        f"{width} 0 0 {height} {x} {y} cm".encode("ascii"),
        f"/{name} Do".encode("ascii"),
        b"Q",
    ]


def get_client_quote_lines(record: dict[str, Any]) -> list[str]:
    input_data = record.get("input", {})
    result = record.get("result", {})
    raw_lines = str(input_data.get("client_quote_items_text", "")).strip()

    if raw_lines and not _has_broken_quote_text(raw_lines):
        return [line.strip() for line in raw_lines.splitlines() if line.strip()]

    for candidate_items in (
        result.get("line_items", []),
        result.get("quote_items", []),
        input_data.get("quote_items", []),
    ):
        lines = _build_lines_from_item_collection(candidate_items)
        if lines:
            return lines

    lines = _build_lines_from_raw_line_items(input_data, result)
    if lines:
        return lines

    product_name = _format_product_display_name(
        input_data.get("product_name") or record.get("product_name") or "Producto",
        input_data.get("reference") or "",
    )
    final_price = result.get("final", {}).get("sale_price_cop")
    return [f"{product_name}: {_format_cop(final_price)}"]


def build_quote_message(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> str:
    client_name = (record.get("client_name") or "").strip()
    brand_name = _resolve_company_brand(company)
    lines = get_client_quote_lines(record)
    final_data = record.get("result", {}).get("final", {})
    notes = _resolve_record_notes(record)

    intro = (
        f"Hola {client_name}, te comparto tu cotizacion formal con {brand_name}."
        if client_name
        else f"Hola, te comparto tu cotizacion formal con {brand_name}."
    )

    parts = [intro, "", "Productos y precios:"]
    parts.extend(f"- {line}" for line in lines)
    parts.extend(
        [
            "",
            f"Valor total: {_format_cop(final_data.get('sale_price_cop'))}",
            f"Anticipo para realizar la compra: {_format_cop(final_data.get('advance_cop'))}",
        ]
    )
    if notes:
        parts.extend(["", f"Detalles: {notes}"])
    parts.extend(["", "Quedo atento para confirmar tu compra y dejarla en proceso."])
    return "\n".join(parts)


def build_quote_message_legacy(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> str:
    return build_quote_message(record, company=company)


def generate_quote_pdf(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> bytes:
    client_name = (record.get("client_name") or "Cliente").strip()
    created_at = _format_date(record.get("created_at", ""))
    final_data = record.get("result", {}).get("final", {})
    sale_price_amount = _to_float(final_data.get("sale_price_cop"))
    advance_amount = _to_float(final_data.get("advance_cop"))
    balance_due_amount = max(sale_price_amount - advance_amount, 0.0)
    sale_price = _format_cop(sale_price_amount)
    advance = _format_cop(advance_amount)
    balance_due = _format_cop(balance_due_amount)
    brand_name = _resolve_company_brand(company)
    tagline = _resolve_company_tagline(company)
    notes = _resolve_record_notes(record)
    quote_number = record.get("id")

    detail_lines: list[str] = []
    detail_lines.extend(_wrap_prefixed_line("Cliente: ", client_name, width=58))
    detail_lines.extend(_wrap_prefixed_line("Fecha: ", created_at, width=60))
    if quote_number not in (None, ""):
        detail_lines.extend(_wrap_prefixed_line("Cotizacion: ", f"#{quote_number}", width=60))
    detail_lines.extend(_wrap_prefixed_line("Empresa: ", brand_name, width=60))

    product_lines: list[str] = []
    for line in get_client_quote_lines(record):
        product_lines.extend(_wrap_prefixed_line("- ", line, width=68))

    notes_lines: list[str] = []
    if notes:
        notes_lines.extend(_wrap_prefixed_line("Detalles: ", notes, width=68))

    body_y = 676
    detail_leading = 18
    section_gap = 26
    product_heading_y = body_y - (len(detail_lines) * detail_leading) - section_gap
    product_text_y = product_heading_y - 24
    notes_heading_y = product_text_y - (len(product_lines) * 18) - section_gap
    notes_text_y = notes_heading_y - 22
    summary_box_y = max(124, notes_text_y - (len(notes_lines) * 16) - 62)

    logo_path = _resolve_company_logo(company)
    logo_bytes = logo_path.read_bytes() if logo_path is not None else b""
    logo_size = _read_jpeg_size(logo_bytes) if logo_bytes else None

    logo_display_width = 120
    logo_display_height = 0
    if logo_size is not None:
        raw_width, raw_height = logo_size
        if raw_width > 0 and raw_height > 0:
            scale_ratio = min(120 / raw_width, 54 / raw_height)
            logo_display_width = max(72, round(raw_width * scale_ratio))
            logo_display_height = max(24, round(raw_height * scale_ratio))

    content_commands: list[bytes] = [
        b"0.07 0.06 0.07 rg",
        b"36 720 523 96 re f",
        b"0.83 0.78 0.72 rg",
        b"36 716 523 4 re f",
    ]

    if logo_bytes and logo_size and logo_display_height:
        content_commands.extend(
            [
                b"1 1 1 rg",
                b"52 742 146 54 re f",
                *_pdf_image_commands(
                    "Im1",
                    x=65,
                    y=742 + max(0, round((54 - logo_display_height) / 2)),
                    width=logo_display_width,
                    height=logo_display_height,
                ),
            ]
        )

    content_commands.extend(
        [
            b"1 1 1 rg",
            *_pdf_line_commands([brand_name], x=220, y=790, font="F2", size=22, leading=20),
            *_pdf_line_commands(wrap(tagline, width=42)[:2], x=220, y=768, font="F1", size=10, leading=14),
            *_pdf_line_commands(["Cotizacion comercial"], x=430, y=790, font="F2", size=14, leading=16),
            *_pdf_line_commands(["Documento formal para compartir con tu cliente"], x=310, y=770, font="F1", size=9, leading=12),
            b"0.12 0.12 0.12 rg",
            *_pdf_line_commands(detail_lines, x=56, y=body_y, font="F1", size=12, leading=detail_leading),
            *_pdf_line_commands(["Productos cotizados"], x=56, y=product_heading_y, font="F2", size=14, leading=16),
            *_pdf_line_commands(product_lines, x=56, y=product_text_y, font="F1", size=12, leading=18),
        ]
    )

    if notes_lines:
        content_commands.extend(
            [
                *_pdf_line_commands(["Observaciones"], x=56, y=notes_heading_y, font="F2", size=14, leading=16),
                *_pdf_line_commands(notes_lines, x=56, y=notes_text_y, font="F1", size=11, leading=16),
            ]
        )

    content_commands.extend(
        [
            b"0.97 0.95 0.92 rg",
            f"40 {summary_box_y} 515 82 re f".encode("ascii"),
            b"0.83 0.78 0.72 RG",
            f"40 {summary_box_y} 515 82 re S".encode("ascii"),
            b"0.12 0.12 0.12 rg",
            *_pdf_line_commands(["Resumen economico"], x=56, y=summary_box_y + 58, font="F2", size=14, leading=16),
            *_pdf_line_commands([f"Valor total: {sale_price}"], x=56, y=summary_box_y + 34, font="F1", size=12, leading=16),
            *_pdf_line_commands(
                [f"Anticipo para realizar la compra: {advance}"],
                x=300,
                y=summary_box_y + 34,
                font="F2",
                size=12,
                leading=16,
            ),
            b"0.75 0.75 0.75 RG",
            b"40 96 515 1 re S",
            *_pdf_line_commands(
                [f"{brand_name} - documento generado automaticamente"],
                x=56,
                y=78,
                font="F1",
                size=9,
                leading=12,
            ),
        ]
    )

    content_stream = b"\n".join(content_commands)

    page_resources = b"<< /ProcSet [/PDF /Text"
    image_object: bytes | None = None
    if logo_bytes and logo_size and logo_display_height:
        page_resources += b" /ImageC"
        raw_width, raw_height = logo_size
        image_object = (
            b"<< /Type /XObject /Subtype /Image /Width "
            + str(raw_width).encode("ascii")
            + b" /Height "
            + str(raw_height).encode("ascii")
            + b" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "
            + str(len(logo_bytes)).encode("ascii")
            + b" >>\nstream\n"
            + logo_bytes
            + b"\nendstream"
        )
    page_resources += b"] /Font << /F1 4 0 R /F2 5 0 R >>"
    if image_object is not None:
        page_resources += b" /XObject << /Im1 6 0 R >>"
    page_resources += b" >>"

    content_object_id = 7 if image_object is not None else 6
    page_object = (
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources "
        + page_resources
        + b" /Contents "
        + str(content_object_id).encode("ascii")
        + b" 0 R >>"
    )

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        page_object,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    if image_object is not None:
        objects.append(image_object)
    objects.append(
        b"<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" >>\nstream\n"
        + content_stream
        + b"\nendstream"
    )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(pdf)


def generate_quote_pdf_legacy(record: dict[str, Any]) -> bytes:
    return generate_quote_pdf(record)


def _client_statement_period_copy(detail: dict[str, Any]) -> str:
    period = detail.get("period") or {}
    period_key = str(period.get("key") or "").strip().lower()
    if not period_key:
        return ""

    period_label = {
        "daily": "Dia",
        "weekly": "Semana",
        "biweekly": "Quincena",
        "monthly": "Mes",
        "quarterly": "Trimestre",
    }.get(period_key, "Periodo")
    start_date = str(period.get("start_date") or "").strip()
    end_date = str(period.get("end_date") or "").strip()
    if start_date and end_date and start_date != end_date:
        return f"{period_label}: {_format_date(start_date)} a {_format_date(end_date)}"
    if end_date:
        return f"{period_label}: {_format_date(end_date)}"
    if start_date:
        return f"{period_label}: {_format_date(start_date)}"
    return period_label


def _client_statement_active_order_lines(detail: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for order in detail.get("active_orders", []) or []:
        order_id = order.get("id")
        order_number = f"Compra #{order_id}" if order_id not in (None, "") else "Compra"
        product_name = str(order.get("product_name") or "Producto sin nombre").strip()
        status_label = str(order.get("status_label") or "Sin estado").strip()
        sale_price = _format_cop(float(order.get("sale_price_cop") or 0))
        balance_due = _format_cop(float(order.get("balance_due_cop") or 0))
        lines.append(
            f"{order_number} - {product_name} - Estado: {status_label} - Total: {sale_price} - Pendiente: {balance_due}"
        )
    return lines


def build_client_statement_message(
    detail: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> str:
    client = detail.get("client") or {}
    summary = detail.get("summary") or {}
    client_name = str(client.get("name") or "").strip()
    brand_name = _resolve_company_brand(company)
    period_copy = _client_statement_period_copy(detail)
    active_order_lines = _client_statement_active_order_lines(detail)
    receivable_total = _format_cop(float(summary.get("accounts_receivable_cop") or 0))

    intro = (
        f"Hola {client_name}, te comparto el estado de tus compras activas con {brand_name}."
        if client_name
        else f"Hola, te comparto el estado de tus compras activas con {brand_name}."
    )

    parts = [intro]
    if period_copy:
        parts.extend(["", period_copy])

    if active_order_lines:
        parts.extend(["", "Compras activas:"])
        parts.extend(f"- {line}" for line in active_order_lines)
    else:
        parts.extend(["", "En este momento no tienes compras activas registradas."])

    parts.extend(["", f"Saldo pendiente total: {receivable_total}"])
    parts.extend(
        [
            "",
            "Si quieres revisar una compra o reportar un pago, me avisas y te actualizo el seguimiento.",
        ]
    )
    return "\n".join(parts)


def generate_client_statement_pdf(
    detail: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> bytes:
    client = detail.get("client") or {}
    summary = detail.get("summary") or {}
    client_name = str(client.get("name") or "Cliente").strip() or "Cliente"
    brand_name = _resolve_company_brand(company)
    tagline = _resolve_company_tagline(company)
    generated_at = _format_date(datetime.now().isoformat())
    period_copy = _client_statement_period_copy(detail)
    active_order_lines = _client_statement_active_order_lines(detail)
    receivable_total = _format_cop(float(summary.get("accounts_receivable_cop") or 0))
    sales_total = _format_cop(float(summary.get("sales_total_cop") or 0))
    cash_in_total = _format_cop(float(summary.get("cash_in_total_cop") or 0))

    detail_lines: list[str] = []
    detail_lines.extend(_wrap_prefixed_line("Cliente: ", client_name, width=58))
    if client.get("identification"):
        detail_lines.extend(
            _wrap_prefixed_line("Identificacion: ", str(client.get("identification")), width=56)
        )
    detail_lines.extend(_wrap_prefixed_line("Fecha: ", generated_at, width=60))
    detail_lines.extend(_wrap_prefixed_line("Empresa: ", brand_name, width=60))
    if period_copy:
        detail_lines.extend(_wrap_prefixed_line("Lectura: ", period_copy, width=60))

    account_lines: list[str] = []
    if active_order_lines:
        for line in active_order_lines:
            account_lines.extend(_wrap_prefixed_line("- ", line, width=68))
    else:
        account_lines.extend(
            _wrap_prefixed_line("- ", "No hay compras activas registradas para este cliente.", width=68)
        )

    summary_lines: list[str] = []
    summary_lines.extend(_wrap_prefixed_line("- ", f"Total vendido activo: {sales_total}", width=68))
    summary_lines.extend(_wrap_prefixed_line("- ", f"Total recaudado: {cash_in_total}", width=68))
    summary_lines.extend(_wrap_prefixed_line("- ", f"Saldo pendiente total: {receivable_total}", width=68))

    logo_path = _resolve_company_logo(company)
    logo_bytes = logo_path.read_bytes() if logo_path is not None else b""
    logo_size = _read_jpeg_size(logo_bytes) if logo_bytes else None

    page_streams: list[bytes] = []
    min_body_y = 150
    current_commands, cursor_y = _pdf_formal_first_page_commands(
        brand_name=brand_name,
        tagline=tagline,
        logo_size=logo_size,
    )

    def finalize_page() -> None:
        nonlocal current_commands
        current_commands.extend(_pdf_formal_footer_commands(brand_name))
        page_streams.append(b"\n".join(current_commands))

    def new_page() -> None:
        nonlocal current_commands, cursor_y
        finalize_page()
        current_commands, cursor_y = _pdf_formal_followup_page_commands(brand_name)

    def ensure_space(height: int) -> None:
        nonlocal cursor_y
        if cursor_y - height < min_body_y:
            new_page()

    def add_text_line(
        line: str,
        *,
        font: str = "F1",
        size: int = 12,
        leading: int = 18,
        x: int = 56,
    ) -> None:
        nonlocal cursor_y
        ensure_space(leading)
        current_commands.append(b"0.12 0.12 0.12 rg")
        current_commands.extend(_pdf_line_commands([line], x=x, y=cursor_y, font=font, size=size, leading=leading))
        cursor_y -= leading

    def add_section(title: str, lines: list[str], *, heading_font: str = "F2") -> None:
        nonlocal cursor_y
        if not lines:
            return

        line_index = 0
        first_chunk = True
        while line_index < len(lines):
            heading_text = title if first_chunk else f"{title} (continua)"
            ensure_space(42)
            add_text_line(heading_text, font=heading_font, size=14, leading=18)
            cursor_y -= 6
            while line_index < len(lines):
                if cursor_y - 18 < min_body_y:
                    new_page()
                    first_chunk = False
                    break
                add_text_line(lines[line_index], font="F1", size=12, leading=18)
                line_index += 1
            else:
                cursor_y -= 10
                return

    add_section("Estado de compras activas", detail_lines)
    add_section("Cuentas activas del cliente", account_lines)
    add_section("Resumen de cuenta", summary_lines)

    finalize_page()

    catalog_id = 1
    pages_root_id = 2
    font_regular_id = 3
    font_bold_id = 4
    image_id = 5 if logo_bytes and logo_size else None
    next_object_id = 6 if image_id is not None else 5

    page_ids: list[int] = []
    content_ids: list[int] = []
    for _ in page_streams:
        page_ids.append(next_object_id)
        next_object_id += 1
        content_ids.append(next_object_id)
        next_object_id += 1

    max_object_id = next_object_id - 1
    objects: dict[int, bytes] = {
        catalog_id: b"<< /Type /Catalog /Pages 2 0 R >>",
        pages_root_id: b"<< /Type /Pages /Kids ["
        + b" ".join(f"{page_id} 0 R".encode("ascii") for page_id in page_ids)
        + b"] /Count "
        + str(len(page_ids)).encode("ascii")
        + b" >>",
        font_regular_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        font_bold_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    }

    if image_id is not None and logo_size is not None:
        raw_width, raw_height = logo_size
        objects[image_id] = (
            b"<< /Type /XObject /Subtype /Image /Width "
            + str(raw_width).encode("ascii")
            + b" /Height "
            + str(raw_height).encode("ascii")
            + b" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "
            + str(len(logo_bytes)).encode("ascii")
            + b" >>\nstream\n"
            + logo_bytes
            + b"\nendstream"
        )

    for index, content_stream in enumerate(page_streams):
        page_id = page_ids[index]
        content_id = content_ids[index]
        resources = _pdf_formal_page_resources(
            font_regular_id=font_regular_id,
            font_bold_id=font_bold_id,
            image_id=image_id,
        )
        objects[page_id] = (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources "
            + resources
            + b" /Contents "
            + str(content_id).encode("ascii")
            + b" 0 R >>"
        )
        objects[content_id] = (
            b"<< /Length "
            + str(len(content_stream)).encode("ascii")
            + b" >>\nstream\n"
            + content_stream
            + b"\nendstream"
        )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for object_id in range(1, max_object_id + 1):
        obj = objects[object_id]
        offsets.append(len(pdf))
        pdf.extend(f"{object_id} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {max_object_id + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {max_object_id + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(pdf)


def _pdf_formal_page_resources(
    *,
    font_regular_id: int,
    font_bold_id: int,
    image_id: int | None = None,
) -> bytes:
    resources = b"<< /ProcSet [/PDF /Text"
    if image_id is not None:
        resources += b" /ImageC"
    resources += (
        b"] /Font << /F1 "
        + str(font_regular_id).encode("ascii")
        + b" 0 R /F2 "
        + str(font_bold_id).encode("ascii")
        + b" 0 R >>"
    )
    if image_id is not None:
        resources += b" /XObject << /Im1 " + str(image_id).encode("ascii") + b" 0 R >>"
    resources += b" >>"
    return resources


def _pdf_formal_footer_commands(brand_name: str) -> list[bytes]:
    return [
        b"0.75 0.75 0.75 RG",
        b"40 96 515 1 re S",
        b"0.12 0.12 0.12 rg",
        *_pdf_line_commands(
            [f"{brand_name} - documento generado automaticamente"],
            x=56,
            y=78,
            font="F1",
            size=9,
            leading=12,
        ),
    ]


def _pdf_formal_first_page_commands(
    *,
    brand_name: str,
    tagline: str,
    logo_size: tuple[int, int] | None,
) -> tuple[list[bytes], int]:
    commands: list[bytes] = [
        b"0.07 0.06 0.07 rg",
        b"36 720 523 96 re f",
        b"0.83 0.78 0.72 rg",
        b"36 716 523 4 re f",
    ]

    brand_x = 56
    if logo_size is not None:
        raw_width, raw_height = logo_size
        scale_ratio = min(120 / raw_width, 54 / raw_height)
        logo_display_width = max(72, round(raw_width * scale_ratio))
        logo_display_height = max(24, round(raw_height * scale_ratio))
        commands.extend(
            [
                b"1 1 1 rg",
                b"52 742 146 54 re f",
                *_pdf_image_commands(
                    "Im1",
                    x=65,
                    y=742 + max(0, round((54 - logo_display_height) / 2)),
                    width=logo_display_width,
                    height=logo_display_height,
                ),
            ]
        )
        brand_x = 220

    commands.extend(
        [
            b"1 1 1 rg",
            *_pdf_line_commands([brand_name], x=brand_x, y=778, font="F2", size=24, leading=20),
        ]
    )
    return commands, 700


def _pdf_formal_followup_page_commands(brand_name: str) -> tuple[list[bytes], int]:
    commands = [
        b"0.07 0.06 0.07 rg",
        b"36 780 523 18 re f",
        b"0.12 0.12 0.12 rg",
        *_pdf_line_commands([brand_name], x=56, y=760, font="F2", size=16, leading=18),
        *_pdf_line_commands(["Continuacion de cotizacion"], x=56, y=740, font="F1", size=10, leading=12),
    ]
    return commands, 706


def generate_quote_pdf(
    record: dict[str, Any],
    company: dict[str, Any] | None = None,
) -> bytes:
    client_name = (record.get("client_name") or "Cliente").strip()
    created_at = _format_date(record.get("created_at", ""))
    final_data = record.get("result", {}).get("final", {})
    sale_price_amount = _to_float(final_data.get("sale_price_cop"))
    advance_amount = _to_float(final_data.get("advance_cop"))
    balance_due_amount = max(sale_price_amount - advance_amount, 0.0)
    sale_price = _format_cop(sale_price_amount)
    advance = _format_cop(advance_amount)
    balance_due = _format_cop(balance_due_amount)
    brand_name = _resolve_company_brand(company)
    tagline = _resolve_company_tagline(company)
    notes = _resolve_record_notes(record)
    quote_number = record.get("id")

    detail_lines: list[str] = []
    detail_lines.extend(_wrap_prefixed_line("Cliente: ", client_name, width=58))
    detail_lines.extend(_wrap_prefixed_line("Fecha: ", created_at, width=60))
    if quote_number not in (None, ""):
        detail_lines.extend(_wrap_prefixed_line("Cotizacion: ", f"#{quote_number}", width=60))
    detail_lines.extend(_wrap_prefixed_line("Empresa: ", brand_name, width=60))

    product_lines: list[str] = []
    for line in get_client_quote_lines(record):
        product_lines.extend(_wrap_prefixed_line("- ", line, width=68))

    notes_lines: list[str] = []
    if notes:
        notes_lines.extend(_wrap_prefixed_line("Detalles: ", notes, width=68))

    terms_lines: list[str] = []
    terms_lines.extend(
        _wrap_prefixed_line(
            "- ",
            f"Anticipo requerido para confirmar la compra: {advance}.",
            width=68,
        )
    )
    terms_lines.extend(
        _wrap_prefixed_line(
            "- ",
            f"Saldo pendiente estimado antes de la entrega: {balance_due}.",
            width=68,
        )
    )
    terms_lines.extend(
        _wrap_prefixed_line(
            "- ",
            "La disponibilidad final del producto se confirma al aprobar la compra.",
            width=68,
        )
    )
    terms_lines.extend(
        _wrap_prefixed_line(
            "- ",
            "Los tiempos logisticos pueden variar segun tienda, casillero, viaje o aduana.",
            width=68,
        )
    )

    logo_path = _resolve_company_logo(company)
    logo_bytes = logo_path.read_bytes() if logo_path is not None else b""
    logo_size = _read_jpeg_size(logo_bytes) if logo_bytes else None

    page_streams: list[bytes] = []
    min_body_y = 150
    page_number = 1
    current_commands, cursor_y = _pdf_formal_first_page_commands(
        brand_name=brand_name,
        tagline=tagline,
        logo_size=logo_size,
    )

    def finalize_page() -> None:
        nonlocal current_commands
        current_commands.extend(_pdf_formal_footer_commands(brand_name))
        page_streams.append(b"\n".join(current_commands))

    def new_page() -> None:
        nonlocal current_commands, cursor_y, page_number
        finalize_page()
        page_number += 1
        current_commands, cursor_y = _pdf_formal_followup_page_commands(brand_name)

    def ensure_space(height: int) -> None:
        nonlocal cursor_y
        if cursor_y - height < min_body_y:
            new_page()

    def add_text_line(
        line: str,
        *,
        font: str = "F1",
        size: int = 12,
        leading: int = 18,
        x: int = 56,
    ) -> None:
        nonlocal cursor_y
        ensure_space(leading)
        current_commands.append(b"0.12 0.12 0.12 rg")
        current_commands.extend(_pdf_line_commands([line], x=x, y=cursor_y, font=font, size=size, leading=leading))
        cursor_y -= leading

    def add_section(title: str, lines: list[str], *, heading_font: str = "F2") -> None:
        nonlocal cursor_y
        if not lines:
            return

        line_index = 0
        first_chunk = True
        while line_index < len(lines):
            heading_text = title if first_chunk else f"{title} (continua)"
            ensure_space(42)
            add_text_line(heading_text, font=heading_font, size=14, leading=18)
            cursor_y -= 6
            while line_index < len(lines):
                if cursor_y - 18 < min_body_y:
                    new_page()
                    first_chunk = False
                    break
                add_text_line(lines[line_index], font="F1", size=12, leading=18)
                line_index += 1
            else:
                cursor_y -= 10
                return

    add_section("Datos de la cotizacion", detail_lines)
    add_section("Productos cotizados", product_lines)
    add_section("Observaciones", notes_lines)
    add_section("Condiciones comerciales", terms_lines)

    summary_height = 104
    ensure_space(summary_height + 20)
    summary_box_y = cursor_y - summary_height
    current_commands.extend(
        [
            b"0.97 0.95 0.92 rg",
            f"40 {summary_box_y} 515 104 re f".encode("ascii"),
            b"0.83 0.78 0.72 RG",
            f"40 {summary_box_y} 515 104 re S".encode("ascii"),
            b"0.12 0.12 0.12 rg",
            *_pdf_line_commands(["Resumen economico"], x=56, y=summary_box_y + 76, font="F2", size=14, leading=16),
            *_pdf_line_commands([f"Valor total de la cotizacion: {sale_price}"], x=56, y=summary_box_y + 52, font="F1", size=12, leading=16),
            *_pdf_line_commands(
                [f"Anticipo para realizar la compra: {advance}"],
                x=56,
                y=summary_box_y + 32,
                font="F2",
                size=12,
                leading=16,
            ),
            *_pdf_line_commands(
                [f"Saldo pendiente estimado: {balance_due}"],
                x=56,
                y=summary_box_y + 14,
                font="F2",
                size=12,
                leading=16,
            ),
        ]
    )
    cursor_y = summary_box_y - 16

    finalize_page()

    catalog_id = 1
    pages_root_id = 2
    font_regular_id = 3
    font_bold_id = 4
    image_id = 5 if logo_bytes and logo_size else None
    next_object_id = 6 if image_id is not None else 5

    page_ids: list[int] = []
    content_ids: list[int] = []
    for _ in page_streams:
        page_ids.append(next_object_id)
        next_object_id += 1
        content_ids.append(next_object_id)
        next_object_id += 1

    max_object_id = next_object_id - 1
    objects: dict[int, bytes] = {
        catalog_id: b"<< /Type /Catalog /Pages 2 0 R >>",
        pages_root_id: b"<< /Type /Pages /Kids ["
        + b" ".join(f"{page_id} 0 R".encode("ascii") for page_id in page_ids)
        + b"] /Count "
        + str(len(page_ids)).encode("ascii")
        + b" >>",
        font_regular_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        font_bold_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    }

    if image_id is not None and logo_size is not None:
        raw_width, raw_height = logo_size
        objects[image_id] = (
            b"<< /Type /XObject /Subtype /Image /Width "
            + str(raw_width).encode("ascii")
            + b" /Height "
            + str(raw_height).encode("ascii")
            + b" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "
            + str(len(logo_bytes)).encode("ascii")
            + b" >>\nstream\n"
            + logo_bytes
            + b"\nendstream"
        )

    for index, content_stream in enumerate(page_streams):
        page_id = page_ids[index]
        content_id = content_ids[index]
        resources = _pdf_formal_page_resources(
            font_regular_id=font_regular_id,
            font_bold_id=font_bold_id,
            image_id=image_id,
        )
        objects[page_id] = (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources "
            + resources
            + b" /Contents "
            + str(content_id).encode("ascii")
            + b" 0 R >>"
        )
        objects[content_id] = (
            b"<< /Length "
            + str(len(content_stream)).encode("ascii")
            + b" >>\nstream\n"
            + content_stream
            + b"\nendstream"
        )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for object_id in range(1, max_object_id + 1):
        obj = objects[object_id]
        offsets.append(len(pdf))
        pdf.extend(f"{object_id} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {max_object_id + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {max_object_id + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(pdf)


def generate_quote_pdf_legacy(record: dict[str, Any]) -> bytes:
    return generate_quote_pdf(record)
