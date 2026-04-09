import sqlite3
import unittest
from datetime import datetime, timezone

from fershop_calculadora.calculations import QuoteInput, calculate_quote, calculate_quote_bundle
from fershop_calculadora.database import (
    build_dashboard_summary,
    create_order_from_quote,
    create_product_category,
    create_product_store,
    get_quote,
    list_clients,
    list_product_categories,
    list_products,
    list_product_stores,
    save_client,
    save_product,
    save_quote,
    set_client_active,
    set_product_active,
    set_product_category_active,
    set_product_store_active,
    update_client,
    update_product,
    update_product_category,
    update_product_pricing,
    update_product_store,
    update_quote,
)
import fershop_calculadora.database as database


class QuoteCatalogPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-quotes-catalogs-{id(self)}?mode=memory&cache=shared"
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

    def test_pending_quote_can_be_updated_with_multiple_products(self) -> None:
        original_quote = QuoteInput.from_dict(
            {
                "client_name": "Laura",
                "client_id": 4,
                "line_items": [
                    {
                        "product_id": 10,
                        "product_name": "Sueter basico",
                        "quantity": 2,
                        "unit_price_usd_net": 20,
                        "unit_tax_usa_percent": 7,
                        "unit_locker_shipping_usd": 3,
                    },
                    {
                        "product_id": 11,
                        "product_name": "Polo clasico",
                        "quantity": 1,
                        "unit_price_usd_net": 24,
                        "unit_tax_usa_percent": 7,
                        "unit_locker_shipping_usd": 3,
                    },
                ],
                "exchange_rate_cop": 4000,
                "travel_cost_usd": 0,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        record = save_quote(original_quote.to_dict(), calculate_quote(original_quote))

        updated_quote = QuoteInput.from_dict(
            {
                "client_name": "Laura",
                "client_id": 4,
                "line_items": [
                    {
                        "product_id": 10,
                        "product_name": "Sueter basico",
                        "quantity": 3,
                        "unit_price_usd_net": 20,
                        "unit_tax_usa_percent": 7,
                        "unit_locker_shipping_usd": 3,
                    },
                    {
                        "product_id": 12,
                        "product_name": "Zapato casual",
                        "quantity": 1,
                        "unit_price_usd_net": 60,
                        "unit_tax_usa_percent": 8,
                        "unit_locker_shipping_usd": 5,
                    },
                ],
                "exchange_rate_cop": 4050,
                "travel_cost_usd": 0,
                "local_costs_cop": 0,
                "desired_margin_percent": 28,
                "advance_percent": 40,
            }
        )
        updated = update_quote(
            record["id"],
            updated_quote.to_dict(),
            calculate_quote(updated_quote),
        )
        fetched = get_quote(record["id"])

        self.assertEqual(updated["id"], record["id"])
        self.assertEqual(len(fetched["input"]["line_items"]), 2)
        self.assertIn("Sueter basico x3", fetched["product_name"])
        self.assertAlmostEqual(
            fetched["result"]["final"]["sale_price_cop"],
            calculate_quote(updated_quote)["final"]["sale_price_cop"],
        )

    def test_quote_cannot_be_updated_after_it_becomes_order(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "client_name": "Camila",
                "product_name": "Bolso",
                "price_usd_net": 80,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 5,
                "travel_cost_usd": 0,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        record = save_quote(quote.to_dict(), calculate_quote(quote))
        create_order_from_quote(record["id"])

        with self.assertRaisesRegex(ValueError, "ya fue convertida en compra"):
            update_quote(record["id"], quote.to_dict(), calculate_quote(quote))

    def test_category_and_store_catalogs_can_be_administered(self) -> None:
        save_product(
            {
                "name": "Polo clasico",
                "reference": "NAVY",
                "category": "Polos",
                "store": "Ralph Lauren",
                "price_usd_net": 32,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 4,
                "notes": "",
            }
        )
        create_product_category("Sueters")
        create_product_store("Nike")

        category_names = [item["name"] for item in list_product_categories()]
        store_names = [item["name"] for item in list_product_stores()]

        self.assertIn("Polos", category_names)
        self.assertIn("Sueters", category_names)
        self.assertIn("Ralph Lauren", store_names)
        self.assertIn("Nike", store_names)

    def test_clients_and_products_support_description_update_and_inactivation(self) -> None:
        client = save_client(
            {
                "name": "Laura",
                "description": "Cliente inicial",
                "phone": "3001234567",
            }
        )
        updated_client = update_client(
            client["id"],
            {
                "name": "Laura",
                "description": "Cliente premium",
                "phone": "3001234567",
                "email": "",
                "city": "",
                "address": "",
                "neighborhood": "",
                "whatsapp_phone": "",
                "whatsapp_opt_in": False,
                "preferred_contact_channel": "",
                "preferred_payment_method": "",
                "interests": "",
                "notes": "",
            },
        )
        set_client_active(client["id"], False)

        product = save_product(
            {
                "name": "Sueter premium",
                "description": "Coleccion invierno",
                "reference": "SW-22",
                "category": "Sueters",
                "store": "Zara",
                "price_usd_net": 25,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 4,
                "notes": "",
            }
        )
        updated_product = update_product(
            product["id"],
            {
                "name": "Sueter premium",
                "description": "Coleccion invierno renovada",
                "reference": "SW-22",
                "category": "Sueters",
                "store": "Zara",
                "inventory_enabled": False,
                "initial_stock_quantity": 0,
                "price_usd_net": 27,
                "tax_usa_percent": 8,
                "locker_shipping_usd": 5,
                "notes": "Actualizado",
            },
        )
        set_product_active(product["id"], False)

        self.assertEqual(updated_client["description"], "Cliente premium")
        self.assertEqual(updated_product["description"], "Coleccion invierno renovada")
        self.assertEqual(len(list_clients(include_inactive=False)), 0)
        self.assertEqual(len(list_products(include_inactive=False)), 0)

    def test_categories_and_stores_support_description_update_and_inactivation(self) -> None:
        category = create_product_category("Sueters", description="Tejidos y basicos")
        store = create_product_store("Nike", description="Tienda deportiva")

        updated_category = update_product_category(
            category["id"],
            name="Sueters",
            description="Tejidos, hoodies y basicos",
        )
        updated_store = update_product_store(
            store["id"],
            name="Nike",
            description="Tienda deportiva principal",
        )
        set_product_category_active(category["id"], is_active=False)
        set_product_store_active(store["id"], is_active=False)

        self.assertEqual(updated_category["description"], "Tejidos, hoodies y basicos")
        self.assertEqual(updated_store["description"], "Tienda deportiva principal")
        self.assertEqual(len(list_product_categories(include_inactive=False)), 0)
        self.assertEqual(len(list_product_stores(include_inactive=False)), 0)

    def test_save_product_handles_legacy_schema_with_removed_cost_columns(self) -> None:
        self.keepalive.execute(
            """
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                company_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                reference TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                store TEXT NOT NULL DEFAULT '',
                price_usd_net REAL NOT NULL,
                tax_usa_percent REAL NOT NULL,
                travel_cost_usd REAL NOT NULL,
                locker_shipping_usd REAL NOT NULL,
                local_costs_cop REAL NOT NULL,
                notes TEXT NOT NULL
            )
            """
        )
        self.keepalive.commit()

        saved = save_product(
            {
                "name": "Legacy polo",
                "reference": "LEG-01",
                "category": "Polos",
                "store": "Legacy Store",
                "price_usd_net": 30,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 4,
                "notes": "Compatibilidad",
            }
        )

        self.assertEqual(saved["name"], "Legacy polo")
        self.assertEqual(saved["category"], "Polos")

    def test_update_product_pricing_persists_new_values(self) -> None:
        product = save_product(
            {
                "name": "Sueter basico",
                "reference": "SW-01",
                "category": "Sueters",
                "store": "H&M",
                "price_usd_net": 20,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )

        updated = update_product_pricing(
            product["id"],
            price_usd_net=24.5,
            tax_usa_percent=9,
            locker_shipping_usd=5.25,
        )

        self.assertEqual(updated["id"], product["id"])
        self.assertEqual(updated["price_usd_net"], 24.5)
        self.assertEqual(updated["tax_usa_percent"], 9)
        self.assertEqual(updated["locker_shipping_usd"], 5.25)

    def test_dashboard_splits_multi_product_order_into_product_rankings(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        quote = QuoteInput.from_dict(
            {
                "client_name": "Valentina",
                "client_id": 6,
                "line_items": [
                    {
                        "product_id": 21,
                        "product_name": "Sueter basico",
                        "quantity": 3,
                        "unit_price_usd_net": 20,
                        "unit_tax_usa_percent": 7,
                        "unit_locker_shipping_usd": 3,
                    },
                    {
                        "product_id": 22,
                        "product_name": "Zapato casual",
                        "quantity": 1,
                        "unit_price_usd_net": 60,
                        "unit_tax_usa_percent": 8,
                        "unit_locker_shipping_usd": 5,
                    },
                ],
                "exchange_rate_cop": 4000,
                "travel_cost_usd": 0,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        record = save_quote(quote.to_dict(), calculate_quote(quote))
        create_order_from_quote(record["id"], advance_paid_cop=300_000)

        summary = build_dashboard_summary(period_key="daily", reference_date=today)
        product_names = [item["product_name"] for item in summary["product_insights"]["top_sellers"]]

        self.assertIn("Sueter basico", product_names)
        self.assertIn("Zapato casual", product_names)

    def test_quote_with_calculated_items_can_be_saved_and_updated(self) -> None:
        original_record = calculate_quote_bundle(
            {
                "client_id": 9,
                "client_name": "Paula",
                "quote_items": [
                    {
                        "input": {
                            "product_id": 30,
                            "product_name": "Sueter basico",
                            "quantity": 2,
                            "purchase_type": "online",
                            "price_usd_net": 20,
                            "tax_usa_percent": 7,
                            "travel_cost_usd": 0,
                            "locker_shipping_usd": 3,
                            "exchange_rate_cop": 4000,
                            "local_costs_cop": 0,
                            "desired_margin_percent": 25,
                            "advance_percent": 50,
                        }
                    }
                ],
            }
        )
        saved = save_quote(original_record["input"], original_record)

        updated_record = calculate_quote_bundle(
            {
                "client_id": 9,
                "client_name": "Paula",
                "quote_items": [
                    {
                        "input": {
                            "product_id": 30,
                            "product_name": "Sueter basico",
                            "quantity": 3,
                            "purchase_type": "online",
                            "price_usd_net": 20,
                            "tax_usa_percent": 7,
                            "travel_cost_usd": 0,
                            "locker_shipping_usd": 3,
                            "exchange_rate_cop": 4000,
                            "local_costs_cop": 0,
                            "desired_margin_percent": 25,
                            "advance_percent": 50,
                        }
                    },
                    {
                        "input": {
                            "product_id": 31,
                            "product_name": "Zapato casual",
                            "quantity": 1,
                            "purchase_type": "travel",
                            "price_usd_net": 60,
                            "tax_usa_percent": 8,
                            "travel_cost_usd": 10,
                            "locker_shipping_usd": 5,
                            "exchange_rate_cop": 4000,
                            "local_costs_cop": 20000,
                            "desired_margin_percent": 25,
                            "advance_percent": 40,
                        }
                    },
                ],
            }
        )
        updated = update_quote(saved["id"], updated_record["input"], updated_record)
        fetched = get_quote(saved["id"])

        self.assertEqual(updated["id"], saved["id"])
        self.assertEqual(len(fetched["input"]["quote_items"]), 2)
        self.assertEqual(fetched["input"]["purchase_type"], "mixed")
        self.assertTrue(
            fetched["result"]["final"]["sale_price_cop"] > original_record["final"]["sale_price_cop"]
        )


if __name__ == "__main__":
    unittest.main()
