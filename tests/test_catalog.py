import unittest

from fershop_calculadora.catalog import ClientInput, ProductInput
from fershop_calculadora.calculations import QuoteInput


class CatalogTests(unittest.TestCase):
    def test_client_requires_name(self) -> None:
        with self.assertRaisesRegex(ValueError, "cliente es obligatorio"):
            ClientInput.from_dict({"name": "  "})

    def test_client_accepts_profile_and_preference_fields(self) -> None:
        client = ClientInput.from_dict(
            {
                "name": "Laura",
                "description": "Cliente premium",
                "phone": "3001234567",
                "email": "laura@example.com",
                "city": "Bogota",
                "address": "Cra 15 # 93 - 40",
                "neighborhood": "Chico",
                "preferred_contact_channel": "WhatsApp",
                "preferred_payment_method": "Transferencia",
                "interests": "Apple, premium",
                "notes": "Cliente frecuente",
            }
        )

        self.assertEqual(client.address, "Cra 15 # 93 - 40")
        self.assertEqual(client.description, "Cliente premium")
        self.assertEqual(client.preferred_contact_channel, "WhatsApp")
        self.assertEqual(client.interests, "Apple, premium")

    def test_product_rejects_negative_costs(self) -> None:
        with self.assertRaisesRegex(ValueError, "no puede ser negativo"):
            ProductInput.from_dict(
                {
                    "name": "Producto",
                    "price_usd_net": -1,
                    "tax_usa_percent": 0,
                    "locker_shipping_usd": 0,
                }
            )

    def test_product_accepts_category_and_store_fields(self) -> None:
        product = ProductInput.from_dict(
            {
                "name": "AirPods Pro",
                "description": "Accesorio premium",
                "reference": "USB-C",
                "category": "Accesorios",
                "store": "Apple",
                "price_usd_net": 220,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 12,
                "notes": "Segunda generacion",
            }
        )

        self.assertEqual(product.description, "Accesorio premium")
        self.assertEqual(product.category, "Accesorios")
        self.assertEqual(product.store, "Apple")
        self.assertEqual(product.locker_shipping_usd, 12)

    def test_quote_accepts_catalog_ids(self) -> None:
        quote = QuoteInput.from_dict(
            {
                "product_id": 3,
                "client_id": 7,
                "product_name": "Producto catálogo",
                "client_name": "Cliente catálogo",
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

        self.assertEqual(quote.product_id, 3)
        self.assertEqual(quote.client_id, 7)


if __name__ == "__main__":
    unittest.main()
