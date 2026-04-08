import sqlite3
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote
from fershop_calculadora.database import (
    create_order_from_quote,
    get_product_detail,
    list_expenses,
    list_inventory_purchases,
    list_products,
    record_product_inventory_movement,
    save_product,
    save_inventory_purchase,
    save_quote,
)
import fershop_calculadora.database as database


class InventoryPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-inventory-{id(self)}?mode=memory&cache=shared"
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

    def test_save_product_can_start_with_store_inventory(self) -> None:
        product = save_product(
            {
                "name": "Sueter basico",
                "reference": "SW-BASE",
                "category": "Sueters",
                "store": "FerShop tienda",
                "inventory_enabled": True,
                "initial_stock_quantity": 3,
                "price_usd_net": 20,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )

        detail = get_product_detail(product["id"])

        self.assertTrue(product["inventory_enabled"])
        self.assertEqual(product["current_stock"], 3)
        self.assertEqual(detail["product"]["current_stock"], 3)
        self.assertEqual(detail["inventory_movements"][0]["movement_type"], "stock_in")

    def test_manual_inventory_entry_can_enable_stock_tracking(self) -> None:
        product = save_product(
            {
                "name": "Polo clasico",
                "reference": "POLO-01",
                "category": "Polos",
                "store": "FerShop tienda",
                "inventory_enabled": False,
                "initial_stock_quantity": 0,
                "price_usd_net": 25,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )

        result = record_product_inventory_movement(
            product["id"],
            movement_type="stock_in",
            quantity=5,
            note="Compra para tienda",
        )

        self.assertTrue(result["product"]["inventory_enabled"])
        self.assertEqual(result["product"]["current_stock"], 5)

    def test_order_from_quote_consumes_store_inventory(self) -> None:
        product = save_product(
            {
                "name": "Zapato casual",
                "reference": "ZP-01",
                "category": "Zapatos",
                "store": "FerShop tienda",
                "inventory_enabled": True,
                "initial_stock_quantity": 3,
                "price_usd_net": 60,
                "tax_usa_percent": 8,
                "locker_shipping_usd": 5,
                "notes": "",
            }
        )
        quote = QuoteInput.from_dict(
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "client_name": "Laura",
                "client_id": 9,
                "quantity": 2,
                "uses_inventory_stock": True,
                "purchase_type": "online",
                "price_usd_net": 60,
                "tax_usa_percent": 8,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        quote_record = save_quote(quote.to_dict(), calculate_quote(quote))
        create_order_from_quote(quote_record["id"], advance_paid_cop=400000)

        detail = get_product_detail(product["id"])

        self.assertEqual(detail["product"]["current_stock"], 1)
        self.assertEqual(detail["inventory_movements"][0]["movement_type"], "sale_out")

    def test_order_from_quote_rejects_when_store_inventory_is_insufficient(self) -> None:
        product = save_product(
            {
                "name": "Sueter premium",
                "reference": "SW-PRE",
                "category": "Sueters",
                "store": "FerShop tienda",
                "inventory_enabled": True,
                "initial_stock_quantity": 1,
                "price_usd_net": 45,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 4,
                "notes": "",
            }
        )
        quote = QuoteInput.from_dict(
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "client_name": "Sara",
                "client_id": 11,
                "quantity": 2,
                "uses_inventory_stock": True,
                "purchase_type": "online",
                "price_usd_net": 45,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 4,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        quote_record = save_quote(quote.to_dict(), calculate_quote(quote))

        with self.assertRaisesRegex(ValueError, "suficiente inventario"):
            create_order_from_quote(quote_record["id"], advance_paid_cop=200000)

        listed = list_products()
        matching = next(item for item in listed if item["id"] == product["id"])
        self.assertEqual(matching["current_stock"], 1)

    def test_inventory_purchase_increases_stock_and_tracks_cost_basis(self) -> None:
        sweater = save_product(
            {
                "name": "Sueter tienda",
                "reference": "SWT-01",
                "category": "Sueters",
                "store": "FerShop tienda",
                "inventory_enabled": True,
                "initial_stock_quantity": 1,
                "price_usd_net": 20,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )
        polo = save_product(
            {
                "name": "Polo tienda",
                "reference": "POL-02",
                "category": "Polos",
                "store": "FerShop tienda",
                "inventory_enabled": False,
                "initial_stock_quantity": 0,
                "price_usd_net": 18,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )

        purchase = save_inventory_purchase(
            {
                "purchase_date": "2026-04-08",
                "supplier_name": "Compra Orlando",
                "notes": "Reposicion para vitrina",
                "items": [
                    {
                        "product_id": sweater["id"],
                        "quantity": 2,
                        "unit_cost_cop": 180000,
                    },
                    {
                        "product_id": polo["id"],
                        "quantity": 3,
                        "unit_cost_cop": 125000,
                        "notes": "Colores surtidos",
                    },
                ],
            }
        )

        sweater_detail = get_product_detail(sweater["id"])
        polo_detail = get_product_detail(polo["id"])
        expenses = list_expenses()
        purchases = list_inventory_purchases()

        self.assertEqual(purchase["total_amount_cop"], 735000)
        self.assertEqual(purchase["items_count"], 2)
        self.assertEqual(purchase["total_units"], 5)
        self.assertEqual(purchase["expense"], None)
        self.assertEqual(sweater_detail["product"]["current_stock"], 3)
        self.assertEqual(polo_detail["product"]["current_stock"], 3)
        self.assertAlmostEqual(sweater_detail["product"]["inventory_unit_cost_cop"], 180000)
        self.assertAlmostEqual(sweater_detail["product"]["current_stock_value_cop"], 540000)
        self.assertAlmostEqual(polo_detail["product"]["inventory_unit_cost_cop"], 125000)
        self.assertAlmostEqual(polo_detail["product"]["current_stock_value_cop"], 375000)
        self.assertEqual(expenses, [])
        self.assertEqual(purchases[0]["id"], purchase["id"])
        self.assertEqual(purchases[0]["items"][0]["product_name"], "Sueter tienda")
        self.assertEqual(polo_detail["inventory_movements"][0]["source"], f"inventory_purchase:{purchase['id']}")

    def test_order_from_quote_uses_actual_inventory_cost_for_profit(self) -> None:
        product = save_product(
            {
                "name": "Pantalon en stock",
                "reference": "PAN-01",
                "category": "Pantalones",
                "store": "FerShop tienda",
                "inventory_enabled": False,
                "initial_stock_quantity": 0,
                "price_usd_net": 22,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 4,
                "notes": "",
            }
        )
        save_inventory_purchase(
            {
                "purchase_date": "2026-04-08",
                "supplier_name": "Compra para stock",
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": 3,
                        "unit_cost_cop": 200000,
                    }
                ],
            }
        )

        quote = QuoteInput.from_dict(
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "client_name": "Paula",
                "client_id": 17,
                "quantity": 2,
                "uses_inventory_stock": True,
                "inventory_unit_cost_cop": 150000,
                "purchase_type": "online",
                "price_usd_net": 22,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 4,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 50,
                "advance_percent": 50,
                "final_sale_price_cop": 700000,
            }
        )
        quote_record = save_quote(quote.to_dict(), calculate_quote(quote))
        order, _ = create_order_from_quote(quote_record["id"], advance_paid_cop=350000)
        detail = get_product_detail(product["id"])

        self.assertAlmostEqual(
            order["snapshot"]["result"]["costs"]["real_total_cost_cop"],
            400000,
        )
        self.assertAlmostEqual(
            order["snapshot"]["result"]["final"]["profit_cop"],
            300000,
        )
        self.assertEqual(detail["product"]["current_stock"], 1)
        self.assertAlmostEqual(detail["product"]["current_stock_value_cop"], 200000)
        self.assertAlmostEqual(
            detail["inventory_movements"][0]["unit_cost_cop"],
            200000,
        )


if __name__ == "__main__":
    unittest.main()
