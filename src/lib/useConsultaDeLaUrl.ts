"use client";

import { useSyncExternalStore } from "react";

function suscribir(avisar: () => void) {
  window.addEventListener("popstate", avisar);
  return () => window.removeEventListener("popstate", avisar);
}

/**
 * Parámetros de la URL leídos en el navegador. A diferencia de `useSearchParams`, no obliga a renderizar la página
 * solo en el cliente: en el servidor (y al hidratar) vale vacío, así la página sigue estática (`○`) y el formulario
 * viene en el HTML. Justo después de hidratar se vuelve a dibujar con los parámetros reales.
 * El prefijo `use` lo exige React para los hooks (excepción de DEC-76, como los sufijos del framework).
 */
export function useConsultaDeLaUrl(): URLSearchParams {
  const consulta = useSyncExternalStore(
    suscribir,
    () => window.location.search,
    () => "",
  );
  return new URLSearchParams(consulta);
}
