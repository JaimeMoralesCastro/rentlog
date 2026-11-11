// ============================================================================
//  C3 — Guidebook digital por piso (sustituye a Touch Stay).
//  Modelo de la guía del huésped: bienvenida, llegada/salida, wifi, cómo
//  funciona la casa, normas, recomendaciones de la zona y contacto. El
//  anfitrión la rellena una vez por piso; el huésped la ve en una página
//  limpia (y, en producción, en una URL pública por piso).
// ============================================================================

export function emptyGuidebook() {
  return {
    welcome: '',
    checkin_time: '',
    checkout_time: '',
    access: '',
    parking: '',
    wifi_network: '',
    wifi_password: '',
    house: '',
    rules: '',
    recommendations: [], // { name, category, note }
    host_name: '',
    host_phone: '',
    emergency: '',
  };
}

// Secciones para el editor (orden y etiquetas). Los campos apuntan a las claves
// de emptyGuidebook(); type controla el control de formulario.
export const SECTIONS = [
  {
    id: 'welcome', title: 'Bienvenida', hint: 'Un saludo breve y cálido. Es lo primero que ve tu huésped.',
    fields: [{ key: 'welcome', label: 'Mensaje de bienvenida', type: 'textarea', placeholder: '¡Bienvenido/a! Esperamos que disfrutes de tu estancia…' }],
  },
  {
    id: 'arrival', title: 'Llegada y salida', hint: 'Horarios e instrucciones para entrar y salir sin fricción.',
    fields: [
      { key: 'checkin_time', label: 'Hora de entrada', type: 'text', placeholder: 'A partir de las 15:00' },
      { key: 'checkout_time', label: 'Hora de salida', type: 'text', placeholder: 'Antes de las 11:00' },
      { key: 'access', label: 'Cómo acceder', type: 'textarea', placeholder: 'La caja de llaves está a la derecha de la puerta. Código: …' },
      { key: 'parking', label: 'Aparcamiento', type: 'textarea', placeholder: 'Parking gratuito en la calle / garaje en…' },
    ],
  },
  {
    id: 'wifi', title: 'WiFi', hint: 'Lo que más se pregunta. El huésped podrá copiarlo con un toque.',
    fields: [
      { key: 'wifi_network', label: 'Nombre de la red', type: 'text', placeholder: 'MiCasa_5G' },
      { key: 'wifi_password', label: 'Contraseña', type: 'text', placeholder: '••••••••' },
    ],
  },
  {
    id: 'house', title: 'La casa', hint: 'Cómo funciona todo: calefacción, aire, electrodomésticos, basura.',
    fields: [{ key: 'house', label: 'Cómo funciona', type: 'textarea', placeholder: 'Termostato en el pasillo. La lavadora usa pastillas bajo el fregadero. Reciclaje: contenedores en la esquina.' }],
  },
  {
    id: 'rules', title: 'Normas de la casa', hint: 'Reglas claras evitan malentendidos y malas reseñas.',
    fields: [{ key: 'rules', label: 'Normas', type: 'textarea', placeholder: 'No se admiten fiestas. No fumar. Descanso a partir de las 22:00.' }],
  },
  {
    id: 'contact', title: 'Contacto y emergencias', hint: 'Cómo localizarte y a quién llamar si algo va mal.',
    fields: [
      { key: 'host_name', label: 'Tu nombre', type: 'text', placeholder: 'Jaime' },
      { key: 'host_phone', label: 'Tu teléfono', type: 'text', placeholder: '+34 …' },
      { key: 'emergency', label: 'Emergencias', type: 'textarea', placeholder: 'Emergencias 112 · Centro de salud a 400 m · Farmacia 24 h en…' },
    ],
  },
];

export const REC_CATEGORIES = ['Restaurante', 'Bar / Café', 'Compras', 'Ocio', 'Playa / Naturaleza', 'Transporte', 'Otro'];

// % de completado de la guía (para animar al anfitrión a terminarla).
export function guidebookCompleteness(gb) {
  const checks = [
    gb.welcome, gb.checkin_time, gb.checkout_time, gb.access,
    gb.wifi_network, gb.wifi_password, gb.house, gb.rules,
    gb.host_phone, (gb.recommendations && gb.recommendations.length > 0),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

// Slug legible para la futura URL pública (rentlog.app/g/<slug>).
export function guidebookSlug(property) {
  const base = (property?.name || 'piso')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const suffix = String(property?.id || '').slice(0, 4);
  return `${base}-${suffix}`;
}
