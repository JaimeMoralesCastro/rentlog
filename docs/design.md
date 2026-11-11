# Rentlog — Sistema de diseño (editorial)

> Vigente desde 2026-07-13. **Sustituye por completo** al sistema anterior ("estilo Apple",
> off-white + slate + sombras). Nada del diseño previo se conserva. Las funciones, rutas,
> formularios y contenido NO cambian: cambia su presentación.

## 1. Color

| Rol | Valor | Uso |
|---|---|---|
| Fondo | `#FFFFFF` | Dominante: ≥85% de cada vista |
| Tinta | `#0A0A0A` | Texto e interfaz. **Nunca `#000000` ni grises intermedios en texto** |
| Acento | `#FF4D00` | Naranja eléctrico. **≤3% de superficie**, máx. 3 usos jerárquicos por vista |
| Acento hover | `#FF6B00` | Solo hover del CTA: **aviva**, no oscurece (mantiene 6.93:1 con tinta) |
| Hairline | `#E6E6E6` | 1px, solo cuando el vacío no basta para separar |
| Marco | `#0A0A0A` | Cabecera y pie sobre negro |

**Los 3 usos del acento por vista (máximo):** sello de sección · dato/cifra clave · un solo CTA primario.

### Reglas de contraste del acento (no negociables)

`#FF4D00` es el naranja más vivo que aún cumple AA en los tres usos. De ahí salen tres reglas:

| Uso | Combinación | Ratio | Por qué |
|---|---|---|---|
| Cifra clave | naranja sobre blanco | **3.33:1** | Solo vale en **texto grande** (≥24px). La cifra va a 72px |
| Sello | naranja sobre el hero **negro** | **5.95:1** | En blanco daría 3.33 y no llegaría a 4.5:1 |
| CTA | **tinta sobre naranja** | **5.95:1** | Texto blanco sobre naranja da 3.33 → **prohibido** |

- **Nunca naranja en texto pequeño sobre blanco** (`text-accent` a <24px): no llega a 4.5:1. Usa tinta.
- **Nunca `text-white` sobre `bg-accent`**: el botón naranja lleva texto negro.
- Más naranja (p. ej. `#FF6B00`) tumbaría la cifra clave sobre blanco (2.86 < 3): no subir el tono.

La jerarquía del texto NO viene del gris: viene de la **escala, el tracking y el vacío**. Todo el
texto es `#0A0A0A`. Los grises solo existen como hairline (`#E6E6E6`) y en placeholders de imagen.

**Prohibido:** degradados, sombras (`box-shadow: none` global), filetes de color, tintes de fondo.

**Excepción razonada — data viz:** las gráficas necesitan codificar categorías. Usan una rampa
monocroma (negro → grises) + rojo solo para la serie/dato destacado. El veto a los grises era para
el *texto*, no para la codificación de datos.

## 2. Tipografía

Dos familias, roles fijos. **El contraste serif/grotesca es la identidad.**

- **Fraunces** (serif alto contraste, 400–500, caja baja, comillas «»): titulares y frases destacadas.
  Nunca en labels, botones ni datos.
  **Siempre con `font-variation-settings: 'opsz' 144`** (lo aplica `.font-display`): el eje óptico al
  máximo es lo que da el corte display y el alto contraste. Sin él sale con contraste de texto y pierde
  la autoridad del titular.
  *Por qué Fraunces y no Playfair:* Playfair es el didone de escaparate de moda (lee "Zara"). Fraunces
  mantiene el alto contraste editorial pero con formas propias, y empuja hacia el lado de *periodismo
  económico* de la tensión buscada.
- **Inter** (grotesca, MAYÚSCULAS, `letter-spacing` 0.08–0.12em): navegación, etiquetas, microtexto.
- Datos y cuerpo: Inter, caja normal.

Escala (base 16px, ratio 1.333):

| Token | Tamaño | Familia |
|---|---|---|
| `text-hero` | clamp 44→72px, lh 1.05, ls −0.02em | Fraunces 400 · opsz 144 |
| `text-display` | 28px, lh 1.15 | Fraunces 400 · opsz 144 |
| `text-h2` | 21px, lh 1.25 | Fraunces 400 · opsz 144 |
| `text-body` | 16px, lh 1.6 | Inter |
| `text-label` | 12px, MAYÚS, ls 0.1em | Inter 500 |

## 3. Layout

- Rejilla 12 columnas, `max-width` 1280px, gutter 24px, margen lateral ≥64px en escritorio.
- Espaciado base 8: 8/16/24/40/64/96/128. **Separación entre bloques ≥96px.**
- Cada página principal abre con **hero full-bleed (100vw)** + titular serif superpuesto,
  alineado a la retícula (nunca centrado).
- **Interfaz invisible:** sin recuadros, sin cajas, sin fondos activos en menús. Enlaces = texto
  desnudo; subrayado solo en hover, offset 3px.
- Menú horizontal sobre negro, texto plano, sin cápsulas.
- Imágenes: 4:5 retratos, 16:9 solo hero. Fondos neutros, sin filtros de color.
- CTA primario: fondo `#D91F26`, texto blanco, `border-radius: 0`, padding 16/32, label grotesca
  mayúscula. **Máximo uno por pantalla.**

## 4. Restricción de cards (dura)

**Máximo DOS componentes tipo card en TODA la web** (sumando todas las páginas, no por página).

Las dos asignadas, ambas de cara al huésped (son objetos acotados de verdad, no contenedores de UI):

1. `Guidebook` → marco de la vista del huésped (simula la página que abre el huésped).
2. `LandingPreview` → widget de reserva de la web pública.

Todo lo demás (listados, KPIs, grids, bloques repetidos) se resuelve con **listas tipográficas,
filas separadas por vacío o hairline, y bloques editoriales a ancho completo**. La jerarquía la dan
la escala y el blanco, nunca un contenedor. Los modales son diálogos (no cards): panel plano, sin
sombra, sin radio.

## 5. Movimiento

- Transiciones 200–400ms `ease-out`. Sobrias y funcionales, nunca decorativas.
- Hover: **solo** subrayado o desplazamiento vertical de 2px. Prohibido escalar, rotar, sombrear.
- Scroll: aparición de bloques con fade-in + desplazamiento ascendente ≤16px al entrar en viewport.
- Hero con parallax leve.
- `prefers-reduced-motion`: el contenido queda visible sin animación (el reveal nunca oculta contenido
  por defecto: la animación realza un estado ya visible).

## 6. Principio rector (orden de decisión)

1. **Primero el vacío**: elimina antes de añadir.
2. La autoridad la dan el serif, el negro y la imagen; nunca el ornamento.
3. El rojo es un evento puntual, no un patrón.
4. Nunca superes las dos cards en total.

## 7. Reglas del proyecto que siguen vigentes

Sin emojis · sin `<select>` nativo (usar `<Select>`) · sin iconos de librería (solo glifos
tipográficos `★ ↑ ↓ → ✓ ▾ × ·`) · sin comentarios de código salvo el "por qué" no obvio.
