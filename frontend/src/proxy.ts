import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_REGISTRO_GOOGLE, COOKIE_SESION, ENCABEZADO_RUTA, RUTA_INICIO_APP, rutaIniciarSesion } from "@/lib/rutas";

/**
 * Chequeo optimista de la sesión (§7.1). Solo mira si llega la cookie; la validación real la hacen el layout de
 * `(app)` y, en cada petición, el backend.
 * - Una ruta de `(app)` sin cookie va a `/iniciar-sesion?volver=<ruta>`.
 * - `/` e `/iniciar-sesion` con cookie van a `/modulos` (DEC-78: son solo para quien no tiene sesión). La excepción es
 *   `/iniciar-sesion?motivo=expirada`: ahí la cookie sigue en el navegador pero ya no vale, y redirigir haría un ciclo.
 * - `/aceptar` (SCR-19) pasa con la cookie de sesión (versión nueva) o con la temporal de Google (primera entrada).
 *   Sin ninguna de las dos va a `/iniciar-sesion` (DEC-85, grafo 1.5.3).
 */
export function proxy(solicitud: NextRequest) {
  const { pathname, search, searchParams } = solicitud.nextUrl;
  const conCookie = solicitud.cookies.has(COOKIE_SESION);

  if (pathname === "/" || pathname === "/iniciar-sesion") {
    const expirada = pathname === "/iniciar-sesion" && searchParams.get("motivo") === "expirada";
    if (conCookie && !expirada) return NextResponse.redirect(new URL(RUTA_INICIO_APP, solicitud.url));
    return NextResponse.next();
  }

  if (pathname === "/aceptar") {
    if (conCookie || solicitud.cookies.has(COOKIE_REGISTRO_GOOGLE)) return NextResponse.next();
    return NextResponse.redirect(new URL("/iniciar-sesion", solicitud.url));
  }

  if (!conCookie) {
    return NextResponse.redirect(new URL(rutaIniciarSesion({ volver: `${pathname}${search}` }), solicitud.url));
  }

  // La ruta pedida, para que el layout arme `volver` si la sesión ya venció. Pisa la que mande el navegador.
  const encabezados = new Headers(solicitud.headers);
  encabezados.set(ENCABEZADO_RUTA, `${pathname}${search}`);
  return NextResponse.next({ request: { headers: encabezados } });
}

export const config = {
  // `/`, Iniciar sesión y las rutas de `(app)` (§5). `:ruta*` incluye la ruta sin nada después (`/modulos`).
  matcher: [
    "/",
    "/iniciar-sesion",
    "/aceptar",
    "/modulos/:ruta*",
    "/actividades/:ruta*",
    "/examenes/:ruta*",
    "/mi-progreso/:ruta*",
    "/mis-resultados/:ruta*",
    "/perfil/:ruta*",
  ],
};
