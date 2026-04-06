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
- `FERSHOP_DB_PATH`: ruta absoluta del archivo SQLite.
- `FERSHOP_DEFAULT_ADMIN_USERNAME`: usuario admin inicial.
- `FERSHOP_DEFAULT_ADMIN_PASSWORD`: clave admin inicial.

## Publicacion rapida en Render

Este proyecto ya incluye:

- `render.yaml`
- `requirements.txt`
- endpoint de salud en `/healthz`
- soporte de `PORT` y ruta de base de datos por entorno

Pasos:

1. Sube este proyecto a GitHub.
2. En Render crea un nuevo servicio desde el repo.
3. Usa el blueprint de `render.yaml`.
4. Define la variable `FERSHOP_DEFAULT_ADMIN_PASSWORD`.
5. Espera el deploy.
6. Entra a la URL de Render.

## Importante para esta primera publicacion

- La app publica actual usa SQLite con disco persistente.
- Eso sirve para un piloto o primera salida.
- Para escalar a varias empresas y mas usuarios concurrentes, el siguiente paso recomendado es migrar a PostgreSQL.
