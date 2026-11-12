// Carga la semilla de desarrollo (INV-24): contenido y documentos legales como echo_contenido, y cuentas de
// ejemplo como echo_app. Nunca con el superusuario (INV-09) y nunca en producción.
//
//   npm run bd:reiniciar   (borra todo, aplica las migraciones y carga esta semilla)
//   npm run bd:semilla     (solo la semilla; la base debe estar recién reiniciada)
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const carpeta = new URL('./', import.meta.url);
const carpetaLegal = new URL('../../../docs/legal/', import.meta.url);

// Documentos legales v1.0 (DEC-28). La huella SHA-256 se calcula del archivo publicado (LF por .gitattributes),
// igual que en la API simulada; nunca se escribe a mano.
const documentos = [
  { tipo: 'aviso_privacidad', archivo: 'aviso-de-privacidad-v1.0.md', resumen: 'Primera versión del aviso de privacidad integral.' },
  { tipo: 'terminos', archivo: 'terminos-y-condiciones-v1.0.md', resumen: 'Primera versión de los términos y condiciones.' },
];

const leer = (nombre) => readFileSync(new URL(nombre, carpeta), 'utf8');
const huella = (archivo) => createHash('sha256').update(readFileSync(new URL(archivo, carpetaLegal))).digest('hex');

if (process.env.NODE_ENV === 'production') {
  throw new Error('La semilla de desarrollo nunca se carga en producción.');
}

async function enTransaccion(variable, trabajo) {
  const url = process.env[variable];
  if (!url) throw new Error(`Falta ${variable} en el .env`);
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    await trabajo(cliente);
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await cliente.end();
  }
}

async function principal() {
  await enTransaccion('DATABASE_URL_CONTENIDO', async (cliente) => {
    await cliente.query(leer('contenido.sql'));
    for (const d of documentos) {
      await cliente.query(
        `INSERT INTO documento_legal (tipo, version, publicado_en, requiere_aceptacion, huella_contenido, resumen_cambios)
         VALUES ($1, '1.0', '2026-10-21T06:00:00Z', true, $2, $3)`,
        [d.tipo, huella(d.archivo), d.resumen],
      );
    }
  });
  console.log('Contenido y documentos legales cargados (echo_contenido).');

  await enTransaccion('DATABASE_URL', async (cliente) => {
    await cliente.query(leer('cuentas.sql'));
  });
  console.log('Cuentas de ejemplo cargadas (echo_app). Contraseña: Ejemplo2026');
}

principal().catch((error) => {
  console.error(`No se pudo cargar la semilla: ${error.message}`);
  process.exitCode = 1;
});
