import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ENCABEZADO_RUTA, rutaIniciarSesion } from "@/lib/rutas";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Validación real de la sesión en `(app)` (§7.2). No dibuja nada: solo redirige.
 * - 401: la sesión venció o la revocaron. Va a Iniciar sesión con el aviso de inactividad y la ruta a la que volver.
 * - Aceptación pendiente (INV-30): va a `/aceptar`. Esa pantalla llega en una tarea próxima.
 * El backend vuelve a validar cada petición: esto no es la seguridad, solo evita mostrar una pantalla sin sesión.
 */
export async function ValidacionDeSesion() {
  const sesion = await obtenerSesion();
  if (!sesion.ok) {
    if (sesion.error.estado === 401) {
      const ruta = (await headers()).get(ENCABEZADO_RUTA);
      redirect(rutaIniciarSesion({ motivo: "expirada", volver: ruta }));
    }
    // Sin conexión con el backend o error interno: cada página muestra su propio error.
    return null;
  }
  const { aviso, terminos } = sesion.datos.aceptacionPendiente;
  if (aviso || terminos) redirect("/aceptar");
  return null;
}
