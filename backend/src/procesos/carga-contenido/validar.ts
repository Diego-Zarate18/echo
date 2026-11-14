import type { Contenido, Cuestionario, Pregunta, Problema } from './modelo';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIPOS_POR_CUESTIONARIO = {
  actividad: ['opcion_multiple', 'verdadero_falso', 'relacion'],
  caso: ['decision'],
  examen: ['opcion_multiple', 'verdadero_falso'], // DEC-117
} as const;

/**
 * Reglas que el esquema de la base no puede revisar solo (DEC-33). Se revisa todo antes de escribir nada, y se
 * devuelven todos los problemas juntos.
 */
export function validar(contenido: Contenido): Problema[] {
  const problemas: Problema[] = [];
  const mal = (archivo: string, mensaje: string) =>
    problemas.push({ archivo, mensaje });

  // Fundamentos: claves únicas.
  const claves = new Set<string>();
  for (const f of contenido.fundamentos) {
    if (claves.has(f.clave))
      mal('fundamentos.yaml', `la clave ${f.clave} se repite`);
    claves.add(f.clave);
  }

  // Documentos legales: una versión por tipo.
  const versiones = new Set<string>();
  for (const d of contenido.documentos) {
    const llave = `${d.tipo} ${d.version}`;
    if (versiones.has(llave))
      mal(d.origen, `la versión ${d.version} de ${d.tipo} se repite`);
    versiones.add(llave);
  }

  // Slugs únicos en todo el contenido (la base los exige únicos por tabla).
  const lecciones = new Set<string>();
  const vistos = { modulo: new Set<string>(), curso: new Set<string>() };
  const ordenes = (
    lista: { orden: number; archivo: string }[],
    que: string,
  ) => {
    const usados = new Set<number>();
    for (const x of lista) {
      if (usados.has(x.orden))
        mal(x.archivo, `dos ${que} tienen el número ${x.orden}`);
      usados.add(x.orden);
    }
  };
  ordenes(contenido.modulos, 'módulos');
  for (const m of contenido.modulos) {
    if (vistos.modulo.has(m.slug))
      mal(m.archivo, `el slug ${m.slug} se repite`);
    vistos.modulo.add(m.slug);
    ordenes(m.cursos, 'cursos');
    for (const c of m.cursos) {
      if (vistos.curso.has(c.slug))
        mal(c.archivo, `el slug ${c.slug} se repite`);
      vistos.curso.add(c.slug);
      ordenes(c.lecciones, 'lecciones');
      for (const l of c.lecciones) {
        if (lecciones.has(l.slug))
          mal(l.archivo, `el slug ${l.slug} se repite`);
        lecciones.add(l.slug);
      }
    }
  }

  for (const m of contenido.modulos) {
    if (m.titulo.length > 150)
      mal(m.archivo, 'el título pasa de 150 caracteres');
    // Todo módulo publicado tiene insignia (DEC-33).
    if (m.publicado && !m.insignia)
      mal(m.archivo, 'un módulo publicado necesita su insignia');
    if (m.insignia && m.insignia.nombre.length > 100)
      mal(m.archivo, 'el nombre de la insignia pasa de 100 caracteres');
    for (const c of m.cursos) {
      if (c.titulo.length > 150)
        mal(c.archivo, 'el título pasa de 150 caracteres');
      if (c.publicado && !m.publicado)
        mal(c.archivo, 'un curso publicado debe estar en un módulo publicado');
      // Todo curso publicado tiene exactamente un examen (DEC-100).
      if (c.publicado && !c.examen)
        mal(c.archivo, 'un curso publicado necesita su examen (DEC-100)');
      if (c.examen) revisarCuestionario(c.examen, lecciones, claves, mal);
      for (const l of c.lecciones) {
        if (l.titulo.length > 150)
          mal(l.archivo, 'el título pasa de 150 caracteres');
        if (l.publicado && !c.publicado)
          mal(
            l.archivo,
            'una lección publicada debe estar en un curso publicado',
          );
        for (const s of l.secciones) {
          if (s.titulo.length > 150)
            mal(
              l.archivo,
              `el título de la sección «${s.titulo.slice(0, 40)}…» pasa de 150 caracteres`,
            );
          if (!s.cuerpo) mal(l.archivo, `la sección «${s.titulo}» está vacía`);
          if (s.imagen && !s.imagen.ruta.startsWith('/'))
            mal(
              l.archivo,
              `la imagen de «${s.titulo}» debe empezar con / (ruta pública)`,
            );
        }
        if (l.actividad)
          revisarCuestionario(l.actividad, lecciones, claves, mal);
        for (const caso of l.casos)
          revisarCuestionario(caso, lecciones, claves, mal);
      }
    }
  }
  for (const m of contenido.modulos)
    if (!SLUG.test(m.slug)) mal(m.archivo, 'slug inválido');
  return problemas;
}

function revisarCuestionario(
  q: Cuestionario,
  lecciones: Set<string>,
  fundamentos: Set<string>,
  mal: (archivo: string, mensaje: string) => void,
): void {
  if (q.titulo.length > 150) mal(q.origen, 'el título pasa de 150 caracteres');
  if (q.preguntas.length === 0) mal(q.origen, 'no tiene preguntas');
  if (!(q.calificacionMinima >= 0 && q.calificacionMinima <= 100))
    mal(q.origen, 'calificacion_minima va de 0 a 100');
  if (!(Number.isInteger(q.minutosEspera) && q.minutosEspera >= 0))
    mal(q.origen, 'minutos_espera es un entero desde 0');
  for (const p of q.preguntas)
    revisarPregunta(q, p, lecciones, fundamentos, mal);
}

function revisarPregunta(
  q: Cuestionario,
  p: Pregunta,
  lecciones: Set<string>,
  fundamentos: Set<string>,
  mal: (archivo: string, mensaje: string) => void,
): void {
  const permitidos: readonly string[] = TIPOS_POR_CUESTIONARIO[q.tipo];
  if (!permitidos.includes(p.tipo)) {
    const motivo =
      p.tipo === 'decision'
        ? 'las preguntas de decisión solo van en casos (DEC-33)'
        : q.tipo === 'caso'
          ? 'un caso solo lleva preguntas de decisión'
          : 'un examen solo lleva opción múltiple y verdadero/falso (DEC-117)';
    mal(p.origen, motivo);
  }
  if (p.leccionRepaso && !lecciones.has(p.leccionRepaso))
    mal(p.origen, `leccion_repaso: no existe la lección ${p.leccionRepaso}`);
  const citados = [p.fundamento, ...p.opciones.map((o) => o.fundamento)].filter(
    (x): x is string => x !== null,
  );
  for (const clave of citados)
    if (!fundamentos.has(clave))
      mal(
        p.origen,
        `fundamento: no existe la clave ${clave} en fundamentos.yaml`,
      );

  if (p.tipo === 'relacion') {
    if (p.parejas.length < 2)
      mal(p.origen, 'una relación necesita al menos 2 parejas');
    const izquierdas = new Set(p.parejas.map((x) => x.izquierda));
    const derechas = new Set(p.parejas.map((x) => x.derecha));
    if (
      izquierdas.size !== p.parejas.length ||
      derechas.size !== p.parejas.length
    ) {
      mal(
        p.origen,
        'en una relación no se repiten textos en una misma columna',
      );
    }
    return;
  }
  if (p.tipo === 'verdadero_falso' && p.opciones.length !== 2)
    mal(p.origen, 'verdadero/falso lleva exactamente 2 opciones');
  if (p.opciones.length < 2) mal(p.origen, 'necesita al menos 2 opciones');
  if (new Set(p.opciones.map((o) => o.texto)).size !== p.opciones.length)
    mal(p.origen, 'hay opciones con el mismo texto');
  for (const o of p.opciones) {
    if (
      !(o.valor >= 0 && o.valor <= 1) ||
      Math.abs(Math.round(o.valor * 100) - o.valor * 100) > 1e-9
    ) {
      mal(
        p.origen,
        `el valor de «${o.texto.slice(0, 40)}» va de 0 a 1 con hasta dos decimales`,
      );
    }
  }
  // Actividades y exámenes: exactamente una opción vale 1 y las demás 0 (DEC-08).
  if (q.tipo !== 'caso') {
    const unos = p.opciones.filter((o) => o.valor === 1).length;
    const otros = p.opciones.filter(
      (o) => o.valor !== 1 && o.valor !== 0,
    ).length;
    if (unos !== 1 || otros > 0)
      mal(
        p.origen,
        'en actividades y exámenes exactamente una opción vale 1 y las demás 0 (DEC-08)',
      );
  }
}
