import "server-only";
import { cache } from "react";
import { apiServidor } from "@/lib/api/servidor";

/**
 * Sesión del alumno vista desde el servidor (§7.2): `GET /api/sesion` por la red privada con su cookie.
 * `cache` de React la pide una sola vez por solicitud aunque la lean el layout de `(app)` y la página.
 * Nunca lleva `'use cache'`: depende de la cookie y de la hora.
 */
export const obtenerSesion = cache(() => apiServidor.obtenerSesion());
