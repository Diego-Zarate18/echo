"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { IconoBuscar, IconoCerrar } from "@/componentes/ui/iconos/iconos";

const ESPERA_AL_ESCRIBIR_MS = 350;

/**
 * Buscador de módulos, cursos y lecciones (SCR-06, OP-21). La búsqueda vive en la URL (`/modulos?q=`): el servidor
 * dibuja los resultados y el botón «Atrás» regresa a la búsqueda anterior. Mientras se escribe, espera un momento
 * antes de buscar; Enter busca al instante. Sin JavaScript, el formulario manda `q` por GET a la misma página.
 */
export function Buscador({ consulta }: { consulta: string }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [valor, setValor] = useState(consulta);
  const [consultaPrevia, setConsultaPrevia] = useState(consulta);
  const [, iniciarTransicion] = useTransition();

  // Si la URL cambia por fuera (Atrás, Adelante, «Ver todos los módulos»), el campo la sigue.
  if (consulta !== consultaPrevia) {
    setConsultaPrevia(consulta);
    if (consulta !== valor.trim()) setValor(consulta);
  }

  function buscar(texto: string) {
    clearTimeout(espera.current);
    const limpio = texto.trim();
    iniciarTransicion(() => {
      router.replace(limpio ? `/modulos?q=${encodeURIComponent(limpio)}` : "/modulos", { scroll: false });
    });
  }

  function alEscribir(evento: ChangeEvent<HTMLInputElement>) {
    const texto = evento.target.value;
    setValor(texto);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => buscar(texto), ESPERA_AL_ESCRIBIR_MS);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscar(valor);
  }

  function limpiar() {
    setValor("");
    buscar("");
    entrada.current?.focus();
  }

  return (
    <form role="search" action="/modulos" method="get" onSubmit={alEnviar} className="flex w-full max-w-[600px] flex-col gap-2">
      <label htmlFor="buscar-en-echo" className="font-titulo text-detalle font-bold text-marca-crema">
        Buscar en Echo
      </label>
      <div className="relative">
        <IconoBuscar className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-secundario" />
        <input
          ref={entrada}
          id="buscar-en-echo"
          name="q"
          type="text"
          value={valor}
          onChange={alEscribir}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Busca módulos, cursos o lecciones"
          className="h-[54px] w-full rounded-fila bg-marca-crema pr-12 pl-12 font-lectura text-base text-marca-cafe placeholder:text-texto-secundario"
        />
        {valor ? (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-texto-secundario transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-marca-cafe/8"
          >
            <IconoCerrar className="size-5" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
