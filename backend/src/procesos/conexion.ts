import pg from 'pg';

/**
 * Conexión de un proceso (limpieza diaria, carga de contenido) con su propio rol (INV-09). Los procesos son puntos de
 * entrada propios: el servidor web nunca importa nada de src/procesos (DEC-104).
 */
export async function conectar(
  variable: string,
  rolEsperado: string,
): Promise<pg.Client> {
  const url = process.env[variable];
  if (!url) throw new Error(`Falta ${variable} en las variables de entorno`);
  const cliente = new pg.Client({
    connectionString: url,
    // Sesión en UTC (INV-03), con un tiempo límite para que el proceso nunca se quede colgado (DEC-63).
    options: '-c timezone=UTC -c statement_timeout=60000',
    connectionTimeoutMillis: 15_000,
  });
  await cliente.connect();
  const { rows } = await cliente.query<{ esperado: boolean }>(
    `SELECT (rolname = $1 AND NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb)) AS esperado
     FROM pg_roles WHERE rolname = current_user`,
    [rolEsperado],
  );
  if (!rows[0]?.esperado) {
    await cliente.end();
    throw new Error(`${variable} debe usar el rol ${rolEsperado} (INV-09)`);
  }
  return cliente;
}
