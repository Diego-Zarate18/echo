/**
 * Comprobación de tipos de los clientes de API (no se ejecuta: la revisa `tsc` en `npm run tipos`).
 * Cada `@ts-expect-error` es un uso que debe fallar al compilar; si deja de fallar, tsc avisa.
 */
import type { ExitoDe } from "../../src/lib/api/cliente";
import type { apiNavegador } from "../../src/lib/api/navegador";
import type { apiServidor } from "../../src/lib/api/servidor";
import { mensajeDeError } from "../../src/lib/api/mensajes";

declare const navegador: typeof apiNavegador;
declare const servidor: typeof apiServidor;

export async function comprobarTiposDeApi() {
  const modulos = await servidor.listarModulos();
  if (modulos.ok) {
    const avance: number = modulos.datos.avanceGeneral;
    const estado: "bloqueado" | "disponible" | "enCurso" | "completado" = modulos.datos.modulos[0].estado;
    void [avance, estado];
  } else {
    void mensajeDeError(modulos.error);
  }

  await servidor.obtenerModulo({ ruta: { modulo: "etica-profesional" } });
  // @ts-expect-error falta el parámetro de ruta
  await servidor.obtenerModulo();
  // @ts-expect-error el cliente de servidor solo lee: las mutaciones van desde el navegador
  await servidor.iniciarSesion({ cuerpo: { correo: "a@example.com", contrasena: "x" } });

  await navegador.buscar({ consulta: { q: "privacidad" } });
  // @ts-expect-error la búsqueda exige q
  await navegador.buscar();
  await navegador.listarResultados();
  await navegador.listarResultados({ consulta: { tipo: "examen" } });

  const sesion = await navegador.iniciarSesion({ cuerpo: { correo: "a@example.com", contrasena: "x" } });
  if (sesion.ok) {
    const pendiente: boolean = sesion.datos.aceptacionPendiente.aviso;
    void pendiente;
  }
  // @ts-expect-error el cuerpo es obligatorio
  await navegador.iniciarSesion();

  const registro = await navegador.registrarCuenta({
    cuerpo: {
      nombre: "Ana",
      apellidos: "Ejemplo",
      correo: "ana@example.com",
      contrasena: "Segura2026",
      versionAviso: "1.0",
      versionTerminos: "1.0",
      aceptaAviso: true,
      aceptaTerminos: true,
      mayorDeEdad: true,
      negativaEncuesta: false,
      negativaEstadisticas: false,
    },
  });
  if (registro.ok) {
    const sinCuerpo: null = registro.datos;
    void sinCuerpo;
  }

  await navegador.guardarRespuesta({ ruta: { intento: "0192f0a0-0000-7000-8000-000000000000", pregunta: 3 }, cuerpo: { opcionId: 7 } });
}

/** El resultado del examen se distingue por `resultado`: el reprobado no tiene preguntas con solución. */
export function comprobarResultadoDeExamen(resultado: ExitoDe<"enviarExamen">) {
  if (resultado.resultado === "reprobado") {
    const minutos: number = resultado.minutosEspera;
    // @ts-expect-error una pregunta de examen reprobado no trae opciones con la correcta
    void resultado.preguntas[0].opciones;
    void minutos;
  } else {
    void resultado.preguntas[0].opciones;
  }
}
