import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";
import { leerYaml } from "./utilidades/yaml-simple";
import {
  ALUMNA,
  Alumno,
  CONTRASENA,
  OTRA_ALUMNA,
  URL_APP,
  aceptaciones,
  control,
  correos,
  encabezadosSetCookie,
  escenario,
  importarDelSimulador,
  leerTexto,
  llavesPresentes,
  raizFrontend,
  reiniciarSimulador,
  rutaContrato,
} from "./utilidades/api";
import { operacionesApi, rutasDeNavegacion } from "../src/lib/api/operaciones";

type Json = Record<string, unknown> & { [llave: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Operacion = { metodo: string; ruta: string; operationId: string; xGrafo: unknown; parametros: Json[] };

const contrato = leerYaml(leerTexto(rutaContrato)) as Json;
const operaciones: Operacion[] = Object.entries(contrato.paths as Json).flatMap(([ruta, metodos]) =>
  Object.entries(metodos as Json).map(([metodo, op]) => ({
    metodo: metodo.toUpperCase(),
    ruta,
    operationId: op.operationId,
    xGrafo: op["x-grafo"],
    parametros: op.parameters ?? [],
  })),
);

/** Llaves que nunca aparecen antes de enviar (INV-04). */
const ANTES_DE_ENVIAR = ["valor", "correcta", "derechaCorrecta", "opcionCorrecta", "parejaCorrecta", "retroalimentacion", "consecuencia", "fundamento", "puntaje", "etiqueta"];
/** Llaves que delatarían la solución en un examen reprobado (DEC-11). */
const SOLUCIONES = ["valor", "opciones", "uniones", "derechaCorrecta", "retroalimentacion", "fundamento", "decision", "consecuencia"];

type Contenido = {
  preguntas: { id: number; tipo: string; opciones?: { id: number; valor: number }[]; parejas?: { id: number; derecho: string }[] }[];
};

/** Arma respuestas para las preguntas recibidas, con el contenido del simulador (la prueba sí conoce la solución). */
function responder(preguntas: Json[], contenido: Contenido, correctas: boolean) {
  return preguntas.map((p) => {
    const original = contenido.preguntas.find((q) => q.id === p.id)!;
    if (p.tipo === "relacion") {
      const claves = p.izquierda.map((izq: Json) => {
        const derecho = original.parejas!.find((par) => par.id === izq.id)!.derecho;
        return p.derecha.find((d: Json) => d.texto === derecho).clave as string;
      });
      const elegidas = correctas ? claves : [...claves.slice(1), claves[0]];
      return { preguntaId: p.id, uniones: p.izquierda.map((izq: Json, i: number) => ({ izquierdaId: izq.id, derechaClave: elegidas[i] })) };
    }
    const ordenadas = [...original.opciones!].sort((a, b) => (correctas ? b.valor - a.valor : a.valor - b.valor));
    return { preguntaId: p.id, opcionId: ordenadas[0].id };
  });
}

/** Lee, termina y envía con respuestas correctas cada lección del curso, por la API. */
async function completarLecciones(alumno: Alumno, curso: string, contenido: Contenido) {
  const indice = (await alumno.json<Json>("GET", `/api/cursos/${curso}`)).cuerpo;
  for (const resumen of indice.lecciones) {
    const leccion = (await alumno.json<Json>("GET", `/api/lecciones/${resumen.slug}`)).cuerpo;
    expect((await alumno.pedir("PUT", `/api/lecciones/${resumen.slug}/seccion-vista`, { cuerpo: { seccion: leccion.secciones.length } })).status()).toBe(204);
    expect((await alumno.pedir("POST", `/api/lecciones/${resumen.slug}/terminar`)).status()).toBe(200);
    for (const evaluable of leccion.evaluables) {
      const actividad = await alumno.json<Json>("GET", `/api/actividades/${evaluable.id}`);
      expect(actividad.estado, `abrir ${evaluable.titulo}`).toBe(200);
      const envio = await alumno.json("POST", `/api/actividades/${evaluable.id}/envios`, {
        cuerpo: { respuestas: responder(actividad.cuerpo.preguntas, contenido, true) },
      });
      expect(envio.estado, `enviar ${evaluable.titulo}`).toBe(200);
    }
  }
}

test.describe("Contrato de la API (docs/api/openapi.yaml)", () => {
  test("el OpenAPI es válido: cada $ref existe y cada operación tiene operationId y x-grafo", async () => {
    expect(contrato.openapi).toBe("3.1.0");
    const refs: string[] = [];
    (function recorrer(valor: unknown) {
      if (Array.isArray(valor)) valor.forEach(recorrer);
      else if (valor && typeof valor === "object") {
        for (const [llave, v] of Object.entries(valor)) {
          if (llave === "$ref") refs.push(String(v));
          recorrer(v);
        }
      }
    })(contrato);
    expect(refs.length).toBeGreaterThan(100);
    for (const ref of new Set(refs)) {
      expect(ref, ref).toMatch(/^#\//);
      const destino = ref.slice(2).split("/").reduce<unknown>((nodo, parte) => (nodo as Json | undefined)?.[parte], contrato);
      expect(destino, `${ref} no existe`).toBeDefined();
    }
    const ids = operaciones.map((o) => o.operationId);
    expect(new Set(ids).size, "operationId repetido").toBe(ids.length);
    for (const op of operaciones) {
      expect(op.operationId, `${op.metodo} ${op.ruta}`).toMatch(/^[a-z][A-Za-z]+$/);
      expect(String(op.xGrafo), `${op.metodo} ${op.ruta}`).toMatch(/^OP-\d{2}$/);
      expect(op.ruta, `${op.operationId}: prefijo /api`).toMatch(/^\/api\//);
    }
  });

  test("el lector de YAML de la prueba coincide con los tipos que generó openapi-typescript", async () => {
    const esquema = leerTexto(`${raizFrontend}/src/lib/api/esquema.d.ts`);
    const bloque = esquema.slice(esquema.indexOf("export interface operations {"));
    const generados = [...bloque.matchAll(/^ {4}([a-zA-Z]+): \{$/gm)].map((m) => m[1]);
    expect(generados.sort()).toEqual(operaciones.map((o) => o.operationId).sort());
  });

  test("cada operationId tiene un manejador en el simulador y cada ruta /api del simulador está en el contrato", async () => {
    const { rutas } = await importarDelSimulador<{ rutas: { metodo: string; ruta: string; operationId: string }[] }>("rutas.mjs");
    const delContrato = operaciones.map((o) => `${o.metodo} ${o.ruta} ${o.operationId}`).sort();
    const delSimulador = rutas.filter((r) => r.ruta.startsWith("/api/")).map((r) => `${r.metodo} ${r.ruta} ${r.operationId}`).sort();
    expect(delSimulador).toEqual(delContrato);
  });

  test("los clientes del frontend usan el método y la ruta del contrato", async () => {
    const delFrontend = [
      ...Object.entries(operacionesApi).map(([id, { metodo, ruta }]) => `${metodo} ${ruta} ${id}`),
      ...Object.entries(rutasDeNavegacion).map(([id, ruta]) => `GET ${ruta} ${id}`),
    ].sort();
    expect(delFrontend).toEqual(operaciones.map((o) => `${o.metodo} ${o.ruta} ${o.operationId}`).sort());
  });

  test("la huella de los documentos del simulador sale de docs/legal y coincide con la publicada (DEC-28)", async () => {
    const { documentosIniciales } = await importarDelSimulador<{ documentosIniciales: { tipo: string; huellaContenido: string }[] }>("contenido.mjs");
    const esperadas: Record<string, [string, string]> = {
      avisoPrivacidad: ["aviso-de-privacidad-v1.0.md", "4d2b93c646d6e81ad295a641be2029621499db59e02783372748083e7104204a"],
      terminos: ["terminos-y-condiciones-v1.0.md", "68b072acafcf08adcfe0ec7712ad3f964484195cd771fa786a0758738a279b72"],
    };
    for (const [tipo, [archivo, huella]] of Object.entries(esperadas)) {
      const bytes = readFileSync(join(raizFrontend, "..", "docs", "legal", archivo));
      expect(bytes.includes(13), `${archivo} con fin de línea LF`).toBe(false);
      expect(createHash("sha256").update(bytes).digest("hex"), archivo).toBe(huella);
      expect(documentosIniciales.find((d) => d.tipo === tipo)?.huellaContenido, tipo).toBe(huella);
    }
  });

  test("ningún endpoint recibe el id del alumno (INV-07)", async () => {
    const texto = leerTexto(rutaContrato);
    expect(texto).not.toMatch(/\b(usuarioId|usuario_id|alumnoId|idAlumno|direccionIp|ip):/);
    for (const op of operaciones) {
      for (const parametro of op.parametros) {
        const nombre = String(parametro.name ?? parametro.$ref ?? "");
        expect(nombre, `${op.operationId}`).not.toMatch(/usuario|alumno/i);
      }
    }
  });
});

test.describe("API simulada a través del rewrite de Next", () => {
  test.describe.configure({ mode: "serial" });
  let contenido: Contenido;

  test.beforeAll(async () => {
    contenido = await importarDelSimulador<Contenido>("contenido.mjs");
  });
  test.beforeEach(async () => {
    await reiniciarSimulador();
  });

  test("INV-04: antes de enviar nada trae valores, solución ni retroalimentación; el reprobado tampoco, el aprobado sí", async () => {
    test.setTimeout(90_000);
    const alumna = await (await Alumno.nuevo()).entrar();

    // Abrir una actividad y un caso.
    await alumna.pedir("GET", "/api/lecciones/que-es-un-codigo-de-etica");
    await alumna.pedir("PUT", "/api/lecciones/que-es-un-codigo-de-etica/seccion-vista", { cuerpo: { seccion: 3 } });
    await alumna.pedir("POST", "/api/lecciones/que-es-un-codigo-de-etica/terminar");
    const actividad = await alumna.json("GET", "/api/actividades/1");
    expect(actividad.estado).toBe(200);
    expect(llavesPresentes(actividad.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);

    // Las respuestas de una actividad sí traen la correcta al enviarla (DEC-17).
    const enviada = await alumna.json<Json>("POST", "/api/actividades/1/envios", { cuerpo: { respuestas: responder((actividad.cuerpo as Json).preguntas, contenido, false) } });
    expect(enviada.estado).toBe(200);
    expect(enviada.cuerpo.preguntas[0].opciones.some((o: Json) => o.correcta)).toBe(true);
    const caso = await alumna.json("GET", "/api/actividades/2");
    expect(llavesPresentes(caso.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);

    // Portada, intento nuevo, intento retomado y respuesta guardada.
    await completarLecciones(alumna, "codigos-de-etica", contenido);
    const portada = await alumna.json("GET", "/api/examenes/4");
    expect(portada.estado).toBe(200);
    expect(llavesPresentes(portada.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);
    const intento = await alumna.json<Json>("POST", "/api/examenes/4/intentos");
    expect(intento.estado).toBe(201);
    expect(llavesPresentes(intento.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);
    const relacion = intento.cuerpo.preguntas.find((p: Json) => p.tipo === "relacion");
    // Las claves derechas no se pueden comparar con los ids izquierdos.
    expect(relacion.derecha.map((d: Json) => d.clave)).not.toEqual(expect.arrayContaining(relacion.izquierda.map((i: Json) => String(i.id))));

    const respuestas = responder(intento.cuerpo.preguntas, contenido, false);
    for (const { preguntaId, ...respuesta } of respuestas) {
      const guardada = await alumna.json("PUT", `/api/intentos/${intento.cuerpo.id}/respuestas/${preguntaId}`, { cuerpo: respuesta });
      expect(guardada.estado).toBe(200);
      expect(llavesPresentes(guardada.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);
    }
    const retomado = await alumna.json<Json>("POST", "/api/examenes/4/intentos");
    expect(retomado.estado, "iniciar dos veces retoma el mismo intento (DEC-19)").toBe(200);
    expect(retomado.cuerpo.id).toBe(intento.cuerpo.id);
    expect(retomado.cuerpo.respuestas).toHaveLength(5);
    expect(llavesPresentes(retomado.cuerpo, ANTES_DE_ENVIAR)).toEqual([]);

    // Reprobado: qué falló y qué repasar, sin solución (DEC-11), y espera (DEC-21).
    const reprobado = await alumna.json<Json>("POST", `/api/intentos/${intento.cuerpo.id}/envio`);
    expect(reprobado.estado).toBe(200);
    expect(reprobado.cuerpo.resultado).toBe("reprobado");
    expect(reprobado.cuerpo.leccionesRepaso.length).toBeGreaterThan(0);
    expect(llavesPresentes(reprobado.cuerpo, SOLUCIONES)).toEqual([]);
    const detalle = await alumna.json<Json>("GET", `/api/resultados/${intento.cuerpo.id}`);
    expect(detalle.cuerpo.solucion).toBe("oculta");
    expect(llavesPresentes(detalle.cuerpo, SOLUCIONES)).toEqual([]);

    const enEspera = await alumna.json<Json>("POST", "/api/examenes/4/intentos");
    expect(enEspera.estado).toBe(409);
    expect(enEspera.cuerpo).toMatchObject({ codigo: "EN_ESPERA", minutosRestantes: 20 });
    expect(Object.keys(enEspera.cuerpo).sort()).toEqual(["codigo", "disponibleEn", "mensaje", "minutosRestantes"]);
    await alumna.cerrar();

    // Aprobado: retroalimentación completa con la respuesta correcta.
    await reiniciarSimulador();
    const otra = await (await Alumno.nuevo()).entrar();
    await completarLecciones(otra, "codigos-de-etica", contenido);
    const nuevo = await otra.json<Json>("POST", "/api/examenes/4/intentos");
    for (const { preguntaId, ...respuesta } of responder(nuevo.cuerpo.preguntas, contenido, true)) {
      await otra.json("PUT", `/api/intentos/${nuevo.cuerpo.id}/respuestas/${preguntaId}`, { cuerpo: respuesta });
    }
    const aprobado = await otra.json<Json>("POST", `/api/intentos/${nuevo.cuerpo.id}/envio`);
    expect(aprobado.cuerpo).toMatchObject({ resultado: "aprobado", aciertos: 5, errores: 0, cursoCompletado: { slug: "codigos-de-etica" } });
    expect(llavesPresentes(aprobado.cuerpo, ["derechaCorrecta"]).length).toBeGreaterThan(0);
    expect(aprobado.cuerpo.preguntas.flatMap((p: Json) => p.opciones ?? []).some((o: Json) => o.correcta)).toBe(true);
    const otraVez = await otra.json<Json>("POST", "/api/examenes/4/intentos");
    expect(otraVez.cuerpo.codigo, "un examen aprobado no se repite (DEC-20)").toBe("EXAMEN_APROBADO");
    await otra.cerrar();
  });

  test("DEC-77: el inicio de sesión y el registro no delatan si una cuenta existe", async () => {
    test.setTimeout(60_000);
    const visitante = await Alumno.nuevo();
    const sinCuenta = await visitante.json("POST", "/api/sesion", { cuerpo: { correo: "nadie@example.com", contrasena: "Cualquiera1" } });
    const contrasenaMala = await visitante.json("POST", "/api/sesion", { cuerpo: { correo: OTRA_ALUMNA, contrasena: "Equivocada1" } });
    expect(sinCuenta.estado).toBe(401);
    expect(contrasenaMala).toMatchObject({ estado: sinCuenta.estado, cuerpo: sinCuenta.cuerpo });
    expect(sinCuenta.cuerpo).toEqual({ codigo: "CREDENCIALES_INVALIDAS", mensaje: expect.any(String) });

    // Cuatro fallos más (cinco en total) y el sexto, ya con la contraseña correcta, responde igual: pausa sin delatarla.
    for (let i = 0; i < 4; i++) await visitante.json("POST", "/api/sesion", { cuerpo: { correo: OTRA_ALUMNA, contrasena: "Equivocada1" } });
    const enPausa = await visitante.json("POST", "/api/sesion", { cuerpo: { correo: OTRA_ALUMNA, contrasena: CONTRASENA } });
    expect(enPausa).toMatchObject({ estado: sinCuenta.estado, cuerpo: sinCuenta.cuerpo });

    // «Correo sin verificar» solo con la contraseña correcta.
    const pendiente = await visitante.json("POST", "/api/sesion", { cuerpo: { correo: "pendiente@example.com", contrasena: CONTRASENA } });
    expect(pendiente.cuerpo).toMatchObject({ codigo: "CORREO_SIN_VERIFICAR" });

    // Registrar un correo existente responde igual que uno nuevo.
    const registro = (correo: string) => ({
      nombre: "Dana",
      apellidos: "Ejemplo",
      correo,
      contrasena: "Segura2026",
      versionAviso: "1.0",
      versionTerminos: "1.0",
      aceptaAviso: true,
      aceptaTerminos: true,
      mayorDeEdad: true,
      negativaEncuesta: false,
      negativaEstadisticas: false,
    });
    const existente = await visitante.pedir("POST", "/api/cuenta/registro", { cuerpo: registro(ALUMNA) });
    const nueva = await visitante.pedir("POST", "/api/cuenta/registro", { cuerpo: registro("dana@example.com") });
    expect(existente.status()).toBe(202);
    expect(nueva.status()).toBe(existente.status());
    expect(await existente.text()).toBe(await nueva.text());
    expect((await correos()).map((c) => [c.para, c.tipo])).toEqual([
      [ALUMNA, "yaTienesCuenta"],
      ["dana@example.com", "verificacion"],
    ]);
    await visitante.cerrar();
  });

  test("avance lineal: lección bloqueada, examen en espera con minutos y el mismo intento al iniciar dos veces", async () => {
    const alumna = await (await Alumno.nuevo()).entrar();
    const bloqueada = await alumna.json("GET", "/api/lecciones/el-codigo-de-acm");
    expect(bloqueada).toMatchObject({ estado: 403, cuerpo: { codigo: "BLOQUEADO_POR_AVANCE" } });
    expect((await alumna.json("GET", "/api/actividades/1")).cuerpo).toMatchObject({ codigo: "BLOQUEADO_POR_AVANCE" });
    expect((await alumna.json("GET", "/api/modulos/propiedad-intelectual")).cuerpo).toMatchObject({ codigo: "BLOQUEADO_POR_AVANCE" });

    await escenario("examen-en-espera");
    const portada = await alumna.json<Json>("GET", "/api/examenes/4");
    expect(portada.cuerpo).toMatchObject({ estado: "enEspera", minutosRestantes: 15 });
    const espera = await alumna.json<Json>("POST", "/api/examenes/4/intentos");
    expect(espera).toMatchObject({ estado: 409, cuerpo: { codigo: "EN_ESPERA", minutosRestantes: 15 } });

    await escenario("curso-completo");
    const curso2 = await alumna.json<Json>("GET", "/api/cursos/privacidad-de-datos");
    expect(curso2.estado).toBe(200);
    const modulos = await alumna.json<Json>("GET", "/api/modulos");
    expect(modulos.cuerpo.modulos[0]).toMatchObject({ estado: "enCurso", avance: 50 });
    await alumna.cerrar();
  });

  test("sesión: cookie __Host- con sus atributos, X-Sesion-Expira, 401 NO_AUTENTICADO y 403 ORIGEN_NO_PERMITIDO", async () => {
    const alumna = await Alumno.nuevo();
    const entrada = await alumna.pedir("POST", "/api/sesion", { cuerpo: { correo: ALUMNA, contrasena: CONTRASENA } });
    const [cookie] = encabezadosSetCookie(entrada);
    expect(cookie).toMatch(/^__Host-echo_sesion=[\w-]{20,};/);
    for (const atributo of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) expect(cookie).toContain(atributo);
    expect(cookie).not.toMatch(/Domain=/i);

    const sesion = await alumna.json<Json>("GET", "/api/sesion");
    const expira = sesion.respuesta.headers()["x-sesion-expira"];
    expect(new Date(expira).toISOString()).toBe(expira);
    expect(sesion.cuerpo.expiraEn).toBe(expira);
    expect(new Date(expira).getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(Object.keys(sesion.cuerpo).sort()).toEqual(["aceptacionPendiente", "apellidos", "expiraEn", "metodoAcceso", "nombre"]);

    const ajeno = await alumna.json("POST", "/api/sesion/renovar", { origen: "https://malicioso.example" });
    expect(ajeno).toMatchObject({ estado: 403, cuerpo: { codigo: "ORIGEN_NO_PERMITIDO" } });
    const sinOrigen = await alumna.json("DELETE", "/api/sesion", { origen: null });
    expect(sinOrigen).toMatchObject({ estado: 403, cuerpo: { codigo: "ORIGEN_NO_PERMITIDO" } });

    expect((await alumna.pedir("DELETE", "/api/sesion")).status()).toBe(204);
    const fuera = await alumna.json("GET", "/api/modulos");
    expect(fuera.estado).toBe(401);
    expect(fuera.cuerpo).toEqual({ codigo: "NO_AUTENTICADO", mensaje: expect.any(String) });
    await alumna.cerrar();

    // Chromium acepta la cookie __Host- en http://localhost a través del rewrite.
    const navegador = await chromium.launch();
    const pagina = await navegador.newPage({ baseURL: URL_APP });
    await pagina.goto("/ayuda");
    const estados = await pagina.evaluate(async ([correo, contrasena]) => {
      const entrar = await fetch("/api/sesion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ correo, contrasena }) });
      const sesion = await fetch("/api/sesion");
      return [entrar.status, sesion.status, document.cookie.includes("echo_sesion")];
    }, [ALUMNA, CONTRASENA]);
    expect(estados, "entrar, leer la sesión y que JavaScript no vea la cookie").toEqual([200, 200, false]);
    const [guardada] = (await pagina.context().cookies()).filter((c) => c.name === "__Host-echo_sesion");
    expect(guardada).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
    await navegador.close();
  });

  test("INV-07: el intento de otro alumno no existe para quien pregunta", async () => {
    const otra = await (await Alumno.nuevo()).entrar(OTRA_ALUMNA);
    const suyos = await otra.json<Json>("GET", "/api/resultados");
    const ajeno = suyos.cuerpo.resultados[0].intentoId as string;
    expect((await otra.json("GET", `/api/resultados/${ajeno}`)).estado).toBe(200);
    await otra.cerrar();

    const alumna = await (await Alumno.nuevo()).entrar();
    expect(await alumna.json("GET", `/api/resultados/${ajeno}`)).toMatchObject({ estado: 404, cuerpo: { codigo: "NO_ENCONTRADO" } });
    expect((await alumna.json("PUT", `/api/intentos/${ajeno}/respuestas/1`, { cuerpo: { opcionId: 1 } })).estado).toBe(404);
    expect((await alumna.json("POST", `/api/intentos/${ajeno}/envio`)).estado).toBe(404);
    expect((await alumna.json<Json>("GET", "/api/resultados")).cuerpo.resultados).toEqual([]);
    // Un id de alumno en la consulta no cambia de quién son los datos.
    expect((await alumna.json<Json>("GET", "/api/resultados?usuarioId=cualquiera")).cuerpo.resultados).toEqual([]);
    await alumna.cerrar();
  });

  test("INV-30: no hay cuenta sin las aceptaciones con fecha, hora, IP y versión", async () => {
    test.setTimeout(60_000);
    const visitante = await Alumno.nuevo();
    const base = {
      nombre: "Eva",
      apellidos: "Ejemplo",
      correo: "eva@example.com",
      contrasena: "Segura2026",
      versionAviso: "1.0",
      versionTerminos: "1.0",
      negativaEncuesta: true,
      negativaEstadisticas: false,
    };
    const antes = (await aceptaciones()).length;

    const sinCasillas = await visitante.json<Json>("POST", "/api/cuenta/registro", { cuerpo: base });
    expect(sinCasillas).toMatchObject({
      estado: 422,
      cuerpo: { codigo: "DATOS_INVALIDOS", campos: { aceptaAviso: "CASILLA_OBLIGATORIA", aceptaTerminos: "CASILLA_OBLIGATORIA", mayorDeEdad: "CASILLA_OBLIGATORIA" } },
    });
    const viejo = await visitante.json("POST", "/api/cuenta/registro", {
      cuerpo: { ...base, versionAviso: "0.9", aceptaAviso: true, aceptaTerminos: true, mayorDeEdad: true },
    });
    expect(viejo).toMatchObject({ estado: 409, cuerpo: { codigo: "VERSION_NO_VIGENTE" } });
    expect(await aceptaciones()).toHaveLength(antes);

    // Registro válido, con una IP en el cuerpo que se ignora.
    const valido = await visitante.pedir("POST", "/api/cuenta/registro", {
      cuerpo: { ...base, aceptaAviso: true, aceptaTerminos: true, mayorDeEdad: true, direccionIp: "203.0.113.9", ip: "203.0.113.9" },
    });
    expect(valido.status()).toBe(202);
    const deEva = (await aceptaciones()).filter((a) => a.usuario === "eva@example.com");
    expect(deEva.map((a) => [a.documento, a.version]).sort()).toEqual([["avisoPrivacidad", "1.0"], ["terminos", "1.0"]]);
    for (const aceptacion of deEva) {
      expect(new Date(aceptacion.aceptadoEn).getTime()).toBeGreaterThan(Date.now() - 60_000);
      expect(aceptacion.direccionIp).toBeTruthy();
      expect(aceptacion.direccionIp).not.toBe("203.0.113.9");
    }

    // Un correo repetido no deja ninguna aceptación.
    const total = (await aceptaciones()).length;
    await visitante.pedir("POST", "/api/cuenta/registro", { cuerpo: { ...base, aceptaAviso: true, aceptaTerminos: true, mayorDeEdad: true } });
    expect(await aceptaciones()).toHaveLength(total);
    await visitante.cerrar();
  });

  test("DEC-92: un X-Forwarded-For puesto por el cliente no cambia la IP registrada ni salta el límite", async () => {
    test.setTimeout(60_000);
    const visitante = await Alumno.nuevo();
    const registro = await visitante.pedir("POST", "/api/cuenta/registro", {
      encabezados: { "x-forwarded-for": "203.0.113.9" },
      cuerpo: {
        nombre: "Ivo",
        apellidos: "Ejemplo",
        correo: "ivo@example.com",
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
    expect(registro.status()).toBe(202);
    const deIvo = (await aceptaciones()).filter((a) => a.usuario === "ivo@example.com");
    expect(deIvo).toHaveLength(2);
    for (const aceptacion of deIvo) {
      // La IP real: Next no agrega entrada, así que es la del socket (el mismo equipo).
      expect(aceptacion.direccionIp).not.toContain("203.0.113.9");
      expect(aceptacion.direccionIp).toMatch(/^(::1|127\.0\.0\.1)$/);
    }

    // Cambiar el encabezado en cada petición no reinicia el límite por IP (60 cada 10 minutos, DEC-26).
    let ultima = 0;
    for (let i = 0; i < 61; i++) {
      const respuesta = await visitante.pedir("POST", "/api/cuenta/verificacion/reenvio", {
        encabezados: { "x-forwarded-for": `198.51.100.${i}` },
        cuerpo: { correo: "nadie@example.com" },
      });
      ultima = respuesta.status();
    }
    expect(ultima, "la petición 62 de esta IP (con el registro) se rechaza").toBe(429);
    await visitante.cerrar();
  });

  test("DEC-92: la IP sale de la entrada que agregó el proxy de confianza, contando desde la derecha", async () => {
    const { ipDe } = await importarDelSimulador<{ ipDe: (s: unknown, saltos: number) => string }>("servidor.mjs");
    const solicitud = (xff?: string) => ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: "::ffff:10.0.0.7" } });
    expect(ipDe(solicitud("203.0.113.9, 198.51.100.4"), 1), "un salto: la última").toBe("198.51.100.4");
    expect(ipDe(solicitud("203.0.113.9, 198.51.100.4, 10.0.0.2"), 2), "dos saltos: la penúltima").toBe("198.51.100.4");
    expect(ipDe(solicitud("203.0.113.9"), 2), "menos entradas que saltos: el socket").toBe("10.0.0.7");
    expect(ipDe(solicitud("203.0.113.9"), 0), "cero saltos: el socket").toBe("10.0.0.7");
    expect(ipDe(solicitud(), 1), "sin encabezado: el socket").toBe("10.0.0.7");
  });

  test("INV-30: con una versión nueva todo responde ACEPTACION_PENDIENTE hasta aceptarla", async () => {
    const alumna = await (await Alumno.nuevo()).entrar();
    await escenario("version-nueva");
    expect(await alumna.json("GET", "/api/modulos")).toMatchObject({ estado: 403, cuerpo: { codigo: "ACEPTACION_PENDIENTE" } });
    expect((await alumna.json<Json>("GET", "/api/sesion")).cuerpo.aceptacionPendiente).toEqual({ aviso: true, terminos: false });
    expect((await alumna.json("GET", "/api/perfil")).estado, "el perfil sigue disponible").toBe(200);
    const documentos = await alumna.json<Json>("GET", "/api/documentos");
    expect(documentos.cuerpo.documentos).toContainEqual(expect.objectContaining({ tipo: "avisoPrivacidad", version: "1.1", requiereAceptacion: true }));
    expect(llavesPresentes(documentos.cuerpo, ["huellaContenido", "huella"])).toEqual([]);

    expect(await alumna.json("POST", "/api/cuenta/aceptacion", { cuerpo: { versionAviso: "1.0", aceptaAviso: true } })).toMatchObject({
      estado: 409,
      cuerpo: { codigo: "VERSION_NO_VIGENTE" },
    });
    const aceptada = await alumna.json<Json>("POST", "/api/cuenta/aceptacion", { cuerpo: { versionAviso: "1.1", aceptaAviso: true } });
    expect(aceptada.cuerpo.aceptacionPendiente).toEqual({ aviso: false, terminos: false });
    expect((await alumna.json("GET", "/api/modulos")).estado).toBe(200);
    const perfil = await alumna.json<Json>("GET", "/api/perfil");
    expect(perfil.cuerpo.aceptaciones).toContainEqual(expect.objectContaining({ documento: "avisoPrivacidad", version: "1.1" }));
    expect(llavesPresentes(perfil.cuerpo, ["direccionIp", "ip"])).toEqual([]);
    await alumna.cerrar();
  });

  test("DEC-93: Google no hereda una cuenta sin verificar (pre-secuestro)", async () => {
    // Alguien registra el correo de otra persona con una contraseña suya y no lo verifica.
    const atacante = await Alumno.nuevo();
    const registro = await atacante.pedir("POST", "/api/cuenta/registro", {
      cuerpo: {
        nombre: "Intruso",
        apellidos: "Ejemplo",
        correo: "vera@example.com",
        contrasena: "DelAtacante1",
        versionAviso: "1.0",
        versionTerminos: "1.0",
        aceptaAviso: true,
        aceptaTerminos: true,
        mayorDeEdad: true,
        negativaEncuesta: false,
        negativaEstadisticas: false,
      },
    });
    expect(registro.status()).toBe(202);
    await atacante.cerrar();

    // La dueña real entra con Google con ese correo y acepta.
    await control("POST", "/__simulador/google", { sub: "google-sub-vera", correo: "vera@example.com", nombre: "Vera", apellidos: "Ejemplo" });
    const duena = await Alumno.nuevo();
    const ida = await duena.pedir("GET", "/api/auth/google");
    const vuelta = await duena.pedir("GET", ida.headers().location);
    expect(vuelta.headers().location, "la cuenta pendiente no se vincula").toBe("/aceptar");
    const antesDeAceptar = new Date();
    const aceptada = await duena.json<Json>("POST", "/api/cuenta/aceptacion", {
      cuerpo: { versionAviso: "1.0", versionTerminos: "1.0", aceptaAviso: true, aceptaTerminos: true, mayorDeEdad: true },
    });
    expect(aceptada.cuerpo).toMatchObject({ nombre: "Vera", metodoAcceso: "google" });
    await duena.cerrar();

    // La contraseña del registro pendiente ya no sirve y solo quedan las aceptaciones nuevas.
    const intento = await (await Alumno.nuevo()).json("POST", "/api/sesion", { cuerpo: { correo: "vera@example.com", contrasena: "DelAtacante1" } });
    expect(intento).toMatchObject({ estado: 401, cuerpo: { codigo: "CREDENCIALES_INVALIDAS" } });
    const deVera = (await aceptaciones()).filter((a) => a.usuario === "vera@example.com");
    expect(deVera).toHaveLength(2);
    for (const aceptacion of deVera) expect(new Date(aceptacion.aceptadoEn).getTime()).toBeGreaterThanOrEqual(antesDeAceptar.getTime() - 1000);
  });

  test("Google sin cuenta: el callback no crea la cuenta; /aceptar la crea con sus aceptaciones", async () => {
    const visitante = await Alumno.nuevo();
    const ida = await visitante.pedir("GET", "/api/auth/google");
    expect(ida.status()).toBe(302);
    const vuelta = await visitante.pedir("GET", ida.headers().location);
    expect(vuelta.status()).toBe(302);
    expect(vuelta.headers().location).toBe("/aceptar");
    const [temporal] = encabezadosSetCookie(vuelta);
    expect(temporal).toMatch(/^__Host-echo_registro_google=.+; HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=600$/);
    expect((await aceptaciones()).some((a) => a.usuario === "google.alumna@example.com")).toBe(false);

    const incompleta = await visitante.json("POST", "/api/cuenta/aceptacion", { cuerpo: { versionAviso: "1.0", versionTerminos: "1.0", aceptaAviso: true } });
    expect(incompleta.cuerpo).toMatchObject({ codigo: "DATOS_INVALIDOS", campos: { aceptaTerminos: "CASILLA_OBLIGATORIA", mayorDeEdad: "CASILLA_OBLIGATORIA" } });
    const creada = await visitante.json<Json>("POST", "/api/cuenta/aceptacion", {
      cuerpo: { versionAviso: "1.0", versionTerminos: "1.0", aceptaAviso: true, aceptaTerminos: true, mayorDeEdad: true, negativaEstadisticas: true },
    });
    expect(creada.cuerpo).toMatchObject({ nombre: "Gala", metodoAcceso: "google" });
    expect((await aceptaciones()).filter((a) => a.usuario === "google.alumna@example.com")).toHaveLength(2);
    expect((await visitante.json<Json>("GET", "/api/perfil")).cuerpo.preferencias).toEqual({ negativaEncuesta: false, negativaEstadisticas: true });
    await visitante.cerrar();
  });
});
