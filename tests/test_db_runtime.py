import os
import sqlite3
import unittest
from unittest.mock import patch

import fershop_calculadora.database as database
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

    def test_init_db_keeps_sqlite_reinitializable(self) -> None:
        original_connect = database._connect
        original_initialized_targets = dict(database._INITIALIZED_TARGETS)
        database._INITIALIZED_TARGETS.clear()

        db_uri = f"file:test-init-cache-{id(self)}?mode=memory&cache=shared"
        keepalive = sqlite3.connect(db_uri, uri=True)
        connect_calls = 0

        def _memory_connect() -> sqlite3.Connection:
            nonlocal connect_calls
            connect_calls += 1
            connection = sqlite3.connect(db_uri, uri=True)
            connection.execute("PRAGMA journal_mode=MEMORY")
            connection.execute("PRAGMA temp_store=MEMORY")
            return connection

        try:
            database._connect = _memory_connect
            database.init_db()
            database.init_db()
        finally:
            database._connect = original_connect
            database._INITIALIZED_TARGETS.clear()
            database._INITIALIZED_TARGETS.update(original_initialized_targets)
            keepalive.close()

        self.assertEqual(connect_calls, 2)


if __name__ == "__main__":
    unittest.main()
