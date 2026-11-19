"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { IconoAlerta, IconoOjo, IconoOjoTachado } from "@/componentes/ui/iconos/iconos";

type PropsCampo = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-invalid" | "aria-describedby"> & {
  id: string;
  etiqueta: string;
  /** Texto del error; liga el campo con `aria-describedby` y lo marca como inválido. */
  error?: string | null;
  /** Ayuda bajo la etiqueta («Al menos el primero»), también ligada con `aria-describedby`. */
  ayuda?: string;
  /** Otros elementos que describen el campo (la lista de requisitos de la contraseña). */
  describe?: string;
  ref?: Ref<HTMLInputElement>;
};

/** `aria-describedby` con el error, la ayuda y lo demás que describa el campo, en ese orden. */
function descripciones(id: string, { error, ayuda, describe }: Pick<PropsCampo, "error" | "ayuda" | "describe">) {
  const ids = [error ? `${id}-error` : null, ayuda ? `${id}-ayuda` : null, describe ?? null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function Ayuda({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="-mt-1 text-detalle text-texto-secundario">
      {children}
    </p>
  );
}

/**
 * Caja de Campo/Normal (66:4): crema elevada, borde de 1.5 px en texto secundario (6.4:1) y 14 px de radio.
 * Con foco, borde bosque y el anillo de 3 px del sistema alrededor de la caja (no del `input`), para que abrace
 * también al botón de la contraseña. Con error, borde riesgosa.
 */
function Caja({ error, children }: { error: boolean; children: ReactNode }) {
  return (
    <div
      className={[
        "flex w-full items-center gap-2 rounded-fila border-[1.5px] bg-superficie-elevada pr-1.5 transition-[border-color] duration-150",
        "has-[input:focus-visible]:border-marca-bosque has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-marca-bosque",
        error ? "border-estado-riesgosa" : "border-texto-secundario",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

const claseEntrada =
  "min-w-0 flex-1 rounded-fila bg-transparent py-3.5 pl-4 font-lectura text-base text-marca-cafe outline-none focus-visible:outline-none";

function Etiqueta({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="font-titulo text-menor font-bold text-marca-cafe">
      {children}
    </label>
  );
}

function MensajeDeError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-detalle text-estado-riesgosa">
      <IconoAlerta className="mt-[3px] size-4" />
      <span>{children}</span>
    </p>
  );
}

/** Campo de texto con etiqueta visible y error junto al campo (§8). Permite pegar y autocompletar (WCAG 3.3.8). */
export function Campo({ id, etiqueta, error, ayuda, describe, ref, ...entrada }: PropsCampo) {
  const idError = `${id}-error`;
  return (
    <div className="flex w-full flex-col gap-2">
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      {ayuda ? <Ayuda id={`${id}-ayuda`}>{ayuda}</Ayuda> : null}
      <Caja error={Boolean(error)}>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripciones(id, { error, ayuda, describe })}
          className={`${claseEntrada} pr-2.5`}
          {...entrada}
        />
      </Caja>
      {error ? <MensajeDeError id={idError}>{error}</MensajeDeError> : null}
    </div>
  );
}

/**
 * Campo de contraseña con el botón para mostrarla (66:8). El botón conserva su nombre, «Mostrar contraseña», y
 * comunica el estado con `aria-pressed` (no cambia de nombre). Mide 40 px: más que los 24 px de WCAG 2.5.8.
 */
export function CampoContrasena({ id, etiqueta, error, ayuda, describe, ref, ...entrada }: Omit<PropsCampo, "type">) {
  const [visible, setVisible] = useState(false);
  const idError = `${id}-error`;
  const Ojo = visible ? IconoOjoTachado : IconoOjo;
  return (
    <div className="flex w-full flex-col gap-2">
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      {ayuda ? <Ayuda id={`${id}-ayuda`}>{ayuda}</Ayuda> : null}
      <Caja error={Boolean(error)}>
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripciones(id, { error, ayuda, describe })}
          className={claseEntrada}
          {...entrada}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-controls={id}
          aria-label="Mostrar contraseña"
          onClick={() => setVisible((antes) => !antes)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-marca-cafe transition-[background-color,scale] duration-150 ease-(--ease-respuesta) hover:bg-superficie-hundida motion-safe:active:scale-[0.94]"
        >
          <Ojo className="size-[22px]" />
        </button>
      </Caja>
      {error ? <MensajeDeError id={idError}>{error}</MensajeDeError> : null}
    </div>
  );
}
