import unittest
from unittest.mock import patch

from fershop_calculadora.server import (
    FerShopHandler,
    PUBLIC_STORE_DEFAULT_ADVANCE_PERCENT,
    PUBLIC_STORE_IMMEDIATE_ADVANCE_PERCENT,
)


class PublicStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.handler = object.__new__(FerShopHandler)

    def test_inventory_product_uses_immediate_policy(self) -> None:
        product = {
            "id": 1,
            "name": "Blazer",
            "reference": "BZ-01",
            "category": "Chaquetas",
            "store": "FerShop",
            "description": "Entrega inmediata",
            "price_usd_net": 20,
            "tax_usa_percent": 7,
            "locker_shipping_usd": 3,
            "inventory_enabled": True,
            "current_stock": 4,
            "inventory_unit_cost_cop": 120000,
        }

        preview = self.handler._build_public_store_product(
            product,
            exchange_rate_cop=4000,
            desired_margin_percent=30,
            advance_percent=PUBLIC_STORE_DEFAULT_ADVANCE_PERCENT,
        )

        self.assertIsNotNone(preview)
        self.assertEqual(preview["availability_type"], "immediate")
        self.assertEqual(preview["advance_percent"], PUBLIC_STORE_IMMEDIATE_ADVANCE_PERCENT)
        self.assertEqual(preview["payment_due_today_cop"], preview["suggested_sale_price_cop"])
        self.assertEqual(preview["payment_balance_on_arrival_cop"], 0)
        self.assertTrue(preview["uses_inventory_stock"])

    def test_non_inventory_product_uses_preorder_policy(self) -> None:
        product = {
            "id": 2,
            "name": "Bolso",
            "reference": "BG-77",
            "category": "Accesorios",
            "store": "Outlet",
            "description": "Producto por pedido",
            "price_usd_net": 40,
            "tax_usa_percent": 7,
            "locker_shipping_usd": 4,
            "inventory_enabled": False,
            "current_stock": 0,
            "inventory_unit_cost_cop": 0,
        }

        preview = self.handler._build_public_store_product(
            product,
            exchange_rate_cop=4000,
            desired_margin_percent=30,
            advance_percent=PUBLIC_STORE_DEFAULT_ADVANCE_PERCENT,
        )

        self.assertIsNotNone(preview)
        self.assertEqual(preview["availability_type"], "preorder")
        self.assertEqual(preview["advance_percent"], PUBLIC_STORE_DEFAULT_ADVANCE_PERCENT)
        self.assertAlmostEqual(
            preview["payment_due_today_cop"] + preview["payment_balance_on_arrival_cop"],
            preview["suggested_sale_price_cop"],
        )
        self.assertGreater(preview["payment_balance_on_arrival_cop"], 0)
        self.assertFalse(preview["uses_inventory_stock"])

    def test_resolve_public_store_defaults_reads_template_items_payload(self) -> None:
        with patch(
            "fershop_calculadora.server.list_direct_order_templates",
            return_value={
                "items": [
                    {
                        "template_key": "online",
                        "exchange_rate_cop": 4123,
                    }
                ]
            },
        ):
            defaults = self.handler._resolve_public_store_defaults(company_id=99)

        self.assertEqual(defaults["exchange_rate_cop"], 4123.0)
        self.assertEqual(defaults["preorder_advance_percent"], PUBLIC_STORE_DEFAULT_ADVANCE_PERCENT)
        self.assertEqual(defaults["immediate_advance_percent"], PUBLIC_STORE_IMMEDIATE_ADVANCE_PERCENT)


if __name__ == "__main__":
    unittest.main()
