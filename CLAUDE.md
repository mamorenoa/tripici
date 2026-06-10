# Tripinci

App de gastos de viajes compartidos entre amigos y pareja.

## Qué es (y qué NO es)

- Permite dar de alta **viajes** y registrar **gastos** asociados a cada viaje.
- Cada gasto tiene una **categoría** (ej.: Restaurantes, Gasolina, Alojamiento...).
- Objetivo principal de la UI: ver de un vistazo el **total gastado** en un viaje
  y poder **filtrar el gasto por categoría**.
- Multiusuario: un usuario crea un viaje e **invita a otros por email**; los
  invitados pueden añadir gastos al viaje.
- **NO es una app de dividir cuentas tipo Splitwise.** No hay cálculo de "quién
  debe a quién", ni balances, ni liquidaciones. No proponer esa funcionalidad.

## Stack (decisiones ya tomadas, no reabrir)

**Backend**
- Python + FastAPI
- PostgreSQL
- SQLModel (ORM)
- Alembic (migraciones)
- uv (gestión de dependencias y entorno)
- Autenticación con FastAPI-Users (registro, login, sesión, perfil)
- Email transaccional para invitaciones: proveedor a decidir cuando toque
  (Resend / Postmark / SendGrid / SES). El modelo de invitaciones debe
  contemplar invitar a personas que **aún no tienen cuenta**.

**Frontend**
- Expo + React Native, con **web incluida** (React Native Web).
- TypeScript en todo el frontend.
- Expo Router (navegación basada en ficheros, igual en web y nativo).
- TanStack Query para el estado del servidor.
- NativeWind para estilos (clases tipo Tailwind en web y nativo).
- Almacenamiento del token de sesión: expo-secure-store en iOS/Android;
  contemplar el mecanismo equivalente en web. Diseñarlo desde el login.

**Integración backend ↔ frontend**
- FastAPI expone OpenAPI. Generar el cliente y los tipos de TypeScript a partir
  del esquema OpenAPI (p. ej. openapi-typescript u orval), en lugar de
  escribir tipos a mano. Mantener el frontend sincronizado con la API así.

## Estructura del repo

Repositorio único:
- `/backend` — FastAPI
- `/app` — Expo / React Native

## Arquitectura — Clean Architecture (no negociable)

Toda feature implementada en este repo respeta tres capas en backend y
en la app. NO es opcional. Si no encajas algo, propones cambiar esta
sección antes de saltártela.

**View** — entrada/salida. Lo que el usuario ve o llama.
- Backend: routers de FastAPI. Validan request/response y devuelven HTTP.
- App: componentes React Native (screens y componentes UI).
- Regla: no contiene lógica de negocio ni acceso directo a datos.

**Domain** — lógica de negocio pura, agnóstica de framework.
- Backend: servicios / use-cases en Python puro. Dependen de
  interfaces (`Protocol`) hacia el repository, nunca de
  implementaciones.
- App: hooks / use-cases que orquestan repositories y exponen estado
  al view. Tipos del dominio compartidos.
- Regla: no importa de FastAPI, ni de React, ni de `fetch`, ni de SQL.

**Repository** — acceso a datos.
- Backend: clases que hablan con Postgres (SQLModel/SQL) u otras
  fuentes externas (email, proveedores, etc.).
- App: clientes que llaman a la API HTTP, `expo-secure-store` para
  tokens, etc.
- Regla: el domain define la interfaz; aquí vive la implementación.

### Estructura de directorios

**Backend (`/backend/app/`)**
- `api/` — view: routers FastAPI
- `domain/` — entidades, servicios e interfaces de repository
- `repositories/` — implementaciones concretas (DB, email, …)
- `core/` — config, db session, cross-cutting

**App**
- `/app/app/` — view: rutas de Expo Router. Cada fichero es un shell de
  una línea que reexporta la screen real desde `src/views/`.
- `/app/src/views/` — view: screens y componentes específicos de pantalla.
- `/app/src/components/` — view: componentes reutilizables (aparece
  cuando haga falta).
- `/app/src/domain/` — hooks / use-cases y tipos.
- `/app/src/repositories/` — api clients y storage. Incluye
  `_generated/` con los tipos producidos por `npm run generate:api`
  desde el OpenAPI del backend.
- `/app/src/lib/` — utilidades cross-cutting: `api.ts` (URL base por
  plataforma), `apiClient.ts` (wrapper de `fetch`), `queryClient.ts`
  (instancia de TanStack Query).

Dentro de cada capa, agrupar por feature:
`domain/trips/`, `repositories/trips/`, `views/trips/`, etc.

### Excepciones razonables

Si una feature no tiene lógica de negocio (p. ej. `/health` o un
endpoint de versión), puede vivir solo en view. No forzar capas
vacías. El dominio aparece **en cuanto haya cualquier regla**.

### Reglas de dependencia (flujo permitido)

```
view  →  domain  →  repository (interfaz)
                         ↑
                  repository (impl)
```

- Las flechas son las únicas direcciones permitidas.
- `domain` nunca importa de `view` ni de implementaciones de
  `repository`.
- `repository` nunca importa de `view` ni de `domain.service` (sólo
  conoce sus propias entidades y la interfaz que implementa).

## Cómo quiero que trabajes

- **Explícame las decisiones para aprender**, no solo entregues código. Me
  interesa el porqué de cada elección, sobre todo cuando hay alternativas.
- **Pregunta antes de asumir** cuando algo sea ambiguo, en vez de decidir por mí
  y seguir.
- Trabajamos por **incrementos pequeños** (rebanadas verticales de punta a
  punta). No construyas toda la app de golpe.
- Para incrementos con complejidad (autenticación, invitaciones, modelo de
  datos), **propón primero un plan corto** y espera mi visto bueno antes de
  generar o modificar ficheros. Los incrementos triviales puedes ir directo.
- Mantén el código simple y legible; prioriza claridad sobre listeza.

## Estado actual

Slices entregados:

- **Slice 1** — esqueleto de conectividad (FastAPI `/health` + pantalla
  Expo que lo llama).
- **Slice 2** — viajes MVP. Postgres en Docker, SQLModel + Alembic,
  capas view/domain/repository en backend y app, TanStack Query y Expo
  Router en la app, tipos TS generados desde OpenAPI.
- **Slice 3** — autenticación. Backend en async, FastAPI-Users con JWT
  Bearer, tabla `user` con FK `trip.owner_id → user.id`. Frontend con
  pantallas de login/registro, token storage cross-platform
  (`expo-secure-store` en nativo, `localStorage` en web), rutas
  protegidas con grupos de Expo Router.
- **Slice 4** — gastos dentro de un viaje. Tabla `category` (seed con
  7 categorías) + tabla `expense` con FK a trip/category/user, importe
  en céntimos, fecha del gasto, descripción opcional. CRUD completo en
  backend (`POST/GET/PATCH/DELETE /trips/{id}/expenses`), validación de
  propiedad del viaje vía service (404 al cruzar usuarios, sin leak de
  existencia). Frontend con `TripDetailScreen` (total agregado + pills
  de filtro por categoría), `ExpenseForm` reutilizado por add/edit y
  rutas anidadas `/trips/[id]/...`.
- **Slice 5** — invitaciones por link compartible (sin email
  transaccional todavía). Tablas `trip_membership` y `trip_invitation`
  (token reutilizable, expiración 7d, revocable). Autorización
  membership-aware en TripService y ExpenseService — cualquier miembro
  CRUD-ea gastos del viaje. Frontend con `TripMembersScreen` (genera
  link, copia al clipboard) y `AcceptInvitationScreen`. Login/register
  honran `?redirect=` para que el flow del usuario sin sesión que
  abre un link funcione sin perder el contexto.

Próximo candidato: **invitaciones por email** (reaprovecha
`trip_invitation` con un campo `email`; requiere elegir proveedor
transaccional) o slice cosmético (NativeWind, date picker decente).
