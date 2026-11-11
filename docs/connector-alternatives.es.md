# Connector — comparativa de proveedores (Bloque 0, 2026-07-03)

> Pregunta: ¿hay algo más barato que Beds24 (~16 €/mes) con prestaciones equivalentes
> (propiedades, reservas con importes/comisiones, calendario, huésped, white-label)?

## Tabla comparativa

| Proveedor | Coste entrada | Coste por piso/canal | API con datos financieros | White-label / multi-cuenta | Fricción |
|---|---|---|---|---|---|
| **Beds24** (decisión actual) | desde **8,40 €/mes** (tier básico; ~15,50 € plan típico) | **0,55 €/canal/mes** | ✅ API v2 Swagger, scopes `bookings-financial/read` + `bookings-personal/read`, invoice items | ✅ Sub-cuentas por API (requiere acuerdo/rol agencia) | Baja-media. Certificado Airbnb + Booking |
| **Channex.io** | Standard ~$30/mes · **WhiteLabel $130/mes flat** | Sin mínimos; pagas por propiedad activa | ✅ API-first para PMSs (su único producto) | ✅ Diseñado exactamente para nuestro caso (PMS revende) | Alta al inicio ($130 flat), pero **la mejor arquitectura a escala** |
| **Nowistay** | **12 €/mes/propiedad** | incluido | ⚠️ API key desde dashboard, docs finas; sin programa partner claro | ❌ No documentado | Media. AI-first, joven, riesgo de docs/estabilidad |
| **Smoobu** | 29 €/mes (Professional) | incluido 1 unidad | ✅ API decente | ⚠️ Partner program, no white-label real | Más caro que Beds24 |
| **NextPax / RentalsUnited / Su-API** | Enterprise, presupuesto a medida | — | ✅ | ✅ White-label puro | Alta: pensados para PMS con volumen, no para arrancar |

## Lectura

1. **Para HOY (presupuesto ≤20 $/mes, 0 clientes): Beds24 sigue siendo la elección correcta.**
   Entrada 8,40-15,50 €, datos financieros completos por API, certificado Airbnb. Nada la bate en coste
   con prestaciones equivalentes. Nowistay es 12 €/piso (más caro a partir de 2 pisos) y sin white-label.
2. **Para MAÑANA (≥15-30 pisos conectados): Channex WhiteLabel ($130 flat) pasa a ser mejor.**
   Es un producto B2B hecho exactamente para lo que queremos (PMS que revende channel management bajo su
   marca). El flat fee se amortiza con volumen y evita el 0,55 €/canal creciente de Beds24.
3. **Conclusión arquitectónica:** la abstracción de proveedor NO es opcional — es lo que permite arrancar
   con Beds24 y saltar a Channex sin reescribir. Construido así en esta fase.

## Necesita mi intervención (decisión del usuario)
- Ninguna urgente: **no hay opción claramente más barata que Beds24 hoy** con prestaciones equivalentes.
- Decisión futura a tu cargo: cuándo saltar a Channex WhiteLabel (~a partir de ~15-30 pisos conectados,
  cuando $130 flat < suma de cuotas Beds24). La abstracción deja el cambio barato.

## Fuentes
[Beds24 pricing](https://www.beds24.com/pricing.html) · [Channex](https://channex.io/) · [Channex en HotelMinder](https://www.hotelminder.com/partner=Channex) · [Nowistay pricing](https://www.nowistay.com/pricing) · [Comparativa channel managers 2026 (Chekin)](https://chekin.com/en/blog/top-5-channel-managers/) · [RentalsUnited white-label](https://rentalsunited.com/white-label-channel-manager/) · [Su-API](https://www.su-api.com/) · [eviivo comparativa](https://eviivo.com/trade-secrets/best-vacation-rental-channel-managers/)
