// Rutas del simulador bajo /api: una por operación del contrato (docs/api/openapi.yaml), con el mismo operationId.
// Cada ruta dice si pide sesión y si se permite con una aceptación pendiente (INV-30). La prueba del contrato
// compara esta tabla con el OpenAPI en los dos sentidos.
import * as R from "./reglas.mjs";
import { usuarioPorCorreo } from "./estado.mjs";
import {
  codigoAleatorio,
  compararConRelleno,
  contrasenaCoincide,
  contrasenaFuerte,
  correoValido,
  errores,
  hashContrasena,
  huella,
  mezclar,
  normalizarCorreo,
  semillaAleatoria,
  sinAcentos,
  uuidv7,
} from "./utilidades.mjs";

const MINUTO = 60_000;
const VIGENCIA = { verificacion: 24 * 60 * MINUTO, recuperacion: 30 * MINUTO, cambioCorreo: 30 * MINUTO };
const INTENTOS_ANTES_DE_PAUSA = 5;
const PAUSA_MS = 15 * MINUTO;
const REINGRESO_GOOGLE_MS = 5 * MINUTO;
const COOKIE_REGISTRO_GOOGLE = "__Host-echo_registro_google";

// ── Validación de cuerpos ───────────────────────────────────────────────────────────────────────────────────
function texto(cuerpo, campo, { min = 1, max = 100 } = {}, campos) {
  const valor = typeof cuerpo?.[campo] === "string" ? cuerpo[campo].trim() : "";
  if (!valor) campos[campo] = "OBLIGATORIO";
  else if (valor.length < min || valor.length > max) campos[campo] = "LONGITUD_INVALIDA";
  return valor;
}
function correo(cuerpo, campo, campos) {
  const valor = normalizarCorreo(cuerpo?.[campo]);
  if (!valor) campos[campo] = "OBLIGATORIO";
  else if (!correoValido(valor)) campos[campo] = "FORMATO_INVALIDO";
  return valor;
}
function contrasenaNueva(cuerpo, campo, campos) {
  const valor = cuerpo?.[campo];
  if (typeof valor !== "string" || !valor) campos[campo] = "OBLIGATORIO";
  else if (!contrasenaFuerte(valor)) campos[campo] = "CONTRASENA_DEBIL";
  return valor;
}
function casilla(cuerpo, campo, campos) {
  if (cuerpo?.[campo] !== true) campos[campo] = "CASILLA_OBLIGATORIA";
}
function booleanoOpcional(cuerpo, campo, campos) {
  const valor = cuerpo?.[campo];
  if (valor === undefined) return false;
  if (typeof valor !== "boolean") campos[campo] = "FORMATO_INVALIDO";
  return valor === true;
}
function version(cuerpo, campo, campos) {
  const valor = cuerpo?.[campo];
  if (typeof valor !== "string" || !valor) campos[campo] = "OBLIGATORIO";
  else if (!/^[0-9]+\.[0-9]+$/.test(valor)) campos[campo] = "FORMATO_INVALIDO";
  return valor;
}
function sinErrores(campos) {
  if (Object.keys(campos).length) throw errores.datosInvalidos(campos);
}
function entero(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

// ── Cuenta, sesión y documentos ─────────────────────────────────────────────────────────────────────────────
function metodoAcceso(usuario) {
  if (usuario.hashContrasena && usuario.googleSub) return "ambos";
  return usuario.googleSub ? "google" : "correo";
}
function sesionVisible(ctx, usuario) {
  return {
    nombre: usuario.nombre,
    apellidos: usuario.apellidos ?? null,
    metodoAcceso: metodoAcceso(usuario),
    expiraEn: ctx.expiraEn(),
    aceptacionPendiente: R.aceptacionPendiente(ctx.bd, usuario.id),
  };
}
function documentoVisible(documento) {
  const { tipo, version: numero, publicadoEn, requiereAceptacion, resumenCambios } = documento;
  return { tipo, version: numero, publicadoEn, requiereAceptacion, resumenCambios };
}
function crearToken(ctx, usuario, tipo, correoDestino) {
  const codigo = codigoAleatorio();
  ctx.bd.tokens.set(huella(codigo), {
    usuarioId: usuario.id,
    tipo,
    correoDestino,
    expiraEn: new Date(ctx.ahora.getTime() + VIGENCIA[tipo]).toISOString(),
    usadoEn: null,
  });
  return codigo;
}
/** Los correos no se envían: quedan en GET /__simulador/correos (DEC-79 da la plantilla real). */
function enviarCorreo(ctx, para, tipo, codigo = null) {
  const rutas = {
    verificacion: "/verificar-correo?codigo=",
    recuperacion: "/recuperar-contrasena/nueva?codigo=",
    cambioCorreo: "/verificar-correo?tipo=cambio-correo&codigo=",
  };
  ctx.bd.correos.push({
    para,
    tipo,
    enlace: codigo && rutas[tipo] ? `${rutas[tipo]}${encodeURIComponent(codigo)}` : null,
    codigo,
    enviadoEn: ctx.ahora.toISOString(),
  });
}
function usarToken(ctx, codigo, tipo) {
  const llave = typeof codigo === "string" ? huella(codigo) : "";
  const token = ctx.bd.tokens.get(llave);
  if (!token || token.tipo !== tipo || token.usadoEn || new Date(token.expiraEn) <= ctx.ahora) throw errores.enlaceInvalido();
  const usuario = ctx.bd.usuarios.get(token.usuarioId);
  if (!usuario || usuario.estado === "anonimizado") throw errores.enlaceInvalido();
  return { token, usuario };
}
function registrarAceptaciones(ctx, usuario, tipos) {
  const vigentes = R.documentosVigentes(ctx.bd);
  for (const tipo of tipos) {
    const documento = vigentes[tipo];
    const repetida = ctx.bd.aceptaciones.some((a) => a.usuarioId === usuario.id && a.documentoId === documento.id);
    if (!repetida) {
      // La IP sale de la petición (X-Forwarded-For del proxy), nunca del cuerpo (INV-30).
      ctx.bd.aceptaciones.push({ id: uuidv7(), usuarioId: usuario.id, documentoId: documento.id, aceptadoEn: ctx.ahora.toISOString(), direccionIp: ctx.ip });
    }
  }
}
function versionesVigentes(ctx, cuerpo, tipos) {
  const vigentes = R.documentosVigentes(ctx.bd);
  const campo = { avisoPrivacidad: "versionAviso", terminos: "versionTerminos" };
  for (const tipo of tipos) {
    if (cuerpo[campo[tipo]] !== vigentes[tipo].version) throw errores.versionNoVigente();
  }
}

function iniciarSesion(ctx) {
  const campos = {};
  const correoEntrada = normalizarCorreo(ctx.cuerpo?.correo);
  const contrasena = typeof ctx.cuerpo?.contrasena === "string" ? ctx.cuerpo.contrasena : "";
  if (!correoEntrada) campos.correo = "OBLIGATORIO";
  if (!contrasena) campos.contrasena = "OBLIGATORIO";
  sinErrores(campos);

  const usuario = usuarioPorCorreo(ctx.bd, correoEntrada);
  // Pausa de 15 minutos tras 5 fallos: no se evalúa la contraseña y la respuesta es la genérica (DEC-26, DEC-77).
  if (usuario?.bloqueadoHasta) {
    if (new Date(usuario.bloqueadoHasta) > ctx.ahora) {
      compararConRelleno(contrasena);
      throw errores.credenciales();
    }
    usuario.bloqueadoHasta = null;
    usuario.intentosFallidos = 0;
  }
  const correcta = usuario?.hashContrasena ? contrasenaCoincide(contrasena, usuario.hashContrasena) : compararConRelleno(contrasena);
  if (!correcta) {
    if (usuario) {
      usuario.intentosFallidos += 1;
      if (usuario.intentosFallidos >= INTENTOS_ANTES_DE_PAUSA) usuario.bloqueadoHasta = new Date(ctx.ahora.getTime() + PAUSA_MS).toISOString();
    }
    throw errores.credenciales();
  }
  if (usuario.estado === "pendiente") throw errores.sinVerificar();
  usuario.intentosFallidos = 0;
  ctx.abrirSesion(usuario);
  return { estado: 200, cuerpo: sesionVisible(ctx, usuario) };
}

function registrarCuenta(ctx) {
  const cuerpo = ctx.cuerpo ?? {};
  const campos = {};
  const nombre = texto(cuerpo, "nombre", {}, campos);
  const apellidos = texto(cuerpo, "apellidos", {}, campos);
  const correoNuevo = correo(cuerpo, "correo", campos);
  const contrasena = contrasenaNueva(cuerpo, "contrasena", campos);
  version(cuerpo, "versionAviso", campos);
  version(cuerpo, "versionTerminos", campos);
  casilla(cuerpo, "aceptaAviso", campos);
  casilla(cuerpo, "aceptaTerminos", campos);
  casilla(cuerpo, "mayorDeEdad", campos);
  const negativaEncuesta = booleanoOpcional(cuerpo, "negativaEncuesta", campos);
  const negativaEstadisticas = booleanoOpcional(cuerpo, "negativaEstadisticas", campos);
  sinErrores(campos);
  versionesVigentes(ctx, cuerpo, ["avisoPrivacidad", "terminos"]);

  // El hash se calcula siempre, para que el tiempo no delate si la cuenta existe (DEC-77).
  const hash = hashContrasena(contrasena);
  const existente = usuarioPorCorreo(ctx.bd, correoNuevo);
  if (existente) {
    enviarCorreo(ctx, correoNuevo, "yaTienesCuenta");
    return { estado: 202 };
  }
  const usuario = {
    id: uuidv7(),
    nombre,
    apellidos,
    correo: correoNuevo,
    correoVerificadoEn: null,
    estado: "pendiente",
    hashContrasena: hash,
    googleSub: null,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    creadoEn: ctx.ahora.toISOString(),
    anonimizadoEn: null,
    mayoriaEdadConfirmadaEn: ctx.ahora.toISOString(),
    negativaEncuesta,
    negativaEstadisticas,
  };
  // La cuenta y sus aceptaciones van juntas (INV-30).
  ctx.bd.usuarios.set(usuario.id, usuario);
  registrarAceptaciones(ctx, usuario, ["avisoPrivacidad", "terminos"]);
  enviarCorreo(ctx, correoNuevo, "verificacion", crearToken(ctx, usuario, "verificacion", correoNuevo));
  return { estado: 202 };
}

function verificarCorreo(ctx) {
  const { token, usuario } = usarToken(ctx, ctx.cuerpo?.codigo, "verificacion");
  if (usuario.estado !== "pendiente") throw errores.enlaceInvalido();
  token.usadoEn = ctx.ahora.toISOString();
  usuario.estado = "activo";
  usuario.correoVerificadoEn = ctx.ahora.toISOString();
  ctx.abrirSesion(usuario);
  return { estado: 200, cuerpo: sesionVisible(ctx, usuario) };
}

function reenviarVerificacion(ctx) {
  const campos = {};
  const correoEntrada = correo(ctx.cuerpo, "correo", campos);
  sinErrores(campos);
  const usuario = usuarioPorCorreo(ctx.bd, correoEntrada);
  if (usuario?.estado === "pendiente") enviarCorreo(ctx, usuario.correo, "verificacion", crearToken(ctx, usuario, "verificacion", usuario.correo));
  return { estado: 202 };
}

function aceptarDocumentos(ctx) {
  const cuerpo = ctx.cuerpo ?? {};
  const campos = {};
  // Caso 2: versión nueva con sesión. Basta aceptar lo pendiente.
  if (ctx.usuario) {
    const pendiente = R.aceptacionPendiente(ctx.bd, ctx.usuario.id);
    const tipos = [];
    if (pendiente.aviso) {
      version(cuerpo, "versionAviso", campos);
      casilla(cuerpo, "aceptaAviso", campos);
      tipos.push("avisoPrivacidad");
    }
    if (pendiente.terminos) {
      version(cuerpo, "versionTerminos", campos);
      casilla(cuerpo, "aceptaTerminos", campos);
      tipos.push("terminos");
    }
    sinErrores(campos);
    versionesVigentes(ctx, cuerpo, tipos);
    registrarAceptaciones(ctx, ctx.usuario, tipos);
    return { estado: 200, cuerpo: sesionVisible(ctx, ctx.usuario) };
  }
  // Caso 1: primera entrada con Google, con la cookie temporal.
  const valor = ctx.cookies[COOKIE_REGISTRO_GOOGLE];
  if (!valor) throw errores.noAutenticado();
  const google = ctx.leerCookieGoogle(valor);
  if (!google || new Date(google.expiraEn) <= ctx.ahora) throw errores.registroGoogleVencido();
  version(cuerpo, "versionAviso", campos);
  version(cuerpo, "versionTerminos", campos);
  casilla(cuerpo, "aceptaAviso", campos);
  casilla(cuerpo, "aceptaTerminos", campos);
  casilla(cuerpo, "mayorDeEdad", campos);
  const negativaEncuesta = booleanoOpcional(cuerpo, "negativaEncuesta", campos);
  const negativaEstadisticas = booleanoOpcional(cuerpo, "negativaEstadisticas", campos);
  sinErrores(campos);
  versionesVigentes(ctx, cuerpo, ["avisoPrivacidad", "terminos"]);

  let usuario = [...ctx.bd.usuarios.values()].find((u) => u.estado !== "anonimizado" && u.googleSub === google.sub) ?? null;
  if (!usuario) {
    const mismoCorreo = usuarioPorCorreo(ctx.bd, google.correo);
    // DEC-93: solo se vincula con una cuenta activa y verificada del mismo correo (INV-16). Una cuenta pendiente se
    // elimina con sus enlaces y aceptaciones: su contraseña la pudo poner otra persona (pre-secuestro de cuenta).
    if (mismoCorreo?.estado === "activo") {
      mismoCorreo.googleSub = google.sub;
      usuario = mismoCorreo;
    } else if (mismoCorreo?.estado === "pendiente") {
      eliminarCuentaPendiente(ctx, mismoCorreo);
    }
  }
  if (!usuario) {
    usuario = {
      id: uuidv7(),
      nombre: google.nombre,
      apellidos: google.apellidos || null,
      correo: google.correo,
      correoVerificadoEn: ctx.ahora.toISOString(),
      estado: "activo",
      hashContrasena: null,
      googleSub: google.sub,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      creadoEn: ctx.ahora.toISOString(),
      anonimizadoEn: null,
      mayoriaEdadConfirmadaEn: ctx.ahora.toISOString(),
      negativaEncuesta,
      negativaEstadisticas,
    };
    ctx.bd.usuarios.set(usuario.id, usuario);
  }
  registrarAceptaciones(ctx, usuario, ["avisoPrivacidad", "terminos"]);
  ctx.borrarCookie(COOKIE_REGISTRO_GOOGLE);
  ctx.abrirSesion(usuario);
  return { estado: 200, cuerpo: sesionVisible(ctx, usuario) };
}

/** Borra una cuenta pendiente (sin verificar) con todo lo suyo, como la limpieza diaria (FN-LIMPIEZA). */
function eliminarCuentaPendiente(ctx, usuario) {
  ctx.bd.usuarios.delete(usuario.id);
  ctx.bd.aceptaciones = ctx.bd.aceptaciones.filter((a) => a.usuarioId !== usuario.id);
  for (const [llave, token] of [...ctx.bd.tokens]) if (token.usuarioId === usuario.id) ctx.bd.tokens.delete(llave);
  for (const [llave, sesion] of [...ctx.bd.sesiones]) if (sesion.usuarioId === usuario.id) ctx.bd.sesiones.delete(llave);
}

/** Google simulado: no sale a Google, va directo al callback con la identidad de ejemplo. */
function entrarConGoogle(ctx) {
  const proposito = ctx.query.get("proposito") === "eliminar" ? "eliminar" : "entrar";
  return { estado: 302, ubicacion: `/api/auth/google/callback?code=simulado&state=${proposito}` };
}

function volverDeGoogle(ctx) {
  if (ctx.query.get("code") !== "simulado") return { estado: 302, ubicacion: "/iniciar-sesion?error=google" };
  const google = ctx.bd.identidadGoogle;
  // Reingreso para eliminar la cuenta (propuesta de OP-14): misma cuenta de Google y sesión abierta.
  if (ctx.query.get("state") === "eliminar" && ctx.usuario?.googleSub === google.sub) {
    ctx.sesion.reingresoGoogleEn = ctx.ahora.toISOString();
    return { estado: 302, ubicacion: "/perfil?reingreso=google" };
  }
  let usuario = [...ctx.bd.usuarios.values()].find((u) => u.estado !== "anonimizado" && u.googleSub === google.sub);
  if (!usuario) {
    // Solo se vincula con una cuenta verificada del mismo correo (INV-16).
    const mismoCorreo = usuarioPorCorreo(ctx.bd, google.correo);
    if (mismoCorreo?.estado === "activo") {
      mismoCorreo.googleSub = google.sub;
      usuario = mismoCorreo;
    }
  }
  if (usuario) {
    usuario.correo = google.correo;
    ctx.abrirSesion(usuario);
    return { estado: 302, ubicacion: "/modulos" };
  }
  ctx.guardarCookieGoogle(COOKIE_REGISTRO_GOOGLE, { ...google, expiraEn: new Date(ctx.ahora.getTime() + 10 * MINUTO).toISOString() });
  return { estado: 302, ubicacion: "/aceptar" };
}

function solicitarRecuperacion(ctx) {
  const campos = {};
  const correoEntrada = correo(ctx.cuerpo, "correo", campos);
  sinErrores(campos);
  const usuario = usuarioPorCorreo(ctx.bd, correoEntrada);
  if (usuario?.estado === "activo" && usuario.hashContrasena) {
    enviarCorreo(ctx, usuario.correo, "recuperacion", crearToken(ctx, usuario, "recuperacion", usuario.correo));
  }
  return { estado: 202 };
}

function restablecerContrasena(ctx) {
  const campos = {};
  const contrasena = contrasenaNueva(ctx.cuerpo, "contrasena", campos);
  sinErrores(campos);
  const { token, usuario } = usarToken(ctx, ctx.cuerpo?.codigo, "recuperacion");
  token.usadoEn = ctx.ahora.toISOString();
  usuario.hashContrasena = hashContrasena(contrasena);
  usuario.intentosFallidos = 0;
  usuario.bloqueadoHasta = null;
  ctx.revocarSesiones(usuario.id);
  return { estado: 204 };
}

function perfilVisible(ctx, usuario) {
  return {
    nombre: usuario.nombre,
    apellidos: usuario.apellidos ?? null,
    correo: usuario.correo,
    metodoAcceso: metodoAcceso(usuario),
    registradoEn: usuario.creadoEn,
    preferencias: { negativaEncuesta: usuario.negativaEncuesta, negativaEstadisticas: usuario.negativaEstadisticas },
    // Sin la IP: solo se entrega por una solicitud ARCO (OP-08).
    aceptaciones: ctx.bd.aceptaciones
      .filter((a) => a.usuarioId === usuario.id)
      .map((a) => {
        const documento = ctx.bd.documentos.find((d) => d.id === a.documentoId);
        return { documento: documento.tipo, version: documento.version, aceptadoEn: a.aceptadoEn };
      }),
  };
}

function editarNombre(ctx) {
  const campos = {};
  const nombre = texto(ctx.cuerpo, "nombre", {}, campos);
  const apellidos = texto(ctx.cuerpo, "apellidos", {}, campos);
  sinErrores(campos);
  Object.assign(ctx.usuario, { nombre, apellidos });
  return { estado: 200, cuerpo: perfilVisible(ctx, ctx.usuario) };
}

function cambiarPreferenciasPrivacidad(ctx) {
  const campos = {};
  const cuerpo = ctx.cuerpo ?? {};
  const presentes = ["negativaEncuesta", "negativaEstadisticas"].filter((c) => cuerpo[c] !== undefined);
  if (!presentes.length) campos.negativaEncuesta = "OBLIGATORIO";
  for (const campo of presentes) if (typeof cuerpo[campo] !== "boolean") campos[campo] = "FORMATO_INVALIDO";
  sinErrores(campos);
  for (const campo of presentes) ctx.usuario[campo] = cuerpo[campo];
  return { estado: 200, cuerpo: { negativaEncuesta: ctx.usuario.negativaEncuesta, negativaEstadisticas: ctx.usuario.negativaEstadisticas } };
}

function cambiarContrasena(ctx) {
  if (!ctx.usuario.hashContrasena) throw errores.noDisponibleConGoogle();
  const campos = {};
  const nueva = contrasenaNueva(ctx.cuerpo, "contrasenaNueva", campos);
  if (typeof ctx.cuerpo?.contrasenaActual !== "string" || !ctx.cuerpo.contrasenaActual) campos.contrasenaActual = "OBLIGATORIO";
  sinErrores(campos);
  if (!contrasenaCoincide(ctx.cuerpo.contrasenaActual, ctx.usuario.hashContrasena)) throw errores.contrasenaIncorrecta();
  ctx.usuario.hashContrasena = hashContrasena(nueva);
  ctx.revocarSesiones(ctx.usuario.id, { exceptoLaActual: true });
  return { estado: 204 };
}

function cambiarCorreo(ctx) {
  if (ctx.usuario.googleSub) throw errores.noDisponibleConGoogle();
  const campos = {};
  const correoNuevo = correo(ctx.cuerpo, "correoNuevo", campos);
  if (typeof ctx.cuerpo?.contrasena !== "string" || !ctx.cuerpo.contrasena) campos.contrasena = "OBLIGATORIO";
  sinErrores(campos);
  if (!contrasenaCoincide(ctx.cuerpo.contrasena, ctx.usuario.hashContrasena)) throw errores.contrasenaIncorrecta();
  if (usuarioPorCorreo(ctx.bd, correoNuevo)) {
    enviarCorreo(ctx, correoNuevo, "avisoCambioCorreo");
  } else {
    enviarCorreo(ctx, correoNuevo, "cambioCorreo", crearToken(ctx, ctx.usuario, "cambioCorreo", correoNuevo));
  }
  return { estado: 202 };
}

function confirmarCambioCorreo(ctx) {
  const { token, usuario } = usarToken(ctx, ctx.cuerpo?.codigo, "cambioCorreo");
  if (usuarioPorCorreo(ctx.bd, token.correoDestino)) throw errores.enlaceInvalido();
  token.usadoEn = ctx.ahora.toISOString();
  usuario.correo = token.correoDestino;
  return { estado: 204 };
}

function eliminarCuenta(ctx) {
  const campos = {};
  if (ctx.cuerpo?.confirmacion !== true) campos.confirmacion = "CASILLA_OBLIGATORIA";
  const usuario = ctx.usuario;
  if (usuario.hashContrasena && (typeof ctx.cuerpo?.contrasena !== "string" || !ctx.cuerpo.contrasena)) campos.contrasena = "OBLIGATORIO";
  sinErrores(campos);
  if (usuario.hashContrasena) {
    if (!contrasenaCoincide(ctx.cuerpo.contrasena, usuario.hashContrasena)) throw errores.contrasenaIncorrecta();
  } else {
    const reingreso = ctx.sesion.reingresoGoogleEn ? new Date(ctx.sesion.reingresoGoogleEn) : null;
    if (!reingreso || ctx.ahora - reingreso > REINGRESO_GOOGLE_MS) throw errores.reingresoRequerido();
  }
  // fn_anonimizar_usuario: datos y credenciales fuera, sesiones y enlaces borrados, IP de las aceptaciones borrada.
  Object.assign(usuario, {
    nombre: null,
    apellidos: null,
    correo: null,
    hashContrasena: null,
    googleSub: null,
    estado: "anonimizado",
    anonimizadoEn: ctx.ahora.toISOString(),
    mayoriaEdadConfirmadaEn: null,
    negativaEncuesta: false,
  });
  for (const aceptacion of ctx.bd.aceptaciones) if (aceptacion.usuarioId === usuario.id) aceptacion.direccionIp = null;
  for (const [llave, token] of [...ctx.bd.tokens]) if (token.usuarioId === usuario.id) ctx.bd.tokens.delete(llave);
  ctx.revocarSesiones(usuario.id);
  return { estado: 204 };
}

/**
 * OP-41 · Exportar mis datos (DEC-94, fn_exportar_datos_usuario): todo lo del alumno de la sesión, con la IP de sus
 * aceptaciones. Nunca hashes, códigos ni google_sub (INV-08); de los intentos, lo que respondió y su puntaje, nunca la
 * respuesta correcta (INV-04, DEC-11).
 */
function exportarMisDatos(ctx) {
  const { bd, usuario, ahora } = ctx;
  const intentos = [...bd.intentos.values()]
    .filter((i) => i.usuarioId === usuario.id)
    .sort((a, b) => new Date(a.iniciadoEn) - new Date(b.iniciadoEn))
    .map((intento) => {
      const cuestionario = R.cuestionarioPorId(intento.cuestionarioId);
      const enviado = intento.estado === "enviado";
      return {
        id: intento.id,
        tipo: cuestionario.tipo,
        cuestionario: { id: cuestionario.id, titulo: cuestionario.titulo },
        numero: intento.numero,
        estado: intento.estado,
        iniciadoEn: intento.iniciadoEn,
        enviadoEn: intento.enviadoEn,
        calificacion: enviado ? intento.calificacion : null,
        aprobado: enviado && cuestionario.tipo === "examen" ? intento.aprobado : null,
        respuestas: R.preguntasDe(cuestionario.id)
          .filter((p) => intento.respuestas.has(p.id))
          .map((p) => ({
            preguntaId: p.id,
            enunciado: p.enunciado,
            // Solo lo que eligió el alumno (el mismo texto que el examen reprobado, sin solución).
            respuesta: R.preguntaSinSolucion(p, intento.respuestas.get(p.id), 0).respuestaElegida,
            puntaje: enviado ? dosDecimalesExportados(intento.puntajes.get(p.id) ?? 0) : null,
          })),
      };
    });
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(ahora);
  return {
    estado: 200,
    encabezados: { "Content-Disposition": `attachment; filename="echo-mis-datos-${fecha}.json"` },
    cuerpo: {
      generadoEn: ahora.toISOString(),
      cuenta: {
        nombre: usuario.nombre,
        apellidos: usuario.apellidos ?? null,
        correo: usuario.correo,
        metodoAcceso: metodoAcceso(usuario),
        registradoEn: usuario.creadoEn,
        correoVerificadoEn: usuario.correoVerificadoEn,
        mayoriaEdadConfirmadaEn: usuario.mayoriaEdadConfirmadaEn,
      },
      preferencias: { negativaEncuesta: usuario.negativaEncuesta, negativaEstadisticas: usuario.negativaEstadisticas },
      aceptaciones: bd.aceptaciones
        .filter((a) => a.usuarioId === usuario.id)
        .map((a) => {
          const documento = bd.documentos.find((d) => d.id === a.documentoId);
          return { documento: documento.tipo, version: documento.version, aceptadoEn: a.aceptadoEn, direccionIp: a.direccionIp };
        }),
      sesiones: [...bd.sesiones.values()]
        // Todas las filas que aún existan: abiertas, cerradas y vencidas (DEC-94, grafo 1.5.2).
        .filter((sesion) => sesion.usuarioId === usuario.id)
        .map((sesion) => ({ iniciadaEn: sesion.creadaEn, ultimaActividadEn: sesion.ultimaActividadEn, navegador: sesion.agenteUsuario || null })),
      progreso: [...bd.progreso.entries()]
        .filter(([llave]) => llave.startsWith(`${usuario.id}:`))
        .map(([llave, progreso]) => {
          const leccion = R.leccionPorId(Number(llave.split(":")[1]));
          return {
            leccion: R.referencia(leccion),
            curso: R.referencia(R.cursoDe(leccion)),
            abiertaEn: progreso.abiertaEn,
            ultimaSeccion: progreso.ultimaSeccion,
            terminadaEn: progreso.terminadaEn,
          };
        }),
      intentos,
      insignias: R.modulosEnOrden()
        .map((modulo) => ({ modulo, insignia: R.insigniaDeModulo(bd, usuario.id, modulo.id) }))
        .filter(({ insignia }) => insignia?.obtenidaEn)
        .map(({ modulo, insignia }) => ({ modulo: R.referencia(modulo), nombre: insignia.nombre, obtenidaEn: insignia.obtenidaEn })),
    },
  };
}

const dosDecimalesExportados = (numero) => Math.round(numero * 100) / 100;

// ── Contenido ───────────────────────────────────────────────────────────────────────────────────────────────
function resumenEvaluable(ctx, cuestionario) {
  const { bd, usuario } = ctx;
  const enviado = R.evaluableEnviado(bd, usuario.id, cuestionario.id);
  return {
    id: cuestionario.id,
    tipo: cuestionario.tipo,
    titulo: cuestionario.titulo,
    orden: cuestionario.orden,
    estado: enviado ? "enviado" : R.evaluableDisponible(bd, usuario.id, cuestionario) ? "disponible" : "bloqueado",
    mejorCalificacion: R.mejorCalificacion(bd, usuario.id, cuestionario.id),
  };
}

function listarModulos(ctx) {
  const { bd, usuario } = ctx;
  return {
    estado: 200,
    cuerpo: {
      avanceGeneral: R.avanceGeneral(bd, usuario.id),
      modulos: R.modulosEnOrden().map((m) => ({
        slug: m.slug,
        titulo: m.titulo,
        descripcion: m.descripcion,
        orden: m.orden,
        estado: R.estadoModulo(bd, usuario.id, m),
        avance: R.avanceModulo(bd, usuario.id, m),
        insignia: R.insigniaDeModulo(bd, usuario.id, m.id),
        requisito: R.requisitoDeModulo(bd, usuario.id, m),
      })),
    },
  };
}

function obtenerModulo(ctx) {
  const { bd, usuario } = ctx;
  const modulo = R.moduloPorSlug(ctx.params.modulo);
  if (!modulo) throw errores.noEncontrado();
  if (!R.moduloDisponible(bd, usuario.id, modulo)) throw errores.bloqueado();
  return {
    estado: 200,
    cuerpo: {
      slug: modulo.slug,
      titulo: modulo.titulo,
      descripcion: modulo.descripcion,
      estado: R.estadoModulo(bd, usuario.id, modulo),
      avance: R.avanceModulo(bd, usuario.id, modulo),
      insignia: R.insigniaDeModulo(bd, usuario.id, modulo.id),
      cursos: R.cursosDeModulo(modulo.id).map((c) => ({
        slug: c.slug,
        titulo: c.titulo,
        descripcion: c.descripcion,
        orden: c.orden,
        estado: R.estadoCurso(bd, usuario.id, c),
        avance: R.avanceCurso(bd, usuario.id, c),
        requisito: R.requisitoDeCurso(bd, usuario.id, c),
      })),
    },
  };
}

function obtenerCurso(ctx) {
  const { bd, usuario } = ctx;
  const curso = R.cursoPorSlug(ctx.params.curso);
  if (!curso) throw errores.noEncontrado();
  if (!R.cursoDisponible(bd, usuario.id, curso)) throw errores.bloqueado();
  const aprobacion = R.aprobacionDeCurso(bd, usuario.id, curso.id);
  const examen = R.examenDeCurso(curso.id);
  return {
    estado: 200,
    cuerpo: {
      slug: curso.slug,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      modulo: R.referencia(R.moduloDe(curso)),
      estado: R.estadoCurso(bd, usuario.id, curso),
      avance: R.avanceCurso(bd, usuario.id, curso),
      lecciones: R.leccionesDeCurso(curso.id).map((l) => ({
        slug: l.slug,
        titulo: l.titulo,
        resumen: l.resumen,
        orden: l.orden,
        estado: R.estadoLeccion(bd, usuario.id, l),
        nueva: Boolean(aprobacion && new Date(l.publicadoEn) > new Date(aprobacion.enviadoEn)),
        evaluables: R.evaluablesDeLeccion(l.id).map((c) => resumenEvaluable(ctx, c)),
      })),
      examen: examen ? { id: examen.id, titulo: examen.titulo, ...R.estadoExamen(bd, usuario.id, examen, ctx.ahora) } : null,
    },
  };
}

function leccionAbierta(ctx) {
  const leccion = R.leccionPorSlug(ctx.params.leccion);
  if (!leccion) throw errores.noEncontrado();
  if (!R.leccionDisponible(ctx.bd, ctx.usuario.id, leccion)) throw errores.bloqueado();
  return leccion;
}

function abrirLeccion(ctx) {
  const { bd, usuario } = ctx;
  const leccion = leccionAbierta(ctx);
  const llave = `${usuario.id}:${leccion.id}`;
  if (!bd.progreso.has(llave)) bd.progreso.set(llave, { ultimaSeccion: 1, abiertaEn: ctx.ahora.toISOString(), terminadaEn: null });
  const progreso = bd.progreso.get(llave);
  const curso = R.cursoDe(leccion);
  const hermanas = R.leccionesDeCurso(curso.id);
  const posicion = hermanas.findIndex((l) => l.id === leccion.id);
  return {
    estado: 200,
    cuerpo: {
      slug: leccion.slug,
      titulo: leccion.titulo,
      curso: R.referencia(curso),
      modulo: R.referencia(R.moduloDe(curso)),
      secciones: R.seccionesDeLeccion(leccion.id).map((s) => ({ orden: s.orden, titulo: s.titulo, cuerpo: s.cuerpo, imagen: R.imagenPorId(s.imagenId) })),
      ultimaSeccion: progreso.ultimaSeccion,
      terminadaEn: progreso.terminadaEn,
      anterior: posicion > 0 ? R.referencia(hermanas[posicion - 1]) : null,
      siguiente: posicion < hermanas.length - 1 ? R.referencia(hermanas[posicion + 1]) : null,
      evaluables: R.evaluablesDeLeccion(leccion.id).map((c) => resumenEvaluable(ctx, c)),
    },
  };
}

function guardarSeccionVista(ctx) {
  const leccion = leccionAbierta(ctx);
  const total = R.seccionesDeLeccion(leccion.id).length;
  const seccion = ctx.cuerpo?.seccion;
  if (!Number.isInteger(seccion)) throw errores.datosInvalidos({ seccion: "OBLIGATORIO" });
  if (seccion < 1 || seccion > total) throw errores.datosInvalidos({ seccion: "FUERA_DE_RANGO" });
  const llave = `${ctx.usuario.id}:${leccion.id}`;
  const progreso = ctx.bd.progreso.get(llave) ?? { ultimaSeccion: 1, abiertaEn: ctx.ahora.toISOString(), terminadaEn: null };
  progreso.ultimaSeccion = seccion;
  ctx.bd.progreso.set(llave, progreso);
  return { estado: 204 };
}

function terminarLeccion(ctx) {
  const leccion = leccionAbierta(ctx);
  const progreso = ctx.bd.progreso.get(`${ctx.usuario.id}:${leccion.id}`);
  const total = R.seccionesDeLeccion(leccion.id).length;
  // Solo desde la última sección (OP-20); se registra una vez.
  if (!progreso || progreso.ultimaSeccion < total) throw errores.bloqueado();
  progreso.terminadaEn ??= ctx.ahora.toISOString();
  return {
    estado: 200,
    cuerpo: { terminadaEn: progreso.terminadaEn, evaluables: R.evaluablesDeLeccion(leccion.id).map((c) => resumenEvaluable(ctx, c)) },
  };
}

function buscar(ctx) {
  const consulta = (ctx.query.get("q") ?? "").trim();
  if (!consulta || consulta.length > 100) throw errores.datosInvalidos({ q: consulta ? "LONGITUD_INVALIDA" : "OBLIGATORIO" });
  const termino = sinAcentos(consulta);
  const coincide = (...textos) => textos.some((t) => sinAcentos(t).includes(termino));
  const { bd, usuario } = ctx;
  const resultados = [];
  for (const m of R.modulosEnOrden()) {
    if (coincide(m.titulo, m.descripcion)) resultados.push({ tipo: "modulo", slug: m.slug, titulo: m.titulo, estado: R.estadoModulo(bd, usuario.id, m), contexto: null });
    for (const c of R.cursosDeModulo(m.id)) {
      if (coincide(c.titulo, c.descripcion)) resultados.push({ tipo: "curso", slug: c.slug, titulo: c.titulo, estado: R.estadoCurso(bd, usuario.id, c), contexto: m.titulo });
      for (const l of R.leccionesDeCurso(c.id)) {
        if (coincide(l.titulo, l.resumen)) resultados.push({ tipo: "leccion", slug: l.slug, titulo: l.titulo, estado: R.estadoLeccion(bd, usuario.id, l), contexto: c.titulo });
      }
    }
  }
  return { estado: 200, cuerpo: { resultados } };
}

// ── Evaluables ──────────────────────────────────────────────────────────────────────────────────────────────
function evaluableAbierto(ctx) {
  const cuestionario = R.cuestionarioPorId(entero(ctx.params.cuestionario));
  if (!cuestionario || cuestionario.tipo === "examen") throw errores.noEncontrado();
  if (!R.evaluableDisponible(ctx.bd, ctx.usuario.id, cuestionario)) throw errores.bloqueado();
  return cuestionario;
}

function abrirActividad(ctx) {
  const { bd, usuario } = ctx;
  const cuestionario = evaluableAbierto(ctx);
  return {
    estado: 200,
    cuerpo: {
      id: cuestionario.id,
      tipo: cuestionario.tipo,
      titulo: cuestionario.titulo,
      instrucciones: cuestionario.instrucciones,
      leccion: R.referencia(R.leccionPorId(cuestionario.leccionId)),
      preguntas: R.preguntasDe(cuestionario.id).map((p) => R.preguntaParaResponder(p, usuario.id)),
      intentosEnviados: R.intentosEnviados(bd, usuario.id, cuestionario.id).length,
      mejorCalificacion: R.mejorCalificacion(bd, usuario.id, cuestionario.id),
    },
  };
}

/** Convierte la respuesta del cuerpo en la que se guarda; `null` si no corresponde a la pregunta. */
function respuestaInterna(pregunta, usuarioId, entrada, { completa }) {
  if (pregunta.tipo === "relacion") {
    if (!Array.isArray(entrada?.uniones)) return null;
    const uniones = [];
    for (const union of entrada.uniones) {
      const izquierda = pregunta.parejas.find((p) => p.id === union?.izquierdaId);
      const derechaId = R.parejaDeClave(pregunta, usuarioId, union?.derechaClave);
      if (!izquierda || derechaId === null) return null;
      if (uniones.some((u) => u.izquierdaId === izquierda.id || u.derechaId === derechaId)) return null;
      uniones.push({ izquierdaId: izquierda.id, derechaId });
    }
    if (completa && uniones.length !== pregunta.parejas.length) return null;
    return { uniones };
  }
  return pregunta.opciones.some((o) => o.id === entrada?.opcionId) ? { opcionId: entrada.opcionId } : null;
}

function nuevoIntento(ctx, cuestionario) {
  const previos = R.intentosDe(ctx.bd, ctx.usuario.id, cuestionario.id);
  const intento = {
    id: uuidv7(),
    usuarioId: ctx.usuario.id,
    cuestionarioId: cuestionario.id,
    numero: previos.length + 1,
    estado: "enCurso",
    semilla: semillaAleatoria(),
    iniciadoEn: ctx.ahora.toISOString(),
    enviadoEn: null,
    calificacion: null,
    aprobado: null,
    respuestas: new Map(),
    puntajes: new Map(),
  };
  ctx.bd.intentos.set(intento.id, intento);
  return intento;
}

function enviarActividad(ctx) {
  const { bd, usuario } = ctx;
  const cuestionario = evaluableAbierto(ctx);
  const preguntas = R.preguntasDe(cuestionario.id);
  const entradas = Array.isArray(ctx.cuerpo?.respuestas) ? ctx.cuerpo.respuestas : null;
  if (!entradas) throw errores.datosInvalidos({ respuestas: "OBLIGATORIO" });
  const respuestas = new Map();
  for (const entrada of entradas) {
    const pregunta = preguntas.find((p) => p.id === entrada?.preguntaId);
    const respuesta = pregunta && respuestaInterna(pregunta, usuario.id, entrada, { completa: true });
    if (!respuesta) throw errores.datosInvalidos({ respuestas: "FORMATO_INVALIDO" });
    respuestas.set(pregunta.id, { ...respuesta, respondidoEn: ctx.ahora.toISOString() });
  }
  const pendientes = preguntas.filter((p) => !respuestas.has(p.id)).map((p) => p.id);
  if (pendientes.length) throw errores.respuestasIncompletas(pendientes);

  // Crea o retoma el intento (fn_iniciar_intento) y califica al enviarlo (fn_enviar_intento).
  const intento = R.intentoAbierto(bd, usuario.id, cuestionario.id) ?? nuevoIntento(ctx, cuestionario);
  intento.respuestas = respuestas;
  intento.estado = "enviado";
  intento.enviadoEn = ctx.ahora.toISOString();
  R.calificar(intento);
  return {
    estado: 200,
    cuerpo: {
      intento: { id: intento.id, numero: intento.numero, enviadoEn: intento.enviadoEn, calificacion: intento.calificacion },
      tipo: cuestionario.tipo,
      mejorCalificacion: R.mejorCalificacion(bd, usuario.id, cuestionario.id),
      preguntas: preguntas.map((p) => R.preguntaCalificada(p, intento.respuestas.get(p.id), intento.puntajes.get(p.id))),
    },
  };
}

function examenDe(ctx) {
  const examen = R.cuestionarioPorId(entero(ctx.params.cuestionario));
  if (!examen || examen.tipo !== "examen") throw errores.noEncontrado();
  if (!R.cursoDisponible(ctx.bd, ctx.usuario.id, R.cursoPorId(examen.cursoId))) throw errores.bloqueado();
  return examen;
}

function obtenerPortadaExamen(ctx) {
  const { bd, usuario } = ctx;
  const examen = examenDe(ctx);
  const estado = R.estadoExamen(bd, usuario.id, examen, ctx.ahora);
  return {
    estado: 200,
    cuerpo: {
      id: examen.id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones,
      curso: R.referencia(R.cursoPorId(examen.cursoId)),
      numeroPreguntas: R.preguntasDe(examen.id).length,
      calificacionMinima: examen.calificacionMinima,
      ...estado,
      intentoEnCurso: R.intentoAbierto(bd, usuario.id, examen.id)?.id ?? null,
      intentosPrevios: R.intentosEnviados(bd, usuario.id, examen.id).map((i) => ({
        id: i.id,
        numero: i.numero,
        enviadoEn: i.enviadoEn,
        calificacion: i.calificacion,
        aprobado: i.aprobado,
      })),
    },
  };
}

function intentoVisible(ctx, intento, examen) {
  const preguntas = mezclar(R.preguntasDe(examen.id), intento.semilla);
  return {
    id: intento.id,
    numero: intento.numero,
    iniciadoEn: intento.iniciadoEn,
    examen: { id: examen.id, titulo: examen.titulo },
    preguntas: preguntas.map((p) => R.preguntaParaResponder(p, ctx.usuario.id, intento.semilla)),
    respuestas: preguntas
      .filter((p) => intento.respuestas.has(p.id))
      .map((p) => R.respuestaVisible(p, ctx.usuario.id, intento.respuestas.get(p.id))),
  };
}

function iniciarIntentoExamen(ctx) {
  const { bd, usuario } = ctx;
  const examen = examenDe(ctx);
  // Mismo orden que fn_iniciar_intento: aprobado, intento abierto, espera, desbloqueo (C-05, DEC-19, DEC-20, DEC-21).
  const estado = R.estadoExamen(bd, usuario.id, examen, ctx.ahora);
  if (estado.estado === "aprobado") throw errores.examenAprobado();
  const abierto = R.intentoAbierto(bd, usuario.id, examen.id);
  if (abierto) return { estado: 200, cuerpo: intentoVisible(ctx, abierto, examen) };
  if (estado.estado === "enEspera") throw errores.enEspera(estado.minutosRestantes, estado.disponibleEn);
  if (estado.estado === "bloqueado") throw errores.bloqueado();
  return { estado: 201, cuerpo: intentoVisible(ctx, nuevoIntento(ctx, examen), examen) };
}

function intentoPropio(ctx) {
  const intento = ctx.bd.intentos.get(String(ctx.params.intento));
  // El intento de otro alumno no existe para quien pregunta (INV-07).
  if (!intento || intento.usuarioId !== ctx.usuario.id) throw errores.noEncontrado();
  return intento;
}

function guardarRespuesta(ctx) {
  const intento = intentoPropio(ctx);
  if (intento.estado === "enviado") throw errores.intentoCerrado();
  const pregunta = R.preguntasDe(intento.cuestionarioId).find((p) => p.id === entero(ctx.params.pregunta));
  if (!pregunta) throw errores.noEncontrado();
  const respuesta = respuestaInterna(pregunta, ctx.usuario.id, ctx.cuerpo, { completa: false });
  if (!respuesta) throw errores.datosInvalidos({ [pregunta.tipo === "relacion" ? "uniones" : "opcionId"]: "FORMATO_INVALIDO" });
  const guardada = { ...respuesta, respondidoEn: ctx.ahora.toISOString() };
  intento.respuestas.set(pregunta.id, guardada);
  return { estado: 200, cuerpo: R.respuestaVisible(pregunta, ctx.usuario.id, guardada) };
}

function enviarExamen(ctx) {
  const { bd, usuario } = ctx;
  const intento = intentoPropio(ctx);
  const examen = R.cuestionarioPorId(intento.cuestionarioId);
  if (examen.tipo !== "examen") throw errores.noEncontrado();
  if (intento.estado === "enviado") throw errores.intentoCerrado();
  const preguntas = R.preguntasDe(examen.id);
  const pendientes = preguntas.filter((p) => !R.respondida(p, intento.respuestas.get(p.id))).map((p) => p.id);
  if (pendientes.length) throw errores.respuestasIncompletas(pendientes);

  intento.estado = "enviado";
  intento.enviadoEn = ctx.ahora.toISOString();
  R.calificar(intento);
  const enOrden = mezclar(preguntas, intento.semilla);
  const aciertos = preguntas.filter((p) => intento.puntajes.get(p.id) >= 1).length;
  const base = {
    intento: { id: intento.id, numero: intento.numero, enviadoEn: intento.enviadoEn, calificacion: intento.calificacion },
    calificacionMinima: examen.calificacionMinima,
    aciertos,
    errores: preguntas.length - aciertos,
  };
  const curso = R.cursoPorId(examen.cursoId);
  if (intento.aprobado) {
    return {
      estado: 200,
      cuerpo: {
        resultado: "aprobado",
        ...base,
        cursoCompletado: R.referencia(curso),
        insigniaNueva: R.otorgarInsigniaSiCorresponde(bd, usuario.id, curso.moduloId, ctx.ahora),
        preguntas: enOrden.map((p) => R.preguntaCalificada(p, intento.respuestas.get(p.id), intento.puntajes.get(p.id))),
      },
    };
  }
  const repaso = new Map();
  for (const p of preguntas) {
    const leccion = R.leccionPorId(p.leccionRepasoId);
    if (intento.puntajes.get(p.id) < 1 && leccion) repaso.set(leccion.id, R.referencia(leccion));
  }
  return {
    estado: 200,
    cuerpo: {
      resultado: "reprobado",
      ...base,
      leccionesRepaso: [...repaso.values()],
      minutosEspera: examen.minutosEspera,
      disponibleEn: new Date(ctx.ahora.getTime() + examen.minutosEspera * MINUTO).toISOString(),
      preguntas: enOrden.map((p) => R.preguntaSinSolucion(p, intento.respuestas.get(p.id), intento.puntajes.get(p.id))),
    },
  };
}

// ── Desempeño (siempre del alumno de la sesión, INV-07) ─────────────────────────────────────────────────────
function obtenerProgreso(ctx) {
  const { bd, usuario } = ctx;
  return {
    estado: 200,
    cuerpo: {
      avanceGeneral: R.avanceGeneral(bd, usuario.id),
      modulos: R.modulosEnOrden().map((m) => ({
        slug: m.slug,
        titulo: m.titulo,
        estado: R.estadoModulo(bd, usuario.id, m),
        avance: R.avanceModulo(bd, usuario.id, m),
        cursos: R.cursosDeModulo(m.id).map((c) => ({
          slug: c.slug,
          titulo: c.titulo,
          estado: R.estadoCurso(bd, usuario.id, c),
          avance: R.avanceCurso(bd, usuario.id, c),
        })),
      })),
      insignias: R.modulosEnOrden()
        .map((m) => ({ modulo: m, insignia: R.insigniaDeModulo(bd, usuario.id, m.id) }))
        .filter(({ insignia }) => insignia)
        .map(({ modulo, insignia }) => ({
          modulo: R.referencia(modulo),
          insignia,
          cursosFaltantes: R.cursosDeModulo(modulo.id).filter((c) => !R.cursoAprobado(bd, usuario.id, c.id)).length,
        })),
    },
  };
}

/** Fila de «Mis resultados». `destacado`: el mejor intento en actividades y exámenes, el primero en casos (C-08). */
function filaDeResultado(ctx, intento) {
  const cuestionario = R.cuestionarioPorId(intento.cuestionarioId);
  const leccion = cuestionario.leccionId ? R.leccionPorId(cuestionario.leccionId) : null;
  const curso = leccion ? R.cursoDe(leccion) : R.cursoPorId(cuestionario.cursoId);
  const enviados = R.intentosEnviados(ctx.bd, ctx.usuario.id, cuestionario.id);
  const destacado =
    cuestionario.tipo === "caso"
      ? intento.numero === enviados[0].numero
      : intento.id === [...enviados].sort((a, b) => b.calificacion - a.calificacion || a.numero - b.numero)[0].id;
  return {
    intentoId: intento.id,
    enviadoEn: intento.enviadoEn,
    tipo: cuestionario.tipo,
    titulo: cuestionario.titulo,
    modulo: R.referencia(R.moduloDe(curso)),
    curso: R.referencia(curso),
    leccion: leccion ? R.referencia(leccion) : null,
    calificacion: intento.calificacion,
    numero: intento.numero,
    destacado,
  };
}

/** Día AAAA-MM-DD en America/Mexico_City (UTC−6, sin horario de verano) como instante UTC (DEC-30). */
function inicioDeDiaEnMexico(fecha, desplazamientoDias = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "")) return undefined;
  const instante = new Date(`${fecha}T06:00:00.000Z`);
  if (Number.isNaN(instante.getTime())) return undefined;
  return new Date(instante.getTime() + desplazamientoDias * 24 * 60 * MINUTO);
}

function listarResultados(ctx) {
  const campos = {};
  const modulo = ctx.query.get("modulo");
  const tipo = ctx.query.get("tipo");
  const desde = ctx.query.get("desde");
  const hasta = ctx.query.get("hasta");
  if (modulo && !R.moduloPorSlug(modulo)) campos.modulo = "FORMATO_INVALIDO";
  if (tipo && !["actividad", "caso", "examen"].includes(tipo)) campos.tipo = "FORMATO_INVALIDO";
  const inicio = desde ? inicioDeDiaEnMexico(desde) : null;
  const fin = hasta ? inicioDeDiaEnMexico(hasta, 1) : null;
  if (inicio === undefined) campos.desde = "FORMATO_INVALIDO";
  if (fin === undefined) campos.hasta = "FORMATO_INVALIDO";
  sinErrores(campos);
  const resultados = [...ctx.bd.intentos.values()]
    .filter((i) => i.usuarioId === ctx.usuario.id && i.estado === "enviado")
    .map((i) => filaDeResultado(ctx, i))
    .filter((f) => (!modulo || f.modulo.slug === modulo) && (!tipo || f.tipo === tipo))
    .filter((f) => (!inicio || new Date(f.enviadoEn) >= inicio) && (!fin || new Date(f.enviadoEn) < fin))
    .sort((a, b) => new Date(b.enviadoEn) - new Date(a.enviadoEn));
  return { estado: 200, cuerpo: { resultados } };
}

function obtenerDetalleIntento(ctx) {
  const intento = intentoPropio(ctx);
  if (intento.estado !== "enviado") throw errores.noEncontrado();
  const cuestionario = R.cuestionarioPorId(intento.cuestionarioId);
  const preguntas = R.preguntasDe(cuestionario.id);
  const resultado = filaDeResultado(ctx, intento);
  const oculta = cuestionario.tipo === "examen" && !intento.aprobado;
  return {
    estado: 200,
    cuerpo: oculta
      ? { solucion: "oculta", resultado, preguntas: preguntas.map((p) => R.preguntaSinSolucion(p, intento.respuestas.get(p.id), intento.puntajes.get(p.id))) }
      : { solucion: "completa", resultado, preguntas: preguntas.map((p) => R.preguntaCalificada(p, intento.respuestas.get(p.id), intento.puntajes.get(p.id))) },
  };
}

// ── Tabla de rutas ──────────────────────────────────────────────────────────────────────────────────────────
// sesion: «requerida» o «opcional». conPendiente: se permite con una aceptación pendiente (INV-30).
// limitada: cuenta para el límite de peticiones por IP (RSG-04).
export const rutas = [
  { metodo: "GET", ruta: "/api/sesion", operationId: "obtenerSesion", sesion: "requerida", conPendiente: true, manejar: (ctx) => ({ estado: 200, cuerpo: sesionVisible(ctx, ctx.usuario) }) },
  { metodo: "POST", ruta: "/api/sesion", operationId: "iniciarSesion", sesion: "opcional", conPendiente: true, limitada: true, manejar: iniciarSesion },
  { metodo: "DELETE", ruta: "/api/sesion", operationId: "cerrarSesion", sesion: "requerida", conPendiente: true, manejar: (ctx) => (ctx.cerrarSesionActual(), { estado: 204 }) },
  { metodo: "POST", ruta: "/api/sesion/renovar", operationId: "renovarSesion", sesion: "requerida", conPendiente: true, manejar: (ctx) => ({ estado: 200, cuerpo: sesionVisible(ctx, ctx.usuario) }) },
  { metodo: "DELETE", ruta: "/api/sesiones", operationId: "cerrarTodasLasSesiones", sesion: "requerida", conPendiente: true, manejar: (ctx) => (ctx.revocarSesiones(ctx.usuario.id), { estado: 204 }) },
  { metodo: "POST", ruta: "/api/cuenta/registro", operationId: "registrarCuenta", sesion: "opcional", conPendiente: true, limitada: true, manejar: registrarCuenta },
  { metodo: "POST", ruta: "/api/cuenta/verificacion", operationId: "verificarCorreo", sesion: "opcional", conPendiente: true, manejar: verificarCorreo },
  { metodo: "POST", ruta: "/api/cuenta/verificacion/reenvio", operationId: "reenviarVerificacion", sesion: "opcional", conPendiente: true, limitada: true, manejar: reenviarVerificacion },
  { metodo: "POST", ruta: "/api/cuenta/aceptacion", operationId: "aceptarDocumentos", sesion: "opcional", conPendiente: true, manejar: aceptarDocumentos },
  { metodo: "GET", ruta: "/api/auth/google", operationId: "entrarConGoogle", sesion: "opcional", conPendiente: true, manejar: entrarConGoogle },
  { metodo: "GET", ruta: "/api/auth/google/callback", operationId: "volverDeGoogle", sesion: "opcional", conPendiente: true, manejar: volverDeGoogle },
  { metodo: "GET", ruta: "/api/documentos", operationId: "obtenerDocumentosVigentes", sesion: "opcional", conPendiente: true, manejar: (ctx) => ({ estado: 200, cuerpo: { documentos: Object.values(R.documentosVigentes(ctx.bd)).map(documentoVisible) } }) },
  { metodo: "POST", ruta: "/api/contrasena/recuperacion", operationId: "solicitarRecuperacion", sesion: "opcional", conPendiente: true, limitada: true, manejar: solicitarRecuperacion },
  { metodo: "POST", ruta: "/api/contrasena/restablecimiento", operationId: "restablecerContrasena", sesion: "opcional", conPendiente: true, manejar: restablecerContrasena },
  { metodo: "GET", ruta: "/api/perfil", operationId: "obtenerPerfil", sesion: "requerida", conPendiente: true, manejar: (ctx) => ({ estado: 200, cuerpo: perfilVisible(ctx, ctx.usuario) }) },
  { metodo: "PATCH", ruta: "/api/perfil", operationId: "editarNombre", sesion: "requerida", manejar: editarNombre },
  { metodo: "GET", ruta: "/api/perfil/exportacion", operationId: "exportarMisDatos", sesion: "requerida", conPendiente: true, manejar: exportarMisDatos },
  { metodo: "PATCH", ruta: "/api/perfil/privacidad", operationId: "cambiarPreferenciasPrivacidad", sesion: "requerida", manejar: cambiarPreferenciasPrivacidad },
  { metodo: "PUT", ruta: "/api/perfil/contrasena", operationId: "cambiarContrasena", sesion: "requerida", manejar: cambiarContrasena },
  { metodo: "POST", ruta: "/api/perfil/correo", operationId: "cambiarCorreo", sesion: "requerida", limitada: true, manejar: cambiarCorreo },
  { metodo: "POST", ruta: "/api/perfil/correo/confirmacion", operationId: "confirmarCambioCorreo", sesion: "opcional", conPendiente: true, manejar: confirmarCambioCorreo },
  { metodo: "POST", ruta: "/api/perfil/eliminacion", operationId: "eliminarCuenta", sesion: "requerida", conPendiente: true, manejar: eliminarCuenta },
  { metodo: "GET", ruta: "/api/modulos", operationId: "listarModulos", sesion: "requerida", manejar: listarModulos },
  { metodo: "GET", ruta: "/api/modulos/{modulo}", operationId: "obtenerModulo", sesion: "requerida", manejar: obtenerModulo },
  { metodo: "GET", ruta: "/api/cursos/{curso}", operationId: "obtenerCurso", sesion: "requerida", manejar: obtenerCurso },
  { metodo: "GET", ruta: "/api/lecciones/{leccion}", operationId: "abrirLeccion", sesion: "requerida", manejar: abrirLeccion },
  { metodo: "PUT", ruta: "/api/lecciones/{leccion}/seccion-vista", operationId: "guardarSeccionVista", sesion: "requerida", manejar: guardarSeccionVista },
  { metodo: "POST", ruta: "/api/lecciones/{leccion}/terminar", operationId: "terminarLeccion", sesion: "requerida", manejar: terminarLeccion },
  { metodo: "GET", ruta: "/api/busqueda", operationId: "buscar", sesion: "requerida", manejar: buscar },
  { metodo: "GET", ruta: "/api/actividades/{cuestionario}", operationId: "abrirActividad", sesion: "requerida", manejar: abrirActividad },
  { metodo: "POST", ruta: "/api/actividades/{cuestionario}/envios", operationId: "enviarActividad", sesion: "requerida", manejar: enviarActividad },
  { metodo: "GET", ruta: "/api/examenes/{cuestionario}", operationId: "obtenerPortadaExamen", sesion: "requerida", manejar: obtenerPortadaExamen },
  { metodo: "POST", ruta: "/api/examenes/{cuestionario}/intentos", operationId: "iniciarIntentoExamen", sesion: "requerida", manejar: iniciarIntentoExamen },
  { metodo: "PUT", ruta: "/api/intentos/{intento}/respuestas/{pregunta}", operationId: "guardarRespuesta", sesion: "requerida", manejar: guardarRespuesta },
  { metodo: "POST", ruta: "/api/intentos/{intento}/envio", operationId: "enviarExamen", sesion: "requerida", manejar: enviarExamen },
  { metodo: "GET", ruta: "/api/progreso", operationId: "obtenerProgreso", sesion: "requerida", manejar: obtenerProgreso },
  { metodo: "GET", ruta: "/api/resultados", operationId: "listarResultados", sesion: "requerida", manejar: listarResultados },
  { metodo: "GET", ruta: "/api/resultados/{intento}", operationId: "obtenerDetalleIntento", sesion: "requerida", manejar: obtenerDetalleIntento },
];

