// API simulada de Echo (DEC-90): cumple docs/api/openapi.yaml para que el frontend trabaje como lo hará con NestJS
// (rewrite de /api, cookie __Host-echo_sesion y red). Node puro: node:http y node:crypto, sin dependencias.
// Uso: npm run simulador (puerto 4000; PUERTO, ORIGENES_PERMITIDOS, LIMITE_POR_IP y PROXIES_CONFIABLES se pueden cambiar
// con variables de entorno).
// Nunca entra al build de producción: nada de src/ lo importa (regla de ESLint y prueba de build).
import http from "node:http";
import { pathToFileURL } from "node:url";
import { crearBase, escenarios } from "./estado.mjs";
import { rutas } from "./rutas.mjs";
import { aceptacionPendiente } from "./reglas.mjs";
import { ErrorApi, MARCA_SIMULADOR, cifrarCookie, codigoAleatorio, descifrarCookie, errores, huella, uuidv7 } from "./utilidades.mjs";

const PUERTO = Number(process.env.PUERTO ?? 4000);
const ORIGENES_PERMITIDOS = (process.env.ORIGENES_PERMITIDOS ?? "http://localhost:3000,http://localhost:3100")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const LIMITE_POR_IP = Number(process.env.LIMITE_POR_IP ?? 60);
const VENTANA_LIMITE_MS = 10 * 60_000;
const COOKIE_SESION = "__Host-echo_sesion";
const ATRIBUTOS_COOKIE = "HttpOnly; Secure; SameSite=Lax; Path=/";
const MUTACIONES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let bd = crearBase();

/** Plantillas de ruta («/api/modulos/{modulo}») como expresiones regulares. */
const tabla = rutas.map((r) => ({
  ...r,
  patron: new RegExp(`^${r.ruta.replace(/\{([a-z]+)\}/gi, "(?<$1>[^/]+)")}$`),
}));

function leerCookies(encabezado = "") {
  const cookies = {};
  for (const parte of encabezado.split(";")) {
    const indice = parte.indexOf("=");
    if (indice > 0) cookies[parte.slice(0, indice).trim()] = decodeURIComponent(parte.slice(indice + 1).trim());
  }
  return cookies;
}

/**
 * Proxies propios que agregan una entrada a X-Forwarded-For entre el cliente y esta API (DEC-92). `next start` reenvía
 * el encabezado tal como llega y no agrega la suya (comprobado el 21/10), así que en desarrollo es 0: la IP es la del
 * socket. En producción el borde de Railway agrega la del cliente; el número se fija al desplegar (PEND-14).
 */
const PROXIES_CONFIABLES = Math.max(0, Number(process.env.PROXIES_CONFIABLES ?? 0) || 0);

/**
 * IP del cliente (DEC-92): la entrada de X-Forwarded-For que agregó el primer proxy propio, contando desde la derecha.
 * Nunca la primera, que escribe el cliente. Con 0 saltos, sin el encabezado o con menos entradas que saltos, la del
 * socket.
 */
export function ipDe(solicitud, saltos = PROXIES_CONFIABLES) {
  const encabezado = solicitud.headers["x-forwarded-for"];
  const entradas = (Array.isArray(encabezado) ? encabezado.join(",") : encabezado ?? "")
    .split(",")
    .map((entrada) => entrada.trim())
    .filter(Boolean);
  const ip = saltos > 0 && entradas.length >= saltos ? entradas[entradas.length - saltos] : solicitud.socket.remoteAddress ?? "";
  return ip.replace(/^::ffff:/, "");
}

async function leerCuerpo(solicitud) {
  const partes = [];
  for await (const parte of solicitud) partes.push(parte);
  const texto = Buffer.concat(partes).toString("utf8");
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    throw errores.datosInvalidos({ cuerpo: "FORMATO_INVALIDO" });
  }
}

function responder(respuesta, estado, cuerpo, encabezados = {}, cookies = []) {
  const final = { ...encabezados, "Cache-Control": "no-store", "X-Simulador": MARCA_SIMULADOR };
  if (cookies.length) final["Set-Cookie"] = cookies;
  if (cuerpo === undefined) {
    respuesta.writeHead(estado, final);
    respuesta.end();
    return;
  }
  respuesta.writeHead(estado, { ...final, "Content-Type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
}

function cuerpoDeError(error) {
  const cuerpo = { codigo: error.codigo, mensaje: error.message };
  if (error.extra.campos) cuerpo.campos = error.extra.campos;
  if (error.extra.minutosRestantes) cuerpo.minutosRestantes = error.extra.minutosRestantes;
  if (error.extra.disponibleEn) cuerpo.disponibleEn = error.extra.disponibleEn;
  if (error.extra.preguntasPendientes) cuerpo.preguntasPendientes = error.extra.preguntasPendientes;
  return cuerpo;
}

/** Sesión válida si no está revocada y su última actividad fue hace menos de la duración (C-01). */
function sesionDe(cookies, ahora) {
  const codigo = cookies[COOKIE_SESION];
  if (!codigo) return null;
  const sesion = bd.sesiones.get(huella(codigo));
  if (!sesion || sesion.revocadaEn) return null;
  if (ahora - new Date(sesion.ultimaActividadEn) >= bd.duracionSesionMs) return null;
  const usuario = bd.usuarios.get(sesion.usuarioId);
  return usuario && usuario.estado === "activo" ? { sesion, usuario } : null;
}

function respetarLimite(ip, ahora) {
  const marcas = (bd.limites.get(ip) ?? []).filter((m) => ahora - m < VENTANA_LIMITE_MS);
  if (marcas.length >= LIMITE_POR_IP) {
    const segundos = Math.ceil((VENTANA_LIMITE_MS - (ahora - marcas[0])) / 1000);
    throw errores.demasiadas(segundos);
  }
  marcas.push(ahora.getTime());
  bd.limites.set(ip, marcas);
}

/** Rutas de control para las vistas y las pruebas. Viven fuera de /api: el rewrite de Next nunca las expone. */
async function atenderControl(solicitud, respuesta, url) {
  const ruta = url.pathname;
  if (solicitud.method === "GET" && ruta === "/__simulador/salud") return responder(respuesta, 200, { ok: true });
  if (solicitud.method === "POST" && ruta === "/__simulador/reiniciar") {
    bd = crearBase();
    return responder(respuesta, 204);
  }
  if (solicitud.method === "POST" && ruta === "/__simulador/escenario") {
    const cuerpo = await leerCuerpo(solicitud);
    const escenario = escenarios[cuerpo?.nombre];
    if (!escenario) return responder(respuesta, 422, { codigo: "DATOS_INVALIDOS", mensaje: `Escenarios: ${Object.keys(escenarios).join(", ")}` });
    escenario(bd);
    return responder(respuesta, 204);
  }
  if (solicitud.method === "GET" && ruta === "/__simulador/correos") return responder(respuesta, 200, { correos: bd.correos });
  if (solicitud.method === "GET" && ruta === "/__simulador/aceptaciones") {
    return responder(respuesta, 200, {
      aceptaciones: bd.aceptaciones.map((a) => {
        const documento = bd.documentos.find((d) => d.id === a.documentoId);
        return {
          usuario: bd.usuarios.get(a.usuarioId)?.correo ?? null,
          documento: documento.tipo,
          version: documento.version,
          aceptadoEn: a.aceptadoEn,
          direccionIp: a.direccionIp,
        };
      }),
    });
  }
  if (solicitud.method === "POST" && ruta === "/__simulador/google") {
    const cuerpo = await leerCuerpo(solicitud);
    bd.identidadGoogle = { ...bd.identidadGoogle, ...cuerpo };
    return responder(respuesta, 204);
  }
  return responder(respuesta, 404, { codigo: "NO_ENCONTRADO", mensaje: "Ruta de control desconocida." });
}

async function atender(solicitud, respuesta) {
  const url = new URL(solicitud.url, "http://simulador");
  if (url.pathname.startsWith("/__simulador/")) return atenderControl(solicitud, respuesta, url);

  const ahora = new Date();
  const cookies = leerCookies(solicitud.headers.cookie);
  const encabezados = {};
  const nuevasCookies = [];
  let actual = null;

  try {
    const ruta = url.pathname.startsWith("/api/") || url.pathname === "/api"
      ? tabla.find((r) => r.metodo === solicitud.method && r.patron.test(url.pathname))
      : null;
    if (!ruta) throw errores.noEncontrado();

    // Mutaciones solo desde el origen del frontend (DEC-85).
    if (MUTACIONES.has(solicitud.method) && !ORIGENES_PERMITIDOS.includes(solicitud.headers.origin ?? "")) throw errores.origen();

    const ip = ipDe(solicitud);
    if (ruta.limitada) respetarLimite(ip, ahora);
    const cuerpo = MUTACIONES.has(solicitud.method) ? await leerCuerpo(solicitud) : null;

    actual = sesionDe(cookies, ahora);
    if (actual) actual.sesion.ultimaActividadEn = ahora.toISOString();
    if (ruta.sesion === "requerida" && !actual) throw errores.noAutenticado();
    // INV-30: con una versión nueva por aceptar, solo pasan las rutas permitidas.
    if (actual && ruta.sesion === "requerida" && !ruta.conPendiente) {
      const pendiente = aceptacionPendiente(bd, actual.usuario.id);
      if (pendiente.aviso || pendiente.terminos) throw errores.aceptacionPendiente();
    }

    const ctx = {
      bd,
      ahora,
      ip,
      cuerpo,
      cookies,
      query: url.searchParams,
      params: ruta.patron.exec(url.pathname).groups ?? {},
      sesion: actual?.sesion ?? null,
      usuario: actual?.usuario ?? null,
      expiraEn: () => new Date(new Date(actual.sesion.ultimaActividadEn).getTime() + bd.duracionSesionMs).toISOString(),
      abrirSesion(usuario) {
        const codigo = codigoAleatorio();
        const sesion = {
          id: uuidv7(),
          usuarioId: usuario.id,
          creadaEn: ahora.toISOString(),
          ultimaActividadEn: ahora.toISOString(),
          revocadaEn: null,
          agenteUsuario: String(solicitud.headers["user-agent"] ?? "").slice(0, 500),
          reingresoGoogleEn: null,
        };
        // En la base solo la huella del código (INV-08).
        bd.sesiones.set(huella(codigo), sesion);
        nuevasCookies.push(`${COOKIE_SESION}=${codigo}; ${ATRIBUTOS_COOKIE}`);
        actual = { sesion, usuario };
        ctx.sesion = sesion;
        ctx.usuario = usuario;
      },
      cerrarSesionActual() {
        actual.sesion.revocadaEn = ahora.toISOString();
        nuevasCookies.push(`${COOKIE_SESION}=; ${ATRIBUTOS_COOKIE}; Max-Age=0`);
        actual = null;
      },
      revocarSesiones(usuarioId, { exceptoLaActual = false } = {}) {
        for (const sesion of bd.sesiones.values()) {
          if (sesion.usuarioId !== usuarioId || sesion.revocadaEn) continue;
          if (exceptoLaActual && sesion === actual?.sesion) continue;
          sesion.revocadaEn = ahora.toISOString();
        }
        if (!exceptoLaActual) {
          nuevasCookies.push(`${COOKIE_SESION}=; ${ATRIBUTOS_COOKIE}; Max-Age=0`);
          actual = null;
        }
      },
      guardarCookieGoogle(nombre, datos) {
        nuevasCookies.push(`${nombre}=${cifrarCookie(datos)}; ${ATRIBUTOS_COOKIE}; Max-Age=600`);
      },
      leerCookieGoogle: descifrarCookie,
      borrarCookie(nombre) {
        nuevasCookies.push(`${nombre}=; ${ATRIBUTOS_COOKIE}; Max-Age=0`);
      },
    };

    const resultado = await ruta.manejar(ctx);
    if (actual) encabezados["X-Sesion-Expira"] = ctx.expiraEn();
    if (resultado.estado === 302) {
      encabezados.Location = resultado.ubicacion;
      return responder(respuesta, 302, undefined, encabezados, nuevasCookies);
    }
    return responder(respuesta, resultado.estado, resultado.cuerpo, encabezados, nuevasCookies);
  } catch (error) {
    const conocido = error instanceof ErrorApi ? error : errores.interno();
    if (!(error instanceof ErrorApi)) console.error(error);
    if (conocido.codigo === "DEMASIADAS_SOLICITUDES") encabezados["Retry-After"] = String(conocido.extra.segundos);
    if (actual && conocido.estado !== 401) {
      encabezados["X-Sesion-Expira"] = new Date(new Date(actual.sesion.ultimaActividadEn).getTime() + bd.duracionSesionMs).toISOString();
    }
    return responder(respuesta, conocido.estado, cuerpoDeError(conocido), encabezados, nuevasCookies);
  }
}

export function crearServidor() {
  return http.createServer((solicitud, respuesta) => {
    atender(solicitud, respuesta).catch((error) => {
      console.error(error);
      if (!respuesta.headersSent) responder(respuesta, 500, { codigo: "ERROR_INTERNO", mensaje: "Error inesperado del simulador." });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  crearServidor().listen(PUERTO, () => {
    console.log(`API simulada de Echo en http://localhost:${PUERTO} (orígenes permitidos: ${ORIGENES_PERMITIDOS.join(", ")})`);
  });
}
