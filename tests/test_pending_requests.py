import sqlite3
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote
from fershop_calculadora.database import (
    get_pending_request,
    list_pending_requests,
    save_client,
    save_pending_request,
    save_quote,
    update_pending_request_status,
)
import fershop_calculadora.database as database


class PendingRequestsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-pending-{id(self)}?mode=memory&cache=shared"
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

    def test_pending_request_can_be_saved_and_moved_through_work_statuses(self) -> None:
        client = save_client({"name": "Valentina"})

        pending = save_pending_request(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "title": "Zapatos blancos tipo runner",
                "category": "Zapatos",
                "desired_store": "Nike",
                "desired_size": "38",
                "desired_color": "Blanco",
                "quantity": 1,
                "budget_cop": 450000,
                "priority_key": "high",
                "status_key": "new",
                "due_date": "2026-04-10",
                "reference_url": "https://example.com/referencia",
                "reference_notes": "Busca algo parecido a una foto de Instagram.",
                "notes": "Cliente quiere opcion premium pero sobria.",
            }
        )

        updated = update_pending_request_status(pending["id"], "searching")
        items = list_pending_requests()

        self.assertEqual(pending["client_name"], "Valentina")
        self.assertEqual(pending["priority_label"], "Alta")
        self.assertEqual(updated["status_key"], "searching")
        self.assertEqual(updated["status_label"], "Buscando opciones")
        self.assertEqual(items[0]["id"], pending["id"])

    def test_pending_request_is_marked_as_quoted_when_quote_is_saved(self) -> None:
        client = save_client({"name": "Camila"})
        pending = save_pending_request(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "title": "Bolso negro minimalista",
                "quantity": 1,
                "priority_key": "normal",
                "status_key": "new",
            }
        )

        quote = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_name": "Bolso negro premium",
                "price_usd_net": 80,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        input_data = quote.to_dict()
        input_data["pending_request_id"] = pending["id"]

        record = save_quote(input_data, calculate_quote(quote))
        refreshed_pending = get_pending_request(pending["id"])

        self.assertEqual(record["client_name"], "Camila")
        self.assertIsNotNone(refreshed_pending)
        self.assertEqual(refreshed_pending["status_key"], "quoted")
        self.assertEqual(refreshed_pending["linked_quote_id"], record["id"])

    def test_pending_request_cannot_be_marked_as_quoted_without_quote_link(self) -> None:
        client = save_client({"name": "Laura"})
        pending = save_pending_request(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "title": "Gafas de sol estilo aviador",
                "quantity": 1,
                "priority_key": "normal",
                "status_key": "new",
            }
        )

        with self.assertRaisesRegex(ValueError, "ya exista una cotizacion"):
            update_pending_request_status(pending["id"], "quoted")


if __name__ == "__main__":
    unittest.main()
