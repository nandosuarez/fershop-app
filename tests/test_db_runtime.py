import os
import unittest
from unittest.mock import patch

from fershop_calculadora.db_runtime import CompatConnection, CompatRow, is_postgres_enabled


class _FakeCursor:
    def __init__(self) -> None:
        self.executed_sql = ""
        self.executed_params = ()
        self.description = [type("Column", (), {"name": "id"})(), type("Column", (), {"name": "name"})()]
        self.rowcount = 1

    def execute(self, sql: str, params: tuple[object, ...]) -> None:
        self.executed_sql = sql
        self.executed_params = params

    def fetchone(self):
        return (7, "FerShop")

    def fetchall(self):
        return [(7, "FerShop")]

    def close(self) -> None:
        return None


class _FakeConnection:
    def __init__(self) -> None:
        self.cursor_instance = _FakeCursor()

    def cursor(self) -> _FakeCursor:
        return self.cursor_instance

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None

    def close(self) -> None:
        return None


class DbRuntimeTests(unittest.TestCase):
    def test_postgres_flag_uses_database_url(self) -> None:
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"}, clear=True):
            self.assertTrue(is_postgres_enabled())

    def test_postgres_flag_is_false_without_postgres_url(self) -> None:
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///tmp/app.db"}, clear=True):
            self.assertFalse(is_postgres_enabled())

    def test_compat_row_supports_name_and_index_access(self) -> None:
        row = CompatRow(["id", "name"], (7, "FerShop"))
        self.assertEqual(row["id"], 7)
        self.assertEqual(row[1], "FerShop")
        self.assertEqual(dict(row), {"id": 7, "name": "FerShop"})

    def test_compat_connection_translates_placeholders_for_postgres(self) -> None:
        raw_connection = _FakeConnection()
        connection = CompatConnection(raw_connection)

        cursor = connection.execute(
            "SELECT id, name FROM companies WHERE slug = ? AND is_active = ?",
            ("fershop", 1),
        )
        row = cursor.fetchone()

        self.assertEqual(
            raw_connection.cursor_instance.executed_sql,
            "SELECT id, name FROM companies WHERE slug = %s AND is_active = %s",
        )
        self.assertEqual(raw_connection.cursor_instance.executed_params, ("fershop", 1))
        self.assertEqual(row["name"], "FerShop")


if __name__ == "__main__":
    unittest.main()
