import math
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote, calculate_quote_bundle
from fershop_calculadora.documents import build_quote_message, generate_quote_pdf, get_client_quote_lines


class CalculationTests(unittest.TestCase):
    def test_matches_excel_reference_case(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Producto base",
                "client_name": "Cliente demo",
                "price_usd_net": 75,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 9.5,
                "exchange_rate_cop": 3790,
                "local_costs_cop": 0,
                "desired_margin_percent": 30,
                "advance_percent": 50,
            }
        )

        result = calculate_quote(quote)

        self.assertTrue(math.isclose(result["costs"]["price_with_tax_usd"], 80.25, rel_tol=1e-9))
        self.assertTrue(math.isclose(result["costs"]["total_usd"], 89.75, rel_tol=1e-9))
        self.assertTrue(
            math.isclose(result["costs"]["real_total_cost_cop"], 340152.5, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["sale_price_cop"], 485932.1428571429, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["profit_cop"], 145779.6428571429, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["advance_cop"], 242966.07142857145, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["own_capital_cop"], 97186.42857142855, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["markup_percent"], 0.4285714285714287, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(result["suggested"]["roi_percent"], 1.5000000000000007, rel_tol=1e-9)
        )

    def test_negotiated_scenario_overrides_suggested_values(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Producto negociado",
                "price_usd_net": 75,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 9.5,
                "exchange_rate_cop": 3790,
                "local_costs_cop": 0,
                "desired_margin_percent": 30,
                "advance_percent": 50,
                "final_sale_price_cop": 490000,
                "final_advance_cop": 245000,
            }
        )

        result = calculate_quote(quote)

        self.assertTrue(
            math.isclose(result["final"]["margin_percent"], 0.3058112244897959, rel_tol=1e-9)
        )
        self.assertTrue(math.isclose(result["final"]["advance_percent"], 0.5, rel_tol=1e-9))
        self.assertTrue(math.isclose(result["final"]["profit_cop"], 149847.5, rel_tol=1e-9))
        self.assertTrue(math.isclose(result["final"]["own_capital_cop"], 95152.5, rel_tol=1e-9))

    def test_rejects_margin_of_one_hundred_percent(self) -> None:
        with self.assertRaisesRegex(ValueError, "menor al 100%"):
            QuoteInput.from_dict(
                {
                    "product_name": "Inválido",
                    "price_usd_net": 10,
                    "tax_usa_percent": 0,
                    "travel_cost_usd": 0,
                    "locker_shipping_usd": 0,
                    "exchange_rate_cop": 4000,
                    "local_costs_cop": 0,
                    "desired_margin_percent": 100,
                    "advance_percent": 50,
                }
            )

    def test_purchase_type_applies_the_right_costs(self) -> None:
        online_quote = QuoteInput.from_dict(
            {
                "product_name": "Compra online",
                "purchase_type": "online",
                "price_usd_net": 100,
                "tax_usa_percent": 10,
                "travel_cost_usd": 40,
                "locker_shipping_usd": 15,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 80000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        online_result = calculate_quote(online_quote)
        self.assertTrue(math.isclose(online_result["costs"]["total_usd"], 125, rel_tol=1e-9))
        self.assertTrue(math.isclose(online_result["costs"]["applied_travel_cost_usd"], 0, rel_tol=1e-9))
        self.assertTrue(math.isclose(online_result["costs"]["applied_local_costs_cop"], 0, rel_tol=1e-9))

        travel_quote = QuoteInput.from_dict(
            {
                "product_name": "Compra en viaje",
                "purchase_type": "travel",
                "price_usd_net": 100,
                "tax_usa_percent": 10,
                "travel_cost_usd": 40,
                "locker_shipping_usd": 15,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 80000,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        travel_result = calculate_quote(travel_quote)
        self.assertTrue(math.isclose(travel_result["costs"]["total_usd"], 165, rel_tol=1e-9))
        self.assertTrue(
            math.isclose(travel_result["costs"]["applied_locker_shipping_usd"], 15, rel_tol=1e-9)
        )
        self.assertTrue(
            math.isclose(travel_result["costs"]["applied_local_costs_cop"], 80000, rel_tol=1e-9)
        )

    def test_customer_quote_lines_fallback_to_product_and_price(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "iPhone 15 Pro Max",
                "client_name": "Jose",
                "price_usd_net": 75,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 9.5,
                "exchange_rate_cop": 3790,
                "local_costs_cop": 0,
                "desired_margin_percent": 30,
                "advance_percent": 50,
            }
        )

        result = calculate_quote(quote)
        record = {
            "created_at": "2026-04-05T14:00:00+00:00",
            "client_name": quote.client_name,
            "product_name": quote.product_name,
            "notes": quote.notes,
            "input": quote.to_dict(),
            "result": result,
        }

        lines = get_client_quote_lines(record)
        self.assertEqual(len(lines), 1)
        self.assertIn("iPhone 15 Pro Max", lines[0])

    def test_whatsapp_message_and_pdf_include_client_quote_data(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Combo Apple",
                "client_name": "Laura",
                "notes": "Entrega estimada en 8 dias.",
                "client_quote_items_text": "iPhone 15 Pro Max - $4.900.000 COP\nAirPods Pro - $1.350.000 COP",
                "price_usd_net": 75,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 9.5,
                "exchange_rate_cop": 3790,
                "local_costs_cop": 0,
                "desired_margin_percent": 30,
                "advance_percent": 50,
                "final_sale_price_cop": 490000,
                "final_advance_cop": 245000,
            }
        )
        result = calculate_quote(quote)
        record = {
            "created_at": "2026-04-05T14:00:00+00:00",
            "client_name": quote.client_name,
            "product_name": quote.product_name,
            "notes": quote.notes,
            "input": quote.to_dict(),
            "result": result,
        }

        message = build_quote_message(record)
        self.assertIn("Laura", message)
        self.assertIn("iPhone 15 Pro Max - $4.900.000 COP", message)
        self.assertIn("Anticipo para realizar la compra: $245.000 COP", message)

        pdf_bytes = generate_quote_pdf(record)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))
        self.assertGreater(len(pdf_bytes), 500)
        self.assertIn(b"/WinAnsiEncoding", pdf_bytes)
        self.assertNotIn(b"FEFF", pdf_bytes)

    def test_broken_autofilled_quote_text_falls_back_to_real_product_names(self) -> None:
        bundle = calculate_quote_bundle(
            {
                "client_name": "Valentina",
                "client_quote_items_text": "Productos y precios:\n- undefined (M4 13)\n- 4 x undefine",
                "quote_items": [
                    {
                        "input": {
                            "product_id": 21,
                            "product_name": "Sueter basico",
                            "reference": "M4 13",
                            "quantity": 4,
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
                            "product_id": 22,
                            "product_name": "Polo clasico",
                            "reference": "PO-10",
                            "quantity": 2,
                            "purchase_type": "online",
                            "price_usd_net": 24,
                            "tax_usa_percent": 7,
                            "travel_cost_usd": 0,
                            "locker_shipping_usd": 3,
                            "exchange_rate_cop": 4000,
                            "local_costs_cop": 0,
                            "desired_margin_percent": 25,
                            "advance_percent": 50,
                        }
                    },
                ],
            }
        )
        record = {
            "client_name": "Valentina",
            "product_name": bundle["input"]["product_name"],
            "input": bundle["input"],
            "result": bundle,
        }

        lines = get_client_quote_lines(record)
        self.assertEqual(len(lines), 2)
        self.assertIn("Sueter basico (M4 13)", lines[0])
        self.assertIn("Polo clasico (PO-10)", lines[1])

        message = build_quote_message(record)
        self.assertNotIn("undefined", message.casefold())
        self.assertIn("Sueter basico (M4 13)", message)

    def test_pdf_can_embed_company_logo_for_formal_quote(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Sueter basico",
                "client_name": "Laura",
                "price_usd_net": 75,
                "tax_usa_percent": 7,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 9.5,
                "exchange_rate_cop": 3790,
                "local_costs_cop": 0,
                "desired_margin_percent": 30,
                "advance_percent": 50,
            }
        )
        result = calculate_quote(quote)
        record = {
            "id": 12,
            "created_at": "2026-04-05T14:00:00+00:00",
            "client_name": quote.client_name,
            "product_name": quote.product_name,
            "notes": quote.notes,
            "input": quote.to_dict(),
            "result": result,
        }

        pdf_bytes = generate_quote_pdf(
            record,
            company={
                "brand_name": "FerShop USA",
                "tagline": "Compras internacionales con seguimiento claro",
                "logo_path": "/static/assets/fershop-logo-crop.jpg",
            },
        )
        self.assertIn(b"/Subtype /Image", pdf_bytes)
        self.assertIn(b"/DCTDecode", pdf_bytes)
        self.assertIn(b"FerShop USA", pdf_bytes)
        self.assertNotIn(b"Documento formal para compartir con tu cliente", pdf_bytes)
        self.assertNotIn(b"Cotizacion comercial", pdf_bytes)
        self.assertIn(b"Condiciones comerciales", pdf_bytes)
        self.assertIn(b"Saldo pendiente estimado", pdf_bytes)

    def test_multi_product_quote_returns_line_breakdown_and_document_lines(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "client_name": "Jose",
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
                        "product_id": 11,
                        "product_name": "Polo clasico",
                        "quantity": 2,
                        "unit_price_usd_net": 24,
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
                "exchange_rate_cop": 4000,
                "travel_cost_usd": 0,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )

        result = calculate_quote(quote)
        record = {
            "created_at": "2026-04-05T14:00:00+00:00",
            "client_name": quote.client_name,
            "product_name": quote.product_name,
            "notes": quote.notes,
            "input": quote.to_dict(),
            "result": result,
        }

        self.assertEqual(len(result["line_items"]), 3)
        self.assertIn("Sueter basico x3", quote.product_name)

        lines = get_client_quote_lines(record)
        self.assertEqual(len(lines), 3)
        self.assertIn("3 x Sueter basico", lines[0])

    def test_single_product_quantity_keeps_individual_calculation_mode(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_name": "Sueter basico",
                "quantity": 3,
                "price_usd_net": 20,
                "tax_usa_percent": 10,
                "travel_cost_usd": 0,
                "locker_shipping_usd": 5,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )

        result = calculate_quote(quote)

        self.assertEqual(result["line_items"][0]["quantity"], 3)
        self.assertTrue(math.isclose(result["costs"]["price_with_tax_usd"], 66, rel_tol=1e-9))
        self.assertTrue(math.isclose(result["costs"]["total_usd"], 81, rel_tol=1e-9))

    def test_quote_bundle_sums_products_calculated_individually(self) -> None:
        bundle = calculate_quote_bundle(
            {
                "client_id": 8,
                "client_name": "Valentina",
                "notes": "Compra armada por items",
                "quote_items": [
                    {
                        "input": {
                            "product_id": 21,
                            "product_name": "Sueter basico",
                            "quantity": 3,
                            "category": "Sueters",
                            "store": "H&M",
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
                            "product_id": 22,
                            "product_name": "Zapato casual",
                            "quantity": 1,
                            "category": "Zapatos",
                            "store": "Nike",
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

        self.assertEqual(len(bundle["quote_items"]), 2)
        self.assertEqual(bundle["input"]["purchase_type"], "mixed")
        expected_sale = sum(item["result"]["final"]["sale_price_cop"] for item in bundle["quote_items"])
        expected_advance = sum(item["result"]["final"]["advance_cop"] for item in bundle["quote_items"])
        self.assertTrue(math.isclose(bundle["final"]["sale_price_cop"], expected_sale, rel_tol=1e-9))
        self.assertTrue(math.isclose(bundle["final"]["advance_cop"], expected_advance, rel_tol=1e-9))

        lines = get_client_quote_lines(
            {
                "client_name": "Valentina",
                "product_name": bundle["input"]["product_name"],
                "input": bundle["input"],
                "result": bundle,
            }
        )
        self.assertEqual(len(lines), 2)
        self.assertIn("3 x Sueter basico", lines[0])


if __name__ == "__main__":
    unittest.main()
