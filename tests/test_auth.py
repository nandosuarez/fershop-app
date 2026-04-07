import sqlite3
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote
from fershop_calculadora.database import (
    authenticate_user,
    create_company_with_admin,
    create_order_from_quote,
    create_order_status,
    create_session_for_user,
    get_default_company_id,
    get_session_by_token,
    list_clients,
    list_order_statuses,
    list_orders,
    list_products,
    list_quotes,
    save_client,
    save_product,
    save_quote,
)
import fershop_calculadora.database as database


class AuthAndTenantTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-auth-{id(self)}?mode=memory&cache=shared"
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

    def test_company_admin_login_returns_company_branding(self) -> None:
        created = create_company_with_admin(
            slug="lux import",
            name="Lux Import",
            brand_name="Lux Import Studio",
            tagline="Compras premium con control total.",
            logo_path="/static/assets/fershop-logo-crop.jpg",
            username="lux_admin",
            password="ClaveSegura2026!",
            display_name="Admin Lux",
        )

        user_data = authenticate_user("lux_admin", "ClaveSegura2026!")
        self.assertIsNotNone(user_data)
        self.assertEqual(user_data["company"]["id"], created["company"]["id"])
        self.assertEqual(user_data["company"]["brand_name"], "Lux Import Studio")

        session_token = create_session_for_user(user_data)
        session = get_session_by_token(session_token)
        self.assertIsNotNone(session)
        self.assertEqual(session["company"]["slug"], "lux-import")
        self.assertEqual(session["user"]["display_name"], "Admin Lux")

    def test_company_data_stays_isolated_across_modules(self) -> None:
        default_company_id = get_default_company_id()
        created = create_company_with_admin(
            slug="north cargo",
            name="North Cargo",
            brand_name="North Cargo",
            tagline="Importaciones con seguimiento completo.",
            logo_path="/static/assets/fershop-logo-crop.jpg",
            username="north_admin",
            password="North2026!",
            display_name="Admin North",
        )
        second_company_id = created["company"]["id"]

        save_client({"name": "Cliente FerShop"}, company_id=default_company_id)
        save_client({"name": "Cliente North"}, company_id=second_company_id)
        save_product(
            {
                "name": "Producto FerShop",
                "reference": "FS-1",
                "price_usd_net": 100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 10,
                "local_costs_cop": 10000,
                "notes": "",
            },
            company_id=default_company_id,
        )
        save_product(
            {
                "name": "Producto North",
                "reference": "NC-1",
                "price_usd_net": 250,
                "tax_usa_percent": 7,
                "travel_cost_usd": 10,
                "locker_shipping_usd": 15,
                "local_costs_cop": 20000,
                "notes": "",
            },
            company_id=second_company_id,
        )

        second_quote = QuoteInput.from_dict(
            {
                "product_name": "Producto North",
                "client_name": "Cliente North",
                "price_usd_net": 250,
                "tax_usa_percent": 7,
                "travel_cost_usd": 10,
                "locker_shipping_usd": 15,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 20000,
                "desired_margin_percent": 30,
                "advance_percent": 50,
            }
        )
        second_result = calculate_quote(second_quote)
        quote_record = save_quote(
            second_quote.to_dict(),
            second_result,
            company_id=second_company_id,
        )
        create_order_from_quote(quote_record["id"], company_id=second_company_id)
        create_order_status(
            label="Listo para pickup North",
            description="Paso propio de North Cargo.",
            company_id=second_company_id,
        )

        default_clients = list_clients(company_id=default_company_id)
        second_clients = list_clients(company_id=second_company_id)
        default_products = list_products(company_id=default_company_id)
        second_products = list_products(company_id=second_company_id)
        default_quotes = list_quotes(company_id=default_company_id)
        second_quotes = list_quotes(company_id=second_company_id)
        default_orders = list_orders(company_id=default_company_id)
        second_orders = list_orders(company_id=second_company_id)
        default_status_keys = {item["key"] for item in list_order_statuses(company_id=default_company_id)}
        second_status_keys = {item["key"] for item in list_order_statuses(company_id=second_company_id)}

        self.assertEqual([item["name"] for item in default_clients], ["Cliente FerShop"])
        self.assertEqual([item["name"] for item in second_clients], ["Cliente North"])
        self.assertEqual([item["name"] for item in default_products], ["Producto FerShop"])
        self.assertEqual([item["name"] for item in second_products], ["Producto North"])
        self.assertEqual(default_quotes, [])
        self.assertEqual(len(second_quotes), 1)
        self.assertEqual(default_orders, [])
        self.assertEqual(len(second_orders), 1)
        self.assertNotIn("listo_para_pickup_north", default_status_keys)
        self.assertIn("listo_para_pickup_north", second_status_keys)


if __name__ == "__main__":
    unittest.main()
