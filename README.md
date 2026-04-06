# FerShop App

App web para cotizaciones, compras, seguimiento comercial y control gerencial.

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

Puedes cambiar esa clave para despliegue usando la variable de entorno `FERSHOP_DEFAULT_ADMIN_PASSWORD`.

## Variables de entorno

- `PORT`: puerto HTTP del servidor. En Render lo pone la plataforma.
- `FERSHOP_HOST`: host a escuchar. En local puede quedar vacio; en Render usa `0.0.0.0`.
- `DATABASE_URL`: cadena de conexion a PostgreSQL. Render la inyecta desde la base.
- `FERSHOP_DATABASE_URL`: alternativa explicita para PostgreSQL.
- `FERSHOP_DB_PATH`: ruta absoluta del archivo SQLite cuando trabajas en local.
- `FERSHOP_DEFAULT_ADMIN_USERNAME`: usuario admin inicial.
- `FERSHOP_DEFAULT_ADMIN_PASSWORD`: clave admin inicial.

## Migracion de SQLite a PostgreSQL

La app ahora soporta:

- SQLite para desarrollo local rapido
- PostgreSQL para Render y ambientes productivos

Si quieres migrar tus datos actuales de SQLite a PostgreSQL:

1. Crea la base PostgreSQL.
2. Define `FERSHOP_DATABASE_URL` o `DATABASE_URL`.
3. Ejecuta:

```powershell
py -3 scripts/migrate_sqlite_to_postgres.py
```

Opcionalmente puedes indicar otra base origen:

```powershell
py -3 scripts/migrate_sqlite_to_postgres.py --sqlite-path C:\ruta\mi_base.sqlite3
```

## Publicacion en Render con PostgreSQL

Este proyecto ya incluye:

- `render.yaml`
- `requirements.txt`
- endpoint de salud en `/healthz`
- soporte de `PORT`
- soporte de `DATABASE_URL`
- script de migracion desde SQLite

Pasos:

1. Sube este proyecto a GitHub.
2. En Render crea un nuevo `Blueprint` desde el repo.
3. Render levantara:
   - un `Web Service`
   - una base `PostgreSQL`
4. Define la variable `FERSHOP_DEFAULT_ADMIN_PASSWORD`.
5. Espera el deploy.
6. Entra a la URL de Render.
7. Si ya tenias datos en SQLite, ejecuta la migracion apuntando a la URL de PostgreSQL.

## Nota de arquitectura

- La app queda lista para seguir trabajando como monolito modular multiempresa.
- PostgreSQL es ahora la base recomendada para escalar a mas empresas, mas usuarios y mas volumen operativo.

## Publicacion sin tarjeta en PythonAnywhere

La app ya incluye entrada WSGI en [wsgi.py](/C:/Users/josef/OneDrive/Desktop/JFSS/FerShop/Proyectos/App/wsgi.py) para poder publicarla en PythonAnywhere.

Pasos sugeridos:

1. Crea una cuenta gratis en PythonAnywhere.
2. En `Files`, sube este proyecto o clonaló desde GitHub.
3. En `Web`, crea una nueva web app manual con Python 3.11.
4. Abre el archivo WSGI que crea PythonAnywhere y reemplaza su contenido para importar `application` desde `wsgi.py`.
5. Configura la carpeta `web/` como static files para `/static/`.
6. Recarga la web app.

Esta ruta sigue siendo valida para una demo. Para operacion real y crecimiento multiempresa, la ruta recomendada es Render + PostgreSQL.
