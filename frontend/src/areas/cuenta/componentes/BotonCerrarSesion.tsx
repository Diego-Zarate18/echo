"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { apiNavegador } from "@/lib/api/navegador";
import { mensajeDeError } from "@/lib/api/mensajes";

/**
 * Cierra la sesión actual (OP-05): `DELETE /api/sesion`, va a Iniciar sesión y `router.refresh()`. Se navega antes de
 * refrescar para que la URL quede limpia, sin `volver`. Si la sesión ya había vencido (401), el resultado es el mismo.
 */
/** `como="enlace"`: con el aspecto de un enlace subrayado (SCR-19, 152:5265); por omisión, Botón/Café. */
export function BotonCerrarSesion({ como = "boton" }: { como?: "boton" | "enlace" }) {
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
    router.replace("/iniciar-sesion");
    router.refresh();
  }

  return (
    <div className={`flex flex-col gap-3 ${como === "enlace" ? "items-center" : "items-start"}`}>
      {como === "enlace" ? (
        <button
          type="button"
          onClick={cerrar}
          aria-disabled={enviando || undefined}
          className="inline-flex min-h-6 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2 aria-disabled:cursor-wait"
        >
          {enviando ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      ) : (
        <Boton variante="cafe" type="button" onClick={cerrar} aria-disabled={enviando || undefined}>
          {enviando ? "Cerrando sesión…" : "Cerrar sesión"}
        </Boton>
      )}
      {error ? (
        <p role="alert" className="text-detalle text-estado-riesgosa">
          {error}
        </p>
      ) : null}
    </div>
  );
}
