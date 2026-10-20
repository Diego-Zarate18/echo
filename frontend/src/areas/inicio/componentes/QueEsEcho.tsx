import { Moris } from "@/componentes/marca/Moris";
import { IconoBalanza, IconoCirculoCheck, IconoEscudo, IconoLey } from "@/componentes/ui/iconos/iconos";

const puntos = [
  "Pensada para estudiantes de TI y carreras afines",
  "Sin conocimientos previos de ética o legislación",
  "Lecciones breves, en español y a tu ritmo",
] as const;

const fundamentos = [
  { texto: "Código de Ética de ACM", Icono: IconoBalanza },
  { texto: "LFPDPPP · datos personales", Icono: IconoEscudo },
  { texto: "LFDA · derecho de autor", Icono: IconoLey },
] as const;

/** Sección «Qué es Echo» (84:530). */
export function QueEsEcho() {
  return (
    <section
      id="que-es-echo"
      aria-labelledby="titulo-que-es-echo"
      data-fondo="oscuro"
      className="border-t border-marca-menta/16 bg-marca-cafe px-5 py-20 text-marca-crema md:px-10 md:py-28 lg:px-[72px] lg:py-[140px]"
    >
      <div className="mx-auto grid w-full max-w-[1296px] gap-12 lg:grid-cols-[minmax(0,640px)_minmax(0,528px)] lg:gap-x-12 xl:gap-x-24">
        <div className="flex flex-col gap-7">
          <h2 id="titulo-que-es-echo" className="font-titulo text-entrada font-extrabold text-balance">
            Echo es una plataforma para aprender ética, principios, leyes y normas del desarrollo de
            software.
          </h2>
          <div className="revelar-globo flex max-w-[560px] items-center gap-4 rounded-burbuja border border-blanco/16 bg-marca-crema/8 px-[22px] py-[18px] backdrop-blur-vidrio">
            <Moris expresion="sorprendido" alt="" sizes="52px" className="w-[52px]" />
            <p className="flex flex-col gap-0.5 text-menor">
              <strong className="font-titulo font-bold text-marca-menta">¿Sabías que…?</strong>
              <span>
                Los programas de cómputo también están protegidos por la Ley Federal del Derecho de
                Autor.
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <p className="text-amplio leading-[1.65]">
            No necesitas saber de leyes. Cada tema se explica con lenguaje claro y ejemplos cotidianos:
            la privacidad de los datos, los derechos de autor, la seguridad y los códigos de ética
            profesional.
          </p>
          <ul className="revelar flex flex-col gap-7">
            {puntos.map((punto) => (
              <li key={punto} className="flex items-center gap-3 text-cuerpo font-semibold">
                <IconoCirculoCheck className="size-[22px] text-marca-menta" />
                {punto}
              </li>
            ))}
          </ul>
          <h3 className="font-titulo text-base font-bold">Fundamentos que vas a conocer</h3>
          <ul className="revelar flex flex-wrap gap-2.5">
            {fundamentos.map(({ texto, Icono }) => (
              <li
                key={texto}
                className="flex items-center gap-2 rounded-full border border-blanco/16 bg-marca-crema/8 px-4 py-2.5 backdrop-blur-vidrio"
              >
                <Icono className="size-[18px] text-marca-menta" />
                <span className="font-titulo text-detalle font-bold">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
