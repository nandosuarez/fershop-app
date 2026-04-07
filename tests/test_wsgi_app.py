import io
import sqlite3
import unittest

import fershop_calculadora.database as database
from fershop_calculadora.wsgi_app import application


class WsgiAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-wsgi-{id(self)}?mode=memory&cache=shared"
        self.keepalive = sqlite3.connect(self.db_uri, uri=True)

        def _memory_connect() -> sqlite3.Connection:
            connection = sqlite3.connect(self.db_uri, uri=True)
            connection.execute("PRAGMA journal_mode=MEMORY")
            connection.execute("PRAGMA temp_store=MEMORY")
            return connection

        database._connect = _memory_connect

    def tearDown(self) -> None:
        database._connect = self.original_connect
        self.keepalive.close()

    def _call_app(
        self,
        path: str,
        *,
        method: str = "GET",
        body: bytes = b"",
        cookie: str = "",
        content_type: str = "application/json",
    ) -> tuple[str, list[tuple[str, str]], bytes]:
        captured: dict[str, object] = {}

        environ = {
            "REQUEST_METHOD": method,
            "PATH_INFO": path,
            "QUERY_STRING": "",
            "CONTENT_LENGTH": str(len(body)),
            "CONTENT_TYPE": content_type,
            "wsgi.input": io.BytesIO(body),
            "HTTP_COOKIE": cookie,
        }

        def start_response(status: str, headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = headers

        response_body = b"".join(application(environ, start_response))
        return (
            str(captured["status"]),
            list(captured["headers"]),
            response_body,
        )

    def test_health_endpoint_returns_ok(self) -> None:
        status, headers, body = self._call_app("/healthz")
        self.assertEqual(status, "200 OK")
        self.assertIn(("Content-Type", "application/json; charset=utf-8"), headers)
        self.assertIn(b'"ok": true', body)

    def test_root_without_session_serves_login_page(self) -> None:
        status, headers, body = self._call_app("/")
        self.assertEqual(status, "200 OK")
        self.assertIn(("Content-Type", "text/html; charset=utf-8"), headers)
        self.assertIn(b"login-form", body)


if __name__ == "__main__":
    unittest.main()
