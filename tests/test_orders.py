import sqlite3
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote, calculate_quote_bundle
from fershop_calculadora.database import (
    create_direct_order,
    delete_order,
    create_order_status,
    create_order_from_quote,
    get_quote,
    invalidate_order,
    list_orders,
    list_order_statuses,
    register_second_payment,
    save_product,
    update_confirmed_order,
    update_order_travel_transport,
    update_order_status,
)
import fershop_calculadora.database as database
from fershop_calculadora.orders import (
    apply_second_payment,
    build_order_from_quote,
    get_next_status,
    get_status_label,
    get_travel_transport_label,
    is_valid_order_status,
    list_default_order_statuses,
    normalize_travel_transport_type,
)


class OrderWorkflowTests(unittest.TestCase):
    def test_status_flow_has_next_step(self) -> None:
        statuses = list_default_order_statuses()
        self.assertEqual(get_next_status("quote_confirmed", statuses=statuses), "received_at_locker")
        self.assertEqual(get_status_label("cycle_closed", statuses=statuses), "Ciclo cerrado")
        self.assertTrue(is_valid_order_status("customs_review", statuses=statuses))
        self.assertFalse(is_valid_order_status("second_payment_pending", statuses=statuses))

    def test_build_order_from_quote_uses_final_amounts(self) -> None:
        quote_record = {
            "id": 12,
            "client_name": "Laura",
            "product_name": "iPhone 15",
            "notes": "Entrega express",
            "input": {"client_id": 5, "product_id": 8},
            "result": {
                "final": {
                    "sale_price_cop": 4900000,
                    "advance_cop": 2450000,
                }
            },
        }

        order = build_order_from_quote(quote_record)
        self.assertEqual(order["quote_id"], 12)
        self.assertEqual(order["client_id"], 5)
        self.assertEqual(order["product_id"], 8)
        self.assertEqual(order["status_key"], "quote_confirmed")
        self.assertEqual(order["balance_due_cop"], 2450000)

    def test_build_order_from_quote_allows_real_advance_override(self) -> None:
        quote_record = {
            "id": 13,
            "client_name": "Laura",
            "product_name": "iPhone 15",
            "notes": "",
            "input": {},
            "result": {
                "final": {
                    "sale_price_cop": 4900000,
                    "advance_cop": 2450000,
                }
            },
        }

        order = build_order_from_quote(quote_record, advance_paid_cop=1470000)
        self.assertEqual(order["quoted_advance_cop"], 2450000)
        self.assertEqual(order["advance_paid_cop"], 1470000)
        self.assertEqual(order["balance_due_cop"], 3430000)

    def test_build_order_from_travel_quote_starts_with_route_pending(self) -> None:
        quote_record = {
            "id": 15,
            "client_name": "Laura",
            "product_name": "Compra viaje",
            "notes": "",
            "input": {"purchase_type": "travel"},
            "result": {
                "final": {
                    "sale_price_cop": 1000000,
                    "advance_cop": 500000,
                }
            },
        }

        order = build_order_from_quote(quote_record)
        self.assertEqual(order["travel_transport_type"], "undecided")
        self.assertEqual(get_travel_transport_label(order["travel_transport_type"]), "Por definir")

    def test_normalize_travel_transport_type_rejects_invalid_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "ruta del producto"):
            normalize_travel_transport_type("avion", purchase_type="travel")

    def test_build_order_from_quote_rejects_advance_over_total(self) -> None:
        quote_record = {
            "id": 14,
            "client_name": "Laura",
            "product_name": "iPhone 15",
            "notes": "",
            "input": {},
            "result": {
                "final": {
                    "sale_price_cop": 4900000,
                    "advance_cop": 2450000,
                }
            },
        }

        with self.assertRaisesRegex(ValueError, "no puede ser mayor"):
            build_order_from_quote(quote_record, advance_paid_cop=5000000)

    def test_apply_second_payment_updates_balance_and_status(self) -> None:
        order_record = {
            "status_key": "client_notified",
            "balance_due_cop": 3430000,
            "second_payment_amount_cop": 0,
        }

        update = apply_second_payment(order_record, amount_cop=1430000, received_at="2026-04-05")
        self.assertEqual(update["second_payment_amount_cop"], 1430000)
        self.assertEqual(update["second_payment_received_at"], "2026-04-05")
        self.assertEqual(update["balance_due_cop"], 2000000)

    def test_apply_second_payment_closes_balance_when_fully_paid(self) -> None:
        order_record = {
            "status_key": "client_notified",
            "balance_due_cop": 980000,
            "second_payment_amount_cop": 250000,
        }

        update = apply_second_payment(order_record, amount_cop=980000, received_at="2026-04-06")
        self.assertEqual(update["second_payment_amount_cop"], 1230000)
        self.assertEqual(update["balance_due_cop"], 0)

    def test_apply_second_payment_rejects_invalid_amounts(self) -> None:
        with self.assertRaisesRegex(ValueError, "mayor a cero"):
            apply_second_payment(
                {"balance_due_cop": 300000, "second_payment_amount_cop": 0},
                amount_cop=0,
                received_at="2026-04-05",
            )

        with self.assertRaisesRegex(ValueError, "mayor al saldo pendiente"):
            apply_second_payment(
                {"balance_due_cop": 300000, "second_payment_amount_cop": 0},
                amount_cop=350000,
                received_at="2026-04-05",
            )


class OrderPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.db_uri = f"file:test-orders-{id(self)}?mode=memory&cache=shared"
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

    def test_register_second_payment_persists_amount_date_and_event(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "MacBook Air",
                "client_name": "Andrea",
                "price_usd_net": 1000,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 25,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 80000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, existing = create_order_from_quote(record["id"], advance_paid_cop=2500000)

        self.assertFalse(existing)
        updated = register_second_payment(order["id"], amount_cop=1000000, received_at="2026-04-07")

        self.assertEqual(updated["second_payment_amount_cop"], 1000000)
        self.assertEqual(updated["second_payment_received_at"], "2026-04-07")
        self.assertEqual(updated["status_key"], "quote_confirmed")
        self.assertEqual(updated["balance_due_cop"], order["balance_due_cop"] - 1000000)
        self.assertIn("Fecha reportada: 2026-04-07", updated["events"][-1]["note"])

    def test_create_order_from_quote_can_override_real_purchase_price(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Bolso premium",
                "client_name": "Andrea",
                "price_usd_net": 100,
                "tax_usa_percent": 0,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 0,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
                "final_sale_price_cop": 700000,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)

        order, existing = create_order_from_quote(
            record["id"],
            advance_paid_cop=350000,
            actual_purchase_prices=[
                {
                    "product_name": "Bolso premium",
                    "price_usd_net": 85,
                }
            ],
        )

        self.assertFalse(existing)
        self.assertAlmostEqual(order["snapshot"]["result"]["costs"]["real_total_cost_cop"], 340000)
        self.assertAlmostEqual(order["snapshot"]["result"]["final"]["profit_cop"], 360000)

    def test_create_order_from_multi_product_quote_keeps_bundle_snapshot(self) -> None:
        bundle_result = calculate_quote_bundle(
            {
                "client_name": "Andrea",
                "quote_items": [
                    {
                        "product_name": "Sueter basico",
                        "quantity": 3,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Sueter basico",
                                "client_name": "Andrea",
                                "quantity": 3,
                                "purchase_type": "travel",
                                "price_usd_net": 20,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 5,
                                "locker_shipping_usd": 2,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 10000,
                                "desired_margin_percent": 25,
                                "advance_percent": 50,
                            }
                        ).to_dict(),
                    },
                    {
                        "product_name": "Zapato",
                        "quantity": 1,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Zapato",
                                "client_name": "Andrea",
                                "quantity": 1,
                                "purchase_type": "travel",
                                "price_usd_net": 30,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 5,
                                "locker_shipping_usd": 3,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 12000,
                                "desired_margin_percent": 25,
                                "advance_percent": 50,
                            }
                        ).to_dict(),
                    },
                ],
            }
        )
        record = database.save_quote(bundle_result["input"], bundle_result)

        order, existing = create_order_from_quote(
            record["id"],
            advance_paid_cop=bundle_result["final"]["advance_cop"],
            actual_purchase_prices=[
                {
                    "quote_item_index": 0,
                    "product_name": "Sueter basico",
                    "price_usd_net": 18,
                },
                {
                    "quote_item_index": 1,
                    "product_name": "Zapato",
                    "price_usd_net": 28,
                },
            ],
        )

        self.assertFalse(existing)
        self.assertEqual(order["status_key"], "quote_confirmed")
        self.assertEqual(order["product_name"], "2 productos / 4 unidades")
        self.assertEqual(len(order["snapshot"]["input"]["quote_items"]), 2)

    def test_create_direct_order_creates_internal_quote_and_order(self) -> None:
        bundle_result = calculate_quote_bundle(
            {
                "client_name": "Andrea",
                "quote_items": [
                    {
                        "product_name": "Sueter basico",
                        "quantity": 2,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Sueter basico",
                                "client_name": "Andrea",
                                "quantity": 2,
                                "purchase_type": "travel",
                                "price_usd_net": 18,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 5,
                                "locker_shipping_usd": 2,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 10000,
                                "desired_margin_percent": 25,
                                "advance_percent": 40,
                                "final_sale_price_cop": 280000,
                            }
                        ).to_dict(),
                    },
                    {
                        "product_name": "Zapato casual",
                        "quantity": 1,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Zapato casual",
                                "client_name": "Andrea",
                                "quantity": 1,
                                "purchase_type": "travel",
                                "price_usd_net": 35,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 6,
                                "locker_shipping_usd": 3,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 12000,
                                "desired_margin_percent": 25,
                                "advance_percent": 40,
                                "final_sale_price_cop": 360000,
                            }
                        ).to_dict(),
                    },
                ],
            }
        )

        order, quote_record = create_direct_order(
            bundle_result["input"],
            bundle_result,
            advance_paid_cop=256000,
        )

        self.assertGreater(quote_record["id"], 0)
        self.assertEqual(order["quote_id"], quote_record["id"])
        self.assertEqual(order["status_key"], "quote_confirmed")
        self.assertEqual(order["product_name"], "2 productos / 3 unidades")
        self.assertAlmostEqual(order["sale_price_cop"], 640000)
        self.assertAlmostEqual(order["advance_paid_cop"], 256000)
        self.assertAlmostEqual(order["balance_due_cop"], 384000)
        self.assertEqual(len(order["snapshot"]["input"]["quote_items"]), 2)

    def test_create_direct_order_can_store_selected_purchase_date(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Sueter basico",
                "client_name": "Andrea",
                "quantity": 1,
                "purchase_type": "online",
                "price_usd_net": 20,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 3,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
                "final_sale_price_cop": 150000,
            }
        )
        result = calculate_quote(quote)

        order, quote_record = create_direct_order(
            quote.to_dict(),
            result,
            advance_paid_cop=75000,
            created_at="2026-04-18",
        )

        fetched_quote = get_quote(quote_record["id"])

        self.assertTrue(str(quote_record["created_at"]).startswith("2026-04-18T"))
        self.assertTrue(str(order["created_at"]).startswith("2026-04-18T"))
        self.assertIsNotNone(fetched_quote)
        self.assertTrue(str(fetched_quote["created_at"]).startswith("2026-04-18T"))

    def test_travel_purchase_can_store_transport_route(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Compra viaje",
                "client_name": "Andrea",
                "purchase_type": "travel",
                "price_usd_net": 100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 20,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 50000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, existing = create_order_from_quote(record["id"], advance_paid_cop=300000)

        self.assertFalse(existing)
        self.assertEqual(order["travel_transport_type"], "undecided")

        updated = update_order_travel_transport(order["id"], "luggage")
        self.assertEqual(updated["travel_transport_type"], "luggage")
        self.assertEqual(updated["travel_transport_label"], "Maleta")
        self.assertIn("Ruta del producto actualizada", updated["events"][-1]["note"])

    def test_update_confirmed_order_can_adjust_trm_price_and_advance(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Bolso premium",
                "client_name": "Andrea",
                "price_usd_net": 100,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
                "final_sale_price_cop": 850000,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=300000)

        updated = update_confirmed_order(
            order["id"],
            exchange_rate_cop=4200,
            advance_paid_cop=320000,
            notes="Compra ajustada por descuento final.",
            quote_item_updates=[
                {
                    "quote_item_index": 0,
                    "product_name": "Bolso premium",
                    "price_usd_net": 90,
                    "tax_usa_percent": 5,
                    "locker_shipping_usd": 8,
                    "final_sale_price_cop": 900000,
                }
            ],
            actual_purchase_prices=[
                {
                    "quote_item_index": 0,
                    "product_name": "Bolso premium",
                    "price_usd_net": 90,
                }
            ],
        )

        self.assertEqual(updated["advance_paid_cop"], 320000)
        self.assertEqual(updated["notes"], "Compra ajustada por descuento final.")
        self.assertAlmostEqual(updated["sale_price_cop"], 900000)
        self.assertAlmostEqual(updated["balance_due_cop"], 580000)
        self.assertAlmostEqual(updated["snapshot"]["input"]["exchange_rate_cop"], 4200)
        self.assertAlmostEqual(updated["snapshot"]["input"]["price_usd_net"], 90)
        self.assertAlmostEqual(updated["snapshot"]["input"]["tax_usa_percent"], 5)
        self.assertAlmostEqual(updated["snapshot"]["input"]["locker_shipping_usd"], 8)
        self.assertIn("Compra editada", updated["events"][-1]["note"])

    def test_update_confirmed_order_can_adjust_general_discount_on_bundle_order(self) -> None:
        bundle_result = calculate_quote_bundle(
            {
                "client_name": "Andrea",
                "general_discount_cop": 20000,
                "quote_items": [
                    {
                        "product_name": "Sueter basico",
                        "quantity": 1,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Sueter basico",
                                "client_name": "Andrea",
                                "quantity": 1,
                                "purchase_type": "travel",
                                "price_usd_net": 20,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 5,
                                "locker_shipping_usd": 2,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 10000,
                                "desired_margin_percent": 25,
                                "advance_percent": 40,
                                "final_sale_price_cop": 220000,
                            }
                        ).to_dict(),
                    },
                    {
                        "product_name": "Zapato casual",
                        "quantity": 1,
                        "input": QuoteInput.from_dict(
                            {
                                "product_name": "Zapato casual",
                                "client_name": "Andrea",
                                "quantity": 1,
                                "purchase_type": "travel",
                                "price_usd_net": 30,
                                "tax_usa_percent": 0,
                                "travel_cost_usd": 6,
                                "locker_shipping_usd": 3,
                                "exchange_rate_cop": 4000,
                                "local_costs_cop": 12000,
                                "desired_margin_percent": 25,
                                "advance_percent": 40,
                                "final_sale_price_cop": 300000,
                            }
                        ).to_dict(),
                    },
                ],
            }
        )

        order, _ = create_direct_order(
            bundle_result["input"],
            bundle_result,
            advance_paid_cop=150000,
        )

        self.assertAlmostEqual(order["sale_price_cop"], 500000)

        updated = update_confirmed_order(
            order["id"],
            general_discount_cop=50000,
        )

        self.assertAlmostEqual(updated["sale_price_cop"], 470000)
        self.assertAlmostEqual(updated["snapshot"]["result"]["final"]["general_discount_cop"], 50000)
        self.assertIn("Descuento general", updated["events"][-1]["note"])

    def test_invalidate_order_removes_it_from_active_flow_and_reopens_quote(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Jordan 1",
                "client_name": "Laura",
                "price_usd_net": 120,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 10,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=350000)

        archived = invalidate_order(order["id"], reason="El cliente cancelo la compra.")

        self.assertEqual(archived["archive_action"], "invalidated")
        self.assertEqual(len(list_orders()), 0)
        quote_after = get_quote(record["id"])
        self.assertIsNotNone(quote_after)
        self.assertFalse(quote_after["has_order"])

        recreated, existing = create_order_from_quote(record["id"], advance_paid_cop=200000)
        self.assertFalse(existing)
        self.assertNotEqual(recreated["id"], order["id"])

    def test_delete_order_removes_it_from_active_flow_and_archives_it(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Cartera",
                "client_name": "Sofia",
                "price_usd_net": 80,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 6,
                "exchange_rate_cop": 3900,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=180000)

        archived = delete_order(order["id"], reason="Se registro por error duplicado.")

        self.assertEqual(archived["archive_action"], "deleted")
        self.assertEqual(len(list_orders()), 0)
        quote_after = get_quote(record["id"])
        self.assertIsNotNone(quote_after)
        self.assertFalse(quote_after["has_order"])

    def test_cannot_mark_second_payment_received_without_registering_it(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Apple Watch",
                "client_name": "Sara",
                "price_usd_net": 400,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 12,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 50000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=1000000)

        for status_key in [
            "received_at_locker",
            "in_international_transit",
            "customs_review",
            "in_transit_to_fershop",
            "received_by_fershop",
            "client_notified",
        ]:
            order = update_order_status(order["id"], status_key)

        with self.assertRaisesRegex(ValueError, "Registra el segundo pago"):
            update_order_status(order["id"], "second_payment_received")

    def test_cannot_jump_directly_to_a_later_status(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "AirPods",
                "client_name": "Mario",
                "price_usd_net": 200,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 10,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 30000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = database.save_quote(quote.to_dict(), result)
        order, _ = create_order_from_quote(record["id"], advance_paid_cop=500000)

        with self.assertRaisesRegex(ValueError, "siguiente estado"):
            update_order_status(order["id"], "cycle_closed")

    def test_create_order_status_inserts_after_selected_step(self) -> None:
        created = create_order_status(
            label="Listo para entrega",
            description="El pedido está listo para coordinar entrega final.",
            insert_after_key="received_by_fershop",
        )

        statuses = list_order_statuses()
        keys = [status["key"] for status in statuses]
        self.assertEqual(created["key"], "listo_para_entrega")
        self.assertEqual(keys[keys.index("received_by_fershop") + 1], "listo_para_entrega")


if __name__ == "__main__":
    unittest.main()
