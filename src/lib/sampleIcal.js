// iCal de ejemplo para MODO DEMO: simula el calendario que Airbnb expone.
// Incluye 2 reservas y 1 bloqueo (que el parser debe ignorar). Las fechas se
// generan en el mes que viene para que aparezcan como próximas. Los UID son
// fijos: al sincronizar dos veces, la segunda no duplica nada.
function nextMonth(day) {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}${String(day).padStart(2, '0')}`;
}

export const SAMPLE_ICAL = `BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:${nextMonth(9)}
DTSTART;VALUE=DATE:${nextMonth(5)}
UID:airbnb-demo-0001@airbnb.com
SUMMARY:Reserved
DESCRIPTION:Reservation confirmed
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:${nextMonth(20)}
DTSTART;VALUE=DATE:${nextMonth(16)}
UID:airbnb-demo-0002@airbnb.com
SUMMARY:Reserved
DESCRIPTION:Reservation confirmed
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:${nextMonth(25)}
DTSTART;VALUE=DATE:${nextMonth(23)}
UID:airbnb-demo-block-01@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
END:VCALENDAR`;
