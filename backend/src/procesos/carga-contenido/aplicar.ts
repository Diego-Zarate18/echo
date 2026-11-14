import type pg from 'pg';
import type {
  Contenido,
  Cuestionario,
  Curso,
  Fundamento,
  Imagen,
  Leccion,
  Modulo,
  Pregunta,
} from './modelo';

/** Desplazamiento temporal para reordenar sin chocar con los índices únicos de orden (orden > 0). */
const TEMPORAL = 100_000;

/** Lo que cambió, para el reporte. */
export interface Cambio {
  que: string;
  detalle: string;
}

type Fila = Record<string, unknown>;

/**
 * Lleva la base al estado de los archivos, dentro de la transacción que abre quien llama (OP-35). Reglas (plan
 * aprobado, DEC-120):
 * - módulos, cursos y lecciones se reconocen por su slug y se actualizan; nunca se borran (se despublican con
 *   publicado: false); lo que está en la base y no en los archivos solo se reporta.
 * - una pregunta se reconoce por su posición en el cuestionario. Si cambió o ya no está: sin respuestas se borra y
 *   se vuelve a crear; con respuestas se retira (activa = false) y se crea una nueva (INV-02, DEC-15).
 * - una versión publicada de un documento legal nunca se edita.
 * REQUIERE REVISIÓN HUMANA: escribe el contenido que ven y responden los alumnos.
 */
export class Aplicador {
  readonly cambios: Cambio[] = [];
  readonly avisos: string[] = [];
  private fundamentos = new Map<string, number>();
  private imagenes = new Map<string, number>();
  private lecciones = new Map<string, number>();

  constructor(private readonly bd: pg.ClientBase) {}

  async aplicar(contenido: Contenido): Promise<void> {
    await this.documentos(contenido);
    await this.cargarFundamentos(contenido.fundamentos);
    await this.cargarImagenes(contenido);
    await this.estructura(contenido.modulos);
    // Con todas las lecciones ya en la base, las preguntas pueden citar cualquier lección de repaso.
    for (const m of contenido.modulos) {
      for (const c of m.cursos) {
        for (const l of c.lecciones) await this.evaluablesDeLeccion(l);
        await this.examen(c);
      }
    }
    await this.reportarSobrantes(contenido.modulos);
  }

  // ── Documentos legales: solo se agregan versiones nuevas ──
  private async documentos(contenido: Contenido): Promise<void> {
    for (const d of contenido.documentos) {
      const { rows } = await this.consulta<{
        huella_contenido: string;
        requiere_aceptacion: boolean;
        resumen_cambios: string;
      }>(
        'SELECT huella_contenido, requiere_aceptacion, resumen_cambios FROM documento_legal WHERE tipo = $1 AND version = $2',
        [d.tipo, d.version],
      );
      if (rows[0]) {
        if (rows[0].huella_contenido !== d.huella) {
          throw new ErrorDeCarga(
            `${d.origen}: la versión ${d.version} de ${d.tipo} ya está publicada y su archivo cambió. Una versión publicada no se edita: publica una versión nueva.`,
          );
        }
        if (
          rows[0].requiere_aceptacion !== d.requiereAceptacion ||
          rows[0].resumen_cambios !== d.resumen
        ) {
          throw new ErrorDeCarga(
            `${d.origen}: la versión ${d.version} de ${d.tipo} ya está publicada; no se cambia su resumen ni si requiere aceptación.`,
          );
        }
        continue;
      }
      await this.consulta(
        `INSERT INTO documento_legal (tipo, version, publicado_en, requiere_aceptacion, huella_contenido, resumen_cambios)
         VALUES ($1, $2, coalesce($3::timestamptz, now()), $4, $5, $6)`,
        [
          d.tipo,
          d.version,
          d.publicadoEn,
          d.requiereAceptacion,
          d.huella,
          d.resumen,
        ],
      );
      this.cambio('documento legal', `${d.tipo} ${d.version} publicado`);
    }
  }

  // ── Fundamentos e imágenes: se reconocen por sus datos naturales ──
  private async cargarFundamentos(fundamentos: Fundamento[]): Promise<void> {
    for (const f of fundamentos) {
      const { rows } = await this.consulta<{
        id: string;
        descripcion: string;
        referencia: string | null;
      }>(
        `SELECT id, descripcion, referencia FROM fundamento
         WHERE tipo = $1 AND nombre = $2 AND articulo IS NOT DISTINCT FROM $3 ORDER BY id LIMIT 1`,
        [f.tipo, f.nombre, f.articulo],
      );
      if (rows[0]) {
        this.fundamentos.set(f.clave, Number(rows[0].id));
        if (
          rows[0].descripcion !== f.descripcion ||
          rows[0].referencia !== f.referencia
        ) {
          await this.consulta(
            'UPDATE fundamento SET descripcion = $2, referencia = $3 WHERE id = $1',
            [rows[0].id, f.descripcion, f.referencia],
          );
          this.cambio('fundamento', `${f.clave} actualizado`);
        }
        continue;
      }
      const nuevo = await this.consulta<{ id: string }>(
        'INSERT INTO fundamento (tipo, nombre, articulo, descripcion, referencia) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [f.tipo, f.nombre, f.articulo, f.descripcion, f.referencia],
      );
      this.fundamentos.set(f.clave, Number(nuevo.rows[0].id));
      this.cambio('fundamento', `${f.clave} creado`);
    }
  }

  private async cargarImagenes(contenido: Contenido): Promise<void> {
    const todas: Imagen[] = [];
    for (const m of contenido.modulos) {
      if (m.insignia) todas.push(m.insignia.imagen);
      for (const c of m.cursos)
        for (const l of c.lecciones)
          for (const s of l.secciones) if (s.imagen) todas.push(s.imagen);
    }
    for (const imagen of todas) {
      if (this.imagenes.has(imagen.ruta)) continue;
      const { rows } = await this.consulta<{
        id: string;
        texto_alternativo: string;
        pie: string | null;
      }>('SELECT id, texto_alternativo, pie FROM imagen WHERE ruta = $1', [
        imagen.ruta,
      ]);
      if (rows[0]) {
        this.imagenes.set(imagen.ruta, Number(rows[0].id));
        if (
          rows[0].texto_alternativo !== imagen.textoAlternativo ||
          rows[0].pie !== imagen.pie
        ) {
          await this.consulta(
            'UPDATE imagen SET texto_alternativo = $2, pie = $3 WHERE id = $1',
            [rows[0].id, imagen.textoAlternativo, imagen.pie],
          );
          this.cambio('imagen', `${imagen.ruta} actualizada`);
        }
        continue;
      }
      const nueva = await this.consulta<{ id: string }>(
        'INSERT INTO imagen (ruta, texto_alternativo, pie) VALUES ($1, $2, $3) RETURNING id',
        [imagen.ruta, imagen.textoAlternativo, imagen.pie],
      );
      this.imagenes.set(imagen.ruta, Number(nueva.rows[0].id));
      this.cambio('imagen', `${imagen.ruta} creada`);
    }
  }

  // ── Módulos, cursos, lecciones, secciones e insignias ──
  private async estructura(modulos: Modulo[]): Promise<void> {
    const idsModulo = await this.sincronizar(
      'modulo',
      modulos.map((m) => ({
        slug: m.slug,
        orden: m.orden,
        padre: null,
        datos: {
          titulo: m.titulo,
          descripcion: m.descripcion,
          publicado: m.publicado,
        },
      })),
    );
    for (const m of modulos) {
      const moduloId = idsModulo.get(m.slug)!;
      if (m.insignia) await this.insignia(moduloId, m);
      const idsCurso = await this.sincronizar(
        'curso',
        m.cursos.map((c) => ({
          slug: c.slug,
          orden: c.orden,
          padre: moduloId,
          datos: {
            titulo: c.titulo,
            descripcion: c.descripcion,
            publicado: c.publicado,
          },
        })),
      );
      for (const c of m.cursos) {
        const cursoId = idsCurso.get(c.slug)!;
        const idsLeccion = await this.sincronizar(
          'leccion',
          c.lecciones.map((l) => ({
            slug: l.slug,
            orden: l.orden,
            padre: cursoId,
            datos: {
              titulo: l.titulo,
              resumen: l.resumen,
              publicado: l.publicado,
            },
          })),
        );
        for (const l of c.lecciones) {
          const leccionId = idsLeccion.get(l.slug)!;
          this.lecciones.set(l.slug, leccionId);
          await this.fechaDePublicacion(leccionId, l);
          await this.secciones(leccionId, l);
        }
      }
    }
  }

  /**
   * Crea o actualiza las filas de una tabla con slug (modulo, curso o leccion). Para reordenar sin chocar con el
   * índice único de orden, primero mueve a un orden temporal las filas cuyo orden o padre cambia.
   */
  private async sincronizar(
    tabla: 'modulo' | 'curso' | 'leccion',
    filas: {
      slug: string;
      orden: number;
      padre: number | null;
      datos: Record<string, string | boolean | null>;
    }[],
  ): Promise<Map<string, number>> {
    const padre =
      tabla === 'curso' ? 'modulo_id' : tabla === 'leccion' ? 'curso_id' : null;
    const ids = new Map<string, number>();
    const existentes = new Map<string, Fila>();
    for (const f of filas) {
      const { rows } = await this.consulta(
        `SELECT * FROM ${tabla} WHERE slug = $1`,
        [f.slug],
      );
      if (rows[0]) existentes.set(f.slug, rows[0]);
    }
    for (const f of filas) {
      const actual = existentes.get(f.slug);
      if (
        actual &&
        (actual.orden !== f.orden ||
          (padre && Number(actual[padre]) !== f.padre))
      ) {
        await this.consulta(`UPDATE ${tabla} SET orden = $2 WHERE id = $1`, [
          actual.id,
          TEMPORAL + Number(actual.id),
        ]);
      }
    }
    for (const f of filas) {
      const actual = existentes.get(f.slug);
      const columnas = Object.keys(f.datos);
      if (!actual) {
        const nombres = [
          ...(padre ? [padre] : []),
          'slug',
          'orden',
          ...columnas,
        ];
        const valores = [
          ...(padre ? [f.padre] : []),
          f.slug,
          f.orden,
          ...columnas.map((c) => f.datos[c]),
        ];
        const extra =
          tabla === 'leccion' && f.datos.publicado ? ', publicado_en' : '';
        const marcadores =
          valores.map((_, i) => `$${i + 1}`).join(', ') +
          (extra ? ', now()' : '');
        const { rows } = await this.consulta<{ id: string }>(
          `INSERT INTO ${tabla} (${nombres.join(', ')}${extra}) VALUES (${marcadores}) RETURNING id`,
          valores,
        );
        ids.set(f.slug, Number(rows[0].id));
        this.cambio(tabla, `${f.slug} creado`);
        continue;
      }
      ids.set(f.slug, Number(actual.id));
      const distintas = columnas.filter((c) => actual[c] !== f.datos[c]);
      const movido =
        actual.orden !== f.orden ||
        (padre !== null && Number(actual[padre]) !== f.padre);
      if (distintas.length === 0 && !movido) continue;
      const asignaciones = [
        'orden = $2',
        ...(padre ? [`${padre} = $3`] : []),
        ...columnas.map((c, i) => `${c} = $${i + (padre ? 4 : 3)}`),
      ];
      const valores = [
        actual.id,
        f.orden,
        ...(padre ? [f.padre] : []),
        ...columnas.map((c) => f.datos[c]),
      ];
      const publicar =
        tabla === 'leccion' && f.datos.publicado && actual.publicado_en === null
          ? ', publicado_en = now()'
          : '';
      await this.consulta(
        `UPDATE ${tabla} SET ${asignaciones.join(', ')}${publicar} WHERE id = $1`,
        valores,
      );
      const que = [...distintas, ...(movido ? ['orden'] : [])].join(', ');
      this.cambio(tabla, `${f.slug} actualizado (${que})`);
    }
    return ids;
  }

  private async fechaDePublicacion(
    leccionId: number,
    l: Leccion,
  ): Promise<void> {
    if (!l.publicadoEn) return;
    const { rows } = await this.consulta<{ publicado_en: Date | null }>(
      'SELECT publicado_en FROM leccion WHERE id = $1',
      [leccionId],
    );
    if (rows[0].publicado_en?.getTime() !== l.publicadoEn.getTime()) {
      await this.consulta(
        'UPDATE leccion SET publicado_en = $2 WHERE id = $1',
        [leccionId, l.publicadoEn],
      );
      this.cambio(
        'leccion',
        `${l.slug}: fecha de publicación ${l.publicadoEn.toISOString()}`,
      );
    }
  }

  private async insignia(moduloId: number, m: Modulo): Promise<void> {
    const i = m.insignia!;
    const imagenId = this.imagenes.get(i.imagen.ruta)!;
    const { rows } = await this.consulta<{
      id: string;
      nombre: string;
      descripcion: string;
      imagen_id: string;
    }>(
      'SELECT id, nombre, descripcion, imagen_id FROM insignia WHERE modulo_id = $1',
      [moduloId],
    );
    if (!rows[0]) {
      await this.consulta(
        'INSERT INTO insignia (modulo_id, nombre, descripcion, imagen_id) VALUES ($1, $2, $3, $4)',
        [moduloId, i.nombre, i.descripcion, imagenId],
      );
      this.cambio('insignia', `${m.slug} creada`);
    } else if (
      rows[0].nombre !== i.nombre ||
      rows[0].descripcion !== i.descripcion ||
      Number(rows[0].imagen_id) !== imagenId
    ) {
      await this.consulta(
        'UPDATE insignia SET nombre = $2, descripcion = $3, imagen_id = $4 WHERE id = $1',
        [rows[0].id, i.nombre, i.descripcion, imagenId],
      );
      this.cambio('insignia', `${m.slug} actualizada`);
    }
  }

  /** Las secciones se reconocen por su orden; las que sobran se borran (nada apunta a una sección). */
  private async secciones(leccionId: number, l: Leccion): Promise<void> {
    const { rows } = await this.consulta<{
      id: string;
      orden: number;
      titulo: string;
      cuerpo: string;
      imagen_id: string | null;
    }>(
      'SELECT id, orden, titulo, cuerpo, imagen_id FROM seccion WHERE leccion_id = $1 ORDER BY orden',
      [leccionId],
    );
    for (const [i, s] of l.secciones.entries()) {
      const orden = i + 1;
      const imagenId = s.imagen ? this.imagenes.get(s.imagen.ruta)! : null;
      const actual = rows.find((r) => r.orden === orden);
      if (!actual) {
        await this.consulta(
          'INSERT INTO seccion (leccion_id, orden, titulo, cuerpo, imagen_id) VALUES ($1, $2, $3, $4, $5)',
          [leccionId, orden, s.titulo, s.cuerpo, imagenId],
        );
        this.cambio('sección', `${l.slug} §${orden} creada`);
      } else if (
        actual.titulo !== s.titulo ||
        actual.cuerpo !== s.cuerpo ||
        (actual.imagen_id === null ? null : Number(actual.imagen_id)) !==
          imagenId
      ) {
        await this.consulta(
          'UPDATE seccion SET titulo = $2, cuerpo = $3, imagen_id = $4 WHERE id = $1',
          [actual.id, s.titulo, s.cuerpo, imagenId],
        );
        this.cambio('sección', `${l.slug} §${orden} actualizada`);
      }
    }
    const sobran = rows.filter((r) => r.orden > l.secciones.length);
    if (sobran.length) {
      await this.consulta('DELETE FROM seccion WHERE id = ANY($1::bigint[])', [
        sobran.map((r) => r.id),
      ]);
      this.cambio(
        'sección',
        `${l.slug}: ${sobran.length} sección(es) de más borradas`,
      );
    }
  }

  // ── Cuestionarios ──
  /**
   * Actividad (posición 1) y casos (posiciones 2 en adelante) de una lección. Un caso que ya no está se retira si
   * tiene intentos (su posición se mueve para dejarla libre) o se borra si no.
   */
  private async evaluablesDeLeccion(l: Leccion): Promise<void> {
    const leccionId = this.lecciones.get(l.slug)!;
    const { rows } = await this.consulta<Fila>(
      'SELECT * FROM cuestionario WHERE leccion_id = $1 ORDER BY orden',
      [leccionId],
    );
    // La actividad es una por lección aunque se haya retirado (ux_cuestionario_actividad): siempre se reutiliza.
    const actividad = rows.find((r) => r.tipo === 'actividad') ?? null;
    if (l.actividad)
      await this.cuestionario(
        l.actividad,
        actividad,
        { leccionId, orden: 1, cursoId: null },
        `${l.slug}/actividad`,
      );
    else if (actividad && actividad.activo)
      await this.quitarCuestionario(actividad, `${l.slug}/actividad`);

    const casos = rows.filter((r) => r.tipo === 'caso' && r.activo);
    for (const [i, caso] of l.casos.entries()) {
      const orden = i + 2;
      const actual = casos.find((r) => r.orden === orden) ?? null;
      await this.cuestionario(
        caso,
        actual,
        { leccionId, orden, cursoId: null },
        `${l.slug}/caso ${i + 1}`,
      );
    }
    for (const sobra of casos.filter(
      (r) => Number(r.orden) > l.casos.length + 1,
    )) {
      await this.quitarCuestionario(
        sobra,
        `${l.slug}/caso en la posición ${Number(sobra.orden) - 1}`,
      );
    }
  }

  private async examen(c: Curso): Promise<void> {
    const { rows } = await this.consulta<Fila>(
      "SELECT q.* FROM cuestionario q JOIN curso c ON c.id = q.curso_id WHERE c.slug = $1 AND q.tipo = 'examen'",
      [c.slug],
    );
    const { rows: curso } = await this.consulta<{ id: string }>(
      'SELECT id FROM curso WHERE slug = $1',
      [c.slug],
    );
    if (c.examen)
      await this.cuestionario(
        c.examen,
        rows[0] ?? null,
        { leccionId: null, orden: null, cursoId: Number(curso[0].id) },
        `${c.slug}/examen`,
      );
    else if (rows[0]?.activo)
      await this.quitarCuestionario(rows[0], `${c.slug}/examen`);
  }

  private async cuestionario(
    q: Cuestionario,
    actual: Fila | null,
    lugar: {
      leccionId: number | null;
      orden: number | null;
      cursoId: number | null;
    },
    nombre: string,
  ): Promise<void> {
    let id: number;
    if (!actual) {
      const { rows } = await this.consulta<{ id: string }>(
        `INSERT INTO cuestionario (tipo, leccion_id, curso_id, orden, titulo, instrucciones, calificacion_minima, minutos_espera)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          q.tipo,
          lugar.leccionId,
          lugar.cursoId,
          lugar.orden,
          q.titulo,
          q.instrucciones,
          q.calificacionMinima,
          q.minutosEspera,
        ],
      );
      id = Number(rows[0].id);
      this.cambio('cuestionario', `${nombre} creado`);
    } else {
      id = Number(actual.id);
      const distinto =
        actual.titulo !== q.titulo ||
        actual.instrucciones !== q.instrucciones ||
        Number(actual.calificacion_minima) !== q.calificacionMinima ||
        actual.minutos_espera !== q.minutosEspera ||
        actual.activo !== true ||
        (lugar.orden !== null && actual.orden !== lugar.orden);
      if (distinto) {
        await this.consulta(
          `UPDATE cuestionario SET titulo = $2, instrucciones = $3, calificacion_minima = $4, minutos_espera = $5,
                  activo = true, orden = coalesce($6, orden) WHERE id = $1`,
          [
            id,
            q.titulo,
            q.instrucciones,
            q.calificacionMinima,
            q.minutosEspera,
            lugar.orden,
          ],
        );
        this.cambio('cuestionario', `${nombre} actualizado`);
      }
    }
    await this.preguntas(id, q, nombre);
  }

  /** Borra el cuestionario si nadie lo ha intentado; si tiene intentos, lo retira y libera su posición. */
  private async quitarCuestionario(fila: Fila, nombre: string): Promise<void> {
    const borrado = await this.borrarSiNadieLoUso([
      [
        'DELETE FROM opcion WHERE pregunta_id IN (SELECT id FROM pregunta WHERE cuestionario_id = $1)',
        [fila.id],
      ],
      [
        'DELETE FROM pareja WHERE pregunta_id IN (SELECT id FROM pregunta WHERE cuestionario_id = $1)',
        [fila.id],
      ],
      ['DELETE FROM pregunta WHERE cuestionario_id = $1', [fila.id]],
      ['DELETE FROM cuestionario WHERE id = $1', [fila.id]],
    ]);
    if (borrado) {
      this.cambio('cuestionario', `${nombre} borrado (no tenía intentos)`);
      return;
    }
    const orden = fila.orden === null ? null : TEMPORAL + Number(fila.id);
    await this.consulta(
      'UPDATE cuestionario SET activo = false, orden = coalesce($2, orden) WHERE id = $1',
      [fila.id, orden],
    );
    this.cambio('cuestionario', `${nombre} retirado (ya tenía intentos)`);
  }

  // ── Preguntas: por posición; lo respondido se retira, nunca se edita (INV-02) ──
  private async preguntas(
    cuestionarioId: number,
    q: Cuestionario,
    nombre: string,
  ): Promise<void> {
    const actuales = await this.preguntasEnBase(cuestionarioId);
    const crear: { orden: number; pregunta: Pregunta }[] = [];
    for (const [i, p] of q.preguntas.entries()) {
      const orden = i + 1;
      const actual = actuales.find((a) => a.orden === orden);
      if (actual && actual.firma === this.firma(p)) continue;
      if (actual)
        await this.quitarPregunta(
          actual,
          `${nombre}, pregunta ${orden}`,
          'cambió',
        );
      crear.push({ orden, pregunta: p });
    }
    for (const sobra of actuales.filter((a) => a.orden > q.preguntas.length)) {
      await this.quitarPregunta(
        sobra,
        `${nombre}, pregunta ${sobra.orden}`,
        'ya no está en el archivo',
      );
    }
    for (const { orden, pregunta } of crear)
      await this.crearPregunta(
        cuestionarioId,
        orden,
        pregunta,
        `${nombre}, pregunta ${orden}`,
      );
  }

  private async preguntasEnBase(
    cuestionarioId: number,
  ): Promise<{ id: string; orden: number; firma: string }[]> {
    const { rows } = await this.consulta<Fila>(
      `SELECT p.id, p.orden, p.tipo, p.enunciado, p.retroalimentacion, p.fundamento_id, p.leccion_repaso_id,
              coalesce((SELECT json_agg(json_build_array(o.texto, o.valor::float8, o.retroalimentacion, o.consecuencia, o.fundamento_id::int) ORDER BY o.orden)
                        FROM opcion o WHERE o.pregunta_id = p.id AND o.activa), '[]') AS opciones,
              coalesce((SELECT json_agg(json_build_array(x.texto_izquierdo, x.texto_derecho) ORDER BY x.orden)
                        FROM pareja x WHERE x.pregunta_id = p.id), '[]') AS parejas
       FROM pregunta p WHERE p.cuestionario_id = $1 AND p.activa ORDER BY p.orden`,
      [cuestionarioId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      orden: Number(r.orden),
      firma: JSON.stringify([
        r.tipo,
        r.enunciado,
        r.retroalimentacion,
        r.fundamento_id === null ? null : Number(r.fundamento_id),
        r.leccion_repaso_id === null ? null : Number(r.leccion_repaso_id),
        r.opciones,
        r.parejas,
      ]),
    }));
  }

  /** Todo lo que el alumno ve o lo que califica, en la misma forma que preguntasEnBase. */
  private firma(p: Pregunta): string {
    const fundamento = (clave: string | null) =>
      clave === null ? null : this.fundamentos.get(clave)!;
    return JSON.stringify([
      p.tipo,
      p.enunciado,
      p.retroalimentacion,
      fundamento(p.fundamento),
      p.leccionRepaso === null ? null : this.lecciones.get(p.leccionRepaso)!,
      p.opciones.map((o) => [
        o.texto,
        o.valor,
        o.retroalimentacion,
        o.consecuencia,
        fundamento(o.fundamento),
      ]),
      p.parejas.map((x) => [x.izquierda, x.derecha]),
    ]);
  }

  /**
   * Borra la pregunta si nadie la ha respondido; si ya tiene respuestas, la base lo impide (ON DELETE RESTRICT de
   * respuesta_opcion y respuesta_pareja) y entonces se retira (INV-02). echo_contenido no puede leer las respuestas
   * de los alumnos: la base le dice si se respondió al rechazar el borrado.
   */
  private async quitarPregunta(
    actual: { id: string },
    nombre: string,
    motivo: string,
  ): Promise<void> {
    const borrada = await this.borrarSiNadieLoUso([
      ['DELETE FROM opcion WHERE pregunta_id = $1', [actual.id]],
      ['DELETE FROM pareja WHERE pregunta_id = $1', [actual.id]],
      ['DELETE FROM pregunta WHERE id = $1', [actual.id]],
    ]);
    if (borrada) {
      this.cambio(
        'pregunta',
        `${nombre}: ${motivo}; no tenía respuestas, se borra`,
      );
      return;
    }
    await this.consulta('UPDATE pregunta SET activa = false WHERE id = $1', [
      actual.id,
    ]);
    this.cambio(
      'pregunta',
      `${nombre}: ${motivo}; ya tenía respuestas, se retira`,
    );
  }

  /** Ejecuta los borrados en un punto de guardado; si una llave foránea lo impide, deshace solo eso y devuelve false. */
  private async borrarSiNadieLoUso(
    borrados: [string, unknown[]][],
  ): Promise<boolean> {
    await this.consulta('SAVEPOINT borrado');
    try {
      for (const [texto, valores] of borrados)
        await this.consulta(texto, valores);
      await this.consulta('RELEASE SAVEPOINT borrado');
      return true;
    } catch (error) {
      await this.consulta('ROLLBACK TO SAVEPOINT borrado');
      await this.consulta('RELEASE SAVEPOINT borrado');
      if ((error as { code?: string }).code === '23503') return false;
      throw error;
    }
  }

  private async crearPregunta(
    cuestionarioId: number,
    orden: number,
    p: Pregunta,
    nombre: string,
  ): Promise<void> {
    const fundamento = (clave: string | null) =>
      clave === null ? null : this.fundamentos.get(clave)!;
    const { rows } = await this.consulta<{ id: string }>(
      `INSERT INTO pregunta (cuestionario_id, tipo, enunciado, orden, fundamento_id, leccion_repaso_id, retroalimentacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        cuestionarioId,
        p.tipo,
        p.enunciado,
        orden,
        fundamento(p.fundamento),
        p.leccionRepaso === null ? null : this.lecciones.get(p.leccionRepaso)!,
        p.retroalimentacion,
      ],
    );
    const preguntaId = rows[0].id;
    for (const [i, o] of p.opciones.entries()) {
      await this.consulta(
        `INSERT INTO opcion (pregunta_id, texto, valor, retroalimentacion, consecuencia, fundamento_id, orden)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          preguntaId,
          o.texto,
          o.valor,
          o.retroalimentacion,
          o.consecuencia,
          fundamento(o.fundamento),
          i + 1,
        ],
      );
    }
    for (const [i, x] of p.parejas.entries()) {
      await this.consulta(
        'INSERT INTO pareja (pregunta_id, texto_izquierdo, texto_derecho, orden) VALUES ($1, $2, $3, $4)',
        [preguntaId, x.izquierda, x.derecha, i + 1],
      );
    }
    this.cambio('pregunta', `${nombre} creada`);
  }

  // ── Lo que está en la base y no en los archivos: no se toca ──
  private async reportarSobrantes(modulos: Modulo[]): Promise<void> {
    const slugs = {
      modulo: modulos.map((m) => m.slug),
      curso: modulos.flatMap((m) => m.cursos.map((c) => c.slug)),
      leccion: modulos.flatMap((m) =>
        m.cursos.flatMap((c) => c.lecciones.map((l) => l.slug)),
      ),
    };
    for (const [tabla, lista] of Object.entries(slugs)) {
      const { rows } = await this.consulta<{
        slug: string;
        publicado: boolean;
      }>(
        `SELECT slug, publicado FROM ${tabla} WHERE NOT (slug = ANY($1::text[])) ORDER BY slug`,
        [lista],
      );
      for (const r of rows) {
        this.avisos.push(
          `${tabla} ${r.slug} está en la base pero no en los archivos; no se toca${r.publicado ? ' y sigue publicado' : ''}. Para quitarlo, márcalo publicado: false.`,
        );
      }
    }
  }

  private consulta<T extends Fila = Fila>(
    texto: string,
    valores: unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    return this.bd.query<T>(texto, valores);
  }

  private cambio(que: string, detalle: string): void {
    this.cambios.push({ que, detalle });
  }
}

/** Un problema que solo se descubre al comparar con la base: detiene la carga sin escribir nada. */
export class ErrorDeCarga extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeCarga';
  }
}
