from __future__ import annotations

import os
import re
from collections.abc import Iterator, Mapping
from typing import Any


_POSTGRES_URL_PREFIXES = ("postgres://", "postgresql://")
_AUTOINCREMENT_PATTERN = re.compile(
    r"\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b",
    re.IGNORECASE,
)


def get_database_url() -> str:
    return (
        os.environ.get("FERSHOP_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or ""
    ).strip()


def is_postgres_enabled() -> bool:
    return get_database_url().lower().startswith(_POSTGRES_URL_PREFIXES)


class CompatRow(Mapping[str, Any]):
    def __init__(self, columns: list[str], values: tuple[Any, ...]) -> None:
        self._columns = tuple(columns)
        self._values = tuple(values)
        self._by_name = dict(zip(self._columns, self._values))

    def __getitem__(self, key: str | int) -> Any:
        if isinstance(key, int):
            return self._values[key]
        return self._by_name[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._columns)

    def __len__(self) -> int:
        return len(self._columns)

    def keys(self) -> tuple[str, ...]:
        return self._columns

    def values(self) -> tuple[Any, ...]:
        return self._values

    def items(self) -> list[tuple[str, Any]]:
        return [(column, self._by_name[column]) for column in self._columns]

    def __repr__(self) -> str:
        return f"CompatRow({self._by_name!r})"


class CompatCursor:
    def __init__(self, raw_cursor: Any) -> None:
        self._raw_cursor = raw_cursor
        self.lastrowid: int | None = None

    @property
    def description(self) -> Any:
        return self._raw_cursor.description

    @property
    def rowcount(self) -> int:
        return self._raw_cursor.rowcount

    def fetchone(self) -> CompatRow | None:
        row = self._raw_cursor.fetchone()
        if row is None:
            return None
        return self._wrap_row(row)

    def fetchall(self) -> list[CompatRow]:
        return [self._wrap_row(row) for row in self._raw_cursor.fetchall()]

    def close(self) -> None:
        self._raw_cursor.close()

    def _wrap_row(self, row: Any) -> CompatRow:
        columns = [column.name for column in self._raw_cursor.description or []]
        if not columns:
            return CompatRow([], tuple())
        return CompatRow(columns, tuple(row))


class CompatConnection:
    def __init__(self, raw_connection: Any) -> None:
        self._raw_connection = raw_connection
        self.backend = "postgres"
        self.row_factory = None

    def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> CompatCursor:
        cursor = self._raw_connection.cursor()
        cursor.execute(_translate_postgres_sql(sql), tuple(params))
        return CompatCursor(cursor)

    def commit(self) -> None:
        self._raw_connection.commit()

    def rollback(self) -> None:
        self._raw_connection.rollback()

    def close(self) -> None:
        self._raw_connection.close()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._raw_connection, name)


def connect_postgres() -> CompatConnection:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "PostgreSQL esta habilitado, pero falta instalar la dependencia 'psycopg'."
        ) from exc

    return CompatConnection(psycopg.connect(get_database_url(), autocommit=False))


def _translate_postgres_sql(sql: str) -> str:
    translated = _AUTOINCREMENT_PATTERN.sub("BIGSERIAL PRIMARY KEY", sql)
    return translated.replace("?", "%s")
