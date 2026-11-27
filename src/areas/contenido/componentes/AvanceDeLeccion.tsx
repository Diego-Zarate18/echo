"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { apiNavegador } from "@/lib/api/navegador";
import { mensajeDeError } from "@/lib/api/mensajes";
import type { ErrorApi } from "@/lib/api/errores";

/**
 * Guarda la sección que se está viendo (OP-19) cada vez que cambia. Si falla, solo se avisa en silencio: la lectura
 * sigue y se vuelve a intentar al cambiar de sección. El texto «Avance guardado» va en una región viva discreta.
 */
export function AvanceDeLeccion({ leccion, seccion }: { leccion: string; seccion: number }) {
  const [estado, setEstado] = useState<"guardando" | "guardado" | "sinGuardar">("guardando");

  useEffect(() => {
    let vigente = true;
    apiNavegador.guardarSeccionVista({ ruta: { leccion }, cuerpo: { seccion } }).then((r) => {
      if (vigente) setEstado(r.ok ? "guardado" : "sinGuardar");
    });
    return () => {
      vigente = false;
    };
  }, [leccion, seccion]);

  return (
    <p role="status" className="mt-6 text-nota text-texto-secundario">
      {estado === "guardado" ? "Avance guardado" : estado === "sinGuardar" ? "No pudimos guardar tu avance; se intentará de nuevo al cambiar de sección." : ""}
    </p>
  );
}

/** «Terminé la lección» (OP-20). Al terminar, la página se vuelve a leer: aparecen la actividad y los casos abiertos. */
export function TerminarLeccion({ leccion }: { leccion: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const alerta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) alerta.current?.focus();
  }, [error]);

  async function terminar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const resultado = await apiNavegador.terminarLeccion({ ruta: { leccion } });
    setEnviando(false);
    if (!resultado.ok) return setError(resultado.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      {error ? (
        <Alerta ref={alerta} tono="error" role="alert" titulo="No pudimos terminar la lección">
          {mensajeDeError(error)}
        </Alerta>
      ) : null}
      <Boton variante="cafe" tamano="mediano" onClick={terminar} aria-disabled={enviando || undefined}>
        {enviando ? "Guardando…" : "Terminé la lección"}
      </Boton>
    </div>
  );
}
