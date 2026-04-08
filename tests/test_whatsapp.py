import sqlite3
import unittest

from fershop_calculadora.calculations import QuoteInput, calculate_quote
from fershop_calculadora.database import (
    create_order_from_quote,
    get_company_whatsapp_settings,
    list_whatsapp_templates,
    maybe_auto_send_order_whatsapp_notification,
    save_client,
    save_company_whatsapp_settings,
    save_quote,
    save_whatsapp_template,
    send_order_whatsapp_notification,
)
import fershop_calculadora.database as database


class WhatsAppIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_connect = database._connect
        self.original_sender = database.send_twilio_whatsapp_message
        self.db_uri = f"file:test-whatsapp-{id(self)}?mode=memory&cache=shared"
        self.keepalive = sqlite3.connect(self.db_uri, uri=True)
        self.sent_messages = []

        def _memory_connect() -> sqlite3.Connection:
            connection = sqlite3.connect(self.db_uri, uri=True)
            connection.execute("PRAGMA journal_mode=MEMORY")
            connection.execute("PRAGMA temp_store=MEMORY")
            return connection

        def _fake_sender(**kwargs):
            self.sent_messages.append(kwargs)
            return {
                "sid": "SM1234567890",
                "status": "queued",
                "error_code": None,
                "error_message": "",
                "raw": {"sid": "SM1234567890", "status": "queued"},
            }

        database._connect = _memory_connect
        database.send_twilio_whatsapp_message = _fake_sender

    def tearDown(self) -> None:
        database._connect = self.original_connect
        database.send_twilio_whatsapp_message = self.original_sender
        self.keepalive.close()

    def test_save_client_persists_whatsapp_fields(self) -> None:
        client = save_client(
            {
                "name": "Laura",
                "phone": "3001112233",
                "whatsapp_phone": "3001112233",
                "whatsapp_opt_in": True,
            }
        )

        self.assertEqual(client["whatsapp_phone"], "+573001112233")
        self.assertTrue(client["whatsapp_opt_in"])
        self.assertTrue(client["whatsapp_phone_masked"].startswith("+573"))

    def test_company_can_save_whatsapp_settings_and_templates(self) -> None:
        settings = save_company_whatsapp_settings(
            {
                "twilio_account_sid": "AC123",
                "twilio_auth_token": "token-123",
                "whatsapp_sender": "+14155238886",
                "default_country_code": "+57",
                "auto_send_enabled": True,
            }
        )
        templates = list_whatsapp_templates()
        saved_template = save_whatsapp_template(
            {
                "trigger_key": "order_status:client_notified",
                "label": "Cliente notificado",
                "body_text": "Hola {{client_name}}, saldo: {{balance_due_cop}}",
                "is_active": True,
                "auto_send_enabled": True,
            }
        )

        self.assertTrue(settings["is_configured"])
        self.assertTrue(settings["auto_send_enabled"])
        self.assertTrue(any(item["trigger_key"] == "order_status:client_notified" for item in templates["items"]))
        self.assertEqual(saved_template["trigger_key"], "order_status:client_notified")

    def test_send_order_whatsapp_notification_records_message(self) -> None:
        client = save_client(
            {
                "name": "Valeria",
                "phone": "3005556677",
                "whatsapp_phone": "3005556677",
                "whatsapp_opt_in": True,
            }
        )
        save_company_whatsapp_settings(
            {
                "twilio_account_sid": "AC123",
                "twilio_auth_token": "token-123",
                "whatsapp_sender": "+14155238886",
                "default_country_code": "+57",
                "auto_send_enabled": True,
            }
        )
        save_whatsapp_template(
            {
                "trigger_key": "order_status:quote_confirmed",
                "label": "Compra confirmada",
                "body_text": "Hola {{client_name}}, compra confirmada de {{product_name}}.",
                "is_active": True,
                "auto_send_enabled": True,
            }
        )

        quote = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_name": "Bolso premium",
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
        order, _ = create_order_from_quote(record["id"])

        notification = send_order_whatsapp_notification(
            order["id"],
            trigger_key="order_status:quote_confirmed",
        )

        self.assertEqual(notification["external_message_id"], "SM1234567890")
        self.assertEqual(notification["status"], "queued")
        self.assertEqual(len(self.sent_messages), 1)
        self.assertEqual(self.sent_messages[0]["to_phone"], "+573005556677")

    def test_auto_send_uses_template_when_enabled(self) -> None:
        client = save_client(
            {
                "name": "Mariana",
                "phone": "3009998888",
                "whatsapp_phone": "3009998888",
                "whatsapp_opt_in": True,
            }
        )
        save_company_whatsapp_settings(
            {
                "twilio_account_sid": "AC456",
                "twilio_auth_token": "token-456",
                "whatsapp_sender": "+14155238886",
                "default_country_code": "+57",
                "auto_send_enabled": True,
            }
        )
        save_whatsapp_template(
            {
                "trigger_key": "second_payment_registered",
                "label": "Segundo pago",
                "body_text": "Hola {{client_name}}, confirmamos el pago de {{second_payment_amount_cop}}.",
                "is_active": True,
                "auto_send_enabled": True,
            }
        )

        quote = QuoteInput.from_dict(
            {
                "client_id": client["id"],
                "client_name": client["name"],
                "product_name": "Zapatos casuales",
                "price_usd_net": 90,
                "tax_usa_percent": 7,
                "locker_shipping_usd": 6,
                "travel_cost_usd": 0,
                "exchange_rate_cop": 4000,
                "local_costs_cop": 0,
                "desired_margin_percent": 25,
                "advance_percent": 50,
            }
        )
        record = save_quote(quote.to_dict(), calculate_quote(quote))
        order, _ = create_order_from_quote(record["id"])

        notification = maybe_auto_send_order_whatsapp_notification(
            order["id"],
            trigger_key="second_payment_registered",
        )

        self.assertIsNotNone(notification)
        self.assertEqual(notification["external_message_id"], "SM1234567890")


if __name__ == "__main__":
    unittest.main()
