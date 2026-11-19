import { IconoCirculo, IconoCirculoCheck } from "@/componentes/ui/iconos/iconos";

/** Reglas de DEC-25: las mismas que revisa el backend (`CONTRASENA_DEBIL`). */
export const REQUISITOS_CONTRASENA = [
  { clave: "largo", texto: "8 caracteres o más", falta: "Usa 8 caracteres o más.", cumple: (c: string) => c.length >= 8 },
  { clave: "letra", texto: "Al menos una letra", falta: "Agrega al menos una letra.", cumple: (c: string) => /\p{L}/u.test(c) },
  { clave: "numero", texto: "Al menos un número", falta: "Agrega al menos un número.", cumple: (c: string) => /\d/.test(c) },
] as const;

/** El primer requisito que falta, para el error junto al campo (Figma 67:380: «Agrega al menos un número.»). */
export function requisitoQueFalta(contrasena: string) {
  return REQUISITOS_CONTRASENA.find((requisito) => !requisito.cumple(contrasena))?.falta;
}

/**
 * Requisitos en vivo bajo la contraseña (68:280). Cada uno lleva ícono y, para el lector, «cumplido» o «pendiente»
 * (no solo color). La lista es `aria-live="polite"`: avisa cuando un requisito cambia, no en cada tecla.
 */
export function RequisitosContrasena({ id, contrasena }: { id: string; contrasena: string }) {
  return (
    <ul id={id} aria-live="polite" className="flex flex-col gap-1.5 text-detalle">
      {REQUISITOS_CONTRASENA.map((requisito) => {
        const cumplido = requisito.cumple(contrasena);
        return (
          <li key={requisito.clave} className={`flex items-center gap-2 ${cumplido ? "text-marca-bosque" : "text-texto-secundario"}`}>
            {cumplido ? <IconoCirculoCheck className="size-[18px]" /> : <IconoCirculo className="size-[18px]" />}
            <span>
              {requisito.texto}
              <span className="sr-only">{cumplido ? ": cumplido" : ": pendiente"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
