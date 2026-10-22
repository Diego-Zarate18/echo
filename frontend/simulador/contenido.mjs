// Contenido de ejemplo del simulador (INV-14, INV-24): inventado, en español y marcado como ejemplo.
// La forma sigue las tablas del grafo: modulo, curso, leccion, seccion, imagen, fundamento, cuestionario,
// pregunta, opcion, pareja e insignia. Nada de esto es contenido real de Echo.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const EJEMPLO = "Contenido de ejemplo.";
const PUBLICADO = "2026-10-01T15:00:00.000Z";

export const imagenes = [
  { id: 1, ruta: "/marca/moris-curioso.png", textoAlternativo: "Moris, la semilla de Echo, con cara de curiosidad.", pie: "Moris pregunta antes de decidir." },
  { id: 2, ruta: "/marca/moris-sorprendido.png", textoAlternativo: "Moris sorprendido, con los ojos muy abiertos.", pie: null },
  { id: 3, ruta: "/marca/moris-feliz.png", textoAlternativo: "Moris sonriendo.", pie: null },
  { id: 4, ruta: "/marca/moris-principal.png", textoAlternativo: "Sello del módulo «Ética profesional en TI»: Moris de frente.", pie: null },
  { id: 5, ruta: "/marca/moris-triste.png", textoAlternativo: "Sello del módulo «Propiedad intelectual»: Moris pensativo.", pie: null },
];

export const fundamentos = [
  { id: 1, tipo: "codigo", nombre: "Código de Ética y Conducta Profesional de ACM", articulo: "Principio 1.6", descripcion: "Respetar la privacidad de las personas.", referencia: "https://www.acm.org/code-of-ethics" },
  { id: 2, tipo: "codigo", nombre: "Código de Ética y Conducta Profesional de ACM", articulo: "Principio 2.5", descripcion: "Evaluar los sistemas y sus riesgos de forma completa.", referencia: "https://www.acm.org/code-of-ethics" },
  { id: 3, tipo: "ley", nombre: "LFPDPPP", articulo: "Consentimiento", descripcion: "Los datos personales se tratan con el consentimiento de su titular. (Ejemplo de cita.)", referencia: null },
  { id: 4, tipo: "ley", nombre: "Ley Federal del Derecho de Autor", articulo: "Programas de cómputo", descripcion: "Los programas de cómputo están protegidos como obras. (Ejemplo de cita.)", referencia: null },
];

export const modulos = [
  { id: 1, slug: "etica-profesional", titulo: "Ética profesional en TI", descripcion: `${EJEMPLO} Qué es un código de ética y cómo cuida a las personas que usan lo que construyes.`, orden: 1 },
  { id: 2, slug: "propiedad-intelectual", titulo: "Propiedad intelectual", descripcion: `${EJEMPLO} Derechos de autor del software y licencias.`, orden: 2 },
];

export const insignias = [
  { id: 1, moduloId: 1, nombre: "Ética profesional", descripcion: "Completaste el módulo «Ética profesional en TI».", imagenId: 4 },
  { id: 2, moduloId: 2, nombre: "Propiedad intelectual", descripcion: "Completaste el módulo «Propiedad intelectual».", imagenId: 5 },
];

export const cursos = [
  { id: 1, moduloId: 1, slug: "codigos-de-etica", titulo: "Códigos de ética", descripcion: `${EJEMPLO} Para qué sirve un código de ética y qué pide el de ACM.`, orden: 1 },
  { id: 2, moduloId: 1, slug: "privacidad-de-datos", titulo: "Privacidad de datos", descripcion: `${EJEMPLO} Datos personales y derechos ARCO.`, orden: 2 },
  { id: 3, moduloId: 2, slug: "derechos-de-autor", titulo: "Derechos de autor del software", descripcion: `${EJEMPLO} A quién pertenece el código y cómo se comparte.`, orden: 1 },
];

export const lecciones = [
  { id: 1, cursoId: 1, slug: "que-es-un-codigo-de-etica", titulo: "¿Qué es un código de ética?", resumen: `${EJEMPLO} Normas que orientan decisiones profesionales.`, orden: 1, publicadoEn: PUBLICADO },
  { id: 2, cursoId: 1, slug: "el-codigo-de-acm", titulo: "El código de ACM", resumen: `${EJEMPLO} Principios generales y responsabilidades.`, orden: 2, publicadoEn: PUBLICADO },
  { id: 3, cursoId: 2, slug: "datos-personales", titulo: "Datos personales", resumen: `${EJEMPLO} Qué es un dato personal y quién responde por él.`, orden: 1, publicadoEn: PUBLICADO },
  { id: 4, cursoId: 2, slug: "derechos-arco", titulo: "Derechos ARCO", resumen: `${EJEMPLO} Acceso, rectificación, cancelación y oposición.`, orden: 2, publicadoEn: PUBLICADO },
  { id: 5, cursoId: 3, slug: "el-software-es-una-obra", titulo: "El software es una obra", resumen: `${EJEMPLO} El código también tiene autor.`, orden: 1, publicadoEn: PUBLICADO },
  { id: 6, cursoId: 3, slug: "licencias-de-software", titulo: "Licencias de software", resumen: `${EJEMPLO} Cómo se comparte el código sin perder derechos.`, orden: 2, publicadoEn: PUBLICADO },
];

// Markdown sin HTML (DEC-57): subtítulos, listas y énfasis.
export const secciones = [
  { id: 1, leccionId: 1, orden: 1, titulo: "Para qué sirve", imagenId: 1, cuerpo: `*${EJEMPLO}*\n\nUn **código de ética** reúne las normas que orientan cómo actúa una profesión. No sustituye a la ley: la complementa.\n\n### Lo que vas a ver\n\n- Qué es un código de ética.\n- Por qué importa en TI.\n- Cómo se usa para decidir.` },
  { id: 2, leccionId: 1, orden: 2, titulo: "Por qué importa en TI", imagenId: null, cuerpo: `El software decide cada vez más cosas sobre las personas. Un error de diseño puede **exponer datos** o **excluir** a quien no fue considerado.\n\n### Ejemplos\n\n1. Una app que guarda contraseñas sin cifrar.\n2. Un formulario que no se puede usar con teclado.` },
  { id: 3, leccionId: 1, orden: 3, titulo: "Cómo se usa para decidir", imagenId: null, cuerpo: `Ante un dilema, el código te ayuda a hacerte tres preguntas:\n\n- ¿A quién afecta mi decisión?\n- ¿Qué riesgo corre esa persona?\n- ¿Qué principio lo respalda?` },
  { id: 4, leccionId: 2, orden: 1, titulo: "Principios generales", imagenId: 2, cuerpo: `*${EJEMPLO}*\n\nEl código de ACM empieza con principios generales, como **evitar el daño** y **respetar la privacidad**.\n\n### Algunos principios\n\n- Contribuir al bienestar de las personas.\n- Ser honesto y digno de confianza.\n- Respetar la privacidad.` },
  { id: 5, leccionId: 2, orden: 2, titulo: "Responsabilidades profesionales", imagenId: null, cuerpo: `Además de los principios, el código pide **evaluar los riesgos** de un sistema y **reconocer el trabajo** de otras personas.` },
  { id: 6, leccionId: 3, orden: 1, titulo: "Qué es un dato personal", imagenId: 1, cuerpo: `*${EJEMPLO}*\n\nUn **dato personal** es cualquier información sobre una persona identificada o identificable: su nombre, su correo o su historial.\n\n### Ejemplos\n\n- Nombre y apellidos.\n- Correo electrónico.\n- Calificaciones.` },
  { id: 7, leccionId: 3, orden: 2, titulo: "Quién responde por ellos", imagenId: null, cuerpo: `Quien decide para qué se usan los datos es el **responsable**. Debe informar en un **aviso de privacidad** qué datos recaba y para qué.` },
  { id: 8, leccionId: 4, orden: 1, titulo: "Acceso y rectificación", imagenId: null, cuerpo: `*${EJEMPLO}*\n\nPuedes **acceder** a tus datos y **rectificarlos** si están mal.` },
  { id: 9, leccionId: 4, orden: 2, titulo: "Cancelación y oposición", imagenId: 3, cuerpo: `Puedes pedir que **cancelen** tus datos o **oponerte** a un uso.\n\n### Recuerda\n\n- La solicitud se hace por escrito.\n- El responsable debe responder en un plazo.` },
  { id: 10, leccionId: 4, orden: 3, titulo: "Cómo se ejerce", imagenId: null, cuerpo: `Se escribe al contacto que indica el aviso de privacidad, con lo que pides y cómo te identificas.` },
  { id: 11, leccionId: 5, orden: 1, titulo: "El código tiene autor", imagenId: 2, cuerpo: `*${EJEMPLO}*\n\nUn programa de cómputo es una **obra**: tiene autor y está protegido desde que se crea.` },
  { id: 12, leccionId: 5, orden: 2, titulo: "Copiar no es lo mismo que aprender", imagenId: null, cuerpo: `Leer código ajeno para aprender está bien. **Copiarlo** sin permiso en tu proyecto, no.\n\n- Revisa la licencia.\n- Da crédito.` },
  { id: 13, leccionId: 6, orden: 1, titulo: "Qué es una licencia", imagenId: 3, cuerpo: `*${EJEMPLO}*\n\nUna **licencia** dice qué puedes hacer con un código: usarlo, modificarlo o compartirlo.` },
  { id: 14, leccionId: 6, orden: 2, titulo: "Licencias libres", imagenId: null, cuerpo: `Algunas licencias piden que **compartas** tus cambios con la misma licencia; otras solo piden **dar crédito**.` },
];

// Cuestionarios: actividad y casos de una lección (con orden) o examen de un curso (DEC-02).
export const cuestionarios = [
  { id: 1, tipo: "actividad", leccionId: 1, cursoId: null, orden: 1, titulo: "Actividad: qué es un código de ética", instrucciones: `${EJEMPLO} Responde las preguntas. Puedes repetir la actividad cuando quieras.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 2, tipo: "caso", leccionId: 1, cursoId: null, orden: 2, titulo: "Caso: el reporte con datos de más", instrucciones: `${EJEMPLO} Lee el caso y elige qué harías.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 3, tipo: "actividad", leccionId: 2, cursoId: null, orden: 1, titulo: "Actividad: el código de ACM", instrucciones: `${EJEMPLO} Responde las preguntas.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 4, tipo: "examen", leccionId: null, cursoId: 1, orden: null, titulo: "Examen: Códigos de ética", instrucciones: `${EJEMPLO} Sin cronómetro. Cada respuesta se guarda al elegirla.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 5, tipo: "actividad", leccionId: 3, cursoId: null, orden: 1, titulo: "Actividad: datos personales", instrucciones: `${EJEMPLO} Responde las preguntas.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 6, tipo: "actividad", leccionId: 4, cursoId: null, orden: 1, titulo: "Actividad: derechos ARCO", instrucciones: `${EJEMPLO} Responde las preguntas.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 7, tipo: "examen", leccionId: null, cursoId: 2, orden: null, titulo: "Examen: Privacidad de datos", instrucciones: `${EJEMPLO} Sin cronómetro.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 8, tipo: "actividad", leccionId: 5, cursoId: null, orden: 1, titulo: "Actividad: el software es una obra", instrucciones: `${EJEMPLO} Responde las preguntas.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 9, tipo: "actividad", leccionId: 6, cursoId: null, orden: 1, titulo: "Actividad: licencias", instrucciones: `${EJEMPLO} Responde las preguntas.`, calificacionMinima: 70, minutosEspera: 20 },
  { id: 10, tipo: "examen", leccionId: null, cursoId: 3, orden: null, titulo: "Examen: Derechos de autor del software", instrucciones: `${EJEMPLO} Sin cronómetro.`, calificacionMinima: 70, minutosEspera: 20 },
];

/**
 * Preguntas con sus opciones o parejas. Las opciones llevan `valor` (1 la correcta y 0 las demás; los casos admiten
 * valores intermedios, DEC-08) y su retroalimentación: nada de eso sale antes de enviar (INV-04).
 */
export const preguntas = [
  // Actividad 1
  { id: 1, cuestionarioId: 1, tipo: "opcionMultiple", orden: 1, enunciado: "¿Qué hace un código de ética profesional?", fundamentoId: null, leccionRepasoId: 1, retroalimentacion: "Un código orienta decisiones; no sustituye a la ley.",
    opciones: [
      { id: 1, texto: "Orienta cómo actuar ante decisiones profesionales.", valor: 1, retroalimentacion: "Correcto: es una guía para decidir." },
      { id: 2, texto: "Sustituye a las leyes del país.", valor: 0, retroalimentacion: "No: las complementa." },
      { id: 3, texto: "Solo aplica a empresas grandes.", valor: 0, retroalimentacion: "No: aplica a cada profesional." },
    ] },
  { id: 2, cuestionarioId: 1, tipo: "verdaderoFalso", orden: 2, enunciado: "Un error de diseño puede exponer datos de las personas.", fundamentoId: 1, leccionRepasoId: 1, retroalimentacion: "Las decisiones técnicas tienen consecuencias en las personas.",
    opciones: [
      { id: 4, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." },
      { id: 5, texto: "Falso", valor: 0, retroalimentacion: "Sí puede: por eso importa la ética en TI." },
    ] },
  // Caso 2
  { id: 3, cuestionarioId: 2, tipo: "decision", orden: 1, enunciado: "Te piden un reporte de calificaciones para una junta y la consulta trae también los correos de todo el grupo. ¿Qué haces?", fundamentoId: 1, leccionRepasoId: null, retroalimentacion: null,
    opciones: [
      { id: 6, texto: "Quito los correos: la junta solo necesita las calificaciones.", valor: 1, retroalimentacion: "Usas solo los datos necesarios.", consecuencia: "El reporte cumple su propósito sin exponer a nadie.", fundamentoId: 1 },
      { id: 7, texto: "Pregunto si los correos hacen falta antes de enviarlo.", valor: 0.5, retroalimentacion: "Preguntar ayuda, pero el dato ya viaja en el borrador.", consecuencia: "Se retrasa un poco, pero se evita compartir de más.", fundamentoId: 3 },
      { id: 8, texto: "Lo envío como está; es más rápido.", valor: 0, retroalimentacion: "Compartes datos que nadie pidió.", consecuencia: "Los correos del grupo terminan en manos de personas que no los necesitaban.", fundamentoId: 3 },
    ] },
  // Actividad 3
  { id: 4, cuestionarioId: 3, tipo: "opcionMultiple", orden: 1, enunciado: "¿Cuál es un principio general del código de ACM?", fundamentoId: 1, leccionRepasoId: 2, retroalimentacion: "Respetar la privacidad es el principio 1.6.",
    opciones: [
      { id: 9, texto: "Respetar la privacidad.", valor: 1, retroalimentacion: "Correcto." },
      { id: 10, texto: "Entregar siempre a tiempo.", valor: 0, retroalimentacion: "Es deseable, pero no es un principio del código." },
    ] },
  { id: 5, cuestionarioId: 3, tipo: "relacion", orden: 2, enunciado: "Relaciona cada principio con lo que pide.", fundamentoId: 2, leccionRepasoId: 2, retroalimentacion: "Cada principio orienta una parte del trabajo.",
    parejas: [
      { id: 1, izquierdo: "Evitar el daño", derecho: "Prever consecuencias negativas", orden: 1 },
      { id: 2, izquierdo: "Respetar la privacidad", derecho: "Usar solo los datos necesarios", orden: 2 },
      { id: 3, izquierdo: "Ser honesto", derecho: "Informar los límites de un sistema", orden: 3 },
    ] },
  // Examen 4 (curso 1): cinco preguntas, con relación de columnas
  { id: 6, cuestionarioId: 4, tipo: "opcionMultiple", orden: 1, enunciado: "¿Qué complementa un código de ética?", fundamentoId: null, leccionRepasoId: 1, retroalimentacion: "El código complementa a la ley.",
    opciones: [
      { id: 11, texto: "La ley", valor: 1, retroalimentacion: "Correcto." },
      { id: 12, texto: "El contrato de trabajo", valor: 0, retroalimentacion: "No es lo que complementa." },
      { id: 13, texto: "El manual de usuario", valor: 0, retroalimentacion: "No." },
    ] },
  { id: 7, cuestionarioId: 4, tipo: "verdaderoFalso", orden: 2, enunciado: "El código de ACM pide evaluar los riesgos de un sistema.", fundamentoId: 2, leccionRepasoId: 2, retroalimentacion: "Es el principio 2.5.",
    opciones: [
      { id: 14, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." },
      { id: 15, texto: "Falso", valor: 0, retroalimentacion: "Sí lo pide." },
    ] },
  { id: 8, cuestionarioId: 4, tipo: "relacion", orden: 3, enunciado: "Relaciona cada situación con el principio que la orienta.", fundamentoId: 1, leccionRepasoId: 2, retroalimentacion: "Cada situación se resuelve con un principio distinto.",
    parejas: [
      { id: 4, izquierdo: "Guardar contraseñas sin cifrar", derecho: "Evitar el daño", orden: 1 },
      { id: 5, izquierdo: "Pedir solo los datos necesarios", derecho: "Respetar la privacidad", orden: 2 },
      { id: 6, izquierdo: "Avisar que un sistema puede fallar", derecho: "Ser honesto", orden: 3 },
    ] },
  { id: 9, cuestionarioId: 4, tipo: "opcionMultiple", orden: 4, enunciado: "Ante un dilema, ¿qué conviene preguntarse primero?", fundamentoId: null, leccionRepasoId: 1, retroalimentacion: "Primero, a quién afecta la decisión.",
    opciones: [
      { id: 16, texto: "¿A quién afecta mi decisión?", valor: 1, retroalimentacion: "Correcto." },
      { id: 17, texto: "¿Cuánto tardaré?", valor: 0, retroalimentacion: "Importa, pero no es lo primero." },
      { id: 18, texto: "¿Qué herramienta usaré?", valor: 0, retroalimentacion: "No es una pregunta ética." },
    ] },
  { id: 10, cuestionarioId: 4, tipo: "verdaderoFalso", orden: 5, enunciado: "Un formulario que no se puede usar con teclado excluye a algunas personas.", fundamentoId: null, leccionRepasoId: 1, retroalimentacion: "La accesibilidad también es una decisión ética.",
    opciones: [
      { id: 19, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." },
      { id: 20, texto: "Falso", valor: 0, retroalimentacion: "Sí las excluye." },
    ] },
  // Actividades y examen del curso 2
  { id: 11, cuestionarioId: 5, tipo: "verdaderoFalso", orden: 1, enunciado: "El correo electrónico es un dato personal.", fundamentoId: 3, leccionRepasoId: 3, retroalimentacion: "Identifica a una persona.",
    opciones: [ { id: 21, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." }, { id: 22, texto: "Falso", valor: 0, retroalimentacion: "Sí lo es." } ] },
  { id: 12, cuestionarioId: 6, tipo: "opcionMultiple", orden: 1, enunciado: "¿Qué derecho usas para corregir un dato equivocado?", fundamentoId: 3, leccionRepasoId: 4, retroalimentacion: "Rectificar es corregir.",
    opciones: [ { id: 23, texto: "Rectificación", valor: 1, retroalimentacion: "Correcto." }, { id: 24, texto: "Oposición", valor: 0, retroalimentacion: "La oposición es para negarte a un uso." } ] },
  { id: 13, cuestionarioId: 7, tipo: "verdaderoFalso", orden: 1, enunciado: "El aviso de privacidad dice para qué se usan los datos.", fundamentoId: 3, leccionRepasoId: 3, retroalimentacion: "Informa las finalidades.",
    opciones: [ { id: 25, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." }, { id: 26, texto: "Falso", valor: 0, retroalimentacion: "Sí lo dice." } ] },
  { id: 14, cuestionarioId: 7, tipo: "opcionMultiple", orden: 2, enunciado: "¿Qué derecho usas para pedir que borren tus datos?", fundamentoId: 3, leccionRepasoId: 4, retroalimentacion: "Cancelar es pedir que se borren.",
    opciones: [ { id: 27, texto: "Cancelación", valor: 1, retroalimentacion: "Correcto." }, { id: 28, texto: "Acceso", valor: 0, retroalimentacion: "El acceso es para conocerlos." } ] },
  { id: 15, cuestionarioId: 7, tipo: "verdaderoFalso", orden: 3, enunciado: "Las calificaciones son datos personales.", fundamentoId: 3, leccionRepasoId: 3, retroalimentacion: "Se refieren a una persona.",
    opciones: [ { id: 29, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." }, { id: 30, texto: "Falso", valor: 0, retroalimentacion: "Sí lo son." } ] },
  // Módulo 2
  { id: 16, cuestionarioId: 8, tipo: "verdaderoFalso", orden: 1, enunciado: "Un programa de cómputo está protegido desde que se crea.", fundamentoId: 4, leccionRepasoId: 5, retroalimentacion: "No hace falta registrarlo para que tenga autor.",
    opciones: [ { id: 31, texto: "Verdadero", valor: 1, retroalimentacion: "Correcto." }, { id: 32, texto: "Falso", valor: 0, retroalimentacion: "Sí lo está." } ] },
  { id: 17, cuestionarioId: 9, tipo: "opcionMultiple", orden: 1, enunciado: "¿Qué indica una licencia de software?", fundamentoId: 4, leccionRepasoId: 6, retroalimentacion: "Indica qué puedes hacer con el código.",
    opciones: [ { id: 33, texto: "Qué puedes hacer con el código", valor: 1, retroalimentacion: "Correcto." }, { id: 34, texto: "Quién lo programó primero", valor: 0, retroalimentacion: "No." } ] },
  { id: 18, cuestionarioId: 10, tipo: "verdaderoFalso", orden: 1, enunciado: "Copiar código ajeno sin permiso en tu proyecto está bien si lo cambias un poco.", fundamentoId: 4, leccionRepasoId: 5, retroalimentacion: "Cambiarlo no te da permiso.",
    opciones: [ { id: 35, texto: "Verdadero", valor: 0, retroalimentacion: "No: necesitas permiso o una licencia." }, { id: 36, texto: "Falso", valor: 1, retroalimentacion: "Correcto." } ] },
  { id: 19, cuestionarioId: 10, tipo: "opcionMultiple", orden: 2, enunciado: "¿Qué piden casi todas las licencias libres?", fundamentoId: 4, leccionRepasoId: 6, retroalimentacion: "Dar crédito.",
    opciones: [ { id: 37, texto: "Dar crédito a quien escribió el código", valor: 1, retroalimentacion: "Correcto." }, { id: 38, texto: "Pagar una cuota", valor: 0, retroalimentacion: "No." } ] },
];

/** Respuestas correctas de cada cuestionario, para armar escenarios (aprobar o reprobar). */
export function respuestasCorrectas(cuestionarioId) {
  return preguntas
    .filter((p) => p.cuestionarioId === cuestionarioId)
    .map((p) =>
      p.tipo === "relacion"
        ? { preguntaId: p.id, uniones: p.parejas.map((par) => ({ izquierdaId: par.id, derechaId: par.id })) }
        : { preguntaId: p.id, opcionId: [...p.opciones].sort((a, b) => b.valor - a.valor)[0].id },
    );
}

/** Textos legales vigentes (docs/legal, con fin de línea LF por .gitattributes). */
const carpetaLegal = new URL("../../docs/legal/", import.meta.url);
export const archivosLegales = {
  avisoPrivacidad: new URL("aviso-de-privacidad-v1.0.md", carpetaLegal),
  terminos: new URL("terminos-y-condiciones-v1.0.md", carpetaLegal),
};

/** Huella SHA-256 del texto publicado (DEC-28): se calcula al arrancar desde el archivo, nunca se escribe a mano. */
export const huellaDe = (archivo) => createHash("sha256").update(readFileSync(archivo)).digest("hex");

/** Documentos legales (documento_legal) v1.0, publicados el 21/10/2026. */
export const documentosIniciales = [
  { id: 1, tipo: "avisoPrivacidad", version: "1.0", publicadoEn: "2026-10-21T06:00:00.000Z", requiereAceptacion: true, huellaContenido: huellaDe(archivosLegales.avisoPrivacidad), resumenCambios: "Primera versión del aviso de privacidad integral." },
  { id: 2, tipo: "terminos", version: "1.0", publicadoEn: "2026-10-21T06:00:00.000Z", requiereAceptacion: true, huellaContenido: huellaDe(archivosLegales.terminos), resumenCambios: "Primera versión de los términos y condiciones." },
];

/** Escenario `version-nueva`: un aviso 1.1 que requiere aceptación. */
export const avisoVersionNueva = {
  id: 3,
  tipo: "avisoPrivacidad",
  version: "1.1",
  requiereAceptacion: true,
  // Versión de ejemplo sin archivo propio: huella de ejemplo.
  huellaContenido: "2a9b8c7d6e5f40312a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091",
  resumenCambios: "Ejemplo: se agrega una finalidad nueva. Hay que aceptarla para seguir usando Echo.",
};
