# FerShop v2

Aplicacion operativa para pedidos, clientes, productos, inventario, compras, pagos y gastos de FerShop.

## Infraestructura

- Next.js 16 y React 19.
- PostgreSQL administrado en Render.
- Acceso por usuario y clave con `scrypt`.
- Sesion de 12 horas en cookie `HttpOnly`, firmada con HMAC SHA-256.
- Roles `SUPERADMIN`, `ADMIN`, `OPERACION` y `VENTAS`.
- Datos de la version 2 aislados en el esquema PostgreSQL `fershop_v2`.
- Backup operativo JSON descargable desde el modulo Usuarios.
- Recuperacion continua y exportaciones logicas de la base pagada desde Render.

## Desarrollo local

Sin `DATABASE_URL`, la aplicacion conserva el modo JSON local para desarrollar la operacion. El acceso privado requiere PostgreSQL.

1. Copiar `.env.example` como `.env.local` y ajustar las variables.
2. Crear el esquema y el administrador:

```bash
pnpm db:setup
```

3. Iniciar la app:

```bash
pnpm dev
```

En produccion no existe fallback a JSON: `DATABASE_URL` es obligatoria.

## Primer despliegue

El Blueprint del repositorio esta en `../render.yaml`. Reemplaza el servicio `fershop-app`, reutiliza `fershop-postgres` y ejecuta `pnpm db:setup:render` antes de iniciar.

El script de preparacion:

- Crea el esquema y las tablas si no existen.
- Crea el superadministrador solo cuando no existe.
- Migra `products`, `customers`, `operations`, `inventory` y `expenses` solo cuando aun no existen en PostgreSQL.
- Nunca reemplaza la clave ni los datos existentes en despliegues posteriores.

Para reemplazar v1 sin interrumpir el despliegue, el primer inicio tambien reconoce temporalmente `FERSHOP_DEFAULT_ADMIN_USERNAME` y `FERSHOP_DEFAULT_ADMIN_PASSWORD`. Las variables nuevas `ADMIN_USERNAME` y `ADMIN_PASSWORD` tienen prioridad.

Los archivos reales de `data/` no se publican porque contienen informacion privada de clientes y pedidos. `database/seeds/` contiene estructuras vacias y seguras para el primer despliegue.

## Respaldos

- En la app: `Usuarios > Descargar backup` exporta documentos, usuarios sin hashes de clave e imagenes.
- En Render: una base PostgreSQL pagada incluye recuperacion a un punto en el tiempo y exportaciones logicas bajo demanda.
