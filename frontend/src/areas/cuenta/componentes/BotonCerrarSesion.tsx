"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { apiNavegador } from "@/lib/api/navegador";
import { mensajeDeError } from "@/lib/api/mensajes";

/**
 * Cierra la sesión actual (OP-05): `DELETE /api/sesion` y `router.refresh()`. Sin la cookie, `proxy.ts` lleva a
 * Iniciar sesión. Si la sesión ya había vencido (401), el resultado es el mismo.
 */
export function BotonCerrarSesion() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cerrar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const resultado = await apiNavegador.cerrarSesion();
    if (!resultado.ok && resultado.error.estado !== 401) {
      setError(mensajeDeError(resultado.error));
      setEnviando(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Boton variante="cafe" type="button" onClick={cerrar} aria-disabled={enviando || undefined}>
        {enviando ? "Cerrando sesión…" : "Cerrar sesión"}
      </Boton>
      {error ? (
        <p role="alert" className="text-detalle text-estado-riesgosa">
          {error}
        </p>
      ) : null}
    </div>
  );
}
