import { crearCliente, type Transporte } from "./cliente";
import { operacionesApi, type IdOperacion } from "./operaciones";

/**
 * Cliente de API para componentes de cliente (formularios, cuestionarios) (§3). Llama a `/api/...` del mismo
 * origen: el rewrite de Next lo lleva al backend y el navegador manda la cookie y el `Origin` solo.
 */
const transporteNavegador: Transporte = async ({ metodo, ruta, cuerpo }) => {
  const respuesta = await fetch(ruta, {
    method: metodo,
    credentials: "same-origin",
    headers: cuerpo === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  // Cada respuesta con sesión trae su nueva expiración; AvisoSesion la escucha (nunca consulta la sesión por su cuenta).
  const expira = respuesta.headers.get("X-Sesion-Expira");
  if (expira) window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRA, { detail: expira }));
  return respuesta;
};

export const EVENTO_SESION_EXPIRA = "echo:sesion-expira";

export const apiNavegador = crearCliente(transporteNavegador, Object.keys(operacionesApi) as IdOperacion[]);
