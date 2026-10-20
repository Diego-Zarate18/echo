import { Moris } from "@/componentes/marca/Moris";
import { Boton } from "@/componentes/ui/Boton";
import { IconoCandado, IconoCirculoCheck, IconoCirculoPunto } from "@/componentes/ui/iconos/iconos";
import { MorisVivo } from "./MorisVivo";
import { Ondas } from "./Ondas";

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
      <g
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1"
        className="animate-trazar [animation-delay:750ms]"
      >
        <path pathLength={1} d="M0 65H150" />
        <path pathLength={1} d="M0 45H58L88 15H140" />
        <path pathLength={1} d="M0 85H58L88 115H140" />
      </g>
      <g
        fill="currentColor"
        className="animate-encender origin-center [transform-box:fill-box] [animation-delay:1350ms]"
      >
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

/**
 * Tarjeta ilustrativa «Ejemplo de ruta» (84:510). No es contenido real: así lo dice su título.
 * Solo aparece desde 1360 px: por debajo tapaba a Moris, y el manual no lo permite.
 */
function EjemploRuta() {
  return (
    <figure className="absolute right-10 bottom-10 z-20 hidden animate-aparecer [animation-delay:900ms] w-[316px] flex-col gap-3.5 rounded-panel border border-blanco/16 bg-marca-crema/8 p-[22px] text-marca-crema shadow-vidrio backdrop-blur-vidrio min-[85rem]:flex">
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
    <div className="p-2">
      <section
        id="portada"
        aria-labelledby="titulo-portada"
        data-fondo="oscuro"
        className="relative isolate overflow-hidden rounded-panel bg-marca-cafe text-marca-crema shadow-hero lg:rounded-hero lg:[--alto-hero:clamp(38rem,calc(100svh-1rem),57.5rem)]"
      >
        {/*
          Borde de arriba del hero: en cuanto sale de la ventana, el encabezado se vuelve barra fija, y al subir
          solo se suelta cuando el encabezado del hero se ve completo. Así nunca hay un momento sin navegación.
        */}
        <span id="centinela-encabezado" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2" />
        {/* El contenido sigue la retícula de 1424 px aunque la tarjeta llegue a 8 px del borde. */}
        <div className="relative mx-auto flex w-full max-w-[1424px] flex-col px-5 pt-[76px] pb-6 md:px-8 md:pt-[92px] md:pb-10 lg:min-h-(--alto-hero) lg:justify-end lg:px-[72px] lg:pt-40 lg:pb-[72px]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-[92px] left-[3.3%] -z-10 animate-eco font-titulo text-[calc((100vw-1rem)*0.322)] leading-none font-black tracking-[-0.03em] whitespace-nowrap text-marca-crema/8 select-none lg:top-[11.3%] lg:left-[15%] lg:text-[min(calc((100vw-1rem)*0.2415),340px,calc(var(--alto-hero)*0.37))]"
          >
            ÉTICA
          </span>

          {/*
            Ancho de Moris: 26 % del contenedor, sin pasar del 42 % del alto del hero y, cuando se ve la
            tarjeta de ejemplo, sin acercarse a ella (316 px + 40 px de margen + 16 px de aire y de puntero).
          */}
          <div className="moris-portada relative mx-auto w-[220px] md:w-[300px] lg:absolute lg:bottom-[17.2%] lg:left-[47.9%] lg:mx-0 lg:w-[min(26%,calc(var(--alto-hero)*0.42))] min-[85rem]:w-[min(26%,calc(var(--alto-hero)*0.42),calc(52.1%-23.25rem))]">
            <MorisVivo>
              <Ondas />
              <Moris
                expresion="principal"
                alt="Moris, la mascota de Echo: una semilla redonda color terracota con dos hojas verdes, ojos grandes y una sonrisa."
                sizes="(min-width: 1024px) min(26vw, 370px), (min-width: 768px) 300px, 220px"
                preload
                className="w-full animate-brotar [animation-delay:150ms]"
              />
              <Filamentos className="top-[31.5%] left-[93%] w-1/2 text-marca-menta lg:top-[7.6%] lg:left-[94%] lg:w-[30%]" />
            </MorisVivo>
          </div>

          <div className="relative mt-[30px] max-w-[640px] lg:mt-0 lg:w-[46%]">
            <h1 id="titulo-portada" className="font-titulo text-portada font-black text-balance">
              <span className="block animate-aparecer [animation-delay:300ms]">Lo que construyes,</span>{" "}
              <span className="block animate-regresar [animation-delay:520ms]">
                <span className="eco-rastro" data-texto="regresa.">
                  regresa.
                </span>
              </span>
            </h1>
            <p className="mt-[18px] max-w-[560px] animate-aparecer text-base leading-[1.55] [animation-delay:650ms] lg:mt-[26px] lg:text-destacado">
              «Echo» viene del griego ēchō: sonido que regresa. Toda decisión en tecnología tiene
              consecuencias que alcanzan a otras personas. Aquí aprendes a anticiparlas.
            </p>
            <div className="mt-[18px] flex animate-aparecer flex-col gap-2.5 [animation-delay:780ms] md:flex-row md:gap-4 lg:mt-[26px]">
              <Boton variante="crema" conFlecha href="/registro" className="w-full md:w-[200px]">
                Crear cuenta
              </Boton>
              <Boton variante="contorno" href="#que-encontraras" className="w-full md:w-[200px]">
                Ver cómo funciona
              </Boton>
            </div>
          </div>

          <EjemploRuta />
        </div>
      </section>
    </div>
  );
}
