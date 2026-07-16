# Tripinci — Roadmap 3 meses (producto público pequeño, web-first)

## Contexto

14 slices entregadas: el core funciona de punta a punta (viajes, gastos, planes+calendario, stats, settle, invitaciones por link, i18n EN/ES, deploy en Fly+Cloudflare con CI/CD). La decisión ahora es **abrir la app a usuarios reales** más allá del círculo cercano, manteniendo web como plataforma principal y cadencia de ~1 slice/semana.

El inventario del repo revela qué falta exactamente para eso:

- **Sin recuperación de contraseña ni verificación de email** — los routers de fastapi-users existen pero no están montados (`backend/app/api/auth.py`); los secrets ya están configurados (`core/auth.py:34`). Un usuario que olvide su contraseña pierde la cuenta: inaceptable en público.
- **Sin email transaccional** — las invitaciones son solo link copiable; no hay proveedor de email en el backend. Es la misma dependencia que bloquea el password reset.
- **Sin backups automáticos** — Postgres free en Fly, solo snapshots manuales (`DEPLOY.md:156`). Perder datos de terceros mata el producto.
- **Sin observabilidad** — cero error reporting (ni Sentry ni similar) en API y web. En público estarías ciego.
- **Sin borrado de cuenta ni legal** — requisito GDPR si hay usuarios europeos.
- **Sin landing ni dominio propio** — `tripinci.pages.dev` va directo al login; no hay página que explique qué es.
- **PRE documentado pero no desplegado** (`DEPLOY.md:192`).
- Deuda técnica menor: `expires_at` naive (falta TIMESTAMPTZ), sin skeletons/error boundary, moneda EUR hardcodeada.

**Principio de ordenación**: primero lo que hace seguro tener desconocidos dentro (retención y confianza), luego lo que los trae (adquisición), luego lo que diferencia y sostiene (valor + monetización).

---

## Mes 1 — «Preparado para desconocidos»

> Objetivo: que un usuario anónimo pueda registrarse, olvidar su contraseña, invitar por email… y que tú no pierdas ni datos ni visibilidad.

### S15 · Email transaccional + password reset + verificación
- Elegir proveedor (recomendado: **Resend** — DX simple, free tier 100 emails/día, ya contemplado en CLAUDE.md).
- Repository `EmailSender` (port en domain, impl Resend en `repositories/`) — patrón idéntico al resto.
- Montar `get_reset_password_router` y `get_verify_router` de fastapi-users + hooks `on_after_forgot_password` / `on_after_register`.
- Pantallas app: "olvidé mi contraseña" (pide email) + "nueva contraseña" (deep link con token). Plantillas de email EN/ES.
- **Por qué primero**: desbloquea S16 (mismo proveedor) y es el mayor riesgo de pérdida de usuarios.

### S16 · Invitaciones por email
- Sobre el modelo existente (`trip_invitation` ya contempla invitar a gente sin cuenta): campo email opcional en la invitación + envío del link por correo.
- Lista de invitaciones pendientes en `TripMembersScreen` (email + estado + reenviar/revocar).
- El flujo `?redirect=` de login/registro ya funciona — solo cambia el canal de entrega.

### S17 · Datos a salvo + ojos abiertos (infra, sin UI)
- **Postgres**: migrar a **Neon** free tier (backups/PITR automáticos, quita el techo de 1GB de Fly) — `DEPLOY.md` ya lo señala como salida natural. Alternativa mínima: cron de snapshots Fly.
- **Sentry** en backend (FastAPI) y frontend (sentry-expo, web incluida). Free tier sobra.
- ErrorBoundary raíz en la app (hoy un throw en render = pantalla blanca).

### S18 · Cuenta y legal (GDPR mínimo)
- Cambiar contraseña estando logueado (pantalla de ajustes — nace la screen de Settings, donde ya encaja el selector de idioma).
- Eliminar cuenta: `DELETE /users/me` con reasignación/borrado de viajes propios (decidir política: borrar viajes sin más miembros, transferir los compartidos).
- Página de privacidad + términos (estática, EN/ES) enlazada desde registro.

**Hito mes 1**: puedes dar la URL a un desconocido sin miedo.

---

## Mes 2 — «Adquisición y confianza»

> Objetivo: que llegue gente y que lo que vea parezca un producto.

### S19 · Landing + dominio + PWA instalable
- Landing pública (qué es, screenshots, CTA registro) — ruta `/` para anónimos en la propia app Expo o página estática en CF Pages.
- Dominio propio (p. ej. `tripinci.app`) para web y API (CNAME en CF + certs en Fly).
- Manifest PWA completo: iconos, splash, `display: standalone` — "instalable" en móvil sin pasar por stores (coherente con web-first).

### S20 · Entorno PRE
- Ejecutar el runbook ya escrito en `DEPLOY.md:192`: branch `develop`, app `tripinci-api-pre`, Postgres separado, job `deploy-pre`, preview branch en CF Pages.
- **Por qué ahora**: con usuarios reales deja de ser aceptable probar en producción (la edición de Málaga la hicimos con SQL a mano…).

### S21 · Modo oscuro
- Los tokens semánticos de NativeWind (slice 6) hacen esto barato: variantes dark de `background/surface/ink/brand` + toggle en Settings (persistido vía `secureStorage` como el idioma) + `prefers-color-scheme` como default.
- Alto valor percibido de "producto cuidado" por coste bajo.

### S22 · Pulido de onboarding y percepción
- Viaje demo autogenerado al registrarse (borrable) para que la primera pantalla no esté vacía.
- Skeletons en las 3 pantallas principales (lista, detalle, stats) en vez de spinner.
- Micro-copys de empty states orientados a acción.

**Hito mes 2**: un desconocido entiende qué es, se instala la PWA y su primera sesión no está vacía.

---

## Mes 3 — «Valor diferencial + sostenibilidad»

> Objetivo: razones para quedarse y una vía de cubrir costes.

### S23 · Presupuesto por viaje
- `trip.budget_cents` opcional + barra presupuesto-vs-gastado en detalle y stats.
- Es la feature de más valor diario para el caso de uso real (¿vamos bien de dinero este viaje?) y diferencia frente a "una nota compartida".

### S24 · Monetización: Stripe one-time
- Pago único "supporter" que desbloquea stats globales (el paywall ya estaba como candidato en CLAUDE.md).
- Stripe Checkout (hosted) para minimizar superficie: webhook + campo `is_supporter` en user.
- Objetivo real: **validar** si alguien paga, no ingresos.

### S25 · Export de datos
- Export CSV/JSON por viaje (gastos con categoría/pagador/fecha) desde la UI.
- Confianza ("tus datos son tuyos") + utilidad real post-viaje. Barato.

### S26 · Slice de feedback (buffer deliberado)
- Con 2-3 semanas de Sentry + uso real: decidir entre candidatos del backlog según datos, o absorber el desbordamiento de S23/S24 (Stripe siempre desborda).

**Hito mes 3**: primer euro cobrado (o descartada la hipótesis), presupuesto en uso, backlog reordenado con datos.

---

## Backlog explícito (con criterio de activación)

| Feature | Actívalo cuando… |
|---|---|
| Apps nativas (EAS + stores) | la PWA se quede corta o usuarios lo pidan |
| Notificaciones push | exista nativo (en web el valor es marginal) |
| Multi-moneda | primer viaje real fuera de la eurozona |
| Fotos de tickets (adjuntos) | usuarios lo pidan; requiere storage (R2/S3) |
| Gastos recurrentes / plantillas | patrón visible en datos de uso |
| Offline real (cache + cola) | quejas de conectividad en viajes |
| TIMESTAMPTZ refactor | antes de cualquier feature sensible a husos |
| Escalado multi-máquina Fly | métricas de saturación (lejos a esta escala) |

## Riesgos a vigilar
- **Deliverability de email** (S15/S16): configurar SPF/DKIM del dominio desde el día 1; si no, los resets caen a spam.
- **Stripe + fiscalidad UE** (S24): un one-time a consumidores UE implica IVA/OSS — valorar Stripe Tax o vender como "donación/supporter" y consultarlo antes de activar.
- **Scope creep en S18** (borrado de cuenta): definir la política de viajes compartidos antes de tocar código.

## Verificación del planning
- Revisión al cierre de cada mes contra el hito (¿se cumple la frase del hito? sí/no).
- Métricas mínimas desde S17: errores/semana en Sentry, registros/semana, % usuarios que crean ≥1 viaje.
- El orden interno de cada mes es intercambiable; el orden **entre meses** no (retención → adquisición → diferenciación).
