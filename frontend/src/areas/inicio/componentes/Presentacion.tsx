import { Moris } from "@/componentes/marca/Moris";
import { Boton } from "@/componentes/ui/Boton";
import { IconoCandado, IconoCirculoCheck, IconoCirculoPunto } from "@/componentes/ui/iconos/iconos";
import { AvisoPiloto } from "./AvisoPiloto";

/** Filamentos de circuito (84:481 / 84:710), decorativos. Rutas exportadas de Figma. */
function Filamentos({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 220 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute opacity-60 ${className}`}
    >
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 65H150" />
        <path d="M0 45H58L88 15H140" />
        <path d="M0 85H58L88 115H140" />
      </g>
      <g fill="currentColor">
        <path d="M162 76C168.075 76 173 71.0751 173 65C173 58.9249 168.075 54 162 54C155.925 54 151 58.9249 151 65C151 71.0751 155.925 76 162 76Z" />
        <path d="M150 24C154.971 24 159 19.9706 159 15C159 10.0294 154.971 6 150 6C145.029 6 141 10.0294 141 15C141 19.9706 145.029 24 150 24Z" />
        <path d="M150 124C154.971 124 159 119.971 159 115C159 110.029 154.971 106 150 106C145.029 106 141 110.029 141 115C141 119.971 145.029 124 150 124Z" />
      </g>
    </svg>
  );
}

const cursosEjemplo = [
  {
    titulo: "Curso 1 · Código de ética",
    estado: "Completado",
    icono: <IconoCirculoCheck titulo="Completado:" className="size-5 text-marca-menta" />,
    claseEstado: "text-marca-menta",
  },
  {
    titulo: "Curso 2 · Privacidad de datos",
    estado: "Disponible",
    icono: <IconoCirculoPunto titulo="Disponible:" className="size-5 text-marca-crema" />,
    claseEstado: "text-marca-crema",
  },
  {
    titulo: "Curso 3 · Propiedad intelectual",
    estado: "Aprueba el examen del curso 2",
    icono: <IconoCandado titulo="Bloqueado:" className="size-5 text-marca-crema" />,
    claseEstado: "text-marca-crema",
  },
] as const;

/** Tarjeta ilustrativa «Ejemplo de ruta» (84:510). No es contenido real: así lo dice su título. */
function EjemploRuta() {
  return (
    <figure className="absolute right-12 bottom-14 z-20 hidden w-[340px] flex-col gap-3.5 rounded-panel border border-blanco/16 bg-marca-crema/8 p-[22px] text-marca-crema shadow-vidrio backdrop-blur-vidrio xl:flex">
      <figcaption className="flex items-center justify-between">
        <span className="font-titulo text-menor font-bold">Ejemplo de ruta</span>
        <span className="text-nota text-marca-menta">Módulo 1</span>
      </figcaption>
      <p className="font-titulo text-tarjeta leading-normal font-extrabold tracking-[-0.005em]">
        Responsabilidad profesional
      </p>
      <ul className="flex flex-col gap-3.5">
        {cursosEjemplo.map((curso) => (
          <li
            key={curso.titulo}
            className="flex items-center gap-3 rounded-fila border border-blanco/10 bg-marca-crema/5 px-3.5 py-3"
          >
            {curso.icono}
            <span className="flex flex-col">
              <span className="font-titulo text-detalle font-bold">{curso.titulo}</span>
              <span className={`text-nota ${curso.claseEstado}`}>{curso.estado}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Hero del inicio público (84:477 escritorio, 84:706 móvil). */
export function Presentacion() {
  return (
    <div className="px-3 pt-3 pb-3 lg:px-4 lg:pt-4 lg:pb-4">
      <section
        aria-labelledby="titulo-portada"
        data-fondo="oscuro"
        className="relative isolate mx-auto max-w-[1408px] overflow-hidden rounded-panel bg-marca-cafe text-marca-crema shadow-hero lg:rounded-hero"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[92px] left-[3.3%] -z-10 font-titulo text-[calc((100vw-1.5rem)*0.322)] leading-none font-black tracking-[-0.03em] whitespace-nowrap opacity-[0.08] select-none lg:top-[11.3%] lg:left-[15%] lg:text-[min(calc((100vw-2rem)*0.2415),340px)]"
        >
          ÉTICA
        </span>

        <div className="relative flex flex-col px-5 pt-[76px] pb-6 md:px-8 md:pt-[92px] md:pb-10 lg:min-h-[57.5rem] lg:justify-end lg:px-[72px] lg:pt-40 lg:pb-[72px]">
          <AvisoPiloto variante="tarjeta" className="lg:hidden" />

          <div className="relative mx-auto w-[220px] md:w-[300px] lg:absolute lg:top-[28.5%] lg:left-[47.9%] lg:mx-0 lg:w-[30.1%]">
            <Moris
              expresion="principal"
              alt="Moris, la mascota de Echo: una semilla redonda color terracota con dos hojas verdes, ojos grandes y una sonrisa."
              sizes="(min-width: 1024px) 30vw, (min-width: 768px) 300px, 220px"
              preload
              className="w-full"
            />
            <Filamentos className="top-[31.5%] left-[93%] w-1/2 text-marca-menta lg:top-[7.6%] lg:left-[94%] lg:w-[52%]" />
          </div>

          <div className="relative mt-[30px] max-w-[640px] lg:mt-0 lg:w-[46%]">
            <h1 id="titulo-portada" className="font-titulo text-portada font-black text-balance">
              Lo que construyes, <span className="block">regresa.</span>
            </h1>
            <p className="mt-[18px] max-w-[560px] text-base leading-[1.55] lg:mt-[26px] lg:text-destacado">
              «Echo» viene del griego ēchō: sonido que regresa. Toda decisión en tecnología tiene
              consecuencias que alcanzan a otras personas. Aquí aprendes a anticiparlas.
            </p>
            <div className="mt-[18px] flex flex-col gap-2.5 md:flex-row md:gap-4 lg:mt-[26px]">
              <Boton variante="crema" conFlecha href="/registro" className="w-full md:w-[200px]">
                Crear cuenta
              </Boton>
              <Boton variante="contorno" href="#que-encontraras" className="w-full md:w-[200px]">
                Ver cómo funciona
              </Boton>
            </div>
          </div>
        </div>

        <EjemploRuta />
      </section>
    </div>
  );
}
