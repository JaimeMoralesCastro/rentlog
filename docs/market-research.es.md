# Rentlog — Estudio de mercado + plan de absorción de suscripciones

> Generado 2026-07-02. Une el estudio de mercado nuevo con la investigación previa del modelo de datos.
> Presupuesto objetivo del usuario: **máximo 20 $/mes de infraestructura**.

---

## 1. Qué paga hoy un host típico (3 pisos) — el stack a matar

Precios verificados julio 2026. Todo mensual salvo indicación.

| Categoría | Herramientas líderes | Precio real | Qué hace |
|---|---|---|---|
| **PMS / Channel Manager** | Smoobu (29 €/unidad), Lodgify (+0,8 %/reserva), Hospitable (~25-40 €), Hostaway (a medida, enterprise), **Beds24 (15,50 € + 0,55 €/canal)** | 25-40 € | Sincroniza calendario/precios/reservas entre Airbnb, Booking, Vrbo y web propia |
| **Dynamic pricing** | PriceLabs (19,99 $/piso), Beyond (1-1,25 % de ingresos), Wheelhouse | 20-60 € (3 pisos) | Precio noche a noche automático |
| **Market data** | AirDNA (15-25 $/piso) | 15-25 € | Ocupación/ADR/RevPAR del mercado |
| **Limpieza / operaciones** | Turno, Properly, Breezeway | 8-16 € | Calendario de turnos, asigna limpiador |
| **Reseñas** | Revyoos, GuestRevu | 8-20 € | Agrega reseñas de todas las plataformas + widget web |
| **Guidebook digital** | Touch Stay | ~21 € | Manual del piso (wifi, entrada, normas) por URL |
| **Contabilidad / fiscal** | Stessa, QuickBooks, o gestor | 15 € app / 60 € gestor | P&L, gastos, impuestos |
| **Verificación huésped** | Superhog, Safely | por estancia | Seguro/verificación |
| **TOTAL** | | **≈ 240-300 €/mes** | |

**La propuesta de Rentlog:** todo esto por **19-49 €/mes**. El cliente ahorra ~200 €/mes.

---

## 2. Lo que Rentlog ya cubre vs lo que falta

**Ya construido:** iCal channel (parcial), Smart Rate (parcial), market data INE (parcial), **fiscal español (completo, nadie más lo tiene)**, reseñas con sentimiento (completo), costes estimados (único), predicción con INE.

**Falta para completar la absorción (orden por dolor/ROI):**
1. Calendario operativo de limpieza → mata Turno (1-2 sem)
2. Smart Rate Pro noche a noche → mata PriceLabs (2-3 sem)
3. Guidebook digital con URL pública → mata Touch Stay (1 sem)
4. Plantillas de mensajería + recordatorios (1 sem)
5. Web/landing por piso + reserva directa Stripe (2 sem)
6. **Conexión Airbnb/Booking automática** (ver sección 4 — es la feature estrella)

---

## 3. Las 3 preguntas clave del usuario, respondidas

### 3.1. "Iniciar sesión con Airbnb/Booking y que importe todo sin pegar links"

**Realidad técnica (no ha cambiado):**
- **Airbnb NO tiene API pública.** Solo partners aprobados (channel managers grandes). Solicitarlo directo = meses + exige tracción demostrada. El único acceso self-service del host es exportar CSV manual (ingresos), que es justo lo que queremos evitarle.
- **Booking.com Connectivity API** existe pero requiere ser Connectivity Partner certificado (proceso formal, exámenes, gratis pero lento).

**Solución realista y barata → Channel Manager como pasarela:**
Los channel managers YA tienen las conexiones certificadas con Airbnb/Booking. Rentlog se conecta a ELLOS por API y saca todo. El host conecta una vez.

**Ganador para el presupuesto: Beds24.**
- Es **channel manager certificado por Airbnb** (preferred partner) y con Booking.com por API 2 vías.
- Tiene **API v2 documentada con Swagger** y scopes `bookings-financial/read` y `bookings-personal/read` → devuelve reservas **con importes, comisiones, datos del huésped, calendario e invoice items** (`?includeInvoiceItems=true`).
- Cuesta **15,50 € + 0,55 €/canal** — el más barato del mercado con API completa y sin comisión por reserva.
- Flujo: el host conecta su Airbnb/Booking a Beds24 (o Rentlog lo revende por debajo) → Rentlog lee todo vía API v2 → **cero pegar iCal, cero CSV**.

Hospitable es la alternativa premium (OAuth2 limpio, más caro ~25-40 €). **Empezar por Beds24 por coste.**

Para **reseñas y datos de competencia** (no las reservas propias privadas): **StayAPI / Staying API** dan reseñas y precios de Airbnb/Booking por API sin scrapear tú (50 requests gratis para probar). Útil para enriquecer, no para importar el negocio privado del host.

### 3.2. "Cómo conectar mi app directamente con Airbnb"

Dos horizontes:
- **Ahora (0-9 meses):** vía Beds24/Hospitable como pasarela. Es "directo" para el cliente (un botón, una conexión), aunque por debajo pase por el channel manager. **Coste dev: 3-4 semanas.**
- **Después (con 50-100 clientes):** solicitar **Airbnb Partner Program** y **Booking Connectivity Partner** directos, quitando el intermediario. Requiere la tracción que hoy no hay. Es la Fase E del roadmap.

### 3.3. "Que el cliente me dé acceso a sus facturas para mejorar Gastos"

Aquí hay que separar dos cosas:
- **Ingresos** → vienen del channel manager (Beds24) o del CSV de Airbnb. Ya resuelto arriba.
- **Gastos/facturas reales** → esto es **Open Banking (AISP)**: el cliente autoriza lectura de su cuenta bancaria y Rentlog importa y categoriza los movimientos (luz, limpieza, suministros...). 

**Proveedor recomendado: Enable Banking.**
- Cubre España entera (CaixaBank, BBVA, Santander, Sabadell, Bankinter, Kutxabank, Unicaja...).
- Tiene **tier gratuito "Restricted Production"** → solo cuentas que enlaces tú mismo. Perfecto para desarrollar y para tu propio negocio.
- Da **24 meses de histórico** y 90 días de consentimiento continuo, read-only.
- **Límite:** producción multi-cliente real necesita **contrato + KYB (de pago)**. GoCardless/Nordigen dejó de aceptar clientes nuevos en 2025; Enable Banking es hoy el mejor sustituto self-serve. Alternativas: Tink, TrueLayer, Salt Edge.

**Interino sin coste recurrente:** OCR/subida de facturas (foto → parser). El motor NLP de gastos de Gastolens ya existe en `src/finance/nlpParser.js` → reutilizable. Cero coste, y sirve mientras el volumen no justifique el contrato AISP.

---

## 4. Presupuesto — ¿qué cabe en 20 $/mes?

**Verdad incómoda primero:** 20 $/mes da para la **fase de construcción y primeros clientes** con tiers gratuitos bien usados. NO da para el modelo predictivo entrenándose sobre toda España + banca multi-cliente a la vez. Esos costes deben **repercutirse al cliente** (plan de 19-49 €), no salir de tu bolsillo.

### Lo que SÍ cabe en ~20 $/mes (fase MVP + primeros clientes)

| Concepto | Coste/mes | Nota |
|---|---|---|
| Supabase | **0 €** | Free tier (se pausa a 7 días sin actividad; con clientes reales no se pausa) |
| Vercel | **0 €** | Hobby tier |
| Beds24 (1 cuenta tuya para dev/test) | **~16 €** | Tu conexión para construir el connector |
| APIs datos (AEMET, DATAESTUR, INE, Ticketmaster, pytrends) | **0 €** | Todas gratuitas |
| Enable Banking (Restricted Production) | **0 €** | Solo cuentas propias, para dev |
| StayAPI (prueba) | **0 €** | 50 requests gratis |
| **TOTAL fase MVP** | **≈ 16 €/mes** | **Cabe en 20 $** ✓ |

### Lo que se sale del presupuesto (y cómo financiarlo)

| Concepto | Coste real | Cómo pagarlo |
|---|---|---|
| Supabase Pro (cuando el modelo + volumen lo exijan) | 25 $/mes | Repercutir en plan Pro/Portfolio |
| Beds24 por cada cliente (si revendes por debajo) | 0,55 €/canal/piso | Coste directo dentro del plan del cliente |
| Enable Banking producción multi-cliente | contrato + KYB | Feature premium; activar con >20-30 clientes |
| Infra modelo (R2 + GitHub Actions) | 1-5 €/mes | Marginal, cabe en Pro |

**Conclusión de presupuesto:** construyes y lanzas dentro de 20 $/mes. En cuanto tengas ingresos por suscripción, el coste crece con los clientes y se autofinancia. **No adelantes Supabase Pro ni contratos AISP hasta tener clientes que los paguen.**

---

## 5. Qué implementar, en qué orden y cuánto tarda

### Fase A — Cerrar MVP (1-2 sem) — *coste 0 €*
- Rediseñar modales pendientes: `PropertyForm`, `ImportReservations`, `ReviewImport`.
- Responsive pass (375px). Verificar end-to-end en Vercel+Supabase.

### Fase B — Connector Beds24 "Conectar mi negocio" (3-4 sem) — *~16 €/mes (tu cuenta dev)*
- OAuth/invite-code contra Beds24 API v2 (scopes financial + personal).
- Mapper: propiedades, reservas con importes/comisiones, calendario, huésped → modelos Rentlog.
- UI "Conectar mi negocio" (Premium) + paywall `is_premium` + Stripe (19-29 €/mes).
- Badge "Conectado vía Beds24".

### Fase C — Features de absorción (por ROI) — *coste 0 € extra*
- **C1** Calendario de limpieza (mata Turno) — 1-2 sem
- **C2** Smart Rate Pro noche a noche (mata PriceLabs, usa datos INE) — 2-3 sem
- **C3** Guidebook digital `rentlog.es/g/[slug]` (mata Touch Stay) — 1 sem
- **C4** Plantillas de mensajería + recordatorios — 1 sem
- **C5** Landing por piso + reserva directa Stripe — 2 sem

### Fase D — Gastos por Open Banking (2-3 sem) — *0 € en dev, contrato al escalar*
- Enable Banking Restricted Production → conectar cuenta, leer 24m, auto-categorizar con `nlpParser.js`.
- Interino: OCR de facturas subidas (0 € recurrente).

### Fase E — Modelo predictivo real (6-8 sem, en paralelo con C) — *sube a ~30-35 €/mes → repercutir*
- Seguir F0→F9 de `research-fuentes-datos-fase2.md`: schema raw → DATAESTUR/BdE → AEMET → Ticketmaster/Trends → Inside Airbnb → **XGBoost MVP (MAPE <10 %)** → validación + **UI que explica el porqué** (diferenciador vs PriceLabs/AirDNA).

### Fase F — Partnership directo Airbnb/Booking (con 50-100 clientes)
- Solicitar Airbnb Partner Program + Booking Connectivity Partner. Sustituir Beds24 por conexión directa.

**Timeline total hasta producto que absorbe el stack completo: ~14-18 semanas** de dev (A→D), con E en paralelo.

---

## 6. Decisión ejecutiva (TL;DR)

1. **Channel manager elegido: Beds24** — el único con Airbnb certificado + API financiera completa que cabe en el presupuesto.
2. **Facturas/gastos: Enable Banking** (gratis en dev, contrato al escalar) + OCR interino con el parser que ya tienes.
3. **20 $/mes alcanza para construir y lanzar.** El resto se autofinancia con las suscripciones.
4. **Orden:** cerrar MVP (A) → connector Beds24 (B) → limpieza/pricing/guidebook (C) → gastos banca (D) → modelo real (E) → partnership directo (F).
5. **No gastes en Supabase Pro ni AISP producción hasta tener clientes de pago.**

---

### Fuentes principales
- [PriceLabs vs AirDNA (SlashDot 2026)](https://slashdot.org/software/comparison/AirDNA-vs-PriceLabs/) · [Beyond/PriceLabs pricing](https://www.rakidzich.com/articles/airbnb-pricing-tools-comparison)
- [Smoobu pricing](https://www.g2.com/products/smoobu/pricing) · [Beds24 pricing](https://www.beds24.com/pricing.html)
- [Beds24 API v2 – datos financieros](https://forum.beds24.com/viewtopic.php?f=15&t=1555) · [getBookings](https://www.beds24.com/api/json/getBookings)
- [Hospitable API](https://developer.hospitable.com/) · [Hostaway API](https://api.hostaway.com/documentation)
- [StayAPI](https://stayapi.com/) · [Revyoos pricing](https://www.revyoos.com/w/plans-and-pricing/)
- [Enable Banking – España](https://enablebanking.com/docs/markets/es/) · [GoCardless Bank Account Data](https://developer.gocardless.com/bank-account-data/overview)
- [Airbnb – descargar ganancias/CSV](https://www.airbnb.com/help/article/3632)
</content>
</invoke>
