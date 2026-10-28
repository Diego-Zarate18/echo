import Link from "next/link";
import type { Ref } from "react";
import { Casilla } from "@/componentes/ui/Casilla";
import {
  AVISO_SIMPLIFICADO,
  CASILLAS,
  CASILLAS_OBLIGATORIAS,
  CASILLAS_OPCIONALES,
  type NombreCasilla,
} from "@/areas/cuenta/textosDeConsentimiento";

const CORREO_EN_TEXTO = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/** Párrafo con el correo como enlace `mailto:`, igual que el convertidor de los textos legales. */
function ConCorreo({ texto }: { texto: string }) {
  const [antes, correo, despues] = texto.split(CORREO_EN_TEXTO);
  if (!correo) return texto;
  return (
    <>
      {antes}
      <a href={`mailto:${correo}`} className="font-semibold text-marca-cafe underline underline-offset-4 hover:decoration-2">
        {correo}
      </a>
      {despues}
    </>
  );
}

/** Aviso de privacidad simplificado (Anexo A, Figma 152:5306) con el enlace al aviso integral. */
export function AvisoSimplificado() {
  return (
    <section
      aria-labelledby="aviso-simplificado"
      className="flex flex-col gap-2 rounded-aviso bg-superficie-hundida p-4 text-detalle leading-normal text-texto-secundario"
    >
      <h2 id="aviso-simplificado" className="font-titulo text-menor font-bold text-marca-cafe">
        {AVISO_SIMPLIFICADO.titulo}
      </h2>
      {AVISO_SIMPLIFICADO.parrafos.map((parrafo) => (
        <p key={parrafo}>
          <ConCorreo texto={parrafo} />
        </p>
      ))}
      <Link
        href="/aviso-de-privacidad"
        className="inline-flex min-h-6 items-center self-start font-titulo font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
      >
        Leer el Aviso de privacidad integral
      </Link>
    </section>
  );
}

export type ValoresCasillas = Record<NombreCasilla, boolean>;
export const CASILLAS_SIN_MARCAR: ValoresCasillas = {
  negativaEncuesta: false,
  negativaEstadisticas: false,
  mayorDeEdad: false,
  aceptaAviso: false,
  aceptaTerminos: false,
};

type PropsCasillas = {
  /** Prefijo de los `id` (`registro`, `aceptar`). El de cada casilla es `${prefijo}-${nombre}`. */
  prefijo: string;
  valores: ValoresCasillas;
  errores: Partial<Record<NombreCasilla, string>>;
  alCambiar: (nombre: NombreCasilla, marcada: boolean) => void;
  referencias?: Partial<Record<NombreCasilla, Ref<HTMLInputElement>>>;
};

const claseLeyenda = "mb-3 font-titulo text-nota font-bold text-texto-secundario";

/**
 * Las cinco casillas del Anexo A, sin marcar, en dos `fieldset` con su `legend` (152:5311 y 152:5321): las negativas a
 * finalidades secundarias son opcionales; mayoría de edad, aviso y términos, obligatorias.
 */
export function CasillasDeConsentimiento({ prefijo, valores, errores, alCambiar, referencias = {} }: PropsCasillas) {
  const casilla = (nombre: NombreCasilla) => (
    <Casilla
      key={nombre}
      ref={referencias[nombre]}
      id={`${prefijo}-${nombre}`}
      name={nombre}
      checked={valores[nombre]}
      error={errores[nombre]}
      onChange={(evento) => alCambiar(nombre, evento.target.checked)}
    >
      {CASILLAS[nombre]}
    </Casilla>
  );
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className={claseLeyenda}>Opcionales</legend>
        {CASILLAS_OPCIONALES.map(casilla)}
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className={claseLeyenda}>Obligatorias</legend>
        {CASILLAS_OBLIGATORIAS.map(casilla)}
      </fieldset>
    </>
  );
}
