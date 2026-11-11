// Apertura editorial de cada página: hero full-bleed (100vw) con titular serif
// superpuesto y alineado a la retícula (nunca centrado). Los controles de la
// página caen DEBAJO, sobre blanco, para no mezclar portada con herramienta.
//
// La API es la misma que antes (eyebrow / title / subtitle / actions): las
// páginas no cambian, cambia su presentación.
//
// `imageUrl` deja preparada la fotografía real (16:9, fondo neutro, sin filtro):
// hasta que exista, el hero es una banda negra —no inventamos una imagen.
export default function PageHeader({ eyebrow, title, subtitle, actions, imageUrl }) {
  return (
    <>
      <div
        className="full-bleed bg-frame text-white relative"
        style={imageUrl ? {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        } : undefined}
      >
        <div className="page min-h-[42vh] flex items-end py-16">
          <div className="w-full">
            {eyebrow && <p className="seal mb-5">{eyebrow}</p>}
            <h1 className="font-display text-hero text-white max-w-[16ch]">{title}</h1>
            {subtitle && (
              <p className="text-[15px] leading-relaxed text-white/75 mt-6 max-w-[58ch]">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="hair-bottom py-6 mb-16 flex items-center gap-6 flex-wrap">
          {actions}
        </div>
      )}
      {!actions && <div className="mb-16" />}
    </>
  );
}
