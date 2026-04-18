import sqlite3
import unittest
from datetime import datetime, timedelta, timezone

from fershop_calculadora.calculations import QuoteInput, calculate_quote
from fershop_calculadora.database import (
    build_followup_summary,
    build_dashboard_summary,
    create_order_from_quote,
    get_client_detail,
    get_product_detail,
    list_orders,
    register_second_payment,
    save_client,
    save_expense,
    save_pending_request,
    save_inventory_purchase,
    save_product,
    save_quote,
    update_order_status,
)
import fershop_calculadora.database as database


class DashboardTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-dashboard-{id(self)}?mode=memory&cache=shared"
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

    def _advance_order_to_client_notified(self, order_id: int) -> dict:
        order = None
        for status_key in [
            "received_at_locker",
            "in_international_transit",
            "customs_review",
            "in_transit_to_fershop",
            "received_by_fershop",
            "client_notified",
        ]:
            order = update_order_status(order_id, status_key)
        return order

    def test_closed_orders_are_hidden_from_operational_list(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "iPhone 16",
                "client_name": "Claudia",
                "price_usd_net": 1000,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 20,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"])

        for status_key in [
            "received_at_locker",
            "in_international_transit",
            "customs_review",
            "in_transit_to_fershop",
            "received_by_fershop",
            "client_notified",
        ]:
            order = update_order_status(order["id"], status_key)

        order = register_second_payment(
            order["id"],
            amount_cop=order["balance_due_cop"],
            received_at=datetime.now(timezone.utc).date().isoformat(),
        )
        for status_key in [
            "second_payment_received",
            "shipped_to_client",
            "delivered_to_client",
            "cycle_closed",
        ]:
            order = update_order_status(order["id"], status_key)

        self.assertEqual(list_orders(), [])
        self.assertEqual(len(list_orders(include_closed=True)), 1)

    def test_dashboard_summary_includes_sales_payments_expenses_and_receivables(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        quote = QuoteInput.from_dict(
            {
                "product_name": "MacBook Pro",
                "client_name": "Valeria",
                "price_usd_net": 1200,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 30,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 120000,
                "desired_margin_percent": 30,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=2_000_000)
        order = self._advance_order_to_client_notified(order["id"])
        order = register_second_payment(order["id"], amount_cop=500_000, received_at=today)
        expense = save_expense(
            {
                "expense_date": today,
                "category_key": "advertising",
                "concept": "Campana Meta Ads",
                "amount_cop": 180000,
                "notes": "Impulso de la semana",
            }
        )

        summary = build_dashboard_summary(period_key="daily", reference_date=today)
        metrics = summary["metrics"]

        self.assertAlmostEqual(metrics["sales_total_cop"], order["sale_price_cop"])
        self.assertAlmostEqual(metrics["cash_in_total_cop"], 2_500_000)
        self.assertAlmostEqual(
            metrics["product_cost_total_cop"],
            result["costs"]["cost_in_cop"]
            - result["costs"]["travel_cost_cop"]
            - result["costs"]["locker_shipping_cop"],
        )
        self.assertAlmostEqual(
            metrics["locker_shipping_total_cop"],
            result["costs"]["locker_shipping_cop"],
        )
        self.assertAlmostEqual(
            metrics["travel_cost_total_cop"],
            result["costs"]["travel_cost_cop"],
        )
        self.assertAlmostEqual(metrics["period_balance_due_cop"], order["balance_due_cop"])
        self.assertAlmostEqual(metrics["accounts_receivable_cop"], order["balance_due_cop"])
        self.assertAlmostEqual(
            metrics["gross_profit_cop"],
            result["final"]["profit_cop"],
        )
        self.assertAlmostEqual(metrics["expenses_total_cop"], expense["amount_cop"])
        self.assertAlmostEqual(
            metrics["net_profit_cop"],
            result["final"]["profit_cop"] - expense["amount_cop"],
        )
        self.assertEqual(summary["expenses_by_category"][0]["category_key"], "advertising")

    def test_dashboard_tracks_inventory_investment_separately_from_expenses(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        product = save_product(
            {
                "name": "Sueter para stock",
                "reference": "SWT-STOCK",
                "category": "Sueters",
                "store": "FerShop tienda",
                "inventory_enabled": False,
                "initial_stock_quantity": 0,
                "price_usd_net": 20,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 3,
                "notes": "",
            }
        )
        purchase = save_inventory_purchase(
            {
                "purchase_date": today,
                "supplier_name": "Compra inventario",
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": 2,
                        "unit_cost_cop": 180000,
                    }
                ],
            }
        )
        save_expense(
            {
                "expense_date": today,
                "category_key": "advertising",
                "concept": "Anuncio Instagram",
                "amount_cop": 90000,
                "notes": "",
            }
        )

        summary = build_dashboard_summary(period_key="daily", reference_date=today)

        self.assertAlmostEqual(summary["metrics"]["inventory_investment_cop"], purchase["total_amount_cop"])
        self.assertAlmostEqual(summary["metrics"]["expenses_total_cop"], 90000)
        self.assertEqual(summary["recent_expenses"][0]["category_key"], "advertising")

    def test_dashboard_exposes_rankings_by_client_and_product(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()

        quote_1 = QuoteInput.from_dict(
            {
                "product_name": "iPhone 16",
                "client_name": "Laura",
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 28,
                "advance_percent": 50,
            }
        )
        result_1 = calculate_quote(quote_1)
        record_1 = save_quote(quote_1.to_dict(), result_1)
        order_1, _ = create_order_from_quote(record_1["id"], advance_paid_cop=1_000_000)
        order_1 = self._advance_order_to_client_notified(order_1["id"])
        order_1 = register_second_payment(order_1["id"], amount_cop=300_000, received_at=today)

        quote_2 = QuoteInput.from_dict(
            {
                "product_name": "AirPods Max",
                "client_name": "Laura",
                "price_usd_net": 450,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 18,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 50000,
                "desired_margin_percent": 34,
                "advance_percent": 40,
            }
        )
        result_2 = calculate_quote(quote_2)
        record_2 = save_quote(quote_2.to_dict(), result_2)
        order_2, _ = create_order_from_quote(record_2["id"], advance_paid_cop=200_000)
        order_2 = self._advance_order_to_client_notified(order_2["id"])

        quote_3 = QuoteInput.from_dict(
            {
                "product_name": "iPhone 16",
                "client_name": "Andres",
                "price_usd_net": 900,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 22,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 95000,
                "desired_margin_percent": 20,
                "advance_percent": 30,
            }
        )
        result_3 = calculate_quote(quote_3)
        record_3 = save_quote(quote_3.to_dict(), result_3)
        reduced_balance_advance = max(float(result_3["final"]["sale_price_cop"]) - 150_000, 0)
        order_3, _ = create_order_from_quote(record_3["id"], advance_paid_cop=reduced_balance_advance)

        summary = build_dashboard_summary(period_key="daily", reference_date=today)

        client_insights = summary["client_insights"]
        top_buyer = client_insights["top_buyers"][0]
        self.assertEqual(top_buyer["client_name"], "Laura")
        self.assertEqual(top_buyer["orders_count"], 2)
        self.assertAlmostEqual(
            top_buyer["sales_total_cop"],
            order_1["sale_price_cop"] + order_2["sale_price_cop"],
        )
        self.assertAlmostEqual(
            top_buyer["accounts_receivable_cop"],
            order_1["balance_due_cop"] + order_2["balance_due_cop"],
        )

        top_receivable = client_insights["receivables"][0]
        self.assertEqual(top_receivable["client_name"], "Laura")
        self.assertAlmostEqual(
            top_receivable["accounts_receivable_cop"],
            order_1["balance_due_cop"] + order_2["balance_due_cop"],
        )
        self.assertGreater(
            top_receivable["accounts_receivable_cop"],
            order_3["balance_due_cop"],
        )

        product_insights = summary["product_insights"]
        top_seller = product_insights["top_sellers"][0]
        self.assertEqual(top_seller["product_name"], "iPhone 16")
        self.assertEqual(top_seller["orders_count"], 2)
        self.assertAlmostEqual(
            top_seller["sales_total_cop"],
            order_1["sale_price_cop"] + order_3["sale_price_cop"],
        )

        most_profitable = product_insights["most_profitable"][0]
        self.assertEqual(most_profitable["product_name"], "iPhone 16")
        self.assertAlmostEqual(
            most_profitable["gross_profit_cop"],
            result_1["final"]["profit_cop"] + result_3["final"]["profit_cop"],
        )

    def test_client_detail_rolls_up_quotes_orders_and_products(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        client = save_client({"name": "Laura", "city": "Bogota", "preferred_contact_channel": "WhatsApp"})
        other_client = save_client({"name": "Camilo"})
        iphone = save_product(
            {
                "name": "iPhone 16",
                "reference": "A18",
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "local_costs_cop": 100000,
                "notes": "",
            }
        )
        airpods = save_product(
            {
                "name": "AirPods Pro",
                "reference": "USB-C",
                "price_usd_net": 240,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 12,
                "local_costs_cop": 30000,
                "notes": "",
            }
        )

        quote_1 = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_id": iphone["id"],
                "product_name": iphone["name"],
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 28,
                "advance_percent": 50,
            }
        )
        result_1 = calculate_quote(quote_1)
        record_1 = save_quote(quote_1.to_dict(), result_1)
        order_1, _ = create_order_from_quote(record_1["id"], advance_paid_cop=1_800_000)
        order_1 = self._advance_order_to_client_notified(order_1["id"])
        order_1 = register_second_payment(order_1["id"], amount_cop=300_000, received_at=today)

        quote_2 = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_id": airpods["id"],
                "product_name": airpods["name"],
                "price_usd_net": 240,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 12,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 30000,
                "desired_margin_percent": 30,
                "advance_percent": 40,
            }
        )
        result_2 = calculate_quote(quote_2)
        save_quote(quote_2.to_dict(), result_2)

        quote_3 = QuoteInput.from_dict(
            {
                "client_id": other_client["id"],
                "client_name": other_client["name"],
                "product_id": iphone["id"],
                "product_name": iphone["name"],
                "price_usd_net": 900,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 18,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 85000,
                "desired_margin_percent": 18,
                "advance_percent": 30,
            }
        )
        result_3 = calculate_quote(quote_3)
        record_3 = save_quote(quote_3.to_dict(), result_3)
        create_order_from_quote(record_3["id"])

        detail = get_client_detail(client["id"])

        self.assertIsNotNone(detail)
        self.assertEqual(detail["client"]["name"], "Laura")
        self.assertEqual(detail["summary"]["quotes_count"], 2)
        self.assertEqual(detail["summary"]["orders_count"], 1)
        self.assertEqual(detail["summary"]["open_orders_count"], 1)
        self.assertAlmostEqual(detail["summary"]["sales_total_cop"], order_1["sale_price_cop"])
        self.assertAlmostEqual(detail["summary"]["cash_in_total_cop"], 2_100_000)
        self.assertAlmostEqual(
            detail["summary"]["accounts_receivable_cop"],
            order_1["balance_due_cop"],
        )
        self.assertAlmostEqual(detail["summary"]["conversion_rate_percent"], 0.5)
        self.assertEqual(len(detail["active_orders"]), 1)
        self.assertEqual(detail["active_orders"][0]["id"], order_1["id"])
        self.assertEqual(detail["top_products"][0]["product_name"], "iPhone 16")
        self.assertEqual(detail["recent_orders"][0]["id"], order_1["id"])
        self.assertEqual(detail["recent_quotes"][0]["client_name"], "Laura")

    def test_client_detail_filters_orders_and_quotes_by_selected_period(self) -> None:
        today_date = datetime.now(timezone.utc).date()
        today = today_date.isoformat()
        previous_date = (today_date - timedelta(days=35)).isoformat()

        client = save_client({"name": "Laura", "city": "Bogota"})
        iphone = save_product(
            {
                "name": "iPhone 16",
                "reference": "A18",
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "notes": "",
            }
        )
        airpods = save_product(
            {
                "name": "AirPods Max",
                "reference": "APM",
                "price_usd_net": 240,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 12,
                "notes": "",
            }
        )

        old_quote = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_id": iphone["id"],
                "product_name": iphone["name"],
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 28,
                "advance_percent": 50,
            }
        )
        old_result = calculate_quote(old_quote)
        old_record = save_quote(old_quote.to_dict(), old_result)
        old_order, _ = create_order_from_quote(old_record["id"], advance_paid_cop=1_800_000)

        recent_quote = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_id": airpods["id"],
                "product_name": airpods["name"],
                "price_usd_net": 240,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 12,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 30000,
                "desired_margin_percent": 30,
                "advance_percent": 40,
            }
        )
        recent_result = calculate_quote(recent_quote)
        recent_record = save_quote(recent_quote.to_dict(), recent_result)
        recent_order, _ = create_order_from_quote(recent_record["id"], advance_paid_cop=600_000)

        with database._connect() as connection:
            connection.execute(
                "UPDATE quotes SET created_at = ? WHERE id = ?",
                (previous_date, old_record["id"]),
            )
            connection.execute(
                "UPDATE orders SET created_at = ? WHERE id = ?",
                (previous_date, old_order["id"]),
            )
            connection.commit()

        detail = get_client_detail(client["id"], period_key="daily", reference_date=today)

        self.assertIsNotNone(detail)
        self.assertEqual(detail["period"]["key"], "daily")
        self.assertEqual(detail["summary"]["quotes_count"], 1)
        self.assertEqual(detail["summary"]["orders_count"], 1)
        self.assertAlmostEqual(detail["summary"]["sales_total_cop"], recent_order["sale_price_cop"])
        self.assertEqual(detail["top_products"][0]["product_name"], "AirPods Max")
        self.assertEqual(detail["recent_quotes"][0]["id"], recent_record["id"])
        self.assertEqual(detail["recent_orders"][0]["id"], recent_order["id"])

    def test_product_detail_rolls_up_quotes_orders_and_clients(self) -> None:
        today = datetime.now(timezone.utc).date().isoformat()
        laura = save_client({"name": "Laura", "city": "Bogota"})
        camilo = save_client({"name": "Camilo", "city": "Medellin"})
        iphone = save_product(
            {
                "name": "iPhone 16",
                "reference": "A18",
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "local_costs_cop": 100000,
                "notes": "",
            }
        )
        macbook = save_product(
            {
                "name": "MacBook Air",
                "reference": "M4",
                "price_usd_net": 1250,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 30,
                "local_costs_cop": 120000,
                "notes": "",
            }
        )

        quote_1 = QuoteInput.from_dict(
            {
                "client_id": laura["id"],
                "client_name": laura["name"],
                "product_id": iphone["id"],
                "product_name": iphone["name"],
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 28,
                "advance_percent": 50,
            }
        )
        result_1 = calculate_quote(quote_1)
        record_1 = save_quote(quote_1.to_dict(), result_1)
        order_1, _ = create_order_from_quote(record_1["id"], advance_paid_cop=1_800_000)
        order_1 = self._advance_order_to_client_notified(order_1["id"])
        order_1 = register_second_payment(order_1["id"], amount_cop=300_000, received_at=today)

        quote_2 = QuoteInput.from_dict(
            {
                "client_id": camilo["id"],
                "client_name": camilo["name"],
                "product_id": iphone["id"],
                "product_name": iphone["name"],
                "price_usd_net": 1100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 100000,
                "desired_margin_percent": 24,
                "advance_percent": 40,
            }
        )
        result_2 = calculate_quote(quote_2)
        record_2 = save_quote(quote_2.to_dict(), result_2)
        order_2, _ = create_order_from_quote(record_2["id"], advance_paid_cop=1_000_000)
        order_2 = self._advance_order_to_client_notified(order_2["id"])

        quote_3 = QuoteInput.from_dict(
            {
                "client_id": laura["id"],
                "client_name": laura["name"],
                "product_id": macbook["id"],
                "product_name": macbook["name"],
                "price_usd_net": 1250,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 30,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 120000,
                "desired_margin_percent": 26,
                "advance_percent": 50,
            }
        )
        result_3 = calculate_quote(quote_3)
        save_quote(quote_3.to_dict(), result_3)

        detail = get_product_detail(iphone["id"])

        self.assertIsNotNone(detail)
        self.assertEqual(detail["product"]["name"], "iPhone 16")
        self.assertEqual(detail["summary"]["quotes_count"], 2)
        self.assertEqual(detail["summary"]["orders_count"], 2)
        self.assertEqual(detail["summary"]["open_orders_count"], 2)
        self.assertAlmostEqual(
            detail["summary"]["sales_total_cop"],
            order_1["sale_price_cop"] + order_2["sale_price_cop"],
        )
        self.assertAlmostEqual(
            detail["summary"]["cash_in_total_cop"],
            2_100_000 + 1_000_000,
        )
        self.assertAlmostEqual(
            detail["summary"]["accounts_receivable_cop"],
            order_1["balance_due_cop"] + order_2["balance_due_cop"],
        )
        self.assertAlmostEqual(detail["summary"]["conversion_rate_percent"], 1.0)
        self.assertEqual(detail["top_clients"][0]["client_name"], "Laura")
        self.assertEqual(detail["top_clients"][0]["orders_count"], 1)
        self.assertEqual(detail["recent_orders"][0]["id"], order_2["id"])
        self.assertEqual(detail["recent_quotes"][0]["client_name"], "Camilo")

    def test_followup_summary_collects_pending_quotes_orders_and_receivables(self) -> None:
        today = datetime.now(timezone.utc).date()
        client = save_client({"name": "Sara"})

        save_pending_request(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "title": "Bolso negro premium",
                "quantity": 1,
                "priority_key": "urgent",
                "status_key": "searching",
                "due_date": today.fromordinal(today.toordinal() - 1).isoformat(),
            }
        )
        save_pending_request(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "title": "Tenis blancos minimalistas",
                "quantity": 1,
                "priority_key": "high",
                "status_key": "ready_to_quote",
                "due_date": today.isoformat(),
            }
        )

        quote_open = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_name": "Bolso negro premium",
                "price_usd_net": 85,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        open_record = save_quote(quote_open.to_dict(), calculate_quote(quote_open))
        self.keepalive.execute(
            "UPDATE quotes SET created_at = ? WHERE id = ?",
            ((today.fromordinal(today.toordinal() - 3)).isoformat() + "T10:00:00+00:00", open_record["id"]),
        )
        self.keepalive.commit()

        quote_order = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_name": "Tenis blancos minimalistas",
                "price_usd_net": 110,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 7,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 40,
            }
        )
        order_record = save_quote(quote_order.to_dict(), calculate_quote(quote_order))
        order, _ = create_order_from_quote(order_record["id"], advance_paid_cop=200_000)
        order = self._advance_order_to_client_notified(order["id"])
        self.keepalive.execute(
            "UPDATE order_events SET created_at = ? WHERE order_id = ?",
            ((today.fromordinal(today.toordinal() - 5)).isoformat() + "T09:00:00+00:00", order["id"]),
        )
        self.keepalive.commit()

        summary = build_followup_summary(reference_date=today.isoformat())
        metrics = summary["metrics"]

        self.assertEqual(metrics["active_pending_count"], 2)
        self.assertEqual(metrics["overdue_pending_count"], 1)
        self.assertEqual(metrics["due_today_count"], 1)
        self.assertEqual(metrics["ready_to_quote_count"], 1)
        self.assertEqual(metrics["open_quotes_count"], 1)
        self.assertEqual(metrics["quotes_followup_count"], 1)
        self.assertEqual(metrics["active_orders_count"], 1)
        self.assertEqual(metrics["stalled_orders_count"], 1)
        self.assertEqual(metrics["clients_with_balance_count"], 1)
        self.assertAlmostEqual(metrics["accounts_receivable_cop"], order["balance_due_cop"])
        self.assertEqual(summary["pending_dashboard"]["overdue"][0]["title"], "Bolso negro premium")
        self.assertEqual(
            summary["pending_dashboard"]["ready_to_quote"][0]["title"],
            "Tenis blancos minimalistas",
        )
        self.assertEqual(
            summary["quote_dashboard"]["needs_followup"][0]["product_name"],
            "Bolso negro premium",
        )
        self.assertEqual(
            summary["order_dashboard"]["stalled_orders"][0]["product_name"],
            "Tenis blancos minimalistas",
        )
        self.assertTrue(summary["agenda"]["today"])


if __name__ == "__main__":
    unittest.main()
