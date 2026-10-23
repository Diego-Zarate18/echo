/**
 * Método y ruta de cada operación de docs/api/openapi.yaml, por su `operationId`. Los clientes de servidor y de
 * navegador generan una función por llave con este nombre. La prueba del contrato revisa que coincida con el OpenAPI.
 *
 * `entrarConGoogle` y `volverDeGoogle` no están aquí: son redirecciones que se recorren navegando (un enlace a
 * `rutasDeNavegacion.entrarConGoogle`), no llamadas con `fetch`.
 */
export const operacionesApi = {
  obtenerSesion: { metodo: "GET", ruta: "/api/sesion" },
  iniciarSesion: { metodo: "POST", ruta: "/api/sesion" },
  cerrarSesion: { metodo: "DELETE", ruta: "/api/sesion" },
  renovarSesion: { metodo: "POST", ruta: "/api/sesion/renovar" },
  cerrarTodasLasSesiones: { metodo: "DELETE", ruta: "/api/sesiones" },
  registrarCuenta: { metodo: "POST", ruta: "/api/cuenta/registro" },
  verificarCorreo: { metodo: "POST", ruta: "/api/cuenta/verificacion" },
  reenviarVerificacion: { metodo: "POST", ruta: "/api/cuenta/verificacion/reenvio" },
  aceptarDocumentos: { metodo: "POST", ruta: "/api/cuenta/aceptacion" },
  obtenerDocumentosVigentes: { metodo: "GET", ruta: "/api/documentos" },
  solicitarRecuperacion: { metodo: "POST", ruta: "/api/contrasena/recuperacion" },
  restablecerContrasena: { metodo: "POST", ruta: "/api/contrasena/restablecimiento" },
  obtenerPerfil: { metodo: "GET", ruta: "/api/perfil" },
  editarNombre: { metodo: "PATCH", ruta: "/api/perfil" },
  exportarMisDatos: { metodo: "GET", ruta: "/api/perfil/exportacion" },
  cambiarPreferenciasPrivacidad: { metodo: "PATCH", ruta: "/api/perfil/privacidad" },
  cambiarContrasena: { metodo: "PUT", ruta: "/api/perfil/contrasena" },
  cambiarCorreo: { metodo: "POST", ruta: "/api/perfil/correo" },
  confirmarCambioCorreo: { metodo: "POST", ruta: "/api/perfil/correo/confirmacion" },
  eliminarCuenta: { metodo: "POST", ruta: "/api/perfil/eliminacion" },
  listarModulos: { metodo: "GET", ruta: "/api/modulos" },
  obtenerModulo: { metodo: "GET", ruta: "/api/modulos/{modulo}" },
  obtenerCurso: { metodo: "GET", ruta: "/api/cursos/{curso}" },
  abrirLeccion: { metodo: "GET", ruta: "/api/lecciones/{leccion}" },
  guardarSeccionVista: { metodo: "PUT", ruta: "/api/lecciones/{leccion}/seccion-vista" },
  terminarLeccion: { metodo: "POST", ruta: "/api/lecciones/{leccion}/terminar" },
  buscar: { metodo: "GET", ruta: "/api/busqueda" },
  abrirActividad: { metodo: "GET", ruta: "/api/actividades/{cuestionario}" },
  enviarActividad: { metodo: "POST", ruta: "/api/actividades/{cuestionario}/envios" },
  obtenerPortadaExamen: { metodo: "GET", ruta: "/api/examenes/{cuestionario}" },
  iniciarIntentoExamen: { metodo: "POST", ruta: "/api/examenes/{cuestionario}/intentos" },
  guardarRespuesta: { metodo: "PUT", ruta: "/api/intentos/{intento}/respuestas/{pregunta}" },
  enviarExamen: { metodo: "POST", ruta: "/api/intentos/{intento}/envio" },
  obtenerProgreso: { metodo: "GET", ruta: "/api/progreso" },
  listarResultados: { metodo: "GET", ruta: "/api/resultados" },
  obtenerDetalleIntento: { metodo: "GET", ruta: "/api/resultados/{intento}" },
} as const satisfies Record<string, { metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; ruta: `/api/${string}` }>;

/** Operaciones que se recorren navegando: el navegador sigue las redirecciones del backend. */
export const rutasDeNavegacion = {
  entrarConGoogle: "/api/auth/google",
  volverDeGoogle: "/api/auth/google/callback",
} as const;

export type OperacionesApi = typeof operacionesApi;
export type IdOperacion = keyof OperacionesApi;
/** Las que solo leen: las únicas que expone el cliente de servidor. */
export type IdOperacionDeLectura = {
  [I in IdOperacion]: OperacionesApi[I]["metodo"] extends "GET" ? I : never;
}[IdOperacion];
