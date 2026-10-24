import type { Metadata } from "next";
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/areas/cuenta/componentes/BotonCerrarSesion";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Módulos",
};

/** Saludo con el nombre de la sesión. Si la sesión no vale, el layout ya está redirigiendo. */
async function Saludo() {
  const sesion = await obtenerSesion();
  if (!sesion.ok) return null;
  return (
    <>
      <h1 className="font-titulo text-entrada font-extrabold">Hola, {sesion.datos.nombre}</h1>
      <BotonCerrarSesion />
    </>
  );
}

/**
 * PROVISIONAL: solo sirve para probar el inicio de sesión de punta a punta (Tarea 08).
 * Se reemplaza con SCR-06 · Módulos, con su diseño de Figma y `listarModulos`.
 */
export default function PaginaModulos() {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      data-provisional
      className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col justify-center gap-8 px-5 py-12 outline-none"
    >
      <Suspense fallback={<p className="text-cuerpo text-texto-secundario">Cargando tu sesión…</p>}>
        <Saludo />
      </Suspense>
    </main>
  );
}
