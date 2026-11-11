# Desplegar la conexión Gmail real — lo mínimo que tienes que hacer tú

Todo el back-end (schema, secrets, 2 Edge Functions, var de entorno) está automatizado
en `scripts/deploy-gmail.ps1`. Tu trabajo manual se reduce a **conseguir 3 valores** y
**ejecutar un script**. La clave de cifrado (`GMAIL_ENC_KEY`) ya está generada dentro del script.

## Paso A — Google Cloud (una vez, ~15 min)
1. [console.cloud.google.com](https://console.cloud.google.com) → **Proyecto nuevo** `Rentlog`.
2. **APIs y servicios → Biblioteca** → busca **Gmail API** → **Habilitar**.
3. **Pantalla de consentimiento OAuth** → tipo **Externo** → rellena nombre `Rentlog`,
   correos de soporte/desarrollador (`tu-correo@example.com`). Déjala en modo **Testing**.
   En **Usuarios de prueba** añade tu correo y el de cualquier tester que vaya a conectar Gmail.
4. **Credenciales → + Crear credenciales → ID de cliente de OAuth → Aplicación web**.
   - URI de redireccionamiento autorizado (pega EXACTO):
     `https://YOUR-PROJECT-REF.supabase.co/functions/v1/gmail-oauth-callback`
5. Copia el **Client ID** (`...apps.googleusercontent.com`) y el **Client Secret** (`GOCSPX-...`).

## Paso B — Token de Supabase (30 seg)
- [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
  → **Generate new token** → copia el `sbp_...`. Solo se usa para desplegar; no se guarda.

## Paso C — Ejecutar el script (1 comando)
```powershell
.\scripts\deploy-gmail.ps1 -GoogleClientId "TU_CLIENT_ID" -GoogleClientSecret "TU_SECRET" -SupabaseAccessToken "sbp_TU_TOKEN"
```
Hace: aplica `schema-gmail.sql`, fija los 3 secrets, despliega `gmail-sync` y
`gmail-oauth-callback` (`--no-verify-jwt`), y añade `VITE_GOOGLE_CLIENT_ID` a `.env`.

## Paso D — Redeploy web (para que el front tenga el Client ID)
1. Vercel → Project → Settings → Environment Variables → añade
   `VITE_GOOGLE_CLIENT_ID = TU_CLIENT_ID`.
2. `npx vercel --prod`

## Probar
App → **Reservas → Conecta tu correo → Conectar Gmail** → consiente en el popup →
"Leer bandeja" trae tus correos reales de Airbnb/Booking y los convierte en reservas.

> Nota: en modo Testing de Google solo conectan los correos añadidos como *usuarios de prueba*.
> Pasar a producción (cualquier correo) exige la verificación de Google del scope `gmail.readonly`.
