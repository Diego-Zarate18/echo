import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { components } from "@/lib/api/esquema";
import { mensajeDeError } from "@/lib/api/mensajes";
import { COOKIE_REGISTRO_GOOGLE, COOKIE_SESION, RUTA_INICIO_APP, rutaIniciarSesion } from "@/lib/rutas";
import { obtenerDocumentosVigentes, obtenerRegistroGoogle, obtenerSesion } from "@/lib/sesion";

type Documento = components["schemas"]["Documento"];
export type Versiones = { versionAviso: string; versionTerminos: string };

export type CasoDeAceptacion =
  /** Versión nueva con sesión: los documentos que faltan por aceptar, con su resumen de cambios (OP-40). */
  | { tipo: "version"; pendientes: Documento[]; versiones: Versiones }
  /** Primera entrada con Google (cookie temporal): con qué cuenta se va a crear. */
  | { tipo: "google"; correo: string; versiones: Versiones }
  /** La cookie temporal venció (REGISTRO_GOOGLE_VENCIDO): hay que volver a «Continuar con Google». */
  | { tipo: "googleVencido" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "redirigir"; a: string };

function versionesDe(documentos: Documento[]): Versiones | null {
  const aviso = documentos.find((d) => d.tipo === "avisoPrivacidad");
  const terminos = documentos.find((d) => d.tipo === "terminos");
  return aviso && terminos ? { versionAviso: aviso.version, versionTerminos: terminos.version } : null;
}

/**
 * Qué muestra `/aceptar` (SCR-19). Lo leen el layout de `(aceptacion)` (para redirigir) y la página (para dibujar), con
 * una sola ida al backend por solicitud.
 * - Con cookie de sesión: sesión válida con aceptación pendiente → versión nueva; sin pendiente → `/modulos`;
 *   401 → Iniciar sesión con el aviso de inactividad (como en `(app)`), salvo que también haya registro con Google.
 * - Con la cookie temporal de Google: el registro pendiente, o «la espera venció».
 * - Sin ninguna: Iniciar sesión (el proxy ya lo hace; esto cubre una cookie que se borró a la mitad).
 * Nunca redirige por aceptación pendiente: esta es la pantalla a la que se llega por ella.
 */
export const casoDeAceptacion = cache(async (): Promise<CasoDeAceptacion> => {
  const almacen = await cookies();
  const conGoogle = almacen.has(COOKIE_REGISTRO_GOOGLE);

  if (almacen.has(COOKIE_SESION)) {
    const sesion = await obtenerSesion();
    if (sesion.ok) {
      const { aviso, terminos } = sesion.datos.aceptacionPendiente;
      if (!aviso && !terminos) return { tipo: "redirigir", a: RUTA_INICIO_APP };
      const documentos = await obtenerDocumentosVigentes();
      const versiones = documentos.ok ? versionesDe(documentos.datos.documentos) : null;
      if (!documentos.ok || !versiones) return { tipo: "error", mensaje: mensajeDeError(documentos.ok ? { estado: 500, codigo: "ERROR_INTERNO" } : documentos.error) };
      const pendientes = documentos.datos.documentos.filter((d) => (d.tipo === "avisoPrivacidad" ? aviso : terminos));
      return { tipo: "version", pendientes, versiones };
    }
    if (sesion.error.estado !== 401) return { tipo: "error", mensaje: mensajeDeError(sesion.error) };
    if (!conGoogle) return { tipo: "redirigir", a: rutaIniciarSesion({ motivo: "expirada" }) };
  }

  if (conGoogle) {
    const registro = await obtenerRegistroGoogle();
    if (!registro.ok) {
      return registro.error.estado === 401 ? { tipo: "googleVencido" } : { tipo: "error", mensaje: mensajeDeError(registro.error) };
    }
    const documentos = await obtenerDocumentosVigentes();
    const versiones = documentos.ok ? versionesDe(documentos.datos.documentos) : null;
    if (!versiones) return { tipo: "error", mensaje: mensajeDeError({ estado: 0, codigo: "SIN_CONEXION" }) };
    return { tipo: "google", correo: registro.datos.correo, versiones };
  }

  return { tipo: "redirigir", a: "/iniciar-sesion" };
});
