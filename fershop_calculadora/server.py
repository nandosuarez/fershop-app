from __future__ import annotations

import json
import mimetypes
import traceback
from http.cookies import SimpleCookie
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .auth import SESSION_COOKIE_NAME, SESSION_DURATION_DAYS
from .catalog import ClientInput, PendingRequestInput, ProductInput
from .calculations import QuoteInput, calculate_quote, calculate_quote_bundle
from .database import (
    authenticate_user,
    build_followup_summary,
    build_dashboard_summary,
    create_product_category,
    create_product_store,
    create_direct_order,
    create_order_status,
    create_order_from_quote,
    create_session_for_user,
    delete_order,
    delete_session,
    get_company_by_slug,
    get_company_whatsapp_settings,
    get_client_detail,
    get_pending_request,
    get_product_detail,
    get_quote,
    get_session_by_token,
    init_db,
    list_clients,
    list_expense_categories,
    list_expenses,
    list_inventory_purchases,
    list_orders,
    list_order_statuses,
    list_pending_requests,
    list_product_categories,
    list_products,
    list_product_stores,
    list_quotes,
    list_whatsapp_notifications,
    list_whatsapp_templates,
    maybe_auto_send_order_whatsapp_notification,
    record_product_inventory_movement,
    register_second_payment,
    save_company_whatsapp_settings,
    save_expense,
    save_inventory_purchase,
    save_client,
    save_pending_request,
    save_product,
    save_quote,
    save_whatsapp_template,
    send_order_whatsapp_notification,
    set_client_active,
    invalidate_order,
    set_product_active,
    set_product_category_active,
    set_product_store_active,
    update_client,
    update_pending_request_status,
    update_product,
    update_product_pricing,
    update_product_category,
    update_product_store,
    update_quote,
    update_order_status,
    update_order_travel_transport,
    update_order_image,
    update_confirmed_order,
    update_whatsapp_notification_status,
)
from .documents import (
    build_client_statement_message,
    build_quote_message,
    generate_client_statement_pdf,
    generate_quote_pdf,
)
from .orders import is_valid_order_status
from .pending import list_pending_priorities, list_pending_statuses


ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "web"
WEB_ROOT = WEB_DIR.resolve()


class FerShopHandler(BaseHTTPRequestHandler):
    server_version = "FerShopCalculadora/0.1"

    @staticmethod
    def _build_quote_record(payload: dict) -> tuple[dict, dict]:
        if isinstance(payload.get("quote_items"), list) and payload.get("quote_items"):
            result = calculate_quote_bundle(payload)
            return result["input"], result

        quote = QuoteInput.from_dict(payload)
        result = calculate_quote(quote)
        return quote.to_dict(), result

    @staticmethod
    def _get_direct_order_item_payload(raw_item: dict) -> dict:
        if isinstance(raw_item.get("input"), dict):
            return raw_item["input"]
        return raw_item

    @staticmethod
    def _get_direct_order_item_sale_price(raw_item: dict) -> float:
        item_payload = FerShopHandler._get_direct_order_item_payload(raw_item)
        try:
            explicit_final_price = item_payload.get("final_sale_price_cop")
        except AttributeError:
            explicit_final_price = None
        if explicit_final_price not in (None, ""):
            try:
                return max(float(explicit_final_price), 0.0)
            except (TypeError, ValueError):
                return 0.0

        item_result = raw_item.get("result") if isinstance(raw_item.get("result"), dict) else {}
        try:
            return max(float(item_result.get("final", {}).get("sale_price_cop") or 0), 0.0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _apply_direct_order_advance(
        payload: dict[str, object],
        advance_paid_cop: float,
    ) -> dict[str, object]:
        normalized = json.loads(json.dumps(payload, ensure_ascii=False))
        quote_items = normalized.get("quote_items")
        if isinstance(quote_items, list) and quote_items:
            sale_prices = [
                FerShopHandler._get_direct_order_item_sale_price(item if isinstance(item, dict) else {})
                for item in quote_items
            ]
            total_sale_price = sum(sale_prices)
            remaining_advance = float(advance_paid_cop)
            for index, raw_item in enumerate(quote_items):
                if not isinstance(raw_item, dict):
                    continue
                item_payload = FerShopHandler._get_direct_order_item_payload(raw_item)
                item_sale_price = sale_prices[index]
                if index == len(quote_items) - 1:
                    allocated_advance = remaining_advance
                else:
                    allocated_advance = round(
                        advance_paid_cop * (item_sale_price / total_sale_price),
                        2,
                    ) if total_sale_price > 0 else 0.0
                    remaining_advance -= allocated_advance
                item_payload["final_advance_cop"] = max(float(allocated_advance), 0.0)
                item_payload["advance_percent"] = (
                    (allocated_advance / item_sale_price) * 100 if item_sale_price > 0 else 0.0
                )
                if isinstance(raw_item.get("input"), dict):
                    raw_item["input"] = item_payload
                else:
                    raw_item.update(item_payload)
            return normalized

        normalized["final_advance_cop"] = max(float(advance_paid_cop), 0.0)
        try:
            sale_price = float(normalized.get("final_sale_price_cop") or 0)
        except (TypeError, ValueError):
            sale_price = 0.0
        normalized["advance_percent"] = (
            (advance_paid_cop / sale_price) * 100 if sale_price > 0 else 0.0
        )
        return normalized

    def _current_session(self) -> dict | None:
        raw_cookie = self.headers.get("Cookie", "")
        if not raw_cookie:
            return None

        cookie = SimpleCookie()
        cookie.load(raw_cookie)
        morsel = cookie.get(SESSION_COOKIE_NAME)
        if morsel is None:
            return None
        return get_session_by_token(morsel.value)

    def _require_session(self) -> dict | None:
        session = self._current_session()
        if session is None:
            self._send_json(
                HTTPStatus.UNAUTHORIZED,
                {"error": "Debes iniciar sesión para continuar."},
            )
            return None
        return session

    def _set_session_cookie(self, session_token: str) -> None:
        cookie = SimpleCookie()
        cookie[SESSION_COOKIE_NAME] = session_token
        cookie[SESSION_COOKIE_NAME]["path"] = "/"
        cookie[SESSION_COOKIE_NAME]["httponly"] = True
        cookie[SESSION_COOKIE_NAME]["max-age"] = str(SESSION_DURATION_DAYS * 24 * 60 * 60)
        self.send_header("Set-Cookie", cookie.output(header="").strip())

    def _clear_session_cookie(self) -> None:
        cookie = SimpleCookie()
        cookie[SESSION_COOKIE_NAME] = ""
        cookie[SESSION_COOKIE_NAME]["path"] = "/"
        cookie[SESSION_COOKIE_NAME]["httponly"] = True
        cookie[SESSION_COOKIE_NAME]["max-age"] = "0"
        self.send_header("Set-Cookie", cookie.output(header="").strip())

    def do_GET(self) -> None:
        try:
            self._do_get()
        except Exception as exc:
            traceback.print_exc()
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": str(exc) or "Ocurrio un error interno consultando la informacion.",
                },
            )

    def _do_get(self) -> None:
        parsed = urlparse(self.path)
        public_registration_slug = self._parse_public_registration_page_route(parsed.path)
        public_company_slug = self._parse_public_company_route(parsed.path)
        route = self._parse_quote_route(parsed.path)
        quote_detail_route = self._parse_quote_detail_route(parsed.path)
        order_route = self._parse_order_route(parsed.path)
        client_statement_route = self._parse_client_statement_route(parsed.path)
        client_route = self._parse_client_route(parsed.path)
        product_route = self._parse_product_route(parsed.path)
        product_pricing_route = self._parse_product_pricing_route(parsed.path)
        client_update_route = self._parse_client_update_route(parsed.path)
        client_active_route = self._parse_client_active_route(parsed.path)
        product_update_route = self._parse_product_update_route(parsed.path)
        product_active_route = self._parse_product_active_route(parsed.path)
        category_update_route = self._parse_product_category_update_route(parsed.path)
        category_active_route = self._parse_product_category_active_route(parsed.path)
        store_update_route = self._parse_product_store_update_route(parsed.path)
        store_active_route = self._parse_product_store_active_route(parsed.path)
        pending_status_route = self._parse_pending_request_status_route(parsed.path)
        pending_detail_route = self._parse_pending_request_detail_route(parsed.path)
        if parsed.path == "/healthz":
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        if public_registration_slug is not None:
            self._serve_file(WEB_DIR / "customer-register.html", "text/html; charset=utf-8")
            return

        if parsed.path == "/calculadora-rapida":
            self._serve_file(WEB_DIR / "quick-calculator.html", "text/html; charset=utf-8")
            return

        if public_company_slug is not None:
            company = get_company_by_slug(public_company_slug)
            if company is None or not company.get("is_active"):
                self._send_json(
                    HTTPStatus.NOT_FOUND,
                    {"error": "No encontramos una empresa activa para ese enlace."},
                )
                return
            self._send_json(HTTPStatus.OK, {"item": company})
            return

        if parsed.path == "/":
            session = self._current_session()
            if session is None:
                self._serve_file(WEB_DIR / "login.html", "text/html; charset=utf-8")
                return
            self._serve_file(WEB_DIR / "index.html", "text/html; charset=utf-8")
            return

        if parsed.path == "/api/session":
            session = self._require_session()
            if session is None:
                return
            self._send_json(HTTPStatus.OK, session)
            return

        if parsed.path == "/api/quotes":
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            raw_limit = params.get("limit", ["15"])[0]
            try:
                limit = max(1, min(int(raw_limit), 50))
            except ValueError:
                limit = 15
            self._send_json(
                HTTPStatus.OK,
                {"items": list_quotes(limit=limit, company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/pending-requests":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "items": list_pending_requests(company_id=session["company"]["id"]),
                    "statuses": list_pending_statuses(),
                    "priorities": list_pending_priorities(),
                },
            )
            return

        if pending_detail_route is not None:
            session = self._require_session()
            if session is None:
                return
            item = get_pending_request(pending_detail_route, company_id=session["company"]["id"])
            if item is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Pendiente no encontrado."})
                return
            self._send_json(HTTPStatus.OK, {"item": item})
            return

        if quote_detail_route is not None:
            session = self._require_session()
            if session is None:
                return
            record = get_quote(quote_detail_route, company_id=session["company"]["id"])
            if record is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Cotizacion no encontrada."})
                return
            self._send_json(HTTPStatus.OK, {"item": record})
            return

        if parsed.path == "/api/clients":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_clients(company_id=session["company"]["id"])},
            )
            return

        if client_statement_route is not None:
            client_id, action = client_statement_route
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            period_key = str(params.get("period", [""])[0] or "").strip() or None
            reference_date = str(params.get("reference_date", [""])[0] or "").strip() or None
            detail = get_client_detail(
                client_id,
                company_id=session["company"]["id"],
                period_key=period_key,
                reference_date=reference_date,
            )
            if detail is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Cliente no encontrado."})
                return

            if action == "pdf":
                filename = f"{session['company']['slug']}_estado_cliente_{client_id}.pdf"
                pdf_bytes = generate_client_statement_pdf(detail, company=session["company"])
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/pdf")
                self.send_header("Content-Length", str(len(pdf_bytes)))
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return

            if action == "message":
                self._send_json(
                    HTTPStatus.OK,
                    {"text": build_client_statement_message(detail, company=session["company"])},
                )
                return

        if client_route is not None:
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            period_key = str(params.get("period", [""])[0] or "").strip() or None
            reference_date = str(params.get("reference_date", [""])[0] or "").strip() or None
            detail = get_client_detail(
                client_route,
                company_id=session["company"]["id"],
                period_key=period_key,
                reference_date=reference_date,
            )
            if detail is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Cliente no encontrado."})
                return
            self._send_json(HTTPStatus.OK, {"item": detail})
            return

        if parsed.path == "/api/products":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_products(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/product-categories":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_product_categories(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/product-stores":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_product_stores(company_id=session["company"]["id"])},
            )
            return

        if product_route is not None:
            session = self._require_session()
            if session is None:
                return
            detail = get_product_detail(product_route, company_id=session["company"]["id"])
            if detail is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Producto no encontrado."})
                return
            self._send_json(HTTPStatus.OK, {"item": detail})
            return

        if any(
            route is not None
            for route in (
                client_update_route,
                client_active_route,
                product_pricing_route,
                product_update_route,
                product_active_route,
                category_update_route,
                category_active_route,
                store_update_route,
                store_active_route,
            )
        ):
            self._send_json(
                HTTPStatus.METHOD_NOT_ALLOWED,
                {"error": "Usa POST para actualizar este recurso."},
            )
            return

        if pending_status_route is not None:
            self._send_json(
                HTTPStatus.METHOD_NOT_ALLOWED,
                {"error": "Usa POST para actualizar el pendiente."},
            )
            return

        if parsed.path == "/api/orders":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_orders(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/dashboard":
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            period_key = str(params.get("period", ["daily"])[0] or "daily")
            reference_date = str(params.get("reference_date", [""])[0] or "").strip() or None
            self._send_json(
                HTTPStatus.OK,
                {
                    "item": build_dashboard_summary(
                        period_key=period_key,
                        company_id=session["company"]["id"],
                        reference_date=reference_date,
                    )
                },
            )
            return

        if parsed.path == "/api/followup":
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            reference_date = str(params.get("reference_date", [""])[0] or "").strip() or None
            self._send_json(
                HTTPStatus.OK,
                {
                    "item": build_followup_summary(
                        company_id=session["company"]["id"],
                        reference_date=reference_date,
                    )
                },
            )
            return

        if parsed.path == "/api/expenses":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "items": list_expenses(company_id=session["company"]["id"]),
                    "categories": list_expense_categories(),
                },
            )
            return

        if parsed.path == "/api/inventory-purchases":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_inventory_purchases(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/order-statuses":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_order_statuses(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/whatsapp/settings":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"item": get_company_whatsapp_settings(company_id=session["company"]["id"])},
            )
            return

        if parsed.path == "/api/whatsapp/templates":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                list_whatsapp_templates(company_id=session["company"]["id"]),
            )
            return

        if parsed.path == "/api/whatsapp/notifications":
            session = self._require_session()
            if session is None:
                return
            params = parse_qs(parsed.query)
            raw_limit = params.get("limit", ["30"])[0]
            raw_order_id = params.get("order_id", [""])[0]
            try:
                limit = max(1, min(int(raw_limit), 100))
            except ValueError:
                limit = 30
            order_id = None
            if raw_order_id not in (None, ""):
                try:
                    order_id = int(raw_order_id)
                except ValueError:
                    order_id = None
            self._send_json(
                HTTPStatus.OK,
                {
                    "items": list_whatsapp_notifications(
                        limit=limit,
                        order_id=order_id,
                        company_id=session["company"]["id"],
                    )
                },
            )
            return

        if parsed.path.startswith("/static/"):
            relative_path = parsed.path.removeprefix("/static/")
            file_path = (WEB_DIR / relative_path).resolve()
            if WEB_ROOT not in file_path.parents and file_path != WEB_ROOT:
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "Ruta no permitida."})
                return
            self._serve_file(file_path)
            return

        if route is not None:
            session = self._require_session()
            if session is None:
                return
            quote_id, action = route
            record = get_quote(quote_id, company_id=session["company"]["id"])
            if record is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Cotización no encontrada."})
                return

            if action == "pdf":
                filename = f"{session['company']['slug']}_cotizacion_{quote_id}.pdf"
                pdf_bytes = generate_quote_pdf(record, company=session["company"])
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/pdf")
                self.send_header("Content-Length", str(len(pdf_bytes)))
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return

            if action == "message":
                self._send_json(
                    HTTPStatus.OK,
                    {"text": build_quote_message(record, company=session["company"])},
                )
                return

        if order_route is not None:
            order_id, action = order_route
            if action in {"status", "second-payment", "travel-transport", "whatsapp"}:
                self._send_json(
                    HTTPStatus.METHOD_NOT_ALLOWED,
                    {"error": "Usa POST para actualizar la compra."},
                )
                return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Recurso no encontrado."})

    def do_POST(self) -> None:
        try:
            public_registration_slug = self._parse_public_registration_api_route(self.path)
            if self.path == "/api/whatsapp/twilio/status":
                form_payload = self._read_form_data()
                message_sid = str(form_payload.get("MessageSid", "")).strip()
                message_status = str(form_payload.get("MessageStatus", "")).strip()
                error_message = str(
                    form_payload.get("ErrorMessage") or form_payload.get("SmsErrorMessage") or ""
                ).strip()
                update_whatsapp_notification_status(
                    message_sid,
                    message_status,
                    error_message=error_message,
                )
                self._send_json(HTTPStatus.OK, {"ok": True})
                return

            if public_registration_slug is not None:
                company = get_company_by_slug(public_registration_slug)
                if company is None or not company.get("is_active"):
                    self._send_json(
                        HTTPStatus.NOT_FOUND,
                        {"error": "No encontramos una empresa activa para ese enlace."},
                    )
                    return

                payload = self._read_json()
                client = ClientInput.from_dict(payload)
                client_data = client.to_dict()
                if not str(client_data.get("identification", "")).strip():
                    raise ValueError(
                        "La identificacion es obligatoria para el registro publico."
                    )
                existing_notes = str(client_data.get("notes", "")).strip()
                registration_note = "Registro publico desde formulario web."
                client_data["notes"] = (
                    f"{registration_note}\n{existing_notes}" if existing_notes else registration_note
                )
                record = save_client(client_data, company_id=company["id"])
                self._send_json(
                    HTTPStatus.CREATED,
                    {
                        "item": record,
                        "company": company,
                        "message": "Tus datos quedaron registrados correctamente.",
                    },
                )
                return

            if self.path == "/api/login":
                payload = self._read_json()
                username = str(payload.get("username", "")).strip()
                password = str(payload.get("password", ""))
                user_data = authenticate_user(username, password)
                if user_data is None:
                    self._send_json(
                        HTTPStatus.UNAUTHORIZED,
                        {"error": "Usuario o contrasena invalidos."},
                    )
                    return
                    self._send_json(
                        HTTPStatus.UNAUTHORIZED,
                        {"error": "Usuario o contraseÃ±a invÃ¡lidos."},
                    )
                    return
                session_token = create_session_for_user(user_data)
                self.send_response(HTTPStatus.OK)
                self._set_session_cookie(session_token)
                body = json.dumps(
                    {
                        "user": {
                            "id": user_data["user_id"],
                            "username": user_data["username"],
                            "display_name": user_data["display_name"],
                        },
                        "company": user_data["company"],
                    },
                    ensure_ascii=False,
                ).encode("utf-8")
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if self.path == "/api/logout":
                session = self._current_session()
                if session is not None:
                    delete_session(session["session_token"])
                self.send_response(HTTPStatus.OK)
                self._clear_session_cookie()
                body = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            session = self._require_session()
            if session is None:
                return

            if self.path == "/api/calculate":
                payload = self._read_json()
                quote = QuoteInput.from_dict(payload)
                result = calculate_quote(quote)
                self._send_json(HTTPStatus.OK, {"result": result})
                return

            if self.path == "/api/quotes":
                payload = self._read_json()
                input_data, result = self._build_quote_record(payload)
                if payload.get("pending_request_id") not in (None, "", 0):
                    input_data["pending_request_id"] = payload.get("pending_request_id")
                record = save_quote(
                    input_data,
                    result,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            quote_update_route = self._parse_quote_update_route(self.path)
            if quote_update_route is not None:
                payload = self._read_json()
                input_data, result = self._build_quote_record(payload)
                if payload.get("pending_request_id") not in (None, "", 0):
                    input_data["pending_request_id"] = payload.get("pending_request_id")
                record = update_quote(
                    quote_update_route,
                    input_data,
                    result,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/pending-requests":
                payload = self._read_json()
                pending_request = PendingRequestInput.from_dict(payload)
                record = save_pending_request(
                    pending_request.to_dict(),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            if self.path == "/api/clients":
                payload = self._read_json()
                client = ClientInput.from_dict(payload)
                record = save_client(client.to_dict(), company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            client_update_route = self._parse_client_update_route(self.path)
            if client_update_route is not None:
                payload = self._read_json()
                client = ClientInput.from_dict(payload)
                record = update_client(
                    client_update_route,
                    client.to_dict(),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            client_active_route = self._parse_client_active_route(self.path)
            if client_active_route is not None:
                payload = self._read_json()
                is_active = bool(payload.get("is_active"))
                record = set_client_active(
                    client_active_route,
                    is_active=is_active,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/products":
                payload = self._read_json()
                product = ProductInput.from_dict(payload)
                record = save_product(product.to_dict(), company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            product_pricing_route = self._parse_product_pricing_route(self.path)
            if product_pricing_route is not None:
                payload = self._read_json()
                item = update_product_pricing(
                    product_pricing_route,
                    price_usd_net=float(payload.get("price_usd_net") or 0),
                    tax_usa_percent=float(payload.get("tax_usa_percent") or 0),
                    locker_shipping_usd=float(payload.get("locker_shipping_usd") or 0),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": item})
                return

            product_update_route = self._parse_product_update_route(self.path)
            if product_update_route is not None:
                payload = self._read_json()
                product = ProductInput.from_dict(payload)
                item = update_product(
                    product_update_route,
                    product.to_dict(),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": item})
                return

            product_active_route = self._parse_product_active_route(self.path)
            if product_active_route is not None:
                payload = self._read_json()
                item = set_product_active(
                    product_active_route,
                    is_active=bool(payload.get("is_active")),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": item})
                return

            product_inventory_route = self._parse_product_inventory_route(self.path)
            if product_inventory_route is not None:
                payload = self._read_json()
                movement_type = str(payload.get("movement_type", "")).strip()
                quantity = payload.get("quantity")
                note = str(payload.get("note", "")).strip()
                record = record_product_inventory_movement(
                    product_inventory_route,
                    movement_type=movement_type,
                    quantity=int(quantity),
                    note=note,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, record)
                return

            if self.path == "/api/product-categories":
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                description = str(payload.get("description", "")).strip()
                record = create_product_category(
                    name,
                    description=description,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            category_update_route = self._parse_product_category_update_route(self.path)
            if category_update_route is not None:
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                description = str(payload.get("description", "")).strip()
                record = update_product_category(
                    category_update_route,
                    name=name,
                    description=description,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            category_active_route = self._parse_product_category_active_route(self.path)
            if category_active_route is not None:
                payload = self._read_json()
                record = set_product_category_active(
                    category_active_route,
                    is_active=bool(payload.get("is_active")),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/product-stores":
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                description = str(payload.get("description", "")).strip()
                record = create_product_store(
                    name,
                    description=description,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            store_update_route = self._parse_product_store_update_route(self.path)
            if store_update_route is not None:
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                description = str(payload.get("description", "")).strip()
                record = update_product_store(
                    store_update_route,
                    name=name,
                    description=description,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            store_active_route = self._parse_product_store_active_route(self.path)
            if store_active_route is not None:
                payload = self._read_json()
                record = set_product_store_active(
                    store_active_route,
                    is_active=bool(payload.get("is_active")),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/whatsapp/settings":
                payload = self._read_json()
                record = save_company_whatsapp_settings(
                    payload,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/whatsapp/templates":
                payload = self._read_json()
                record = save_whatsapp_template(
                    payload,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": record})
                return

            if self.path == "/api/expenses":
                payload = self._read_json()
                record = save_expense(payload, company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            if self.path == "/api/inventory-purchases":
                payload = self._read_json()
                record = save_inventory_purchase(
                    payload,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            if self.path == "/api/order-statuses":
                payload = self._read_json()
                label = str(payload.get("label", "")).strip()
                description = str(payload.get("description", "")).strip()
                insert_after_key = str(payload.get("insert_after_key", "")).strip()
                item = create_order_status(
                    label=label,
                    description=description,
                    insert_after_key=insert_after_key or None,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.CREATED, {"item": item})
                return

            if self.path == "/api/orders/from-quote":
                payload = self._read_json()
                raw_quote_id = payload.get("quote_id")
                try:
                    quote_id = int(raw_quote_id)
                except (TypeError, ValueError) as exc:
                    raise ValueError("Debes enviar un quote_id válido.") from exc

                raw_advance_paid_cop = payload.get("advance_paid_cop")
                advance_paid_cop = None
                if raw_advance_paid_cop not in (None, ""):
                    try:
                        advance_paid_cop = float(raw_advance_paid_cop)
                    except (TypeError, ValueError) as exc:
                        raise ValueError("El anticipo real debe ser numérico.") from exc

                actual_purchase_prices = payload.get("actual_purchase_prices")
                if actual_purchase_prices not in (None, "") and not isinstance(actual_purchase_prices, list):
                    raise ValueError(
                        "Los precios reales de compra deben enviarse como una lista valida."
                    )

                item, existing = create_order_from_quote(
                    quote_id,
                    advance_paid_cop=advance_paid_cop,
                    actual_purchase_prices=actual_purchase_prices,
                    company_id=session["company"]["id"],
                )
                notification = None
                if not existing:
                    notification = maybe_auto_send_order_whatsapp_notification(
                        item["id"],
                        trigger_key="order_status:quote_confirmed",
                        company_id=session["company"]["id"],
                    )
                status = HTTPStatus.OK if existing else HTTPStatus.CREATED
                self._send_json(
                    status,
                    {"item": item, "existing": existing, "notification": notification},
                )
                return

            if self.path == "/api/orders/direct":
                payload = self._read_json()
                purchase_date = str(payload.get("purchase_date") or "").strip()
                raw_advance_paid_cop = payload.get("advance_paid_cop")
                advance_paid_cop = None
                if raw_advance_paid_cop not in (None, ""):
                    try:
                        advance_paid_cop = float(raw_advance_paid_cop)
                    except (TypeError, ValueError) as exc:
                        raise ValueError(
                            "Debes enviar un valor numerico valido para el anticipo real."
                        ) from exc
                    if advance_paid_cop < 0:
                        raise ValueError("El anticipo real no puede ser negativo.")

                quote_payload = json.loads(json.dumps(payload, ensure_ascii=False))
                quote_payload.pop("advance_paid_cop", None)
                quote_payload.pop("purchase_date", None)
                if advance_paid_cop is not None:
                    quote_payload = self._apply_direct_order_advance(
                        quote_payload,
                        advance_paid_cop,
                    )

                input_data, result = self._build_quote_record(quote_payload)
                item, quote_record = create_direct_order(
                    input_data,
                    result,
                    advance_paid_cop=advance_paid_cop,
                    created_at=purchase_date or None,
                    company_id=session["company"]["id"],
                )
                notification = maybe_auto_send_order_whatsapp_notification(
                    item["id"],
                    trigger_key="order_status:quote_confirmed",
                    company_id=session["company"]["id"],
                )
                self._send_json(
                    HTTPStatus.CREATED,
                    {"item": item, "quote": quote_record, "notification": notification},
                )
                return

            order_route = self._parse_order_route(self.path)
            if order_route is not None:
                order_id, action = order_route
                if action == "status":
                    payload = self._read_json()
                    status_key = str(payload.get("status_key", "")).strip()
                    if not is_valid_order_status(status_key):
                        raise ValueError("El estado enviado no es válido.")
                    note = str(payload.get("note", "")).strip()
                    item = update_order_status(
                        order_id,
                        status_key,
                        note,
                        company_id=session["company"]["id"],
                    )
                    notification = maybe_auto_send_order_whatsapp_notification(
                        order_id,
                        trigger_key=f"order_status:{status_key}",
                        company_id=session["company"]["id"],
                    )
                    self._send_json(
                        HTTPStatus.OK,
                        {"item": item, "notification": notification},
                    )
                    return
                if action == "second-payment":
                    payload = self._read_json()
                    raw_amount_cop = payload.get("amount_cop")
                    try:
                        amount_cop = float(raw_amount_cop)
                    except (TypeError, ValueError) as exc:
                        raise ValueError("El segundo pago debe ser numérico.") from exc

                    received_at = str(payload.get("received_at", "")).strip()
                    item = register_second_payment(
                        order_id,
                        amount_cop=amount_cop,
                        received_at=received_at,
                        company_id=session["company"]["id"],
                    )
                    notification = maybe_auto_send_order_whatsapp_notification(
                        order_id,
                        trigger_key="second_payment_registered",
                        company_id=session["company"]["id"],
                    )
                    self._send_json(
                        HTTPStatus.OK,
                        {"item": item, "notification": notification},
                    )
                    return
                if action == "travel-transport":
                    payload = self._read_json()
                    travel_transport_type = str(payload.get("travel_transport_type", "")).strip()
                    item = update_order_travel_transport(
                        order_id,
                        travel_transport_type=travel_transport_type,
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": item})
                    return
                if action == "edit":
                    payload = self._read_json()
                    raw_advance_paid_cop = payload.get("advance_paid_cop")
                    advance_paid_cop = None
                    if raw_advance_paid_cop not in (None, ""):
                        try:
                            advance_paid_cop = float(raw_advance_paid_cop)
                        except (TypeError, ValueError) as exc:
                            raise ValueError("El anticipo real debe ser numerico.") from exc

                    raw_exchange_rate = payload.get("exchange_rate_cop")
                    exchange_rate_cop = None
                    if raw_exchange_rate not in (None, ""):
                        try:
                            exchange_rate_cop = float(raw_exchange_rate)
                        except (TypeError, ValueError) as exc:
                            raise ValueError("La TRM debe ser numerica.") from exc

                    raw_general_discount = payload.get("general_discount_cop")
                    general_discount_cop = None
                    if raw_general_discount not in (None, ""):
                        try:
                            general_discount_cop = float(raw_general_discount)
                        except (TypeError, ValueError) as exc:
                            raise ValueError("El descuento general debe ser numerico.") from exc

                    actual_purchase_prices = payload.get("actual_purchase_prices")
                    if actual_purchase_prices is not None and not isinstance(actual_purchase_prices, list):
                        raise ValueError("Los precios reales de compra deben enviarse como lista.")
                    quote_item_updates = payload.get("quote_item_updates")
                    if quote_item_updates is not None and not isinstance(quote_item_updates, list):
                        raise ValueError("Los ajustes por producto deben enviarse como lista.")

                    item = update_confirmed_order(
                        order_id,
                        exchange_rate_cop=exchange_rate_cop,
                        advance_paid_cop=advance_paid_cop,
                        general_discount_cop=general_discount_cop,
                        notes=str(payload.get("notes", "") if "notes" in payload else "").strip()
                        if "notes" in payload
                        else None,
                        actual_purchase_prices=actual_purchase_prices,
                        quote_item_updates=quote_item_updates,
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": item})
                    return
                if action == "invalidate":
                    payload = self._read_json()
                    item = invalidate_order(
                        order_id,
                        reason=str(payload.get("reason", "")).strip(),
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": item})
                    return
                if action == "delete":
                    payload = self._read_json()
                    item = delete_order(
                        order_id,
                        reason=str(payload.get("reason", "")).strip(),
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": item})
                    return
                if action == "image":
                    payload = self._read_json()
                    item = update_order_image(
                        order_id,
                        str(payload.get("image_data_url", "")).strip(),
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": item})
                    return
                if action == "whatsapp":
                    payload = self._read_json()
                    trigger_key = str(payload.get("trigger_key", "")).strip() or None
                    notification = send_order_whatsapp_notification(
                        order_id,
                        trigger_key=trigger_key,
                        source="manual",
                        company_id=session["company"]["id"],
                    )
                    self._send_json(HTTPStatus.OK, {"item": notification})
                    return
            pending_status_route = self._parse_pending_request_status_route(self.path)
            if pending_status_route is not None:
                payload = self._read_json()
                status_key = str(payload.get("status_key", "")).strip()
                item = update_pending_request_status(
                    pending_status_route,
                    status_key=status_key,
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": item})
                return
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        except Exception as exc:
            traceback.print_exc()
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": str(exc) or "Ocurrio un error interno procesando la operacion.",
                },
            )
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Recurso no encontrado."})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _read_json(self) -> dict:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            content_length = int(raw_length)
        except ValueError as exc:
            raise ValueError("Cabecera Content-Length inválida.") from exc

        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}

        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("El cuerpo de la petición no es JSON válido.") from exc

    def _read_form_data(self) -> dict[str, str]:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            content_length = int(raw_length)
        except ValueError as exc:
            raise ValueError("Cabecera Content-Length invalida.") from exc

        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}

        parsed = parse_qs(raw_body.decode("utf-8"), keep_blank_values=True)
        return {key: values[-1] if values else "" for key, values in parsed.items()}

    def _parse_public_registration_page_route(self, path: str) -> str | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 2 or parts[0] != "registro":
            return None
        return parts[1]

    def _parse_public_company_route(self, path: str) -> str | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "public" or parts[2] != "company":
            return None
        return parts[3]

    def _parse_public_registration_api_route(self, path: str) -> str | None:
        parts = [part for part in path.split("/") if part]
        if (
            len(parts) != 4
            or parts[0] != "api"
            or parts[1] != "public"
            or parts[2] != "register"
        ):
            return None
        return parts[3]

    def _parse_quote_route(self, path: str) -> tuple[int, str] | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "quotes":
            return None

        raw_id = parts[2]
        action = parts[3]
        if action not in {"pdf", "message"}:
            return None

        try:
            return int(raw_id), action
        except ValueError:
            return None

    def _parse_quote_detail_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "quotes":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_quote_update_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "quotes" or parts[3] != "update":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_order_route(self, path: str) -> tuple[int, str] | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "orders":
            return None

        raw_id = parts[2]
        action = parts[3]
        if action not in {
            "status",
            "second-payment",
            "travel-transport",
            "whatsapp",
            "image",
            "edit",
            "invalidate",
            "delete",
        }:
            return None

        try:
            return int(raw_id), action
        except ValueError:
            return None

    def _parse_client_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "clients":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_client_statement_route(self, path: str) -> tuple[int, str] | None:
        parts = [part for part in path.split("/") if part]
        if (
            len(parts) != 5
            or parts[0] != "api"
            or parts[1] != "clients"
            or parts[3] != "statement"
        ):
            return None

        action = parts[4]
        if action not in {"pdf", "message"}:
            return None

        try:
            return int(parts[2]), action
        except ValueError:
            return None

    def _parse_product_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "products":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_client_update_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "clients" or parts[3] != "update":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_client_active_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "clients" or parts[3] != "active":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_pricing_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "products" or parts[3] != "pricing":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_update_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "products" or parts[3] != "update":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_active_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "products" or parts[3] != "active":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_inventory_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "products" or parts[3] != "inventory":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_pending_request_detail_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "pending-requests":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_pending_request_status_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "pending-requests" or parts[3] != "status":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_category_update_route(self, path: str) -> int | None:
        return self._parse_catalog_item_route(path, "product-categories", "update")

    def _parse_product_category_active_route(self, path: str) -> int | None:
        return self._parse_catalog_item_route(path, "product-categories", "active")

    def _parse_product_store_update_route(self, path: str) -> int | None:
        return self._parse_catalog_item_route(path, "product-stores", "update")

    def _parse_product_store_active_route(self, path: str) -> int | None:
        return self._parse_catalog_item_route(path, "product-stores", "active")

    def _parse_catalog_item_route(self, path: str, resource_name: str, action: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != resource_name or parts[3] != action:
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _serve_file(self, file_path: Path, content_type: str | None = None) -> None:
        if not file_path.exists() or not file_path.is_file():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Archivo no encontrado."})
            return

        file_bytes = file_path.read_bytes()
        guessed_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or guessed_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(file_bytes)))
        self.end_headers()
        self.wfile.write(file_bytes)

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_server(host: str = "127.0.0.1", port: int = 8000) -> None:
    init_db()
    server = ThreadingHTTPServer((host, port), FerShopHandler)
    print(f"FerShop Calculadora corriendo en http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()
