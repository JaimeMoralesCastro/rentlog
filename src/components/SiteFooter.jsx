// Pie sobre negro: cierra el marco. Texto plano, sin cajas.
export default function SiteFooter() {
  return (
    <footer className="bg-frame text-white mt-32">
      <div className="page py-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
        <div>
          <p className="font-display text-[28px] leading-none mb-3">Rentlog</p>
          <p className="text-[14px] text-white/70 max-w-[42ch] leading-relaxed">
            Analítica y gestión para anfitriones en España. Datos reales del INE y fiscalidad
            española, en un solo sitio.
          </p>
        </div>
        <p className="label text-white/60">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
