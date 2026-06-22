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
- **Slice 6** — refresh cosmético. NativeWind 4 + Tailwind 3 con
  tokens semánticos (brand emerald, ink primary/secondary/muted,
  background stone-50, danger rose, shadow-card). Fuente Inter
  cargada con `expo-font` + splash. Set de primitives reutilizables
  en `src/components/` (Button, Card, Input, DateInput, Badge, Pill,
  Avatar, EmptyState, Icon). `DateInput` plat-specific (HTML `<input
  type="date">` en web, `@react-native-community/datetimepicker` en
  nativo). Iconos Feather de `@expo/vector-icons`. Todas las screens
  refactorizadas. Cero cambios funcionales.
- **Slice 7** — deploy público. Backend dockerizado (multi-stage uv
  → uvicorn) en **Fly.io** con Postgres unmanaged en `mad`. Web
  estática (`expo export -p web`) en **Cloudflare Pages**. CI/CD vía
  GitHub Actions: `backend.yml` (pytest + flyctl deploy en push a
  main) y `frontend.yml` (type-check guard; CF Pages despliega solo).
  `release_command` corre Alembic antes de promocionar. Config
  ajustado para normalizar el URL de Postgres (`postgres://` →
  `postgresql+psycopg://`) y leer `CORS_ORIGINS` como CSV con
  `NoDecode`. Estructura PRE (branch `develop`, app `-pre`)
  documentada en `DEPLOY.md` pero no desplegada todavía.
  URLs: `https://tripinci-api.fly.dev` + `https://tripinci.pages.dev`.
  Coste: $0/mes a hobby scale.
- **Slice 8** — expulsión de miembros. El owner puede eliminar a
  cualquier colaborador desde `TripMembersScreen` (botón "Remove" +
  diálogo de confirmación; sólo visible para el owner y en filas de
  no-owners). `DELETE /trips/{id}/members/{user_id}`: sólo el owner
  puede llamarlo, 400 si intenta eliminarse a sí mismo, 404 si el
  usuario no es miembro, 204 en éxito. Dos nuevas excepciones de
  dominio: `MemberNotFound` y `CannotRemoveOwner`. Sin migración
  (no hay cambios de esquema).

- **Slice 9** — estadísticas por viaje. Endpoint `GET /trips/{id}/stats`
  devuelve `{total_cents, by_category, by_member, by_date}` con porcentajes
  calculados en Python. Tres queries SQL nativas (GROUP BY) en
  `SQLModelStatsRepository`. `StatsService` reutiliza el patrón
  `_authorize_trip` de `ExpenseService` (404 para outsiders). Frontend con
  `TripStatsScreen`: barras horizontales por categoría y persona, barras
  verticales por día. Botón "Stats" en el header de `TripDetailScreen`.
  Sin librería de charts (todo con `View` nativas). Empty state si no hay gastos.
  4 nuevos tests backend.

- **Slice 10** — estadísticas globales. Endpoint `GET /stats?category_code=` (opcional)
  agrega gastos de todos los viajes del usuario (propios + de miembro). `by_category`
  siempre sin filtrar (alimenta las pills); `total_cents`, `by_trip` y `by_month`
  responden al filtro. `GlobalStatsScreen` accesible desde el header de la lista de
  viajes: total con subtítulo dinámico, pills de categoría, panel "By category" (oculto
  si hay filtro), "By trip", "By month". El filtro viaja al servidor como query param;
  TanStack Query cachea cada combinación. 5 nuevos tests backend.

- **Slice 11** — gastos comunes y atribuibles. Nueva columna
  `expense.paid_by_user_id` (nullable, FK a `user.id`): `NULL` = gasto
  **común** (de la cuenta compartida), con valor = atribuido a ese
  miembro (puede ser otro, no quien lo registra). `created_by_user_id`
  queda solo como auditoría. Migración con backfill
  `paid_by = created_by` para no alterar el histórico. `ExpenseService`
  valida que el pagador sea miembro del viaje (excepción `PayerNotMember`
  → 400). **Refactor de stats**: `StatsRepository` pasa a devolver
  agregados crudos y `StatsService` (dominio) calcula los % y el
  reparto. En `TripStats.by_member` el común se reparte a partes iguales
  entre los miembros (céntimos sobrantes a los primeros; la suma cuadra
  con el total). `GlobalStats` gana `personal_total_cents` = lo que has
  gastado tú (atribuido a ti + tu parte del común de cada viaje, según
  su nº de miembros), respetando el filtro de categoría. Frontend:
  selector "Paid by" en `ExpenseForm` (Common + miembros, default = tú),
  etiqueta del pagador en la lista de `TripDetailScreen` y "Your share"
  en `GlobalStatsScreen`. 7 nuevos tests backend.

Próximo candidato: **monetización** (Stripe one-time + paywall sobre stats globales),
**invitaciones por email**, **modo oscuro**, o **EAS Build**.
