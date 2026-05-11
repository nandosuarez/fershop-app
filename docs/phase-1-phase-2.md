# Shopper Calculator - Fase 1 y Fase 2

Este documento resume los cambios ejecutados en esta iteracion, enfocados en rebrand + base tecnica para crecer por modulos y usuarios.

## Fase 1 - Rebrand y mejora visual general

Objetivo: alinear la plataforma web con la marca `Shopper Calculator` y mejorar percepcion visual sin romper flujo actual.

Cambios aplicados:

- Rebrand visible en web:
  - `web/index.html`: titulo y fallback de marca en cabecera.
  - `web/login.html`: titulo de ingreso.
  - `web/customer-register.html`: fallback de marca del formulario publico.
  - `web/index.modular.html`: mismo ajuste de marca.
  - `web/app.js`: fallback de branding, copy por defecto y titulo de documento.
  - `fershop_calculadora/documents.py`: marca de respaldo para mensajes/PDF.
  - `fershop_calculadora/__init__.py`: descripcion del paquete.
  - `README.md`: nombre y descripcion del proyecto.

- Pulido visual general (`web/styles.css`):
  - paleta de color y contrastes refinados,
  - fondos con degradados mas limpios,
  - paneles y sombras mas consistentes,
  - ajustes de espaciado y ancho del shell para pantallas grandes.

Resultado esperado:

- experiencia visual mas premium y consistente,
- plataforma presentada como Shopper Calculator en ingreso y operacion,
- sin cambios destructivos sobre tablas ni data de negocio.

## Fase 2 - Base multiusuario por empresa (roles)

Objetivo: dejar la estructura lista para vender por modulos y crecer con varios usuarios dentro de una empresa.

Cambios aplicados:

- Esquema y migracion segura:
  - `fershop_calculadora/database.py`
    - se agrega columna `users.role` (default `admin`) con migracion no destructiva,
    - normalizacion de roles invalidos/vacios en datos existentes,
    - proteccion de continuidad: siempre debe existir al menos un usuario activo con rol elevado.

- Modelo de roles:
  - roles soportados: `owner`, `admin`, `operator`, `viewer`,
  - helpers para validar/serializar roles,
  - rol incluido en autenticacion y sesion.

- Nuevas funciones backend para gestion de usuarios por empresa:
  - `list_company_users(company_id)`
  - `create_company_user(...)`
  - `set_company_user_active(...)`
  - `update_company_user_role(...)`

- Endpoints API listos para conectar UI:
  - `GET /api/company-users`
  - `POST /api/company-users`
  - `POST /api/company-users/{id}/active`
  - `POST /api/company-users/{id}/role`
  - control de permisos: solo `owner/admin`.

Resultado esperado:

- base preparada para controles de acceso por modulo,
- gestion de usuarios por empresa sin afectar compras, cotizaciones o cartera ya cargadas,
- lista para siguiente fase de UI de usuarios/permisos y planes comerciales.
