import type { ReactNode } from "react";
import { ControlesDeApartados } from "@/componentes/estructura/ControlesDeApartados";
import { IconoCasilla, IconoChevronAbajo } from "@/componentes/ui/iconos/iconos";
import type { DocumentoLegal } from "@/lib/markdown/documento";
import { dibujarBloques, dibujarTexto } from "@/lib/markdown/renderizar";

type PropsPaginaDeDocumentoLegal = {
  documento: DocumentoLegal;
  /** Frase bajo el título (Figma 84:787 y 170:5231). */
  subtitulo: string;
  /** Título de la tarjeta de resumen: «Resumen del Aviso de privacidad». */
  tituloDelResumen: string;
  /** Un ícono decorativo por punto del resumen, en su orden. */
  iconosDelResumen: readonly ReactNode[];
  /** Correos que se vuelven enlaces `mailto:` en el texto. */
  correos: readonly string[];
};

const ID_APARTADOS = "apartados";

/**
 * Página de un texto legal (SCR-05 y SCR-20, DEC-98; Figma 84:783, 170:5216 y móviles 150:4959, 150:5454):
 * 1. el título, la frase y la versión con su fecha;
 * 2. la tarjeta «Resumen…» con los cinco puntos del bloque «Resumen en cinco puntos» del archivo (el convertidor lo saca
 *    de su lugar, así que no se repite en el texto);
 * 3. «El documento completo · N apartados» con «Abrir todos»;
 * 4. cada `##` del archivo como un `<details>` cerrado, con su `h2` dentro del `summary` (componente 170:5215).
 *
 * El texto completo va en el HTML aunque los apartados estén cerrados: es lo que la persona acepta. La página sigue
 * estática; lo único de cliente son los controles (el botón, las anclas y la impresión).
 */
export function PaginaDeDocumentoLegal({ documento, subtitulo, tituloDelResumen, iconosDelResumen, correos }: PropsPaginaDeDocumentoLegal) {
  const { resumen } = documento;
  return (
    <div className="mx-auto w-full max-w-[840px] px-5 md:px-5">
      <header className="flex flex-col gap-3.5 pt-10 pb-8 lg:pt-16 lg:pb-10">
        <h1 className="font-titulo text-seccion font-black text-balance">{documento.titulo}</h1>
        <p className="text-amplio text-texto-secundario">{subtitulo}</p>
        <p className="text-detalle font-bold text-texto-secundario">
          Versión {documento.version} · Última actualización:{" "}
          <time dateTime={documento.actualizacion.iso}>{documento.actualizacion.texto}</time>
        </p>
      </header>

      <div className="flex flex-col gap-7 pb-24">
        {resumen ? (
          <section
            aria-labelledby="titulo-resumen"
            className="flex flex-col gap-5 rounded-tarjeta bg-superficie-hundida px-5 py-6 md:px-8 md:py-7"
          >
            <h2 id="titulo-resumen" className="font-titulo text-[22px] leading-[1.2] font-extrabold md:text-2xl">
              {tituloDelResumen}
            </h2>
            <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {resumen.puntos.map((punto, i) => (
                <li key={punto.titulo} className="flex gap-3.5 md:flex-col md:gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-marca-cafe text-marca-menta"
                  >
                    {iconosDelResumen[i]}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-titulo text-base leading-[1.4] font-bold">{punto.titulo}</p>
                    <p className="text-menor leading-normal text-texto-secundario">{dibujarTexto(punto.texto, { correos })}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-detalle text-texto-secundario">{dibujarTexto(resumen.nota, { correos })}</p>
          </section>
        ) : null}

        <ControlesDeApartados idLista={ID_APARTADOS} total={documento.secciones.length} />

        <div id={ID_APARTADOS} className="flex flex-col gap-3">
          {documento.secciones.map((seccion) => (
            <details
              key={seccion.id}
              id={seccion.id}
              className="apartado group overflow-clip rounded-aviso border border-marca-cafe bg-superficie-elevada"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-4 transition-[background-color] duration-150 group-open:bg-superficie-hundida hover:bg-superficie-hundida md:px-6 md:py-[18px] [&::-webkit-details-marker]:hidden">
                <h2
                  id={`titulo-${seccion.id}`}
                  className="flex-1 font-titulo text-base leading-[1.4] font-bold text-balance md:text-[18px]"
                >
                  {seccion.titulo}
                </h2>
                <IconoChevronAbajo className="chevron-apartado size-[22px]" />
              </summary>
              <div className="flex flex-col gap-4 px-5 pt-4 pb-6 text-amplio leading-[1.7] md:px-6">
                {dibujarBloques(seccion.bloques, {
                  prefijo: seccion.id,
                  tituloDeSeccion: seccion.titulo,
                  correos,
                  iconoDeCasilla: <IconoCasilla className="size-5" />,
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
