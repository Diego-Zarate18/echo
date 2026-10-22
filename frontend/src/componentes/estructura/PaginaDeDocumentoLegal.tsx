import { IndicePagina } from "@/componentes/estructura/IndicePagina";
import { IconoCasilla } from "@/componentes/ui/iconos/iconos";
import type { DocumentoLegal } from "@/lib/markdown/documento";
import { dibujarBloques } from "@/lib/markdown/renderizar";

type PropsPaginaDeDocumentoLegal = {
  documento: DocumentoLegal;
  /** Correos que se vuelven enlaces `mailto:` en el texto. */
  correos: readonly string[];
};

/**
 * Página de un texto legal (SCR-05 y SCR-20, con el diseño de Figma 84:783): título, versión y fecha, índice
 * «En esta página» con cada `##` y columna de lectura de 58ch. Las tablas ocupan el ancho de la columna y se desplazan
 * dentro de su contenedor en pantallas angostas.
 */
export function PaginaDeDocumentoLegal({ documento, correos }: PropsPaginaDeDocumentoLegal) {
  const apartados = documento.secciones.map(({ id, titulo }) => ({ id, titulo }));
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[120px]">
      <header className="flex max-w-[920px] flex-col gap-3.5 pt-10 pb-8 lg:pt-16 lg:pb-12">
        <h1 className="font-titulo text-seccion font-black text-balance">{documento.titulo}</h1>
        <p className="text-amplio text-texto-secundario">
          Versión {documento.version} · Última actualización:{" "}
          <time dateTime={documento.actualizacion.iso}>{documento.actualizacion.texto}</time>
        </p>
      </header>

      <div className="grid gap-10 pb-24 lg:grid-cols-[300px_minmax(0,776px)] lg:gap-16">
        <IndicePagina apartados={apartados} />
        <div className="flex min-w-0 flex-col gap-14">
          {documento.secciones.map((seccion) => (
            <section
              key={seccion.id}
              id={seccion.id}
              aria-labelledby={`titulo-${seccion.id}`}
              className="flex flex-col gap-4 text-amplio leading-[1.7]"
            >
              <h2 id={`titulo-${seccion.id}`} className="font-titulo text-elemento leading-[1.15] font-extrabold text-balance">
                {seccion.titulo}
              </h2>
              {dibujarBloques(seccion.bloques, {
                prefijo: seccion.id,
                tituloDeSeccion: seccion.titulo,
                correos,
                iconoDeCasilla: <IconoCasilla className="size-5" />,
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
