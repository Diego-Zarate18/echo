import { crearCliente, type Transporte } from "./cliente";
import { operacionesApi, type IdOperacion } from "./operaciones";

/**
 * Cliente de API para componentes de cliente (formularios, cuestionarios) (§3). Llama a `/api/...` del mismo
 * origen: el rewrite de Next lo lleva al backend y el navegador manda la cookie y el `Origin` solo.
 */
const transporteNavegador: Transporte = ({ metodo, ruta, cuerpo }) =>
  fetch(ruta, {
    method: metodo,
    credentials: "same-origin",
    headers: cuerpo === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });

export const apiNavegador = crearCliente(transporteNavegador, Object.keys(operacionesApi) as IdOperacion[]);
