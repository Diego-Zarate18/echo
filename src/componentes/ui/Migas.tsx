import Link from "next/link";

export type Miga = {
  texto: string;
  /** Sin `href` es la página actual: va en negrita y con `aria-current="page"`. */
  href?: string;
};

/** Ruta de navegación («Módulos / Privacidad y datos personales»). El último elemento es la página actual. */
export function Migas({ elementos }: { elementos: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="flex flex-wrap items-center gap-x-[9px] gap-y-1 text-detalle text-texto-secundario">
        {elementos.map(({ texto, href }, indice) => (
          <li key={`${indice}-${texto}`} className="flex items-center gap-[9px]">
            {indice > 0 ? <span aria-hidden="true" className="text-marca-cafe/50">/</span> : null}
            {href ? (
              <Link href={href} className="underline underline-offset-[3px] hover:text-marca-cafe hover:decoration-2">
                {texto}
              </Link>
            ) : (
              <span aria-current="page" className="font-bold text-marca-cafe">
                {texto}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
