# Guía de despliegue de Rentlog (paso a paso)

## Estado actual

- ✅ **Desplegada y pública en Vercel:** https://rentlog-two.vercel.app
- ⏳ **En MODO DEMO** (datos de ejemplo) hasta conectar Supabase. Para cuentas reales,
  verificación de correo y que los datos no se pierdan → completa los pasos 1-3 de abajo
  y envíame las 2 claves de Supabase (o ponlas tú en Vercel) para activarlo.

Esta guía deja Rentlog **funcionando de verdad**: cuentas reales con verificación de
correo, datos que NO se pierden, sincronización de calendarios y datos de mercado del INE.

Tiempo estimado: ~30 minutos. No necesitas saber programar.

---

## 1. Crear el proyecto en Supabase (la base de datos)

1. Entra en [supabase.com](https://supabase.com) → **Start your project** (es gratis).
2. **New project** → ponle nombre (`rentlog`), elige una contraseña y la región **Europe (Frankfurt)**.
3. Espera ~2 minutos a que se cree.

### 1.1 Crear las tablas
1. En el menú lateral: **SQL Editor** → **New query**.
2. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copia TODO su contenido y pégalo.
3. Pulsa **Run**. Debe decir *Success*. Esto crea propiedades, reservas, gastos, reseñas, seguridad por usuario (RLS) y la tabla de datos de mercado.

### 1.2 Coger las 2 claves
1. Menú lateral: **Project Settings** (engranaje) → **API**.
2. Copia estos dos valores:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** (Project API Keys) → será `VITE_SUPABASE_ANON_KEY`

---

## 2. Activar el registro con verificación de correo

1. En Supabase: **Authentication** → **Providers** → **Email** → activa **Confirm email** (verificación obligatoria).
2. **Authentication** → **Email Templates** → pestaña **Confirm signup**:
   - Pega el contenido de [`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html).
   - Asunto sugerido: `Confirma tu cuenta de Rentlog`.
3. **Authentication** → **URL Configuration** → **Site URL**: pon la URL donde alojarás la app
   (en local `http://localhost:5174`; en producción, tu dominio de Vercel).

> Con el plan gratis, Supabase envía los correos por ti (límite diario). Para volumen real,
> en **Authentication → Emails → SMTP** puedes conectar un proveedor (Resend, SendGrid…).

---

## 3. Conectar la app con Supabase

1. En la carpeta del proyecto, copia `.env.example` a `.env`.
2. Rellena las dos líneas con las claves del paso 1.2:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. `npm install` y `npm run dev`. Ahora la app pide login real y **los datos se guardan** (ya no es modo demo).

---

## 4. Desplegar las Edge Functions (sincronización y mercado)

Necesitas la CLI de Supabase: [instrucciones](https://supabase.com/docs/guides/cli).

```bash
supabase login
supabase link --project-ref <TU_PROJECT_REF>     # el ref está en Project Settings

# Sincronización de reservas iCal (Airbnb/Booking)
supabase functions deploy sync-ical

# Refresco de datos de mercado del INE
supabase functions deploy refresh-market
```

- **sync-ical**: la usa el botón "Sincronizar" de cada propiedad. Lee las URLs iCal, descarga las reservas y las guarda sin duplicar.
- **refresh-market**: actualiza la estacionalidad con datos vivos del INE. Prográmala 1 vez/mes
  (Supabase → **Database → Cron** o un scheduler externo). Mientras no se ejecute, la app usa el
  snapshot real del INE ya incluido (2024).

---

## 5. Publicar la app en internet (Vercel)

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
4. **Environment Variables**: añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (las del paso 1.2).
5. **Deploy**. En 1-2 minutos tendrás una URL pública.
6. Vuelve a Supabase → **Authentication → URL Configuration → Site URL** y pon esa URL de Vercel.

---

## Comprobación final (checklist para enseñar a un cliente)

- [ ] Puedo **crear una cuenta** y me llega el **correo de verificación** (con la estética de Rentlog).
- [ ] Al **salir y volver a entrar**, mis propiedades/reservas/gastos **siguen ahí**.
- [ ] Puedo añadir una propiedad, pegar su **URL iCal** y pulsar **Sincronizar** para traer reservas.
- [ ] El **dashboard**, las **finanzas** (informe fiscal) y la **analítica** (con datos INE) muestran cifras.
- [ ] La app se entiende **sin manual**.

---

## Fuentes de datos de mercado

Los análisis y predicciones se basan en datos reales del **INE (Instituto Nacional de Estadística)**:
- Estacionalidad: *Pernoctaciones en alojamientos turísticos (EOT)*, 2024.
- Anclajes ADR/RevPAR/ocupación: *Coyuntura Turística Hotelera (EOH/IPH/IRSH)*, 2024.

Ver detalle y procedencia en [`src/finance/marketData.js`](src/finance/marketData.js).
