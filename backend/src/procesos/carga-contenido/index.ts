/**
 * Carga de contenido (OP-35, DEC-33): lleva la base al estado de la carpeta contenido/ como echo_contenido, en una
 * sola transacción. Formato y reglas en docs/backend/contenido.md.
 *
 *   npm run contenido:revisar    valida y muestra qué cambiaría, sin escribir nada
 *   npm run contenido:cargar     aplica los cambios
 *
 * Opciones: --carpeta <ruta> (por omisión, contenido/ en la raíz del repositorio) y --motivo "texto" (queda en la
 * auditoría, DEC-97). En producción, antes de cargar se hace el respaldo (DEC-69, regla 6).
 * REQUIERE REVISIÓN HUMANA.
 */
import 'dotenv/config';
import { resolve } from 'node:path';
import { conectar } from '../conexion';
import { Aplicador, ErrorDeCarga } from './aplicar';
import { Lector } from './leer';
import { validar } from './validar';

function opcion(nombre: string): string | null {
  const i = process.argv.indexOf(nombre);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function principal(): Promise<number> {
  const revisar = process.argv.includes('--revisar');
  // El proceso corre desde backend/ (npm run): la raíz del repositorio es la carpeta de arriba.
  const raiz = resolve(process.cwd(), '..');
  const carpeta = resolve(opcion('--carpeta') ?? resolve(raiz, 'contenido'));
  const motivo =
    opcion('--motivo') ??
    (revisar ? 'revisión de contenido' : 'carga de contenido');

  console.log(`${revisar ? 'Revisando' : 'Cargando'} ${carpeta}`);
  const lector = new Lector(carpeta, raiz);
  const contenido = lector.leer();
  const problemas = [
    ...lector.problemas,
    ...(lector.problemas.length ? [] : validar(contenido)),
  ];
  if (problemas.length > 0) {
    console.error(
      `\nNo se cargó nada: hay ${problemas.length} problema(s) en los archivos.\n`,
    );
    for (const p of problemas) console.error(`  ✗ ${p.archivo}: ${p.mensaje}`);
    return 1;
  }

  const bd = await conectar('DATABASE_URL_CONTENIDO', 'echo_contenido');
  try {
    await bd.query('BEGIN');
    // Una sola carga a la vez; el motivo queda en cada registro de la auditoría de esta transacción (DEC-97).
    await bd.query(
      "SELECT pg_advisory_xact_lock(hashtext('echo:carga-contenido'))",
    );
    await bd.query("SELECT set_config('echo.motivo', $1, true)", [
      motivo.slice(0, 200),
    ]);
    const aplicador = new Aplicador(bd);
    await aplicador.aplicar(contenido);
    if (revisar) await bd.query('ROLLBACK');
    else await bd.query('COMMIT');

    for (const aviso of aplicador.avisos) console.log(`  ! ${aviso}`);
    if (aplicador.cambios.length === 0)
      console.log('\nLa base ya está igual a los archivos: no hay cambios.');
    else {
      console.log(
        `\n${revisar ? 'Cambios que se harían' : 'Cambios hechos'} (${aplicador.cambios.length}):`,
      );
      for (const c of aplicador.cambios)
        console.log(`  · ${c.que}: ${c.detalle}`);
    }
    if (revisar && aplicador.cambios.length > 0)
      console.log(
        '\nNo se escribió nada. Para aplicarlo: npm run contenido:cargar',
      );
    return 0;
  } catch (error) {
    await bd.query('ROLLBACK').catch(() => undefined);
    if (error instanceof ErrorDeCarga) {
      console.error(`\nNo se cargó nada: ${error.message}`);
      return 1;
    }
    const codigo = (error as { code?: string }).code;
    const restriccion = (error as { constraint?: string }).constraint;
    console.error(
      `\nNo se cargó nada: la base rechazó un cambio${codigo ? ` (${codigo}${restriccion ? `, ${restriccion}` : ''})` : ''}. ` +
        'Todo se deshizo. Si es ux_*_orden, otro elemento que no está en los archivos ocupa ese número.',
    );
    if (process.env.NODE_ENV !== 'production') console.error(error);
    return 1;
  } finally {
    await bd.end();
  }
}

principal()
  .then((codigo) => process.exit(codigo))
  .catch((error: unknown) => {
    console.error(
      `No se pudo correr la carga: ${error instanceof Error ? error.message : 'error desconocido'}`,
    );
    process.exit(1);
  });
