"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { IconoSalir } from "@/componentes/ui/iconos/iconos";
import { apiNavegador } from "@/lib/api/navegador";
import { mensajeDeError } from "@/lib/api/mensajes";

/**
 * Cierra la sesión actual (OP-05): `DELETE /api/sesion`, va a Iniciar sesión y `router.refresh()`. Se navega antes de
 * refrescar para que la URL quede limpia, sin `volver`. Si la sesión ya había vencido (401), el resultado es el mismo.
 */
/**
 * `como="enlace"`: con el aspecto de un enlace subrayado (SCR-19, 152:5265).
 * `como="encabezado"`: ícono y texto en crema sobre la barra café de la app (SCR-06).
 * Por omisión, Botón/Café.
 */
export function BotonCerrarSesion({ como = "boton" }: { como?: "boton" | "enlace" | "encabezado" }) {
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
      {como === "encabezado" ? (
        <button
          type="button"
          onClick={cerrar}
          aria-disabled={enviando || undefined}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-titulo text-menor font-semibold whitespace-nowrap text-marca-crema transition-[background-color] duration-150 ease-(--ease-respuesta) hover:bg-marca-crema/10 aria-disabled:cursor-wait"
        >
          <IconoSalir className="size-5" />
          {enviando ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      ) : como === "enlace" ? (
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
        <p role="alert" className={`text-detalle ${como === "encabezado" ? "text-marca-crema" : "text-estado-riesgosa"}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
