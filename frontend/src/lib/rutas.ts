/** Cookie de sesión que pone el backend (DEC-12). El frontend solo mira si existe; nunca lee su valor. */
export const COOKIE_SESION = "__Host-echo_sesion";

/**
 * Encabezado interno con la ruta que pidió el alumno. Lo escribe `proxy.ts` en cada ruta de `(app)` (y pisa el que
 * mande el navegador) para que el layout sepa a dónde volver tras iniciar sesión de nuevo.
 */
export const ENCABEZADO_RUTA = "x-echo-ruta";

/** A dónde va el alumno al iniciar sesión si no hay `volver` válido. */
export const RUTA_INICIO_APP = "/modulos";

const BASE_FICTICIA = "http://echo.invalid";

/**
 * Valida `volver` (§7.5): solo rutas internas, para que no sirva como redirección abierta.
 * Debe empezar con una sola `/`, sin esquema, sin `\` ni caracteres de control, y seguir en el mismo origen al
 * resolverla. No acepta volver a Iniciar sesión. Devuelve la ruta normalizada o `null`.
 */
export function rutaInternaSegura(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(valor)) return null;
  let url: URL;
  try {
    url = new URL(valor, BASE_FICTICIA);
  } catch {
    return null;
  }
  if (url.origin !== BASE_FICTICIA || url.pathname.startsWith("/iniciar-sesion")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** `/iniciar-sesion` con sus parámetros: el motivo y la ruta a la que volver, si es segura. */
export function rutaIniciarSesion({ motivo, volver }: { motivo?: "expirada"; volver?: string | null }) {
  const parametros = new URLSearchParams();
  if (motivo) parametros.set("motivo", motivo);
  const destino = rutaInternaSegura(volver);
  if (destino) parametros.set("volver", destino);
  const consulta = parametros.toString();
  return consulta ? `/iniciar-sesion?${consulta}` : "/iniciar-sesion";
}
