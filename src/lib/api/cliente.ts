import type { operations } from "./esquema";
import { interpretarRespuesta, sinConexion, type Resultado } from "./errores";
import { operacionesApi, type IdOperacion } from "./operaciones";

type Operacion<I extends IdOperacion> = operations[I];
type Parametros<I extends IdOperacion> = Operacion<I>["parameters"];

type ParametrosDeRuta<I extends IdOperacion> = NonNullable<Parametros<I>["path"]>;
type ParametrosDeConsulta<I extends IdOperacion> = NonNullable<Parametros<I>["query"]>;
type CuerpoDe<I extends IdOperacion> =
  Operacion<I> extends { requestBody: { content: { "application/json": infer C } } } ? C : never;

type ConRuta<I extends IdOperacion> = [ParametrosDeRuta<I>] extends [never] ? unknown : { ruta: ParametrosDeRuta<I> };
type ConConsulta<I extends IdOperacion> = [ParametrosDeConsulta<I>] extends [never]
  ? unknown
  : Record<string, never> extends ParametrosDeConsulta<I>
    ? { consulta?: ParametrosDeConsulta<I> }
    : { consulta: ParametrosDeConsulta<I> };
type ConCuerpo<I extends IdOperacion> = [CuerpoDe<I>] extends [never] ? unknown : { cuerpo: CuerpoDe<I> };

/** Lo que recibe cada función: `ruta` (parámetros de la URL), `consulta` y `cuerpo`, según el contrato. */
export type EntradaDe<I extends IdOperacion> = ConRuta<I> & ConConsulta<I> & ConCuerpo<I>;

type ContenidoDe<R> = R extends { content: { "application/json": infer C } } ? C : null;
type Respuestas<I extends IdOperacion> = Operacion<I>["responses"];
/** Datos de las respuestas 2xx de la operación (`null` en 202 y 204, que no traen cuerpo). */
export type ExitoDe<I extends IdOperacion> = {
  [C in keyof Respuestas<I>]: C extends 200 | 201 | 202 | 204 ? ContenidoDe<Respuestas<I>[C]> : never;
}[keyof Respuestas<I>];

type Argumentos<I extends IdOperacion> =
  Record<string, never> extends EntradaDe<I> ? [entrada?: EntradaDe<I>] : [entrada: EntradaDe<I>];

export type FuncionDeApi<I extends IdOperacion> = (...argumentos: Argumentos<I>) => Promise<Resultado<ExitoDe<I>>>;
export type ClienteApi<I extends IdOperacion> = { [K in I]: FuncionDeApi<K> };

export type Solicitud = { metodo: string; ruta: string; cuerpo?: unknown };
/** Cómo llega la solicitud a la API: por la red privada (servidor) o por el mismo origen (navegador). */
export type Transporte = (solicitud: Solicitud) => Promise<Response>;

type EntradaGenerica = { ruta?: Record<string, string | number>; consulta?: Record<string, unknown>; cuerpo?: unknown };

/** Arma la URL: sustituye `{parametro}` y agrega la consulta sin los valores vacíos. */
export function armarRuta(plantilla: string, ruta: EntradaGenerica["ruta"] = {}, consulta: EntradaGenerica["consulta"] = {}) {
  const camino = plantilla.replace(/\{([a-zA-Z]+)\}/g, (_, nombre: string) => {
    const valor = ruta[nombre];
    if (valor === undefined) throw new Error(`Falta el parámetro de ruta «${nombre}» para ${plantilla}`);
    return encodeURIComponent(String(valor));
  });
  const parametros = new URLSearchParams();
  for (const [llave, valor] of Object.entries(consulta)) {
    if (valor !== undefined && valor !== null && valor !== "") parametros.set(llave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `${camino}?${texto}` : camino;
}

/** Crea una función por operación, con el nombre de su `operationId`. */
export function crearCliente<I extends IdOperacion>(transporte: Transporte, ids: readonly I[]): ClienteApi<I> {
  const cliente = {} as Record<IdOperacion, (entrada?: EntradaGenerica) => Promise<Resultado<unknown>>>;
  for (const id of ids) {
    const { metodo, ruta } = operacionesApi[id];
    cliente[id] = async (entrada = {}) => {
      let respuesta: Response;
      try {
        respuesta = await transporte({ metodo, ruta: armarRuta(ruta, entrada.ruta, entrada.consulta), cuerpo: entrada.cuerpo });
      } catch {
        return sinConexion();
      }
      return interpretarRespuesta(respuesta);
    };
  }
  return cliente as unknown as ClienteApi<I>;
}
