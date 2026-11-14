/**
 * Limpieza diaria (OP-34, DEC-63): borra las cuentas pendientes de más de 24 horas sin verificar, los enlaces vencidos
 * y las sesiones vencidas, llamando a fn_limpieza_diaria() como echo_app. Lo corre el Cron de Railway a las 09:00 UTC
 * (03:00 en la Ciudad de México):
 *
 *   npm run proceso:limpieza-diaria      (node dist/procesos/limpieza-diaria.js)
 *
 * Siempre termina, también con error (código de salida 1), porque Railway salta la siguiente ejecución si la anterior
 * sigue corriendo. Solo registra los conteos: ningún dato personal (INV-08).
 */
import 'dotenv/config';
import { conectar } from './conexion';

async function principal(): Promise<void> {
  const inicio = Date.now();
  const cliente = await conectar('DATABASE_URL', 'echo_app');
  try {
    const { rows } = await cliente.query<{
      cuentas_pendientes: number;
      enlaces: number;
      sesiones: number;
    }>(
      'SELECT cuentas_pendientes, enlaces, sesiones FROM fn_limpieza_diaria()',
    );
    const [borrados] = rows;
    console.log(
      JSON.stringify({
        proceso: 'limpieza-diaria',
        resultado: 'ok',
        cuentasPendientes: borrados.cuentas_pendientes,
        enlaces: borrados.enlaces,
        sesiones: borrados.sesiones,
        milisegundos: Date.now() - inicio,
      }),
    );
  } finally {
    await cliente.end();
  }
}

principal()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    // Solo el tipo y el código: el mensaje de la base puede incluir datos de la consulta (INV-08).
    const codigo = (error as { code?: unknown }).code;
    console.error(
      JSON.stringify({
        proceso: 'limpieza-diaria',
        resultado: 'error',
        error: error instanceof Error ? error.name : 'desconocido',
        codigo: typeof codigo === 'string' ? codigo : undefined,
      }),
    );
    process.exit(1);
  });
