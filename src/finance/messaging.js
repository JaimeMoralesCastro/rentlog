// ============================================================================
//  C4 — Plantillas de mensajería.
//  Plantillas reutilizables con variables {{...}} que se rellenan con los datos
//  de una reserva/piso/guía. El anfitrión copia el mensaje listo (o, en el
//  futuro Premium, se envía solo al huésped en el momento adecuado).
// ============================================================================
import { formatDate } from './dateHelpers.js';

// Variables disponibles para las plantillas (para el editor y la ayuda).
export const VARIABLES = [
  { key: 'huesped', label: 'Nombre del huésped' },
  { key: 'piso', label: 'Nombre del piso' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'entrada', label: 'Fecha de entrada' },
  { key: 'salida', label: 'Fecha de salida' },
  { key: 'noches', label: 'Nº de noches' },
  { key: 'hora_entrada', label: 'Hora de entrada' },
  { key: 'hora_salida', label: 'Hora de salida' },
  { key: 'wifi_red', label: 'Red WiFi' },
  { key: 'wifi_clave', label: 'Contraseña WiFi' },
  { key: 'anfitrion', label: 'Tu nombre' },
  { key: 'telefono', label: 'Tu teléfono' },
];

// Plantillas de fábrica. `moment` marca cuándo tiene sentido enviarla (para la
// futura automatización). Sin envío real todavía.
export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-confirm', name: 'Confirmación de reserva', moment: 'Al reservar',
    body: 'Hola {{huesped}}, ¡gracias por reservar {{piso}}! Tu estancia es del {{entrada}} al {{salida}} ({{noches}} noches). Te escribiré unos días antes con las instrucciones de llegada. Cualquier duda, aquí estoy.\n\n{{anfitrion}}',
  },
  {
    id: 'tpl-checkin', name: 'Instrucciones de llegada', moment: '1 día antes de la entrada',
    body: 'Hola {{huesped}}, ¡ya casi estás aquí! Entrada a partir de las {{hora_entrada}} en {{piso}} ({{ciudad}}).\n\nWiFi: red "{{wifi_red}}", contraseña {{wifi_clave}}.\n\nSi necesitas cualquier cosa, llámame al {{telefono}}. ¡Buen viaje!\n{{anfitrion}}',
  },
  {
    id: 'tpl-during', name: 'Mensaje de bienvenida', moment: 'El día de la entrada',
    body: '¡Bienvenido/a a {{piso}}, {{huesped}}! Espero que el viaje haya ido bien y que todo esté a tu gusto. Tienes toda la información de la casa en la guía. Que disfrutes de {{ciudad}}.\n\n{{anfitrion}}',
  },
  {
    id: 'tpl-checkout', name: 'Recordatorio de salida', moment: '1 día antes de la salida',
    body: 'Hola {{huesped}}, un recordatorio: la salida es mañana antes de las {{hora_salida}}. Solo tienes que dejar las llaves donde las encontraste. ¡Gracias por cuidar el piso!\n\n{{anfitrion}}',
  },
  {
    id: 'tpl-review', name: 'Petición de reseña', moment: '1 día después de la salida',
    body: 'Hola {{huesped}}, ¡gracias por tu estancia en {{piso}}! Espero que lo hayas pasado genial. Si te ha gustado, me ayudaría muchísimo que dejaras una reseña. ¡Serás bienvenido/a siempre que vuelvas a {{ciudad}}!\n\n{{anfitrion}}',
  },
];

// Construye el contexto de variables desde reserva + piso + guía.
export function buildContext({ reservation, property, guidebook }) {
  const r = reservation || {};
  const p = property || {};
  const g = guidebook || {};
  return {
    huesped: r.guest_name || 'huésped',
    piso: p.name || 'el piso',
    ciudad: p.city || '',
    entrada: r.check_in ? formatDate(r.check_in) : '',
    salida: r.check_out ? formatDate(r.check_out) : '',
    noches: r.nights != null ? String(r.nights) : '',
    hora_entrada: g.checkin_time || '15:00',
    hora_salida: g.checkout_time || '11:00',
    wifi_red: g.wifi_network || '',
    wifi_clave: g.wifi_password || '',
    anfitrion: g.host_name || '',
    telefono: g.host_phone || '',
  };
}

// Sustituye {{var}} por su valor. Deja marcadas las variables sin dato como
// [algo] para que el anfitrión las vea y complete antes de enviar.
export function renderTemplate(body, context = {}) {
  return String(body || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = context[key];
    if (v == null || v === '') {
      const label = (VARIABLES.find(x => x.key === key)?.label || key).toLowerCase();
      return `[${label}]`;
    }
    return v;
  });
}

// Lista de variables sin valor en un render (para avisar al anfitrión).
export function missingVariables(body, context = {}) {
  const used = [...String(body || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]);
  return [...new Set(used)].filter(k => context[k] == null || context[k] === '');
}
