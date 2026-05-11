# Shopper Calculator Platform

Plataforma web para cotizaciones, compras, seguimiento comercial y control gerencial por empresa.

## Modulos actuales

- Login por empresa
- Dashboard gerencial
- Cotizaciones con PDF y texto para WhatsApp
- Clientes
- Productos
- Compras con estados secuenciales
- Registro de gastos
- Administracion de estados

## Ejecutar en local

1. Abre PowerShell en la carpeta del proyecto.
2. Ejecuta:

```powershell
py -3 app.py
```

3. Abre:

```text
http://127.0.0.1:8000
```

## Usuario inicial local

- Usuario: `fershop_admin`
- Contrasena: `FerShop2026!`

Puedes cambiar esa clave con la variable `FERSHOP_DEFAULT_ADMIN_PASSWORD`.

## Variables de entorno

- `PORT`: puerto HTTP del servidor.
- `FERSHOP_HOST`: host a escuchar.
- `DATABASE_URL`: conexion a PostgreSQL.
- `FERSHOP_DATABASE_URL`: alternativa explicita para PostgreSQL.
- `FERSHOP_DB_PATH`: ruta del archivo SQLite en local.
- `FERSHOP_DEFAULT_ADMIN_USERNAME`: usuario admin inicial.
- `FERSHOP_DEFAULT_ADMIN_PASSWORD`: clave admin inicial.
- `FERSHOP_TIMEZONE`: zona horaria de la app (ejemplo `America/Bogota`).

## Migracion de SQLite a PostgreSQL

1. Crea la base PostgreSQL.
2. Define `FERSHOP_DATABASE_URL` o `DATABASE_URL`.
3. Ejecuta:

```powershell
py -3 scripts/migrate_sqlite_to_postgres.py
```

Opcional:

```powershell
py -3 scripts/migrate_sqlite_to_postgres.py --sqlite-path C:\ruta\mi_base.sqlite3
```

## Seguridad antes de cambios

1. Backup SQLite local:

```powershell
copy data\fershop_app.sqlite3 data\fershop_app.backup.sqlite3
```

2. Backup PostgreSQL:

```bash
pg_dump "$DATABASE_URL" > shopper_calculator_backup.sql
```

## Deploy en Render

1. Sube el repo a GitHub.
2. Crea un `Blueprint` en Render desde el repo.
3. Define `FERSHOP_DEFAULT_ADMIN_PASSWORD`.
4. Espera el deploy y valida `/healthz`.

## Nota de arquitectura

- Monolito modular multiempresa.
- PostgreSQL recomendado para escalar a mas empresas, usuarios y volumen.
