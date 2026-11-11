# Plan — Conectar Rentlog con Airbnb / Booking

> Generado 2026-07-30. Objetivo: pasar de mock a conexión REAL con los canales.
> Léelo de arriba abajo; al final está la decisión que necesito de ti para arrancar.

---

## 0. La realidad de las integraciones (para no llevarnos sorpresas)

Ni Airbnb ni Booking dan una API financiera abierta a un anfitrión individual:

- **Airbnb** — no tiene API pública para hosts. Su API es solo para *partners* aprobados (gestores con
  volumen). Lo único accesible a un host normal es el **iCal** (exportar calendario).
- **Booking.com** — su *Connectivity API* está reservada a proveedores de conectividad homologados.
  También ofrece **iCal** de exportación.

Por tanto hay **tres rutas reales**, y conviene combinarlas:

| Ruta | Qué trae | Coste | Esfuerzo | Estado |
|---|---|---|---|---|
| **A · iCal** | Fechas/ocupación + UID + nombre huésped (a veces) | Gratis | Bajo | Código LISTO, falta desplegar |
| **B · Beds24** (channel manager) | TODO: importe, comisión, canal, estado, huésped | ~16 €/mes | Medio | Provider escrito, falta probar+desplegar |
| **C · Partnership directo** | API oficial | — | Alto | Largo plazo (Fase F, con 50-100 clientes) |

**Recomendación:** hacer **A ya** (quick win visible y gratis, aunque solo fechas) y en paralelo montar
**B** (el que da el valor financiero real del producto). C queda para más adelante.

---

## 1. Lo que YA está montado (no partimos de cero)

- **iCal**
  - `supabase/functions/sync-ical/index.ts` — **completa**: descarga el iCal server-side (evita CORS),
    parsea eventos, ignora bloqueos, hace upsert con dedupe por `(user_id, external_uid)`, respeta RLS,
    actualiza `last_sync_at`. **Solo falta desplegarla.**
  - `properties.ical_airbnb_url` / `ical_booking_url` (columnas ya en `schema.sql`).
  - `useRentlogData.syncProperty()` ya invoca `supabase.functions.invoke('sync-ical', ...)` en modo real.
- **Beds24 (connector)**
  - `src/connector/providers/beds24Provider.js` — **con las llamadas reales a la API v2** escritas
    (setup → refreshToken, token 24h, getProperties, getBookings con importe/comisión/canal/estado).
  - Abstracción limpia: `provider.js` (registry, env `VITE_CONNECTOR_PROVIDER`, default `mock`),
    `mapper.js`, `importBusiness.js`, `connection.js`. UI `ConnectBusiness.jsx` (paywall→código→progreso→resumen).
  - `supabase/schema-connector.sql` — tablas `profiles`, `connector_accounts` (token **cifrado** con
    pgp_sym_encrypt) + RPCs + columnas `connected_via`/`external_property_id`.
  - `supabase/functions/sync-connector/index.ts` — esqueleto server-side para guardar/renovar el token y
    traer bookings (a revisar/completar).

---

## Fase 0 — Prerequisitos (tú, ~30 min)

- [ ] Instalar **Supabase CLI** (`npm i -g supabase` o scoop/brew) y `supabase login`.
- [ ] `supabase link --project-ref YOUR-PROJECT-REF` desde la carpeta del proyecto.
- [ ] Decidir si vamos también a por Beds24 ahora (implica crear cuenta de pago) o solo iCal de momento.

---

## Fase 1 — iCal en real (quick win, gratis) — EN MARCHA

**Meta:** que pegando la URL iCal de un piso, las reservas (fechas) entren solas en Supabase.

1. [x] **Desplegada** `sync-ical` (2026-07-30). Fix aplicado: el índice único de `reservations` es PARCIAL,
       así que ON CONFLICT no servía → la función deduplica en código e inserta.
2. [x] **Probado end-to-end**: iCal real → 83 reservas importadas; re-sync → 0 (dedupe OK).
3. [x] UI `IcalUrlInput` rediseñada a DESIGN.md; botón "Sincronizar" ya operativo en Propiedades.
4. [x] **Sync automático HECHO** (2026-07-30): Edge Function `cron-sync-ical` (service role, protegida por
       cabecera `x-cron-secret` = secreto `CRON_SECRET`, desplegada con `--no-verify-jwt`) recorre TODAS las
       propiedades con iCal. Programada con **pg_cron** (job `sync-ical-all`, cada 3 h: `0 */3 * * *`) vía
       `net.http_post`. Verificado: 200 con el secreto, 401 sin él.
5. [ ] UX: mostrar `last_sync_at` ("sincronizado hace X") por piso. ← pendiente menor

**Dónde saca el usuario la URL iCal:**
- **Airbnb**: Calendario → (piso) → *Disponibilidad* → **Sincronizar calendarios** → *Exportar calendario* →
  copiar la URL `.ics`.
- **Booking**: Extranet → *Tarifas y disponibilidad* → **Sincronización de calendarios / iCal** → exportar.

**Limitación importante:** iCal **no trae dinero** (ni importe, ni comisión, ni payout). Sirve para
ocupación y calendario. Los ingresos seguirán viniendo del **import CSV** o de **Beds24**. Esto hay que
comunicarlo bien en la UI para no prometer de más.

---

## Fase 2 — Beds24 en real (datos financieros) — ~2-3 días

**Meta:** el flujo "Conectar mi negocio" trae propiedades + reservas + **importe/comisión/canal** de verdad.

1. [ ] Crear cuenta **Beds24** (~16 €/mes) y **conectar en Beds24** tus anuncios de Airbnb/Booking
       (Beds24 hace de channel manager entre los canales y nosotros).
2. [ ] En Beds24: *Settings → Apps & Integrations → API* → generar **invite code** con scopes
       `bookings-personal/read`, `bookings-financial/read`, `properties/read`.
3. [ ] Backend Supabase:
   - [ ] Aplicar `schema-connector.sql` (si no está ya) en el SQL Editor.
   - [ ] Definir el secreto **`CONNECTOR_ENC_KEY`** (clave para cifrar el refreshToken):
         `supabase secrets set CONNECTOR_ENC_KEY=...`.
4. [ ] **Revisar/completar** `sync-connector/index.ts`: canjear invite→refreshToken (cifrado en
       `connector_accounts`), emitir accessToken 24h, llamar a `beds24Provider.getProperties/getBookings`
       (el módulo ya existe; Deno usa el mismo `fetch`), mapear con `mapper.js` y hacer upsert con dedupe
       por `external_uid`. **El refreshToken NUNCA viaja al navegador.**
5. [ ] `supabase functions deploy sync-connector`.
6. [ ] En la app: `VITE_CONNECTOR_PROVIDER=beds24` (var de entorno en Vercel) y probar el flujo real de
       `ConnectBusiness` con tu invite code → importa propiedades + reservas + importes + comisiones + canal.
7. [ ] **Validar el riesgo de white-label** (anotado en el handoff): el revender sub-cuentas de Beds24 por
       API suele exigir acuerdo de partner + ~0,55 €/canal por piso. Confirmar con la cuenta real antes de
       ofrecerlo a clientes.

---

## Puente "Conecta tu correo" (Gmail) — EN CONSTRUCCIÓN

Alternativa/complemento sin API de Airbnb: leer los correos de ANFITRIÓN (nueva reserva / payout) y
reconstruir la reserva con su dinero. Dos partes:

1. [x] **Parser** `src/finance/emailParser.js` (2026-07-30): de email de anfitrión → reserva normalizada
       (huésped, fechas, ingreso, comisión, código→`external_uid`, estado). ES/EN, Airbnb+Booking, reserva/
       payout/cancelación; ignora campañas. Extracción por ETIQUETAS. Incorpora formatos reales verificados por
       web: asunto Airbnb `Reservation Confirmed - <código>`, payout `Payout of <importe> sent`, código HMxxxxxxxx.
       **32/32 tests** (`scripts/test-email-parser.mjs`). ⚠️ CAVEAT: los correos de Airbnb son TABLAS HTML donde
       los valores viven en celdas (no siempre junto a una etiqueta de texto) → para cubrir Airbnb al 100% hará
       falta extracción por estructura HTML, y eso requiere un correo REAL de anfitrión para mapearlo. Booking y
       las partes con etiquetas/texto sí van bien. La bandeja del usuario solo tiene correos de viajero.
2. [x] **Orquestador de importación** HECHO (2026-07-30): `src/email/importEmails.js` — `scanInbox(emails, ctx)`
       parsea, ignora lo que no es reserva, **funde reserva + payout** por código, casa cada una con la
       propiedad por el nombre del alojamiento, marca duplicados (código ya en BBDD) y campos a revisar.
       `candidateToReservation` prepara la fila (sin `currency`: la tabla no la tiene; `property_id` obligatorio).
3. [x] **Pantalla "Conecta tu correo"** HECHA (2026-07-30, MOCK): `src/components/ConnectEmail.jsx` (intro →
       leer bandeja → revisar → importar → resumen), enchufada en `Reservas` (botón cabecera). Bandeja simulada
       en `src/email/mockInbox.js` (7 correos: reservas Airbnb ES/EN, Booking, payout que se funde, uno sin
       casar «Loft Granada», campaña ignorada, cancelación). **Verificado end-to-end** contra Supabase real:
       7 leídos → 1 ignorado → 5 reservas → 4 importadas (1 sin propiedad se bloquea hasta asignarla) →
       re-escaneo marca "4 ya importadas" (dedupe por `external_uid`). ⚠️ Falta afinar Airbnb HTML real.
4. [~] **Conexión Gmail (OAuth read-only)** — CÓDIGO HECHO (2026-07-30), falta desplegar (depende de que el
       usuario cree el proyecto Google Cloud y me pase client_id + client_secret). Construido:
       - `supabase/schema-gmail.sql` — tablas `gmail_accounts` (refresh token CIFRADO) + `gmail_oauth_states`
         (anti-CSRF, mapa state→user) + RPCs `gmail_store_token`/`gmail_read_token` (patrón connector).
       - `supabase/functions/gmail-oauth-callback/index.ts` — canjea el code por tokens (client_secret en el
         servidor), guarda el refresh cifrado, avisa a la app por `postMessage`. Deploy `--no-verify-jwt`.
       - `supabase/functions/gmail-sync/index.ts` — renueva access token, busca `from:airbnb.com OR
         from:booking.com newer_than:1y`, devuelve `{from,subject,text}` (el parseo lo hace scanInbox en front).
       - `src/email/gmailConnection.js` — popup de consentimiento + `fetchHostEmails()` (real vía Edge Function,
         demo → mock). `ConnectEmail.jsx` ya distingue demo / no conectado ("Conectar Gmail") / conectado.
       - **Pendiente de desplegar:** aplicar `schema-gmail.sql`, secrets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/
         `GMAIL_ENC_KEY`, `deploy gmail-sync` + `deploy gmail-oauth-callback --no-verify-jwt`, y en la app
         `VITE_GOOGLE_CLIENT_ID` (local + Vercel).
       - **Redirect URI a registrar en Google:** `https://YOUR-PROJECT-REF.supabase.co/functions/v1/gmail-oauth-callback`
       - *Gratis en testing (≤100 usuarios de prueba); producción con scope restringido exige verificación de Google.*

## Fase 3 — Robustez y automatización (después)

- [ ] Sync programado (cron) también para Beds24; o **webhooks** de Beds24 si están disponibles (mejor que
      hacer polling).
- [ ] Reintentos + estado de error por piso + alerta si un canal deja de sincronizar.
- [ ] Reconciliación: si una reserva llega por iCal y luego por Beds24, no duplicar (Beds24 gana, trae más
      datos). Clave de dedupe común.

---

## Decisión que necesito de ti (al volver)

**¿Por dónde arrancamos?**

- **Opción rápida:** Fase 0 + Fase 1 (iCal) hoy mismo → tienes reservas reales entrando por calendario en
  un rato, gratis. No trae dinero.
- **Opción completa:** además, empezar Fase 2 (Beds24) → datos financieros reales, pero implica pagar la
  cuenta Beds24 y ~2-3 días de trabajo + validar el tema white-label.

**Mi recomendación:** hacemos **Fase 1 (iCal) ya** como base gratis y visible, y en cuanto tengas la cuenta
Beds24 creada, atacamos Fase 2, que es la que convierte a Rentlog en la herramienta financiera de verdad.

Lo primero que necesito de ti para empezar sin fricción: **instalar el Supabase CLI y hacer `supabase login`**
(Fase 0) — sin eso no puedo desplegar las Edge Functions.
