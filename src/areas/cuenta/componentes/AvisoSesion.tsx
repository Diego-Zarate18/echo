"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/componentes/ui/Boton";
import { IconoReloj } from "@/componentes/ui/iconos/iconos";
import { apiNavegador, EVENTO_SESION_EXPIRA } from "@/lib/api/navegador";
import { mensajeDeError } from "@/lib/api/mensajes";
import { rutaIniciarSesion } from "@/lib/rutas";

const ANTICIPO_MS = 2 * 60_000;

function cuentaRegresiva(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Aviso 2 minutos antes de que expire la sesión (RNF-06, WCAG 2.2.1) con «Seguir conectado» (renovarSesion).
 * La expiración llega del layout y de `X-Sesion-Expira` en cada respuesta del navegador; nunca se consulta
 * GET /api/sesion por su cuenta, porque eso la renovaría.
 */
export function AvisoSesion({ expiraEn }: { expiraEn: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const [expira, setExpira] = useState(() => new Date(expiraEn).getTime());
  const [ahora, setAhora] = useState(() => Date.now());
  const [renovando, setRenovando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anterior = useRef<Element | null>(null);
  // Duración de la sesión tal como la dio el servidor al cargar (30 min); sirve para estimar la renovación al navegar.
  const [duracion] = useState(() => new Date(expiraEn).getTime() - Date.now());

  useEffect(() => {
    const alRecibir = (e: Event) => setExpira(new Date((e as CustomEvent<string>).detail).getTime());
    window.addEventListener(EVENTO_SESION_EXPIRA, alRecibir);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRA, alRecibir);
  }, []);

  // shortcut: una navegación pide la página al servidor y eso renueva la sesión, pero el navegador no ve el encabezado;
  // se estima la nueva expiración con la duración inicial. Si el backend la acorta, el aviso llega tarde (el 401 sigue redirigiendo).
  const [rutaVista, setRutaVista] = useState(ruta);
  if (ruta !== rutaVista) {
    setRutaVista(ruta);
    setExpira(ahora + duracion);
  }

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);

  const restante = expira - ahora;
  const visible = restante <= ANTICIPO_MS;

  useEffect(() => {
    if (restante <= 0) {
      router.replace(rutaIniciarSesion({ motivo: "expirada", volver: ruta }));
      router.refresh();
    }
  }, [restante, router, ruta]);

  useEffect(() => {
    if (visible) {
      anterior.current = document.activeElement;
      document.getElementById("aviso-sesion-seguir")?.focus();
    } else if (anterior.current instanceof HTMLElement) {
      anterior.current.focus();
      anterior.current = null;
    }
  }, [visible]);

  async function seguir() {
    if (renovando) return;
    setRenovando(true);
    setError(null);
    const resultado = await apiNavegador.renovarSesion();
    setRenovando(false);
    if (resultado.ok) setExpira(new Date(resultado.datos.expiraEn).getTime());
    else if (resultado.error.estado === 401) setExpira(0);
    else setError(mensajeDeError(resultado.error));
  }

  if (!visible || restante <= 0) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="aviso-sesion-titulo"
      aria-describedby="aviso-sesion-texto"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-tarjeta bg-superficie-elevada p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-marca-cafe shadow-hero motion-safe:animate-fundido lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[400px] lg:rounded-tarjeta lg:pb-6"
    >
      <div className="flex items-start gap-3">
        <IconoReloj className="mt-0.5 size-6 shrink-0 text-marca-terracota" />
        <div className="flex flex-col gap-1">
          <h2 id="aviso-sesion-titulo" className="font-titulo text-cuerpo font-extrabold">
            Tu sesión está por cerrarse
          </h2>
          <p id="aviso-sesion-texto" className="text-menor">
            Por seguridad cerramos la sesión tras 30 minutos sin actividad. Se cerrará en menos de 2 minutos.
          </p>
          <p aria-hidden="true" className="font-titulo text-tarjeta font-extrabold tabular-nums">
            {cuentaRegresiva(restante)}
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-detalle text-estado-riesgosa">
          {error}
        </p>
      ) : null}
      <Boton id="aviso-sesion-seguir" variante="cafe" tamano="mediano" type="button" onClick={seguir} aria-disabled={renovando || undefined} className="aria-disabled:cursor-wait">
        {renovando ? "Renovando…" : "Seguir conectado"}
      </Boton>
    </div>
  );
}
