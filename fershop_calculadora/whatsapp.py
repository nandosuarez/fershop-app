from __future__ import annotations

import base64
import json
import re
from typing import Any
from urllib import error, parse, request

from .orders import list_default_order_statuses


TWILIO_MESSAGES_URL_TEMPLATE = "https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
DEFAULT_WHATSAPP_COUNTRY_CODE = "+57"


def build_whatsapp_trigger_catalog(
    statuses: list[dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    active_statuses = statuses or list_default_order_statuses()
    items = [
        {
            "key": f"order_status:{status['key']}",
            "label": f"Estado: {status['label']}",
            "description": str(status.get("description") or "").strip(),
        }
        for status in active_statuses
    ]
    items.append(
        {
            "key": "second_payment_registered",
            "label": "Segundo pago registrado",
            "description": "Confirma por WhatsApp que el saldo fue recibido.",
        }
    )
    return items


def default_whatsapp_templates(
    statuses: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    templates: list[dict[str, Any]] = []
    for trigger in build_whatsapp_trigger_catalog(statuses):
        body_text = build_default_template_body(trigger["key"], trigger["label"])
        templates.append(
            {
                "trigger_key": trigger["key"],
                "label": trigger["label"],
                "body_text": body_text,
                "content_sid": "",
                "content_variables_json": "",
                "is_active": True,
                "auto_send_enabled": trigger["key"]
                in {
                    "order_status:quote_confirmed",
                    "order_status:received_at_locker",
                    "order_status:in_international_transit",
                    "order_status:customs_review",
                    "order_status:received_by_fershop",
                    "order_status:client_notified",
                    "order_status:shipped_to_client",
                    "order_status:delivered_to_client",
                    "second_payment_registered",
                },
            }
        )
    return templates


def build_default_template_body(trigger_key: str, trigger_label: str) -> str:
    if trigger_key == "order_status:quote_confirmed":
        return (
            "Hola {{client_name}}, tu compra con {{company_name}} quedó confirmada.\n"
            "Producto: {{product_name}}\n"
            "Anticipo recibido: {{advance_paid_cop}}\n"
            "Saldo pendiente: {{balance_due_cop}}"
        )
    if trigger_key == "order_status:client_notified":
        return (
            "Hola {{client_name}}, tu pedido {{product_name}} ya está listo para continuar el cierre con {{company_name}}.\n"
            "Saldo pendiente: {{balance_due_cop}}\n"
            "Cuando lo pagues, te confirmamos el siguiente paso."
        )
    if trigger_key == "second_payment_registered":
        return (
            "Hola {{client_name}}, confirmamos el segundo pago de {{second_payment_amount_cop}} para tu pedido {{product_name}}.\n"
            "Gracias por continuar con {{company_name}}."
        )
    if trigger_key == "order_status:shipped_to_client":
        return (
            "Hola {{client_name}}, tu pedido {{product_name}} ya fue enviado al cliente final.\n"
            "Empresa: {{company_name}}"
        )
    if trigger_key == "order_status:delivered_to_client":
        return (
            "Hola {{client_name}}, registramos tu pedido {{product_name}} como recibido.\n"
            "Gracias por comprar con {{company_name}}."
        )
    return (
        "Hola {{client_name}}, te compartimos una actualización de tu pedido con {{company_name}}.\n"
        "Estado actual: {{status_label}}\n"
        "Producto: {{product_name}}"
    )


def normalize_whatsapp_phone(value: Any, default_country_code: str = DEFAULT_WHATSAPP_COUNTRY_CODE) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""

    normalized = raw_value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if normalized.startswith("00"):
        normalized = f"+{normalized[2:]}"
    digits_only = re.sub(r"\D", "", normalized)

    if normalized.startswith("+"):
        if not 8 <= len(digits_only) <= 15:
            raise ValueError("El número de WhatsApp debe estar en formato internacional válido.")
        return f"+{digits_only}"

    clean_country_code = str(default_country_code or DEFAULT_WHATSAPP_COUNTRY_CODE).strip()
    if clean_country_code and not clean_country_code.startswith("+"):
        clean_country_code = f"+{clean_country_code}"
    clean_country_digits = re.sub(r"\D", "", clean_country_code)

    if len(digits_only) == 10 and clean_country_digits:
        return f"+{clean_country_digits}{digits_only}"
    if 8 <= len(digits_only) <= 15:
        return f"+{digits_only}"
    raise ValueError("El número de WhatsApp debe tener un formato válido.")


def mask_whatsapp_phone(value: Any) -> str:
    phone = str(value or "").strip()
    if len(phone) <= 6:
        return phone
    return f"{phone[:4]}***{phone[-3:]}"


def format_whatsapp_channel(phone: str) -> str:
    clean_phone = normalize_whatsapp_phone(phone)
    return f"whatsapp:{clean_phone}"


def format_cop_plain(value: Any) -> str:
    try:
        numeric_value = float(value or 0)
    except (TypeError, ValueError):
        numeric_value = 0.0
    return f"${numeric_value:,.0f} COP".replace(",", ".")


def render_template_text(body_text: str, context: dict[str, Any]) -> str:
    rendered = str(body_text or "")
    for key, value in context.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value if value is not None else ""))
    return rendered.strip()


def render_content_variables(raw_json: str, context: dict[str, Any]) -> str:
    clean_json = str(raw_json or "").strip()
    if not clean_json:
        return ""

    try:
        parsed = json.loads(clean_json)
    except json.JSONDecodeError as exc:
        raise ValueError("Las variables del template de WhatsApp deben estar en JSON válido.") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Las variables del template de WhatsApp deben ser un objeto JSON.")

    rendered = {}
    for key, value in parsed.items():
        if isinstance(value, str):
            rendered[str(key)] = render_template_text(value, context)
        else:
            rendered[str(key)] = value
    return json.dumps(rendered, ensure_ascii=False)


def send_twilio_whatsapp_message(
    *,
    account_sid: str,
    auth_token: str,
    to_phone: str,
    sender_phone: str = "",
    messaging_service_sid: str = "",
    body_text: str = "",
    content_sid: str = "",
    content_variables_json: str = "",
    status_callback_url: str = "",
) -> dict[str, Any]:
    clean_account_sid = str(account_sid or "").strip()
    clean_auth_token = str(auth_token or "").strip()
    clean_sender_phone = str(sender_phone or "").strip()
    clean_messaging_service_sid = str(messaging_service_sid or "").strip()
    clean_content_sid = str(content_sid or "").strip()
    clean_body_text = str(body_text or "").strip()
    clean_status_callback_url = str(status_callback_url or "").strip()

    if not clean_account_sid or not clean_auth_token:
        raise ValueError("Debes configurar Account SID y Auth Token de Twilio.")
    if not clean_messaging_service_sid and not clean_sender_phone:
        raise ValueError("Debes configurar un remitente WhatsApp o un Messaging Service SID.")
    if not clean_content_sid and not clean_body_text:
        raise ValueError("Debes configurar un cuerpo de mensaje o un Content SID.")

    payload: dict[str, str] = {
        "To": format_whatsapp_channel(to_phone),
    }
    if clean_messaging_service_sid:
        payload["MessagingServiceSid"] = clean_messaging_service_sid
    else:
        payload["From"] = format_whatsapp_channel(clean_sender_phone)
    if clean_content_sid:
        payload["ContentSid"] = clean_content_sid
        if content_variables_json:
            payload["ContentVariables"] = content_variables_json
    else:
        payload["Body"] = clean_body_text
    if clean_status_callback_url:
        payload["StatusCallback"] = clean_status_callback_url

    encoded_payload = parse.urlencode(payload).encode("utf-8")
    auth_value = base64.b64encode(f"{clean_account_sid}:{clean_auth_token}".encode("utf-8")).decode(
        "ascii"
    )
    request_headers = {
        "Authorization": f"Basic {auth_value}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    endpoint = TWILIO_MESSAGES_URL_TEMPLATE.format(account_sid=clean_account_sid)
    http_request = request.Request(endpoint, data=encoded_payload, headers=request_headers, method="POST")

    try:
        with request.urlopen(http_request, timeout=30) as response:
            raw_body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        raw_error_body = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw_error_body)
            error_message = payload.get("message") or raw_error_body
        except json.JSONDecodeError:
            error_message = raw_error_body or str(exc)
        raise ValueError(f"Twilio rechazó el envío: {error_message}") from exc
    except error.URLError as exc:
        raise ValueError("No fue posible conectar con Twilio para enviar el mensaje.") from exc

    try:
        response_payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise ValueError("Twilio devolvió una respuesta no válida al enviar WhatsApp.") from exc

    return {
        "sid": response_payload.get("sid", ""),
        "status": response_payload.get("status", ""),
        "error_code": response_payload.get("error_code"),
        "error_message": response_payload.get("error_message"),
        "raw": response_payload,
    }
