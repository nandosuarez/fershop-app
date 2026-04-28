from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs

from .auth import SESSION_COOKIE_NAME, SESSION_DURATION_DAYS
from .catalog import ClientInput, ProductInput
from .calculations import QuoteInput, calculate_quote
from .database import (
    authenticate_user,
    build_dashboard_summary,
    create_order_from_quote,
    create_order_status,
    create_session_for_user,
    delete_session,
    get_company_by_slug,
    get_client_detail,
    get_product_detail,
    get_quote,
    get_session_by_token,
    init_db,
    list_clients,
    list_expense_categories,
    list_expenses,
    list_orders,
    list_order_statuses,
    list_products,
    list_quotes,
    register_second_payment,
    save_client,
    save_expense,
    save_product,
    save_quote,
    update_order_status,
)
from .runtime_time import configure_process_timezone


configure_process_timezone()
from .documents import build_quote_message, generate_quote_pdf
from .orders import is_valid_order_status


ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "web"
WEB_ROOT = WEB_DIR.resolve()


def _json_response(
    status: HTTPStatus,
    payload: dict[str, Any],
    extra_headers: list[tuple[str, str]] | None = None,
) -> tuple[str, list[tuple[str, str]], list[bytes]]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
    ]
    if extra_headers:
        headers.extend(extra_headers)
    return f"{status.value} {status.phrase}", headers, [body]


def _bytes_response(
    status: HTTPStatus,
    body: bytes,
    *,
    content_type: str,
    extra_headers: list[tuple[str, str]] | None = None,
) -> tuple[str, list[tuple[str, str]], list[bytes]]:
    headers = [
        ("Content-Type", content_type),
        ("Content-Length", str(len(body))),
    ]
    if extra_headers:
        headers.extend(extra_headers)
    return f"{status.value} {status.phrase}", headers, [body]


def _set_session_cookie(session_token: str) -> tuple[str, str]:
    cookie = SimpleCookie()
    cookie[SESSION_COOKIE_NAME] = session_token
    cookie[SESSION_COOKIE_NAME]["path"] = "/"
    cookie[SESSION_COOKIE_NAME]["httponly"] = True
    cookie[SESSION_COOKIE_NAME]["max-age"] = str(SESSION_DURATION_DAYS * 24 * 60 * 60)
    return "Set-Cookie", cookie.output(header="").strip()


def _clear_session_cookie() -> tuple[str, str]:
    cookie = SimpleCookie()
    cookie[SESSION_COOKIE_NAME] = ""
    cookie[SESSION_COOKIE_NAME]["path"] = "/"
    cookie[SESSION_COOKIE_NAME]["httponly"] = True
    cookie[SESSION_COOKIE_NAME]["max-age"] = "0"
    return "Set-Cookie", cookie.output(header="").strip()


def _current_session(environ: dict[str, Any]) -> dict[str, Any] | None:
    raw_cookie = environ.get("HTTP_COOKIE", "")
    if not raw_cookie:
        return None

    cookie = SimpleCookie()
    cookie.load(raw_cookie)
    morsel = cookie.get(SESSION_COOKIE_NAME)
    if morsel is None:
        return None
    return get_session_by_token(morsel.value)


def _read_json(environ: dict[str, Any]) -> dict[str, Any]:
    raw_length = str(environ.get("CONTENT_LENGTH", "0") or "0")
    try:
        content_length = int(raw_length)
    except ValueError as exc:
        raise ValueError("Cabecera Content-Length invalida.") from exc

    if content_length <= 0:
        return {}

    raw_body = environ["wsgi.input"].read(content_length)
    if not raw_body:
        return {}

    try:
        return json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("El cuerpo de la peticion no es JSON valido.") from exc


def _parse_quote_route(path: str) -> tuple[int, str] | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 4 or parts[0] != "api" or parts[1] != "quotes":
        return None
    if parts[3] not in {"pdf", "message"}:
        return None
    try:
        return int(parts[2]), parts[3]
    except ValueError:
        return None


def _parse_order_route(path: str) -> tuple[int, str] | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 4 or parts[0] != "api" or parts[1] != "orders":
        return None
    if parts[3] not in {"status", "second-payment"}:
        return None
    try:
        return int(parts[2]), parts[3]
    except ValueError:
        return None


def _parse_client_route(path: str) -> int | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 3 or parts[0] != "api" or parts[1] != "clients":
        return None
    try:
        return int(parts[2])
    except ValueError:
        return None


def _parse_product_route(path: str) -> int | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 3 or parts[0] != "api" or parts[1] != "products":
        return None
    try:
        return int(parts[2])
    except ValueError:
        return None


def _parse_public_registration_page_route(path: str) -> str | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 2 or parts[0] != "registro":
        return None
    return parts[1]


def _parse_public_company_route(path: str) -> str | None:
    parts = [part for part in path.split("/") if part]
    if len(parts) != 4 or parts[0] != "api" or parts[1] != "public" or parts[2] != "company":
        return None
    return parts[3]


def _parse_public_registration_api_route(path: str) -> str | None:
    parts = [part for part in path.split("/") if part]
    if (
        len(parts) != 4
        or parts[0] != "api"
        or parts[1] != "public"
        or parts[2] != "register"
    ):
        return None
    return parts[3]


def _serve_file(file_path: Path, content_type: str | None = None):
    if not file_path.exists() or not file_path.is_file():
        return _json_response(HTTPStatus.NOT_FOUND, {"error": "Archivo no encontrado."})

    file_bytes = file_path.read_bytes()
    guessed_type, _ = mimetypes.guess_type(str(file_path))
    return _bytes_response(
        HTTPStatus.OK,
        file_bytes,
        content_type=content_type or guessed_type or "application/octet-stream",
    )


def _require_session(environ: dict[str, Any]):
    session = _current_session(environ)
    if session is None:
        return None, _json_response(
            HTTPStatus.UNAUTHORIZED,
            {"error": "Debes iniciar sesion para continuar."},
        )
    return session, None


def _handle_get(environ: dict[str, Any]):
    path = str(environ.get("PATH_INFO", "") or "/")
    query = parse_qs(str(environ.get("QUERY_STRING", "") or ""))
    public_registration_slug = _parse_public_registration_page_route(path)
    public_company_slug = _parse_public_company_route(path)
    quote_route = _parse_quote_route(path)
    order_route = _parse_order_route(path)
    client_route = _parse_client_route(path)
    product_route = _parse_product_route(path)

    if path == "/healthz":
        return _json_response(HTTPStatus.OK, {"ok": True})

    if public_registration_slug is not None:
        return _serve_file(WEB_DIR / "customer-register.html", "text/html; charset=utf-8")

    if public_company_slug is not None:
        company = get_company_by_slug(public_company_slug)
        if company is None or not company.get("is_active"):
            return _json_response(
                HTTPStatus.NOT_FOUND,
                {"error": "No encontramos una empresa activa para ese enlace."},
            )
        return _json_response(HTTPStatus.OK, {"item": company})

    if path == "/calculadora-rapida":
        return _serve_file(WEB_DIR / "quick-calculator.html", "text/html; charset=utf-8")

    if path == "/":
        session = _current_session(environ)
        target = WEB_DIR / ("index.html" if session else "login.html")
        return _serve_file(target, "text/html; charset=utf-8")

    if path == "/api/session":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(HTTPStatus.OK, session)

    if path == "/api/quotes":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        raw_limit = query.get("limit", ["15"])[0]
        try:
            limit = max(1, min(int(raw_limit), 50))
        except ValueError:
            limit = 15
        return _json_response(
            HTTPStatus.OK,
            {"items": list_quotes(limit=limit, company_id=session["company"]["id"])},
        )

    if path == "/api/clients":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(
            HTTPStatus.OK,
            {"items": list_clients(company_id=session["company"]["id"])},
        )

    if client_route is not None:
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        detail = get_client_detail(client_route, company_id=session["company"]["id"])
        if detail is None:
            return _json_response(HTTPStatus.NOT_FOUND, {"error": "Cliente no encontrado."})
        return _json_response(HTTPStatus.OK, {"item": detail})

    if path == "/api/products":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(
            HTTPStatus.OK,
            {"items": list_products(company_id=session["company"]["id"])},
        )

    if product_route is not None:
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        detail = get_product_detail(product_route, company_id=session["company"]["id"])
        if detail is None:
            return _json_response(HTTPStatus.NOT_FOUND, {"error": "Producto no encontrado."})
        return _json_response(HTTPStatus.OK, {"item": detail})

    if path == "/api/orders":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(
            HTTPStatus.OK,
            {"items": list_orders(company_id=session["company"]["id"])},
        )

    if path == "/api/dashboard":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        period_key = str(query.get("period", ["daily"])[0] or "daily")
        reference_date = str(query.get("reference_date", [""])[0] or "").strip() or None
        return _json_response(
            HTTPStatus.OK,
            {
                "item": build_dashboard_summary(
                    period_key=period_key,
                    company_id=session["company"]["id"],
                    reference_date=reference_date,
                )
            },
        )

    if path == "/api/expenses":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(
            HTTPStatus.OK,
            {
                "items": list_expenses(company_id=session["company"]["id"]),
                "categories": list_expense_categories(),
            },
        )

    if path == "/api/order-statuses":
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        return _json_response(
            HTTPStatus.OK,
            {"items": list_order_statuses(company_id=session["company"]["id"])},
        )

    if path.startswith("/static/"):
        relative_path = path.removeprefix("/static/")
        file_path = (WEB_DIR / relative_path).resolve()
        if WEB_ROOT not in file_path.parents and file_path != WEB_ROOT:
            return _json_response(HTTPStatus.FORBIDDEN, {"error": "Ruta no permitida."})
        return _serve_file(file_path)

    if quote_route is not None:
        session, failure = _require_session(environ)
        if failure is not None:
            return failure
        quote_id, action = quote_route
        record = get_quote(quote_id, company_id=session["company"]["id"])
        if record is None:
            return _json_response(HTTPStatus.NOT_FOUND, {"error": "Cotizacion no encontrada."})

        if action == "pdf":
            filename = f"{session['company']['slug']}_cotizacion_{quote_id}.pdf"
            pdf_bytes = generate_quote_pdf(record, company=session["company"])
            return _bytes_response(
                HTTPStatus.OK,
                pdf_bytes,
                content_type="application/pdf",
                extra_headers=[("Content-Disposition", f'attachment; filename="{filename}"')],
            )

        if action == "message":
            return _json_response(
                HTTPStatus.OK,
                {"text": build_quote_message(record, company=session["company"])},
            )

    if order_route is not None:
        order_id, action = order_route
        if action in {"status", "second-payment"}:
            return _json_response(
                HTTPStatus.METHOD_NOT_ALLOWED,
                {"error": "Usa POST para actualizar la compra."},
            )

    return _json_response(HTTPStatus.NOT_FOUND, {"error": "Recurso no encontrado."})


def _handle_post(environ: dict[str, Any]):
    path = str(environ.get("PATH_INFO", "") or "/")
    try:
        public_registration_slug = _parse_public_registration_api_route(path)
        if public_registration_slug is not None:
            company = get_company_by_slug(public_registration_slug)
            if company is None or not company.get("is_active"):
                return _json_response(
                    HTTPStatus.NOT_FOUND,
                    {"error": "No encontramos una empresa activa para ese enlace."},
                )
            payload = _read_json(environ)
            client = ClientInput.from_dict(payload)
            client_data = client.to_dict()
            if not str(client_data.get("identification", "")).strip():
                raise ValueError("La identificacion es obligatoria para el registro publico.")
            existing_notes = str(client_data.get("notes", "")).strip()
            registration_note = "Registro publico desde formulario web."
            client_data["notes"] = (
                f"{registration_note}\n{existing_notes}" if existing_notes else registration_note
            )
            record = save_client(client_data, company_id=company["id"])
            return _json_response(
                HTTPStatus.CREATED,
                {
                    "item": record,
                    "company": company,
                    "message": "Tus datos quedaron registrados correctamente.",
                },
            )

        if path == "/api/login":
            payload = _read_json(environ)
            username = str(payload.get("username", "")).strip()
            password = str(payload.get("password", ""))
            user_data = authenticate_user(username, password)
            if user_data is None:
                return _json_response(
                    HTTPStatus.UNAUTHORIZED,
                    {"error": "Usuario o contrasena invalidos."},
                )

            session_token = create_session_for_user(user_data)
            return _json_response(
                HTTPStatus.OK,
                {
                    "user": {
                        "id": user_data["user_id"],
                        "username": user_data["username"],
                        "display_name": user_data["display_name"],
                    },
                    "company": user_data["company"],
                },
                extra_headers=[_set_session_cookie(session_token)],
            )

        if path == "/api/logout":
            session = _current_session(environ)
            if session is not None:
                delete_session(session["session_token"])
            return _json_response(
                HTTPStatus.OK,
                {"ok": True},
                extra_headers=[_clear_session_cookie()],
            )

        session, failure = _require_session(environ)
        if failure is not None:
            return failure

        if path == "/api/calculate":
            payload = _read_json(environ)
            quote = QuoteInput.from_dict(payload)
            result = calculate_quote(quote)
            return _json_response(HTTPStatus.OK, {"result": result})

        if path == "/api/quotes":
            payload = _read_json(environ)
            quote = QuoteInput.from_dict(payload)
            result = calculate_quote(quote)
            record = save_quote(quote.to_dict(), result, company_id=session["company"]["id"])
            return _json_response(HTTPStatus.CREATED, {"item": record})

        if path == "/api/clients":
            payload = _read_json(environ)
            client = ClientInput.from_dict(payload)
            record = save_client(client.to_dict(), company_id=session["company"]["id"])
            return _json_response(HTTPStatus.CREATED, {"item": record})

        if path == "/api/products":
            payload = _read_json(environ)
            product = ProductInput.from_dict(payload)
            record = save_product(product.to_dict(), company_id=session["company"]["id"])
            return _json_response(HTTPStatus.CREATED, {"item": record})

        if path == "/api/expenses":
            payload = _read_json(environ)
            record = save_expense(payload, company_id=session["company"]["id"])
            return _json_response(HTTPStatus.CREATED, {"item": record})

        if path == "/api/order-statuses":
            payload = _read_json(environ)
            label = str(payload.get("label", "")).strip()
            description = str(payload.get("description", "")).strip()
            insert_after_key = str(payload.get("insert_after_key", "")).strip()
            item = create_order_status(
                label=label,
                description=description,
                insert_after_key=insert_after_key or None,
                company_id=session["company"]["id"],
            )
            return _json_response(HTTPStatus.CREATED, {"item": item})

        if path == "/api/orders/from-quote":
            payload = _read_json(environ)
            try:
                quote_id = int(payload.get("quote_id"))
            except (TypeError, ValueError) as exc:
                raise ValueError("Debes enviar un quote_id valido.") from exc

            raw_advance_paid_cop = payload.get("advance_paid_cop")
            advance_paid_cop = None
            if raw_advance_paid_cop not in (None, ""):
                try:
                    advance_paid_cop = float(raw_advance_paid_cop)
                except (TypeError, ValueError) as exc:
                    raise ValueError("El anticipo real debe ser numerico.") from exc

            item, existing = create_order_from_quote(
                quote_id,
                advance_paid_cop=advance_paid_cop,
                company_id=session["company"]["id"],
            )
            status = HTTPStatus.OK if existing else HTTPStatus.CREATED
            return _json_response(status, {"item": item, "existing": existing})

        order_route = _parse_order_route(path)
        if order_route is not None:
            order_id, action = order_route
            payload = _read_json(environ)
            if action == "status":
                status_key = str(payload.get("status_key", "")).strip()
                if not is_valid_order_status(status_key):
                    raise ValueError("El estado enviado no es valido.")
                note = str(payload.get("note", "")).strip()
                item = update_order_status(
                    order_id,
                    status_key,
                    note,
                    company_id=session["company"]["id"],
                )
                return _json_response(HTTPStatus.OK, {"item": item})

            if action == "second-payment":
                try:
                    amount_cop = float(payload.get("amount_cop"))
                except (TypeError, ValueError) as exc:
                    raise ValueError("El segundo pago debe ser numerico.") from exc

                received_at = str(payload.get("received_at", "")).strip()
                item = register_second_payment(
                    order_id,
                    amount_cop=amount_cop,
                    received_at=received_at,
                    company_id=session["company"]["id"],
                )
                return _json_response(HTTPStatus.OK, {"item": item})
    except ValueError as exc:
        return _json_response(HTTPStatus.BAD_REQUEST, {"error": str(exc)})

    return _json_response(HTTPStatus.NOT_FOUND, {"error": "Recurso no encontrado."})


def application(environ: dict[str, Any], start_response):
    init_db()
    method = str(environ.get("REQUEST_METHOD", "GET") or "GET").upper()
    if method == "GET":
        status, headers, body = _handle_get(environ)
    elif method == "POST":
        status, headers, body = _handle_post(environ)
    else:
        status, headers, body = _json_response(
            HTTPStatus.METHOD_NOT_ALLOWED,
            {"error": "Metodo no permitido."},
        )

    start_response(status, headers)
    return body
