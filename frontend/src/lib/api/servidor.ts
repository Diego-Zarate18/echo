import "server-only";
import { cookies } from "next/headers";
import { crearCliente, type Transporte } from "./cliente";
import { operacionesApi, type IdOperacionDeLectura } from "./operaciones";

/**
 * Cliente de API para componentes de servidor y layouts (§3). Llama a `API_URL_INTERNA` por la red privada,
 * reenvía las cookies del alumno y nunca guarda en caché (todo depende de la sesión).
 *
 * Solo expone operaciones de lectura: las mutaciones van desde el navegador (navegador.ts), para que el
 * `Set-Cookie` del backend llegue intacto y el `Origin` sea el del frontend (§6, DEC-86).
 */
const transporteServidor: Transporte = async ({ metodo, ruta }) => {
  const base = process.env.API_URL_INTERNA;
  if (!base) throw new Error("Falta API_URL_INTERNA: la URL interna del backend (ver frontend/.env.example).");
  const almacen = await cookies();
  return fetch(`${base.replace(/\/$/, "")}${ruta}`, {
    method: metodo,
    headers: { accept: "application/json", cookie: almacen.toString() },
    cache: "no-store",
    redirect: "manual",
  });
};

const operacionesDeLectura = (Object.keys(operacionesApi) as (keyof typeof operacionesApi)[]).filter(
  (id): id is IdOperacionDeLectura => operacionesApi[id].metodo === "GET",
);

export const apiServidor = crearCliente(transporteServidor, operacionesDeLectura);
