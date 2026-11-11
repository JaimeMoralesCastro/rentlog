/** @type {import('tailwindcss').Config} */
// Sistema editorial — ver DESIGN.md. Blanco dominante, tinta #0A0A0A, un solo
// acento rojo (≤3% de superficie), sin sombras, sin radios.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Superficies: blanco, siempre ──
        bg:      '#FFFFFF',
        surface: '#FFFFFF',
        elevated:'#FFFFFF',
        // ── Marco (cabecera/pie) ──
        frame:   '#0A0A0A',
        // ── Tinta: negro casi puro. Sin grises intermedios en texto: la
        //    jerarquía la dan escala, tracking y vacío (DESIGN.md §1).
        //    Los pasos 300→50 NO son texto: son hairline y placeholders. ──
        ink: {
          950: '#0A0A0A',
          900: '#0A0A0A',
          700: '#0A0A0A',
          600: '#0A0A0A',
          500: '#0A0A0A',
          400: '#0A0A0A',
          300: '#E6E6E6',
          200: '#E6E6E6',
          100: '#E6E6E6',
          50:  '#FFFFFF',
        },
        hairline: '#E6E6E6',
        // ── Acento único: naranja eléctrico ──
        //  #FF4D00 es el naranja más vivo que aún da 3:1 sobre blanco (3.33),
        //  lo que permite la cifra clave en grande. Sobre él va SIEMPRE texto
        //  negro (5.95:1): en blanco daría 3.33 y no pasa. Ver DESIGN.md §1.
        accent: {
          DEFAULT: '#FF4D00',
          ink:     '#FF6B00',   // hover del CTA: aviva (no oscurece) para mantener 6.93:1 con tinta
          subtle:  '#FFFFFF',   // sin tintes: el acento no se diluye
          ring:    '#FF4D00',
        },
        // ── Semánticos: el brief impone un solo acento. Todo a tinta; el rojo
        //    queda reservado a los 3 usos jerárquicos por vista. ──
        income:  '#0A0A0A',
        expense: '#0A0A0A',
        warn:    '#0A0A0A',
        info:    '#0A0A0A',
        // ── Rampa monocroma solo para data viz (no texto) ──
        viz: { 1: '#0A0A0A', 2: '#4D4D4D', 3: '#8A8A8A', 4: '#B8B8B8', 5: '#D6D6D6', key: '#FF4D00' },
        // ── Compat: aliases de componentes antiguos remapeados al sistema ──
        peach: { 50: '#FFFFFF', 100: '#FFFFFF', 200: '#E6E6E6', 300: '#0A0A0A', 500: '#0A0A0A', 600: '#0A0A0A' },
        teal:  { 50: '#FFFFFF', 100: '#E6E6E6', 200: '#E6E6E6', 300: '#0A0A0A', 500: '#0A0A0A', 600: '#0A0A0A', 700: '#0A0A0A' },
        canvas:{ DEFAULT: '#FFFFFF', card: '#FFFFFF' },
      },
      // Sin sombras en ningún sitio (DESIGN.md §1). El foco usa outline, no shadow.
      boxShadow: {
        hair: 'none', card: 'none', 'card-hover': 'none', pop: 'none', focus: 'none', none: 'none',
      },
      // Sin radios: esquina viva.
      borderRadius: { none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0' },
      fontFamily: {
        // Grotesca: nav, labels, datos, cuerpo.
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Serif alto contraste: SOLO titulares y frases destacadas. Fraunces con
        // el eje óptico al máximo (ver .font-display en index.css): mantiene el
        // alto contraste editorial sin el didone de escaparate de moda.
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        // Escala base 16, ratio 1.333 (DESIGN.md §2)
        hero:    ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
        display: ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '400' }], // H1 28px
        h2:      ['1.3125rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '400' }], // 21px
        body:    ['1rem', { lineHeight: '1.6' }],
        label:   ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.1em', fontWeight: '500' }],
      },
      letterSpacing: { tightest: '-0.03em', tighter: '-0.02em', label: '0.1em', wide: '0.08em' },
      transitionTimingFunction: {
        out:      'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        drawer:   'cubic-bezier(0.32, 0.72, 0, 1)',
        spring:   'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: { 120: '120ms', 180: '200ms', 220: '240ms', 280: '320ms' },
      animation: {
        'fade-in':  'fadeIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'count-in': 'fadeIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'page-in':  'pageIn 360ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-dot':'pulseDot 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pageIn:  { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseDot:{ '0%,100%': { opacity: '0.9' }, '50%': { opacity: '0.3' } },
      },
      maxWidth: { grid: '1280px' },
      spacing: { grid: '64px' },
    },
  },
  plugins: [],
}
