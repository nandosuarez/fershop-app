from __future__ import annotations

import json
import mimetypes
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
    create_order_status,
    create_order_from_quote,
    create_session_for_user,
    delete_session,
    get_client_detail,
    get_pending_request,
    get_product_detail,
    get_quote,
    get_session_by_token,
    init_db,
    list_clients,
    list_expense_categories,
    list_expenses,
    list_orders,
    list_order_statuses,
    list_pending_requests,
    list_product_categories,
    list_products,
    list_product_stores,
    list_quotes,
    register_second_payment,
    save_expense,
    save_client,
    save_pending_request,
    save_product,
    save_quote,
    update_pending_request_status,
    update_product_pricing,
    update_quote,
    update_order_status,
    update_order_travel_transport,
)
from .documents import build_quote_message, generate_quote_pdf
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
        parsed = urlparse(self.path)
        route = self._parse_quote_route(parsed.path)
        quote_detail_route = self._parse_quote_detail_route(parsed.path)
        order_route = self._parse_order_route(parsed.path)
        client_route = self._parse_client_route(parsed.path)
        product_route = self._parse_product_route(parsed.path)
        product_update_route = self._parse_product_update_route(parsed.path)
        pending_status_route = self._parse_pending_request_status_route(parsed.path)
        pending_detail_route = self._parse_pending_request_detail_route(parsed.path)
        if parsed.path == "/healthz":
            self._send_json(HTTPStatus.OK, {"ok": True})
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

        if client_route is not None:
            session = self._require_session()
            if session is None:
                return
            detail = get_client_detail(client_route, company_id=session["company"]["id"])
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

        if product_update_route is not None:
            self._send_json(
                HTTPStatus.METHOD_NOT_ALLOWED,
                {"error": "Usa POST para actualizar el producto."},
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

        if parsed.path == "/api/order-statuses":
            session = self._require_session()
            if session is None:
                return
            self._send_json(
                HTTPStatus.OK,
                {"items": list_order_statuses(company_id=session["company"]["id"])},
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
            if action in {"status", "second-payment", "travel-transport"}:
                self._send_json(
                    HTTPStatus.METHOD_NOT_ALLOWED,
                    {"error": "Usa POST para actualizar la compra."},
                )
                return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Recurso no encontrado."})

    def do_POST(self) -> None:
        try:
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

            if self.path == "/api/products":
                payload = self._read_json()
                product = ProductInput.from_dict(payload)
                record = save_product(product.to_dict(), company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            product_update_route = self._parse_product_update_route(self.path)
            if product_update_route is not None:
                payload = self._read_json()
                item = update_product_pricing(
                    product_update_route,
                    price_usd_net=float(payload.get("price_usd_net") or 0),
                    tax_usa_percent=float(payload.get("tax_usa_percent") or 0),
                    locker_shipping_usd=float(payload.get("locker_shipping_usd") or 0),
                    company_id=session["company"]["id"],
                )
                self._send_json(HTTPStatus.OK, {"item": item})
                return

            if self.path == "/api/product-categories":
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                record = create_product_category(name, company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            if self.path == "/api/product-stores":
                payload = self._read_json()
                name = str(payload.get("name", "")).strip()
                record = create_product_store(name, company_id=session["company"]["id"])
                self._send_json(HTTPStatus.CREATED, {"item": record})
                return

            if self.path == "/api/expenses":
                payload = self._read_json()
                record = save_expense(payload, company_id=session["company"]["id"])
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

                item, existing = create_order_from_quote(
                    quote_id,
                    advance_paid_cop=advance_paid_cop,
                    company_id=session["company"]["id"],
                )
                status = HTTPStatus.OK if existing else HTTPStatus.CREATED
                self._send_json(status, {"item": item, "existing": existing})
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
                    self._send_json(HTTPStatus.OK, {"item": item})
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
                    self._send_json(HTTPStatus.OK, {"item": item})
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
        if action not in {"status", "second-payment", "travel-transport"}:
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

    def _parse_product_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "products":
            return None

        try:
            return int(parts[2])
        except ValueError:
            return None

    def _parse_product_update_route(self, path: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 4 or parts[0] != "api" or parts[1] != "products" or parts[3] != "pricing":
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
