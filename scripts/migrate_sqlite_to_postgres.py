from __future__ import annotations

import argparse
import os
import sqlite3
from contextlib import closing
from pathlib import Path

from fershop_calculadora import database


TABLES_TO_COPY = [
    "companies",
    "users",
    "clients",
    "products",
    "product_categories",
    "product_stores",
    "pending_requests",
    "quotes",
    "company_order_statuses",
    "orders",
    "order_events",
    "payment_events",
    "expenses",
]

TABLES_WITH_ID = [
    "companies",
    "users",
    "clients",
    "products",
    "product_categories",
    "product_stores",
    "pending_requests",
    "quotes",
    "company_order_statuses",
    "orders",
    "order_events",
    "payment_events",
    "expenses",
]


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migra los datos actuales de SQLite a PostgreSQL para FerShop."
    )
    parser.add_argument(
        "--sqlite-path",
        default=os.environ.get("FERSHOP_SQLITE_SOURCE", str(database.DB_PATH)),
        help="Ruta al archivo SQLite origen.",
    )
    parser.add_argument(
        "--postgres-url",
        default=os.environ.get("FERSHOP_DATABASE_URL") or os.environ.get("DATABASE_URL"),
        help="Cadena de conexion a PostgreSQL destino.",
    )
    return parser.parse_args()


def _load_sqlite_rows(sqlite_path: Path, table_name: str) -> list[sqlite3.Row]:
    with closing(sqlite3.connect(sqlite_path)) as connection:
        connection.row_factory = sqlite3.Row
        order_by = "id" if table_name != "sessions" else "created_at"
        return connection.execute(
            f"SELECT * FROM {table_name} ORDER BY {order_by} ASC"
        ).fetchall()


def _copy_table(pg_connection: object, table_name: str, rows: list[sqlite3.Row]) -> int:
    if not rows:
        return 0

    try:
        from psycopg import sql
    except ImportError as exc:
        raise RuntimeError(
            "Falta instalar 'psycopg' para ejecutar la migracion a PostgreSQL."
        ) from exc

    with pg_connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table_name,),
        )
        destination_columns = [row[0] for row in cursor.fetchall()]

    columns = [column for column in rows[0].keys() if column in destination_columns]
    if not columns:
        return 0

    insert_query = sql.SQL(
        "INSERT INTO {table_name} ({columns}) VALUES ({values}) ON CONFLICT DO NOTHING"
    ).format(
        table_name=sql.Identifier(table_name),
        columns=sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        values=sql.SQL(", ").join(sql.Placeholder() for _ in columns),
    )

    inserted = 0
    with pg_connection.cursor() as cursor:
        for row in rows:
            cursor.execute(insert_query, tuple(row[column] for column in columns))
            inserted += cursor.rowcount
    return inserted


def _sync_sequences(pg_connection: object) -> None:
    try:
        from psycopg import sql
    except ImportError as exc:
        raise RuntimeError(
            "Falta instalar 'psycopg' para ajustar las secuencias de PostgreSQL."
        ) from exc

    with pg_connection.cursor() as cursor:
        for table_name in TABLES_WITH_ID:
            cursor.execute(
                sql.SQL(
                    """
                    SELECT setval(
                        pg_get_serial_sequence({table_literal}, 'id'),
                        COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                        true
                    )
                    """
                ).format(
                    table_literal=sql.Literal(table_name),
                    table_name=sql.Identifier(table_name),
                )
            )


def main() -> None:
    args = _parse_args()
    sqlite_path = Path(args.sqlite_path).expanduser().resolve()
    postgres_url = str(args.postgres_url or "").strip()

    if not sqlite_path.exists():
        raise FileNotFoundError(f"No existe la base SQLite origen: {sqlite_path}")
    if not postgres_url:
        raise ValueError(
            "Debes definir --postgres-url o la variable FERSHOP_DATABASE_URL / DATABASE_URL."
        )

    os.environ["FERSHOP_DATABASE_URL"] = postgres_url
    database.init_db(skip_defaults=True)

    with closing(database._connect()) as target_connection:
        for table_name in TABLES_TO_COPY:
            copied = _copy_table(
                target_connection._raw_connection,
                table_name,
                _load_sqlite_rows(sqlite_path, table_name),
            )
            print(f"{table_name}: {copied} registros copiados")
        _sync_sequences(target_connection._raw_connection)
        target_connection.commit()

    print("Migracion completada.")


if __name__ == "__main__":
    main()
