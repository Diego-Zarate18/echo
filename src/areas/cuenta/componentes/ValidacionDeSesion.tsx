import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ENCABEZADO_RUTA, rutaIniciarSesion } from "@/lib/rutas";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Validación real de la sesión en `(app)` (§7.2). No dibuja nada: solo redirige.
 * - 401: la sesión venció o la revocaron. Va a Iniciar sesión con el aviso de inactividad y la ruta a la que volver.
 * - Aceptación pendiente (INV-30): va a `/aceptar`, salvo en el Perfil, la única pantalla con sesión permitida mientras
 *   tanto (para eliminar la cuenta).
 * El backend vuelve a validar cada petición: esto no es la seguridad, solo evita mostrar una pantalla sin sesión.
 */
export async function ValidacionDeSesion() {
  const sesion = await obtenerSesion();
  const ruta = (await headers()).get(ENCABEZADO_RUTA);
  if (!sesion.ok) {
    if (sesion.error.estado === 401) redirect(rutaIniciarSesion({ motivo: "expirada", volver: ruta }));
    // Sin conexión con el backend o error interno: cada página muestra su propio error.
    return null;
  }
  const { aviso, terminos } = sesion.datos.aceptacionPendiente;
  const enPerfil = ruta === "/perfil" || ruta?.startsWith("/perfil/") || ruta?.startsWith("/perfil?");
  if ((aviso || terminos) && !enPerfil) redirect("/aceptar");
  return null;
}
